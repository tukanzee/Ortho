import { MathUtils } from 'three'

export type ReductionStep =
  | 'disimpact'
  | 'traction'
  | 'translation'
  | 'tilt'
  | 'review'

export type ReductionProgress = {
  disimpact: number
  traction: number
  translation: number
  tilt: number
}

export type ReductionFeedback = 'correct' | 'wrong' | null

export const INITIAL_REDUCTION_PROGRESS: ReductionProgress = {
  disimpact: 0,
  traction: 0,
  translation: 0,
  tilt: 0,
}

export const REDUCTION_STEP_ORDER: ReductionStep[] = [
  'disimpact',
  'traction',
  'translation',
  'tilt',
  'review',
]

export const REDUCTION_STEP_COMPLETION_THRESHOLD = 0.85

// V1 teaching simplification: the impacted distal fragment is first "unlocked"
// by briefly exaggerating the dorsal angulation before restoring length.
// This is illustrative and is not intended as patient-specific procedural guidance.
export const DISIMPACTION_EXTRA_DORSAL_TILT = MathUtils.degToRad(10)

// Exaggerated teaching-only separation used during the unlock/disimpaction step.
// The base Colles preset remains unchanged. The gap closes again during the
// final tilt-correction step so the review state returns to simplified alignment.
export const DISIMPACTION_TEACHING_SEPARATION_M = 0.008

export type ReducibleFractureType = 'colles' | 'smith'

type ReductionStepCopy = {
  title: string
  shortTitle: string
  instruction: string
  hint: string
  success: string
  wrong: string
}

const COLLES_REDUCTION_STEP_CONTENT: Record<ReductionStep, ReductionStepCopy> = {
  disimpact: {
    title: 'Disimpact / unlock',
    shortTitle: 'Disimpact',
    instruction:
      'Drag the orange ball along the curved path to exaggerate the dorsal deformity and visually unlock the impacted fragment.',
    hint:
      'Follow the orange arc from its start to its end. The temporary opening is deliberately exaggerated so the movement is easier to understand.',
    success:
      'Good — the fragment is now represented as disimpacted and ready for traction.',
    wrong:
      'That movement is away from the guided disimpaction direction. Try following the orange handle.',
  },
  traction: {
    title: 'Restore length with traction',
    shortTitle: 'Traction',
    instruction:
      'Drag the green ball from the tail to the tip of the arrow, distally along the long axis of the forearm.',
    hint:
      'Follow the proximal–distal axis. The guided model only allows movement along that line.',
    success:
      'Good — the radial shortening has been corrected in this teaching model.',
    wrong:
      'That direction increases shortening. Drag the handle distally, away from the forearm.',
  },
  translation: {
    title: 'Correct dorsal displacement',
    shortTitle: 'Translation',
    instruction:
      'Drag the magenta ball along the arrow toward VOLAR to correct the dorsal translation.',
    hint:
      'Use the DORSAL / VOLAR orientation arrows as your reference. Correction moves toward VOLAR.',
    success: 'Good — the dorsal translation is now corrected.',
    wrong:
      'That movement increases dorsal displacement. Try moving the fragment toward VOLAR.',
  },
  tilt: {
    title: 'Correct dorsal tilt',
    shortTitle: 'Tilt',
    instruction:
      'Drag the purple ball along the curved path to restore the distal radial tilt toward neutral alignment.',
    hint:
      'This step reverses the dorsal angulation around the fracture-level pivot.',
    success:
      'Good — the simplified distal fragment is now restored to the reduced alignment.',
    wrong:
      'That direction increases dorsal angulation. Rotate back toward the guided correction direction.',
  },
  review: {
    title: 'Review reduction',
    shortTitle: 'Review',
    instruction:
      'Inspect the wrist from multiple angles and compare the reduced alignment with the reference anatomy.',
    hint:
      'Rotate the model freely. The fracture line remains visible so you can inspect the alignment.',
    success: 'Guided Colles reduction sequence complete.',
    wrong: '',
  },
}

const SMITH_REDUCTION_STEP_CONTENT: Record<ReductionStep, ReductionStepCopy> = {
  disimpact: {
    title: 'Disimpact / unlock',
    shortTitle: 'Disimpact',
    instruction:
      'Drag the orange ball along the curved path to exaggerate the VOLAR deformity and visually unlock the impacted fragment.',
    hint:
      'For this Smith teaching model, the first guided motion temporarily increases the palmar/volar angulation before traction.',
    success:
      'Good — the Smith fragment is represented as disimpacted and ready for traction.',
    wrong:
      'That movement is away from the guided Smith disimpaction direction. Follow the orange arc toward VOLAR.',
  },
  traction: {
    title: 'Restore length with traction',
    shortTitle: 'Traction',
    instruction:
      'Drag the green ball from the tail to the tip of the arrow, distally along the long axis of the forearm.',
    hint:
      'Follow the proximal–distal axis. The guided model only allows movement along that line.',
    success:
      'Good — the radial shortening has been corrected in this teaching model.',
    wrong:
      'That direction increases shortening. Drag the handle distally, away from the forearm.',
  },
  translation: {
    title: 'Correct volar displacement',
    shortTitle: 'Translation',
    instruction:
      'Drag the magenta ball along the arrow toward DORSAL to correct the volar translation.',
    hint:
      'Use the DORSAL / VOLAR orientation arrows as your reference. Smith correction moves toward DORSAL.',
    success: 'Good — the volar translation is now corrected.',
    wrong:
      'That movement increases volar displacement. Try moving the fragment toward DORSAL.',
  },
  tilt: {
    title: 'Correct volar tilt',
    shortTitle: 'Tilt',
    instruction:
      'Drag the purple ball along the curved path to restore the distal radial tilt toward normal alignment.',
    hint:
      'This step reverses the additional volar angulation around the fracture-level pivot.',
    success:
      'Good — the simplified Smith fragment is now restored to the reduced alignment.',
    wrong:
      'That direction increases volar angulation. Rotate back along the guided correction path.',
  },
  review: {
    title: 'Review reduction',
    shortTitle: 'Review',
    instruction:
      'Inspect the wrist from multiple angles and compare the reduced alignment with the reference anatomy.',
    hint:
      'Rotate the model freely. The fracture line remains visible so you can inspect the alignment.',
    success: 'Guided Smith reduction sequence complete.',
    wrong: '',
  },
}

export function getReductionStepContent(
  fractureType: ReducibleFractureType,
  step: ReductionStep,
) {
  return fractureType === 'smith'
    ? SMITH_REDUCTION_STEP_CONTENT[step]
    : COLLES_REDUCTION_STEP_CONTENT[step]
}
