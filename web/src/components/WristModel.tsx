import { Html, Line, useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Box3,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Plane,
  MathUtils,
  Quaternion,
  Vector2,
  Vector3,
} from 'three'
import {
  carpalBoneIds,
  wristBoneDefinitions,
  type WristBoneDefinition,
} from '../anatomy/anatomyRegistry'
import {
  COLLES_DEFORMITY,
  SMITH_DEFORMITY,
  FRACTURE_ANIMATION_DURATION,
  FRACTURE_DISTANCE_FROM_DISTAL_SURFACE_M,
  FRACTURE_TEACHING_COLORS,
  ORIENTATION_GUIDE_LENGTH_M,
  type FractureType,
  WRIST_ROOT_ROTATION_Z,
  smoothstep,
} from '../fracture/fractureConfig'
import {
  DISIMPACTION_EXTRA_DORSAL_TILT,
  DISIMPACTION_TEACHING_SEPARATION_M,
  type ReductionFeedback,
  type ReductionProgress,
  type ReductionStep,
} from '../reduction/reductionConfig'

type ArcballControlsLike = {
  target: Vector3
  update?: () => void
  saveState?: () => void
}

type BoneLoadBoundaryProps = {
  bone: WristBoneDefinition
  onFailed: (id: string) => void
  children: ReactNode
}

type WristModelProps = {
  fractureType: FractureType
  onHandleDragStateChange: (dragging: boolean) => void
  onHandleFeedback: (feedback: ReductionFeedback) => void
  onReductionProgressChange: (
    step: Exclude<ReductionStep, 'review'>,
    progress: number,
  ) => void
  onSelectionChange?: (bone: WristBoneDefinition | null) => void
  reductionMode: boolean
  reductionProgress: ReductionProgress
  reductionStep: ReductionStep
  showTeachingAids: boolean
}

type RadiusFragment = 'proximal' | 'distal'

const RADIUS_BONE_ID = 'left_radius'
const ULNA_BONE_ID = 'left_ulna'
const CARPAL_BONE_ID_SET = new Set<string>(carpalBoneIds)
const PISIFORM_BONE_ID = 'left_pisiform'

type AnatomicalFrame = {
  carpalCenter: Vector3
  proximal: Vector3
  distal: Vector3
  radial: Vector3
  ulnar: Vector3
  volar: Vector3
  dorsal: Vector3
}

function getAnatomyCenterLocal(rootGroup: Group, anatomyId: string) {
  const bounds = new Box3().makeEmpty()

  rootGroup.traverse((object) => {
    if (
      object instanceof Mesh &&
      object.userData.anatomyId === anatomyId
    ) {
      bounds.expandByObject(object)
    }
  })

  if (bounds.isEmpty()) {
    return null
  }

  const worldCenter = bounds.getCenter(new Vector3())
  return rootGroup.worldToLocal(worldCenter)
}

function getCarpalCenterLocal(rootGroup: Group) {
  const bounds = new Box3().makeEmpty()

  rootGroup.traverse((object) => {
    if (
      object instanceof Mesh &&
      typeof object.userData.anatomyId === 'string' &&
      CARPAL_BONE_ID_SET.has(object.userData.anatomyId)
    ) {
      bounds.expandByObject(object)
    }
  })

  if (bounds.isEmpty()) {
    return null
  }

  const worldCenter = bounds.getCenter(new Vector3())
  return rootGroup.worldToLocal(worldCenter)
}

function deriveAnatomicalFrame(rootGroup: Group): AnatomicalFrame | null {
  rootGroup.updateMatrixWorld(true)

  const carpalCenter = getCarpalCenterLocal(rootGroup)
  const radiusCenter = getAnatomyCenterLocal(rootGroup, RADIUS_BONE_ID)
  const ulnaCenter = getAnatomyCenterLocal(rootGroup, ULNA_BONE_ID)
  const pisiformCenter = getAnatomyCenterLocal(rootGroup, PISIFORM_BONE_ID)

  if (!carpalCenter || !radiusCenter || !ulnaCenter || !pisiformCenter) {
    return null
  }

  // Longitudinal axis: from the wrist/carpus toward the centre of the forearm.
  const forearmCenter = radiusCenter.clone().add(ulnaCenter).multiplyScalar(0.5)
  const proximal = forearmCenter.sub(carpalCenter).normalize()
  const distal = proximal.clone().negate()

  // Radial/ulnar axis: ulna -> radius, projected perpendicular to the long axis.
  const radial = radiusCenter.clone().sub(ulnaCenter)
  radial.addScaledVector(proximal, -radial.dot(proximal)).normalize()
  const ulnar = radial.clone().negate()

  // The pisiform is a reliable volar landmark. Cross the proximal and radial
  // axes, then orient that normal toward the pisiform to resolve the sign.
  const pisiformVector = pisiformCenter.clone().sub(carpalCenter)
  const volar = new Vector3().crossVectors(proximal, radial).normalize()

  if (volar.dot(pisiformVector) < 0) {
    volar.negate()
  }

  const dorsal = volar.clone().negate()

  return {
    carpalCenter,
    proximal,
    distal,
    radial,
    ulnar,
    volar,
    dorsal,
  }
}

class BoneLoadBoundary extends Component<
  BoneLoadBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(
      `Failed to load wrist bone ${this.props.bone.id} from ${this.props.bone.file}`,
      error,
    )
    this.props.onFailed(this.props.bone.id)
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

function WristModel({
  fractureType,
  onHandleDragStateChange,
  onHandleFeedback,
  onReductionProgressChange,
  onSelectionChange,
  reductionMode,
  reductionProgress,
  reductionStep,
  showTeachingAids,
}: WristModelProps) {
  const rootGroupRef = useRef<Group>(null)
  const distalAnimationRef = useRef<Group>(null)
  const collesProgressRef = useRef(0)
  const smithProgressRef = useRef(0)
  const targetCollesProgress = fractureType === 'colles' ? 1 : 0
  const targetSmithProgress = fractureType === 'smith' ? 1 : 0

  const [loadedBoneIds, setLoadedBoneIds] = useState(() => new Set<string>())
  const [failedBoneIds, setFailedBoneIds] = useState(() => new Set<string>())
  const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null)
  const [anatomicalFrame, setAnatomicalFrame] = useState<AnatomicalFrame | null>(null)
  const [fractureGeometry, setFractureGeometry] = useState<{
    pivot: Vector3
  } | null>(null)

  const hasFramedCamera = useRef(false)
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls as ArcballControlsLike | null)
  const markLoaded = useCallback((id: string) => {
    setLoadedBoneIds((currentIds) => {
      if (currentIds.has(id)) {
        return currentIds
      }

      return new Set(currentIds).add(id)
    })
  }, [])

  const markFailed = useCallback((id: string) => {
    setFailedBoneIds((currentIds) => {
      if (currentIds.has(id)) {
        return currentIds
      }

      return new Set(currentIds).add(id)
    })
  }, [])

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedBoneId((currentId) => {
        const nextId = currentId === id ? null : id
        const selectedBone =
          wristBoneDefinitions.find((bone) => bone.id === nextId) ?? null

        onSelectionChange?.(selectedBone)

        return nextId
      })
    },
    [onSelectionChange],
  )

  const settledBoneCount = loadedBoneIds.size + failedBoneIds.size
  const radiusBone = wristBoneDefinitions.find((bone) => bone.id === RADIUS_BONE_ID)
  const ulnaBone = wristBoneDefinitions.find((bone) => bone.id === ULNA_BONE_ID)
  const distalBones = wristBoneDefinitions.filter(
    (bone) => bone.id !== RADIUS_BONE_ID && bone.id !== ULNA_BONE_ID,
  )

  useEffect(() => {
    const rootGroup = rootGroupRef.current

    if (
      !rootGroup ||
      !controls ||
      hasFramedCamera.current ||
      settledBoneCount < wristBoneDefinitions.length ||
      loadedBoneIds.size === 0
    ) {
      return
    }

    rootGroup.updateMatrixWorld(true)

    const box = new Box3().setFromObject(rootGroup)
    const center = new Vector3()
    const size = new Vector3()

    box.getCenter(center)
    box.getSize(size)

    // Keep the whole model visually centred, but rotate around an anatomical
    // wrist frame rather than the midpoint of the forearm.
    rootGroup.position.sub(center)
    rootGroup.updateMatrixWorld(true)

    const frame = deriveAnatomicalFrame(rootGroup)
    if (frame) {
      setAnatomicalFrame(frame)
    }

    const carpalTargetWorld = frame
      ? rootGroup.localToWorld(frame.carpalCenter.clone())
      : new Vector3()

    controls.target.copy(carpalTargetWorld)

    const largestDimension = Math.max(size.x, size.y, size.z)
    const distance = Math.max(largestDimension * 1.9, 0.8)

    camera.position.set(
      carpalTargetWorld.x + distance * 0.45,
      carpalTargetWorld.y + distance * 0.3,
      carpalTargetWorld.z + distance,
    )
    camera.lookAt(carpalTargetWorld)
    camera.updateProjectionMatrix()
    controls.update?.()
    controls.saveState?.()

    hasFramedCamera.current = true
  }, [camera, controls, loadedBoneIds.size, settledBoneCount])

  useFrame((_, delta) => {
    const distalGroup = distalAnimationRef.current

    if (!distalGroup || !anatomicalFrame) {
      return
    }

    const step = delta / FRACTURE_ANIMATION_DURATION

    const advanceProgress = (current: number, target: number) =>
      current < target
        ? Math.min(target, current + step)
        : Math.max(target, current - step)

    const nextCollesProgress = advanceProgress(
      collesProgressRef.current,
      targetCollesProgress,
    )
    const nextSmithProgress = advanceProgress(
      smithProgressRef.current,
      targetSmithProgress,
    )

    collesProgressRef.current = nextCollesProgress
    smithProgressRef.current = nextSmithProgress

    const collesProgress = smoothstep(nextCollesProgress)
    const smithProgress = smoothstep(nextSmithProgress)

    const tractionCorrection = reductionMode
      ? MathUtils.clamp(reductionProgress.traction, 0, 1)
      : 0
    const translationCorrection = reductionMode
      ? MathUtils.clamp(reductionProgress.translation, 0, 1)
      : 0
    const tiltCorrection = reductionMode
      ? MathUtils.clamp(reductionProgress.tilt, 0, 1)
      : 0
    const disimpaction = reductionMode
      ? MathUtils.clamp(reductionProgress.disimpact, 0, 1)
      : 0

    const collesShortening =
      COLLES_DEFORMITY.proximalShortening *
      collesProgress *
      (fractureType === 'colles' ? 1 - tractionCorrection : 1)

    const smithShortening =
      SMITH_DEFORMITY.proximalShortening *
      smithProgress *
      (fractureType === 'smith' ? 1 - tractionCorrection : 1)

    const residualShortening = collesShortening + smithShortening

    const residualDorsalTranslation =
      COLLES_DEFORMITY.dorsalTranslation *
      collesProgress *
      (fractureType === 'colles' ? 1 - translationCorrection : 1)

    const residualVolarTranslation =
      SMITH_DEFORMITY.volarTranslation *
      smithProgress *
      (fractureType === 'smith' ? 1 - translationCorrection : 1)

    const activeFractureProgress = MathUtils.clamp(
      collesProgress + smithProgress,
      0,
      1,
    )

    const teachingSeparation =
      DISIMPACTION_TEACHING_SEPARATION_M *
      activeFractureProgress *
      disimpaction *
      (1 - tiltCorrection)

    const translation = anatomicalFrame.dorsal
      .clone()
      .multiplyScalar(residualDorsalTranslation)
      .add(
        anatomicalFrame.volar
          .clone()
          .multiplyScalar(residualVolarTranslation),
      )
      .add(
        anatomicalFrame.proximal
          .clone()
          .multiplyScalar(residualShortening),
      )
      .add(
        anatomicalFrame.distal
          .clone()
          .multiplyScalar(teachingSeparation),
      )

    distalGroup.position.copy(translation)

    const collesDorsalTilt =
      COLLES_DEFORMITY.dorsalTiltDelta * collesProgress

    const smithVolarTilt =
      SMITH_DEFORMITY.volarTiltDelta * smithProgress

    const collesDisimpaction =
      DISIMPACTION_EXTRA_DORSAL_TILT *
      collesProgress *
      disimpaction

    const smithDisimpaction =
      DISIMPACTION_EXTRA_DORSAL_TILT *
      smithProgress *
      disimpaction

    // Positive sagittal angle = dorsal; negative = volar.
    // Each guided reduction reverses the deformity specific to that pattern.
    const signedSagittalTilt =
      (collesDorsalTilt + collesDisimpaction) *
        (fractureType === 'colles' ? 1 - tiltCorrection : 1) -
      (smithVolarTilt + smithDisimpaction) *
        (fractureType === 'smith' ? 1 - tiltCorrection : 1)

    const sagittalDirection =
      signedSagittalTilt >= 0
        ? anatomicalFrame.dorsal
        : anatomicalFrame.volar

    const sagittalMagnitude = Math.abs(signedSagittalTilt)

    const sagittalTarget = anatomicalFrame.distal
      .clone()
      .multiplyScalar(Math.cos(sagittalMagnitude))
      .add(
        sagittalDirection
          .clone()
          .multiplyScalar(Math.sin(sagittalMagnitude)),
      )
      .normalize()

    const sagittalRotation = new Quaternion().setFromUnitVectors(
      anatomicalFrame.distal,
      sagittalTarget,
    )

    const distalAfterSagittal = anatomicalFrame.distal
      .clone()
      .applyQuaternion(sagittalRotation)
      .normalize()

    const radialTilt =
      COLLES_DEFORMITY.radialInclinationLoss *
        collesProgress *
        (fractureType === 'colles' ? 1 - tiltCorrection : 1) +
      SMITH_DEFORMITY.radialInclinationLoss *
        smithProgress *
        (fractureType === 'smith' ? 1 - tiltCorrection : 1)

    const coronalTarget = distalAfterSagittal
      .clone()
      .multiplyScalar(Math.cos(radialTilt))
      .add(
        anatomicalFrame.radial
          .clone()
          .multiplyScalar(Math.sin(radialTilt)),
      )
      .normalize()

    const coronalRotation = new Quaternion().setFromUnitVectors(
      distalAfterSagittal,
      coronalTarget,
    )

    distalGroup.quaternion.copy(coronalRotation).multiply(sagittalRotation)
  })

  if (!radiusBone || !ulnaBone) {
    return null
  }

  const pivot = fractureGeometry?.pivot ?? new Vector3()

  return (
    <group
      name="horizontal-left-wrist"
      ref={rootGroupRef}
      rotation={[0, 0, WRIST_ROOT_ROTATION_Z]}
    >
      <group name="static-forearm">
        <BoneLoadBoundary bone={radiusBone} onFailed={markFailed}>
          <Suspense fallback={null}>
            <RadiusFragmentMesh
              bone={radiusBone}
              anatomicalFrame={anatomicalFrame}
              fragment="proximal"
              onFractureGeometry={setFractureGeometry}
              showFractureEdge={fractureType !== 'normal' && showTeachingAids}
              onLoaded={markLoaded}
              onSelect={handleSelect}
              selected={selectedBoneId === radiusBone.id}
            />
          </Suspense>
        </BoneLoadBoundary>

        <BoneLoadBoundary bone={ulnaBone} onFailed={markFailed}>
          <Suspense fallback={null}>
            <SelectableBone
              bone={ulnaBone}
              onLoaded={markLoaded}
              onSelect={handleSelect}
              selected={selectedBoneId === ulnaBone.id}
            />
          </Suspense>
        </BoneLoadBoundary>
      </group>

      {fractureType !== 'normal' && anatomicalFrame && showTeachingAids && (
        <DorsalVolarOrientationGuide frame={anatomicalFrame} />
      )}

      <group name="distal-fragment-pivot" position={pivot}>
        <group name="distal-fragment-animation" ref={distalAnimationRef}>
          <group name="distal-fragment-content" position={pivot.clone().multiplyScalar(-1)}>
            <BoneLoadBoundary bone={radiusBone} onFailed={markFailed}>
              <Suspense fallback={null}>
                <RadiusFragmentMesh
                  bone={radiusBone}
                  anatomicalFrame={anatomicalFrame}
                  fragment="distal"
                  onFractureGeometry={setFractureGeometry}
                  showFractureEdge={fractureType !== 'normal' && showTeachingAids}
                  onLoaded={markLoaded}
                  onSelect={handleSelect}
                  selected={selectedBoneId === radiusBone.id}
                />
              </Suspense>
            </BoneLoadBoundary>

            {distalBones.map((bone) => (
              <BoneLoadBoundary bone={bone} key={bone.id} onFailed={markFailed}>
                <Suspense fallback={null}>
                  <SelectableBone
                    bone={bone}
                    onLoaded={markLoaded}
                    onSelect={handleSelect}
                    selected={selectedBoneId === bone.id}
                  />
                </Suspense>
              </BoneLoadBoundary>
            ))}
          </group>
        </group>
      </group>

      {reductionMode &&
        anatomicalFrame &&
        fractureGeometry &&
        reductionStep !== 'review' && (
          <ReductionHandle
            fractureType={fractureType}
            frame={anatomicalFrame}
            onDragStateChange={onHandleDragStateChange}
            onFeedback={onHandleFeedback}
            onProgressChange={(progress) =>
              onReductionProgressChange(reductionStep, progress)
            }
            pivot={pivot}
            progress={reductionProgress[reductionStep]}
            step={reductionStep}
          />
        )}
    </group>
  )
}



function ReductionHandle({
  fractureType,
  frame,
  onDragStateChange,
  onFeedback,
  onProgressChange,
  pivot,
  progress,
  step,
}: {
  fractureType: FractureType
  frame: AnatomicalFrame
  onDragStateChange: (dragging: boolean) => void
  onFeedback: (feedback: ReductionFeedback) => void
  onProgressChange: (progress: number) => void
  pivot: Vector3
  progress: number
  step: Exclude<ReductionStep, 'review'>
}) {
  const camera = useThree((state) => state.camera)
  const handleRef = useRef<Group>(null)
  const dragRef = useRef<{
    pointerStart: Vector2
    progressStart: number
    screenDirection: Vector2
  } | null>(null)

  const specification = useMemo(() => {
    const isSmith = fractureType === 'smith'

    if (step === 'disimpact') {
      return {
        color: '#f59e0b',
        direction: isSmith ? frame.volar : frame.dorsal,
        kind: 'rotation' as const,
        label: 'Disimpact',
        origin: pivot.clone().add(frame.radial.clone().multiplyScalar(0.05)),
      }
    }

    if (step === 'traction') {
      return {
        color: '#84cc16',
        direction: frame.distal,
        kind: 'linear' as const,
        label: 'Traction',
        origin: frame.carpalCenter
          .clone()
          .add(frame.radial.clone().multiplyScalar(0.045)),
      }
    }

    if (step === 'translation') {
      return {
        color: '#e879f9',
        direction: isSmith ? frame.dorsal : frame.volar,
        kind: 'linear' as const,
        label: 'Correct displacement',
        origin: frame.carpalCenter
          .clone()
          .add(frame.radial.clone().multiplyScalar(0.045)),
      }
    }

    return {
      color: '#c084fc',
      direction: isSmith ? frame.dorsal : frame.volar,
      kind: 'rotation' as const,
      label: 'Correct tilt',
      origin: pivot.clone().add(frame.radial.clone().multiplyScalar(0.05)),
    }
  }, [fractureType, frame, pivot, step])

  const arrowLength = 0.1
  const shaftLength = arrowLength * 0.76

  // Intentionally oversized visual path. The learner gets a clear path to follow
  // while the fragment itself still uses the fracture/reduction configuration.
  const rotationArc = useMemo(() => {
    if (specification.kind !== 'rotation') {
      return []
    }

    const points: Vector3[] = []
    const radius = 0.078
    const sweep = MathUtils.degToRad(52)
    const startAngle = step === 'tilt' ? sweep : 0
    const endAngle = step === 'tilt' ? 0 : sweep
    const samples = 36
    const deformityDirection =
      fractureType === 'smith' ? frame.volar : frame.dorsal

    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples
      const angle = MathUtils.lerp(startAngle, endAngle, t)

      points.push(
        frame.distal
          .clone()
          .multiplyScalar(Math.cos(angle) * radius)
          .add(
            deformityDirection
              .clone()
              .multiplyScalar(Math.sin(angle) * radius),
          ),
      )
    }

    return points
  }, [
    fractureType,
    frame.distal,
    frame.dorsal,
    frame.volar,
    specification.kind,
    step,
  ])

  const rotationBallPosition = useMemo(() => {
    if (rotationArc.length === 0) {
      return new Vector3()
    }

    const scaledIndex =
      MathUtils.clamp(progress, 0, 1) * (rotationArc.length - 1)
    const lowerIndex = Math.floor(scaledIndex)
    const upperIndex = Math.min(rotationArc.length - 1, lowerIndex + 1)
    const blend = scaledIndex - lowerIndex

    return rotationArc[lowerIndex]
      .clone()
      .lerp(rotationArc[upperIndex], blend)
  }, [progress, rotationArc])

  const arrowQuaternion = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        specification.direction.clone().normalize(),
      ),
    [specification.direction],
  )

  const projectedDirection = useCallback(() => {
    const handle = handleRef.current

    if (!handle) {
      return new Vector2(1, 0)
    }

    let worldStart: Vector3
    let worldEnd: Vector3

    if (specification.kind === 'rotation' && rotationArc.length > 1) {
      worldStart = handle.localToWorld(rotationArc[0].clone())
      worldEnd = handle.localToWorld(
        rotationArc[rotationArc.length - 1].clone(),
      )
    } else {
      worldStart = handle.getWorldPosition(new Vector3())
      const parentQuaternion =
        handle.parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion()
      const worldDirection = specification.direction
        .clone()
        .applyQuaternion(parentQuaternion)
        .normalize()

      worldEnd = worldStart
        .clone()
        .add(worldDirection.multiplyScalar(0.1))
    }

    const startPoint = worldStart.clone().project(camera)
    const endPoint = worldEnd.clone().project(camera)

    const direction = new Vector2(
      endPoint.x - startPoint.x,
      endPoint.y - startPoint.y,
    )

    if (direction.lengthSq() < 0.0001) {
      return new Vector2(1, 0)
    }

    return direction.normalize()
  }, [camera, rotationArc, specification.direction, specification.kind])

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)

    dragRef.current = {
      pointerStart: event.pointer.clone(),
      progressStart: progress,
      screenDirection: projectedDirection(),
    }

    onFeedback(null)
    onDragStateChange(true)
    document.body.style.cursor = 'grabbing'
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    event.stopPropagation()

    const pointerDelta = event.pointer.clone().sub(drag.pointerStart)
    const signedMovement = pointerDelta.dot(drag.screenDirection)
    const nextProgress = MathUtils.clamp(
      drag.progressStart + signedMovement * 2.15,
      0,
      1,
    )

    onFeedback(signedMovement < -0.025 ? 'wrong' : 'correct')
    onProgressChange(nextProgress)
  }

  const stopDragging = (event: ThreeEvent<PointerEvent>) => {
    if (!dragRef.current) {
      return
    }

    event.stopPropagation()
    ;(event.target as Element).releasePointerCapture?.(event.pointerId)
    dragRef.current = null
    onDragStateChange(false)
    document.body.style.cursor = 'grab'
  }

  const linearBallPosition = arrowLength * MathUtils.clamp(progress, 0, 1)

  const labelPosition = useMemo(() => {
    if (specification.kind === 'rotation' && rotationArc.length > 0) {
      return rotationArc[Math.floor(rotationArc.length / 2)]
        .clone()
        .add(frame.radial.clone().multiplyScalar(0.035))
    }

    return specification.direction
      .clone()
      .multiplyScalar(arrowLength + 0.045)
  }, [
    frame.radial,
    rotationArc,
    specification.direction,
    specification.kind,
  ])

  return (
    <group
      name={`reduction-handle-${step}`}
      ref={handleRef}
      position={specification.origin}
    >
      {specification.kind === 'linear' ? (
        <group quaternion={arrowQuaternion}>
          <mesh position={[0, shaftLength / 2, 0]}>
            <cylinderGeometry args={[0.0034, 0.0034, shaftLength, 18]} />
            <meshBasicMaterial
              color={specification.color}
              depthTest
              depthWrite
            />
          </mesh>

          <mesh position={[0, shaftLength + 0.012, 0]}>
            <coneGeometry args={[0.009, 0.024, 24]} />
            <meshBasicMaterial
              color={specification.color}
              depthTest
              depthWrite
            />
          </mesh>

          <mesh
            position={[0, linearBallPosition, 0]}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <sphereGeometry args={[0.0115, 24, 18]} />
            <meshStandardMaterial
              color={specification.color}
              emissive={specification.color}
              emissiveIntensity={0.28}
            />
          </mesh>
        </group>
      ) : (
        <>
          <Line
            color={specification.color}
            depthTest
            lineWidth={5}
            points={rotationArc}
          />

          <mesh
            position={rotationBallPosition}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <sphereGeometry args={[0.0115, 24, 18]} />
            <meshStandardMaterial
              color={specification.color}
              emissive={specification.color}
              emissiveIntensity={0.28}
            />
          </mesh>
        </>
      )}

      <Html
        center
        position={labelPosition}
        style={{ pointerEvents: 'none' }}
        transform={false}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '4px 7px',
            border: `1px solid ${specification.color}`,
            borderRadius: '6px',
            color: '#ffffff',
            background: 'rgba(5, 18, 24, 0.88)',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {specification.label}
        </span>
      </Html>
    </group>
  )
}

function DorsalVolarOrientationGuide({ frame }: { frame: AnatomicalFrame }) {
  const origin = useMemo(
    () =>
      frame.carpalCenter
        .clone()
        .add(frame.radial.clone().multiplyScalar(0.065))
        .add(frame.proximal.clone().multiplyScalar(0.015)),
    [frame],
  )

  return (
    <group name="dorsal-volar-orientation-guide">
      <AnatomicalArrow
        color={FRACTURE_TEACHING_COLORS.dorsal}
        direction={frame.dorsal}
        length={ORIENTATION_GUIDE_LENGTH_M}
        origin={origin}
      />
      <AnatomicalArrow
        color={FRACTURE_TEACHING_COLORS.volar}
        direction={frame.volar}
        length={ORIENTATION_GUIDE_LENGTH_M}
        origin={origin}
      />
    </group>
  )
}

function AnatomicalArrow({
  color,
  direction,
  length,
  origin,
}: {
  color: string
  direction: Vector3
  length: number
  origin: Vector3
}) {
  const shaftLength = length * 0.72
  const headLength = length - shaftLength
  const shaftRadius = 0.0025
  const headRadius = 0.0065

  const quaternion = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
    [direction],
  )

  const label = color === FRACTURE_TEACHING_COLORS.dorsal ? 'DORSAL' : 'VOLAR'

  return (
    <group position={origin} quaternion={quaternion}>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, 18]} />
        <meshBasicMaterial color={color} depthTest depthWrite />
      </mesh>

      <mesh position={[0, shaftLength + headLength / 2, 0]}>
        <coneGeometry args={[headRadius, headLength, 24]} />
        <meshBasicMaterial color={color} depthTest depthWrite />
      </mesh>

      <Html
        center
        position={[0, length + 0.011, 0]}
        style={{ pointerEvents: 'none' }}
        transform={false}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '3px 6px',
            borderRadius: '5px',
            color: '#ffffff',
            background: 'rgba(5, 18, 24, 0.82)',
            border: `1px solid ${color}`,
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
          }}
        >
          {label}
        </span>
      </Html>
    </group>
  )
}

function SelectableBone({
  bone,
  selected,
  onLoaded,
  onSelect,
}: {
  bone: WristBoneDefinition
  selected: boolean
  onLoaded: (id: string) => void
  onSelect: (id: string) => void
}) {
  const { scene } = useGLTF(bone.file)
  const boneScene = usePreparedBoneScene(scene, bone)

  useEffect(() => {
    onLoaded(bone.id)
  }, [bone.id, onLoaded])

  useBoneHighlight(boneScene, selected)

  return (
    <primitive
      object={boneScene}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onSelect(bone.id)
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        document.body.style.cursor = 'default'
      }}
    />
  )
}

function RadiusFragmentMesh({
  anatomicalFrame,
  bone,
  fragment,
  selected,
  showFractureEdge,
  onFractureGeometry,
  onLoaded,
  onSelect,
}: {
  anatomicalFrame: AnatomicalFrame | null
  bone: WristBoneDefinition
  fragment: RadiusFragment
  selected: boolean
  showFractureEdge: boolean
  onFractureGeometry: (geometry: { pivot: Vector3 }) => void
  onLoaded: (id: string) => void
  onSelect: (id: string) => void
}) {
  const { scene } = useGLTF(bone.file)
  const radiusScene = usePreparedBoneScene(scene, bone)

  const proximalAxis = useMemo(
    () => anatomicalFrame?.proximal.clone() ?? new Vector3(0, 1, 0),
    [anatomicalFrame],
  )

  const projectionRange = useMemo(
    () => getSceneProjectionRange(radiusScene, proximalAxis),
    [proximalAxis, radiusScene],
  )

  const fractureLevel = useMemo(() => {
    if (!projectionRange) {
      return 0
    }

    const radiusLength = projectionRange.max - projectionRange.min
    const proposedLevel =
      projectionRange.min + FRACTURE_DISTANCE_FROM_DISTAL_SURFACE_M

    return Math.min(
      proposedLevel,
      projectionRange.max - radiusLength * 0.05,
    )
  }, [projectionRange])

  const clippingPlane = useMemo(() => {
    if (fragment === 'proximal') {
      return new Plane(proximalAxis.clone(), -fractureLevel)
    }

    return new Plane(proximalAxis.clone().negate(), fractureLevel)
  }, [fractureLevel, fragment, proximalAxis])

  const contourPoints = useMemo(
    () => computeCutContour(radiusScene, clippingPlane),
    [clippingPlane, radiusScene],
  )

  const cutCenter = useMemo(() => {
    if (contourPoints.length === 0) {
      return proximalAxis.clone().multiplyScalar(fractureLevel)
    }

    return contourPoints
      .reduce((center, point) => center.add(point), new Vector3())
      .multiplyScalar(1 / contourPoints.length)
  }, [contourPoints, fractureLevel, proximalAxis])

  useEffect(() => {
    onFractureGeometry({ pivot: cutCenter.clone() })
  }, [cutCenter, onFractureGeometry])

  useEffect(() => {
    onLoaded(bone.id)
  }, [bone.id, onLoaded])

  useBoneHighlight(radiusScene, selected)
  useClippingPlane(radiusScene, clippingPlane)

  const edgeColor =
    fragment === 'proximal'
      ? FRACTURE_TEACHING_COLORS.proximalEdge
      : FRACTURE_TEACHING_COLORS.distalEdge

  const contourOffset = clippingPlane.normal.clone().multiplyScalar(0.00035)

  const visibleContour = contourPoints.map((point) =>
    point.clone().add(contourOffset),
  )

  const closedContour =
    visibleContour.length > 2
      ? [...visibleContour, visibleContour[0].clone()]
      : visibleContour

  return (
    <group>
      <primitive
        object={radiusScene}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation()
          onSelect(bone.id)
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          document.body.style.cursor = 'default'
        }}
      />

      {showFractureEdge && closedContour.length > 2 && (
        <Line
          color={edgeColor}
          depthTest
          depthWrite={false}
          lineWidth={5}
          opacity={1}
          points={closedContour}
          transparent
        />
      )}
    </group>
  )
}


function getSceneRelativeMatrix(object: Mesh, scene: Group) {
  scene.updateMatrixWorld(true)
  object.updateMatrixWorld(true)

  return new Matrix4()
    .copy(scene.matrixWorld)
    .invert()
    .multiply(object.matrixWorld)
}

function getSceneProjectionRange(scene: Group, axis: Vector3) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  const vertex = new Vector3()

  scene.updateMatrixWorld(true)

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return
    }

    const position = object.geometry.getAttribute('position')
    if (!position) {
      return
    }

    const relativeMatrix = getSceneRelativeMatrix(object, scene)

    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(relativeMatrix)
      const projection = vertex.dot(axis)
      min = Math.min(min, projection)
      max = Math.max(max, projection)
    }
  })

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null
  }

  return { min, max }
}

function computeCutContour(scene: Group, plane: Plane) {
  const intersections: Vector3[] = []
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()

  scene.updateMatrixWorld(true)

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return
    }

    const geometry = object.geometry
    const position = geometry.getAttribute('position')
    if (!position) {
      return
    }

    const index = geometry.getIndex()
    const relativeMatrix = getSceneRelativeMatrix(object, scene)
    const triangleCount = index ? index.count / 3 : position.count / 3

    const readVertex = (vertexIndex: number, target: Vector3) => {
      target
        .fromBufferAttribute(position, vertexIndex)
        .applyMatrix4(relativeMatrix)
    }

    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const i0 = index ? index.getX(triangle * 3) : triangle * 3
      const i1 = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1
      const i2 = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2

      readVertex(i0, a)
      readVertex(i1, b)
      readVertex(i2, c)

      collectPlaneIntersections(a, b, c, plane, intersections)
    }
  })

  const uniquePoints = deduplicatePoints(intersections, 0.00015)
  if (uniquePoints.length < 3) {
    return uniquePoints
  }

  const center = uniquePoints
    .reduce((sum, point) => sum.add(point), new Vector3())
    .multiplyScalar(1 / uniquePoints.length)

  const reference =
    Math.abs(plane.normal.y) < 0.9
      ? new Vector3(0, 1, 0)
      : new Vector3(1, 0, 0)

  const tangent = new Vector3()
    .crossVectors(plane.normal, reference)
    .normalize()
  const bitangent = new Vector3()
    .crossVectors(plane.normal, tangent)
    .normalize()

  return uniquePoints.sort((pointA, pointB) => {
    const relativeA = pointA.clone().sub(center)
    const relativeB = pointB.clone().sub(center)

    const angleA = Math.atan2(
      relativeA.dot(bitangent),
      relativeA.dot(tangent),
    )
    const angleB = Math.atan2(
      relativeB.dot(bitangent),
      relativeB.dot(tangent),
    )

    return angleA - angleB
  })
}

function collectPlaneIntersections(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  plane: Plane,
  output: Vector3[],
) {
  intersectEdgeWithPlane(a, b, plane, output)
  intersectEdgeWithPlane(b, c, plane, output)
  intersectEdgeWithPlane(c, a, plane, output)
}

function intersectEdgeWithPlane(
  start: Vector3,
  end: Vector3,
  plane: Plane,
  output: Vector3[],
) {
  const startDistance = plane.distanceToPoint(start)
  const endDistance = plane.distanceToPoint(end)
  const epsilon = 1e-7

  if (Math.abs(startDistance) <= epsilon) {
    output.push(start.clone())
  }

  if (Math.abs(endDistance) <= epsilon) {
    output.push(end.clone())
  }

  if (startDistance * endDistance < 0) {
    const t = startDistance / (startDistance - endDistance)
    output.push(start.clone().lerp(end, t))
  }
}

function deduplicatePoints(points: Vector3[], tolerance: number) {
  const unique: Vector3[] = []
  const toleranceSquared = tolerance * tolerance

  points.forEach((point) => {
    if (
      !unique.some(
        (existingPoint) =>
          existingPoint.distanceToSquared(point) <= toleranceSquared,
      )
    ) {
      unique.push(point.clone())
    }
  })

  return unique
}

function usePreparedBoneScene(scene: Group, bone: WristBoneDefinition) {
  return useMemo(() => {
    const clone = scene.clone(true)

    clone.name = bone.id
    clone.userData = {
      ...clone.userData,
      anatomyLabel: bone.label,
      fmaId: bone.fmaId,
    }

    clone.traverse((object) => {
      object.userData = {
        ...object.userData,
        anatomyId: bone.id,
        anatomyLabel: bone.label,
        fmaId: bone.fmaId,
      }

      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
        object.material = cloneMaterial(object.material)
      }
    })

    return clone
  }, [bone, scene])
}

function useBoneHighlight(scene: Group, selected: boolean) {
  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return
      }

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]

      materials.forEach((material) => {
        if (!(material instanceof MeshStandardMaterial)) {
          return
        }

        if (!material.userData.originalColor) {
          material.userData.originalColor = `#${material.color.getHexString()}`
        }

        if (!material.userData.originalEmissive) {
          material.userData.originalEmissive = `#${material.emissive.getHexString()}`
        }

        const originalColor = material.userData.originalColor as string
        const originalEmissive = material.userData.originalEmissive as string

        if (selected) {
          material.color.set('#d97706')
          material.emissive.set('#7c2d12')
          material.emissiveIntensity = 0.28
        } else {
          material.color.set(originalColor)
          material.emissive.set(originalEmissive)
          material.emissiveIntensity = 0
        }

        material.needsUpdate = true
      })
    })
  }, [scene, selected])
}

function useClippingPlane(scene: Group, clippingPlane: Plane) {
  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return
      }

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]

      materials.forEach((material) => {
        material.clippingPlanes = [new Plane()]
        material.clipIntersection = false
        material.needsUpdate = true
      })
    })
  }, [scene])

  useFrame(() => {
    scene.updateMatrixWorld(true)

    scene.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return
      }

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]

      materials.forEach((material) => {
        const worldPlane = material.clippingPlanes?.[0]

        if (!worldPlane) {
          return
        }

        worldPlane.copy(clippingPlane).applyMatrix4(object.matrixWorld)
      })
    })
  })
}

function cloneMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    return material.map((singleMaterial) => singleMaterial.clone())
  }

  return material.clone()
}

export default WristModel
