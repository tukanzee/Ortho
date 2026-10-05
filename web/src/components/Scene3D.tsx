import { ArcballControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { WristBoneDefinition } from '../anatomy/anatomyRegistry'
import type { FractureType } from '../fracture/fractureConfig'
import type {
  ReductionFeedback,
  ReductionProgress,
  ReductionStep,
} from '../reduction/reductionConfig'
import WristModel from './WristModel'

type Scene3DProps = {
  fractureType: FractureType
  onHandleFeedback: (feedback: ReductionFeedback) => void
  onReductionProgressChange: (
    step: Exclude<ReductionStep, 'review'>,
    progress: number,
  ) => void
  onSelectionChange?: (bone: WristBoneDefinition | null) => void
  reductionMode: boolean
  reductionProgress: ReductionProgress
  reductionStep: ReductionStep
  resetViewToken: number
  showTeachingAids: boolean
}

type ArcballControlsHandle = {
  reset: () => void
}

function ArcballController({
  enabled,
  resetViewToken,
}: {
  enabled: boolean
  resetViewToken: number
}) {
  const controlsRef = useRef<ArcballControlsHandle | null>(null)

  useEffect(() => {
    if (resetViewToken > 0) {
      controlsRef.current?.reset()
    }
  }, [resetViewToken])

  return (
    <ArcballControls
      ref={(controls) => {
        controlsRef.current = controls as ArcballControlsHandle | null
      }}
      makeDefault
      enabled={enabled}
      enablePan={false}
      cursorZoom
      minDistance={0.12}
      maxDistance={5}
    />
  )
}

function Scene3D({
  fractureType,
  onHandleFeedback,
  onReductionProgressChange,
  onSelectionChange,
  reductionMode,
  reductionProgress,
  reductionStep,
  resetViewToken,
  showTeachingAids,
}: Scene3DProps) {
  const [handleDragging, setHandleDragging] = useState(false)

  return (
    <Canvas
      camera={{
        position: [0.42, 0.28, 0.82],
        fov: 45,
        near: 0.01,
        far: 100,
      }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
      }}
      shadows
    >
      <color attach="background" args={['#101d25']} />
      <ambientLight intensity={0.8} />
      <directionalLight castShadow intensity={2.4} position={[4, 6, 5]} />
      <directionalLight intensity={0.7} position={[-4, -2, -3]} />

      <WristModel
        fractureType={fractureType}
        onHandleDragStateChange={setHandleDragging}
        onHandleFeedback={onHandleFeedback}
        onReductionProgressChange={onReductionProgressChange}
        onSelectionChange={onSelectionChange}
        reductionMode={reductionMode}
        reductionProgress={reductionProgress}
        reductionStep={reductionStep}
        showTeachingAids={showTeachingAids}
      />

      <mesh
        receiveShadow
        position={[0, -0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[4, 64]} />
        <shadowMaterial opacity={0.28} />
      </mesh>

      <ArcballController
        enabled={!handleDragging}
        resetViewToken={resetViewToken}
      />
    </Canvas>
  )
}

export default Scene3D
