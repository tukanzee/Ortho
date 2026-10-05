import { MathUtils } from 'three'

export type FractureType = 'normal' | 'colles' | 'smith'

export const FRACTURE_ANIMATION_DURATION = 1.2

// BodyParts3D assets are exported in metres. For the V1 teaching preset,
// place the extra-articular fracture approximately 25 mm from the distal
// end of the radius rather than using a percentage of the whole bone length.
export const FRACTURE_DISTANCE_FROM_DISTAL_SURFACE_M = 0.025

export const WRIST_ROOT_ROTATION_Z = -Math.PI / 2

export const TYPICAL_COLLES_RADIOGRAPHIC_PRESET = {
  // Literature-anchored teaching targets rather than patient-specific values.
  normalVolarTiltDeg: 11,
  targetDorsalTiltDeg: 20,
  normalRadialInclinationDeg: 22,
  targetRadialInclinationDeg: 17,
  radialShorteningMm: 5,
  dorsalTranslationMm: 4,
} as const

// Smith fractures are defined by volar displacement and/or volar angulation
// of the distal radius fragment. There is no single universal Smith angle.
// These values are deliberately illustrative and independently tunable rather
// than being a literal sign-reversal of the Colles teaching preset.
export const SMITH_TEACHING_PRESET = {
  normalVolarTiltDeg: 11,
  targetVolarTiltDeg: 25,
  normalRadialInclinationDeg: 22,
  targetRadialInclinationDeg: 18,
  radialShorteningMm: 3,
  volarTranslationMm: 4,
} as const

export const FRACTURE_TEACHING_COLORS = {
  proximalEdge: '#2563ff',
  distalEdge: '#ff1744',
  dorsal: '#f59e0b',
  volar: '#22d3ee',
} as const

export const ORIENTATION_GUIDE_LENGTH_M = 0.05

const MM_TO_M = 0.001

const dorsalTiltDeltaDeg =
  TYPICAL_COLLES_RADIOGRAPHIC_PRESET.normalVolarTiltDeg +
  TYPICAL_COLLES_RADIOGRAPHIC_PRESET.targetDorsalTiltDeg

const radialInclinationLossDeg =
  TYPICAL_COLLES_RADIOGRAPHIC_PRESET.normalRadialInclinationDeg -
  TYPICAL_COLLES_RADIOGRAPHIC_PRESET.targetRadialInclinationDeg

const smithVolarTiltDeltaDeg =
  SMITH_TEACHING_PRESET.targetVolarTiltDeg -
  SMITH_TEACHING_PRESET.normalVolarTiltDeg

const smithRadialInclinationLossDeg =
  SMITH_TEACHING_PRESET.normalRadialInclinationDeg -
  SMITH_TEACHING_PRESET.targetRadialInclinationDeg

export const COLLES_DEFORMITY = {
  // Magnitudes only. WristModel applies them using an anatomical coordinate
  // frame derived from the radius, ulna, carpus and pisiform landmarks.
  dorsalTranslation:
    TYPICAL_COLLES_RADIOGRAPHIC_PRESET.dorsalTranslationMm * MM_TO_M,

  // Positive local Y moves the distal fragment proximally, creating
  // shortening/impaction rather than distraction across the fracture.
  proximalShortening:
    TYPICAL_COLLES_RADIOGRAPHIC_PRESET.radialShorteningMm * MM_TO_M,

  // Moving from ~11° volar tilt to ~20° dorsal tilt requires an
  // approximately 31° change in sagittal orientation.
  dorsalTiltDelta: MathUtils.degToRad(dorsalTiltDeltaDeg),

  // Magnitude of the coronal-plane teaching adjustment (22° -> 17°).
  radialInclinationLoss: MathUtils.degToRad(radialInclinationLossDeg),
} as const


export const SMITH_DEFORMITY = {
  volarTranslation:
    SMITH_TEACHING_PRESET.volarTranslationMm * MM_TO_M,

  proximalShortening:
    SMITH_TEACHING_PRESET.radialShorteningMm * MM_TO_M,

  // The source anatomy already contains the normal ~11° volar tilt.
  // This is the additional volar rotation needed to reach the V1 teaching target.
  volarTiltDelta: MathUtils.degToRad(smithVolarTiltDeltaDeg),

  radialInclinationLoss: MathUtils.degToRad(smithRadialInclinationLossDeg),
} as const

export function smoothstep(progress: number) {
  const clampedProgress = MathUtils.clamp(progress, 0, 1)

  return clampedProgress * clampedProgress * (3 - 2 * clampedProgress)
}
