import { useEffect, useState } from 'react'
import type { WristBoneDefinition } from './anatomy/anatomyRegistry'
import Scene3D from './components/Scene3D'
import {
  FRACTURE_TEACHING_COLORS,
  SMITH_TEACHING_PRESET,
  TYPICAL_COLLES_RADIOGRAPHIC_PRESET,
  type FractureType,
} from './fracture/fractureConfig'
import {
  fractureReferences,
  type XrayReferenceImage,
} from './references/fractureReferences'
import {
  INITIAL_REDUCTION_PROGRESS,
  REDUCTION_STEP_COMPLETION_THRESHOLD,
  REDUCTION_STEP_ORDER,
  getReductionStepContent,
  type ReductionFeedback,
  type ReductionProgress,
  type ReductionStep,
} from './reduction/reductionConfig'
import './styles/app.css'

const REDUCTION_ACTION_STEPS = [
  'disimpact',
  'traction',
  'translation',
  'tilt',
] as const

type ReductionActionStep = (typeof REDUCTION_ACTION_STEPS)[number]

function App() {
  const [selectedBone, setSelectedBone] = useState<WristBoneDefinition | null>(null)
  const [fractureType, setFractureType] = useState<FractureType>('normal')
  const [resetViewToken, setResetViewToken] = useState(0)
  const [showTeachingAids, setShowTeachingAids] = useState(true)
  const [xrayOpen, setXrayOpen] = useState(false)

  const [reductionMode, setReductionMode] = useState(false)
  const [reductionStep, setReductionStep] = useState<ReductionStep>('disimpact')
  const [reductionProgress, setReductionProgress] =
    useState<ReductionProgress>(INITIAL_REDUCTION_PROGRESS)
  const [reductionFeedback, setReductionFeedback] =
    useState<ReductionFeedback>(null)
  const [showReductionHint, setShowReductionHint] = useState(false)

  useEffect(() => {
    if (fractureType === 'normal' && reductionMode) {
      setReductionMode(false)
      setReductionStep('disimpact')
      setReductionProgress(INITIAL_REDUCTION_PROGRESS)
      setReductionFeedback(null)
    }
  }, [fractureType, reductionMode])

  const startReduction = () => {
    if (fractureType === 'normal') {
      return
    }

    setShowTeachingAids(true)
    setReductionProgress(INITIAL_REDUCTION_PROGRESS)
    setReductionStep('disimpact')
    setReductionFeedback(null)
    setShowReductionHint(false)
    setReductionMode(true)
  }

  const exitReduction = () => {
    setReductionMode(false)
    setReductionStep('disimpact')
    setReductionProgress(INITIAL_REDUCTION_PROGRESS)
    setReductionFeedback(null)
    setShowReductionHint(false)
  }

  const updateReductionProgress = (
    step: ReductionActionStep,
    progress: number,
  ) => {
    setReductionProgress((current) => ({
      ...current,
      [step]: progress,
    }))
  }

  const continueReduction = () => {
    if (reductionStep === 'review') {
      return
    }

    const progress = reductionProgress[reductionStep]

    if (progress < REDUCTION_STEP_COMPLETION_THRESHOLD) {
      return
    }

    setReductionProgress((current) => ({
      ...current,
      [reductionStep]: 1,
    }))

    const currentIndex = REDUCTION_STEP_ORDER.indexOf(reductionStep)
    const nextStep = REDUCTION_STEP_ORDER[currentIndex + 1] ?? 'review'

    setReductionStep(nextStep)
    setReductionFeedback(null)
    setShowReductionHint(false)
  }

  const restartReduction = () => {
    setReductionProgress(INITIAL_REDUCTION_PROGRESS)
    setReductionStep('disimpact')
    setReductionFeedback(null)
    setShowReductionHint(false)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Interactive teaching prototype</p>
        <h1>Wrist Reduction Trainer</h1>
        <p className="intro">
          Explore distal-radius fracture deformity in 3D, then practise a simplified
          guided reduction sequence.
        </p>
      </header>

      <section className="viewer" aria-labelledby="viewer-title">
        <div className="viewer-heading">
          <div>
            <p className="section-label">3D viewer</p>
            <h2 id="viewer-title">Wrist fracture model</h2>
          </div>

          <span className="status">
            <span className="status-dot" aria-hidden="true" />
            Scene ready
          </span>
        </div>

        <div className="canvas-container">
          <Scene3D
            fractureType={fractureType}
            onHandleFeedback={setReductionFeedback}
            onReductionProgressChange={updateReductionProgress}
            onSelectionChange={setSelectedBone}
            reductionMode={reductionMode}
            reductionProgress={reductionProgress}
            reductionStep={reductionStep}
            resetViewToken={resetViewToken}
            showTeachingAids={showTeachingAids}
          />

          <FractureControls
            fractureType={fractureType}
            onExitReduction={exitReduction}
            onFractureTypeChange={setFractureType}
            onStartReduction={startReduction}
            reductionMode={reductionMode}
          />

          <div className="viewer-actions">
            <button
              aria-expanded={xrayOpen}
              className="viewer-action-button"
              onClick={() => setXrayOpen((open) => !open)}
              type="button"
            >
              X-rays
            </button>

            <button
              className="viewer-action-button"
              onClick={() => setResetViewToken((token) => token + 1)}
              type="button"
            >
              Reset view
            </button>
          </div>

          {selectedBone && !reductionMode && (
            <aside className="selected-anatomy-panel" aria-live="polite">
              <p>Selected anatomy</p>
              <h3>{selectedBone.label}</h3>
            </aside>
          )}

          {reductionMode && (
            <ReductionInstructionCard
              fractureType={fractureType}
              feedback={reductionFeedback}
              onContinue={continueReduction}
              onExit={exitReduction}
              onRestart={restartReduction}
              onToggleHint={() => setShowReductionHint((show) => !show)}
              progress={reductionProgress}
              showHint={showReductionHint}
              step={reductionStep}
            />
          )}

          {fractureType !== 'normal' && showTeachingAids && (
            <FloatingLegend drawerOpen={xrayOpen} />
          )}

          <XrayDrawer
            fractureType={fractureType}
            onClose={() => setXrayOpen(false)}
            open={xrayOpen}
          />
        </div>

        {reductionMode ? (
          <ReductionStepTracker
            fractureType={fractureType}
            step={reductionStep}
          />
        ) : (
          <ExplorationBar
            fractureType={fractureType}
            onTeachingAidsChange={setShowTeachingAids}
            showTeachingAids={showTeachingAids}
          />
        )}

        <p className="instructions">
          Drag to rotate freely • Scroll or pinch to zoom • Reduction handles lock
          the camera while you drag
        </p>
      </section>
    </main>
  )
}

function FractureControls({
  fractureType,
  onExitReduction,
  onFractureTypeChange,
  onStartReduction,
  reductionMode,
}: {
  fractureType: FractureType
  onExitReduction: () => void
  onFractureTypeChange: (fractureType: FractureType) => void
  onStartReduction: () => void
  reductionMode: boolean
}) {
  if (reductionMode) {
    return (
      <div className="fracture-floating-controls">
        <span className="mode-badge">
          Guided {fractureType === 'smith' ? 'Smith' : 'Colles'} reduction
        </span>
        <button className="fracture-chip" onClick={onExitReduction} type="button">
          Exit
        </button>
      </div>
    )
  }

  return (
    <div className="fracture-floating-controls" aria-label="Fracture type">
      {(['normal', 'colles', 'smith'] satisfies FractureType[]).map((type) => (
        <button
          aria-pressed={fractureType === type}
          className="fracture-chip"
          key={type}
          onClick={() => onFractureTypeChange(type)}
          type="button"
        >
          <span className="fracture-option-dot" aria-hidden="true" />
          {type === 'normal' ? 'Normal' : type === 'colles' ? 'Colles' : 'Smith'}
        </button>
      ))}

      {fractureType !== 'normal' && (
        <button
          className="start-reduction-button"
          onClick={onStartReduction}
          type="button"
        >
          Start guided reduction
        </button>
      )}
    </div>
  )
}

function FloatingLegend({ drawerOpen }: { drawerOpen: boolean }) {
  return (
    <div className={`floating-legend${drawerOpen ? ' drawer-open' : ''}`}>
      <LegendItem color={FRACTURE_TEACHING_COLORS.dorsal} label="Dorsal" />
      <LegendItem color={FRACTURE_TEACHING_COLORS.volar} label="Volar" />
      <LegendItem
        color={FRACTURE_TEACHING_COLORS.proximalEdge}
        label="Proximal edge"
      />
      <LegendItem
        color={FRACTURE_TEACHING_COLORS.distalEdge}
        label="Distal edge"
      />
    </div>
  )
}

function ExplorationBar({
  fractureType,
  onTeachingAidsChange,
  showTeachingAids,
}: {
  fractureType: FractureType
  onTeachingAidsChange: (showTeachingAids: boolean) => void
  showTeachingAids: boolean
}) {
  const colles = TYPICAL_COLLES_RADIOGRAPHIC_PRESET
  const smith = SMITH_TEACHING_PRESET

  return (
    <div className="exploration-bar">
      <button
        aria-pressed={showTeachingAids}
        className="teaching-aids-toggle"
        onClick={() => onTeachingAidsChange(!showTeachingAids)}
        type="button"
      >
        <span>
          <strong>Teaching aids</strong>
          <small>Fracture edges, orientation arrows and measurements</small>
        </span>
        <span className="teaching-aids-toggle-state">
          {showTeachingAids ? 'On' : 'Off'}
        </span>
      </button>

      {fractureType === 'colles' && showTeachingAids && (
        <div className="teaching-measurements">
          <Measurement
            label="Dorsal tilt"
            value={`~${colles.targetDorsalTiltDeg}°`}
          />
          <Measurement
            label="Radial shortening"
            value={`~${colles.radialShorteningMm} mm`}
          />
          <Measurement
            label="Radial inclination"
            value={`~${colles.targetRadialInclinationDeg}°`}
          />
          <Measurement
            label="Dorsal translation"
            value={`~${colles.dorsalTranslationMm} mm`}
          />
        </div>
      )}

      {fractureType === 'smith' && showTeachingAids && (
        <div className="teaching-measurements">
          <Measurement
            label="Volar tilt"
            value={`~${smith.targetVolarTiltDeg}°`}
          />
          <Measurement
            label="Radial shortening"
            value={`~${smith.radialShorteningMm} mm`}
          />
          <Measurement
            label="Radial inclination"
            value={`~${smith.targetRadialInclinationDeg}°`}
          />
          <Measurement
            label="Volar translation"
            value={`~${smith.volarTranslationMm} mm`}
          />
        </div>
      )}

      {(fractureType === 'normal' || !showTeachingAids) && (
        <p className="bar-placeholder">
          {fractureType === 'normal'
            ? 'Select Colles or Smith to explore the teaching deformity.'
            : 'Teaching aids are hidden.'}
        </p>
      )}

      <p className="teaching-note">
        Illustrative teaching geometry; not patient-specific procedural guidance.
      </p>
    </div>
  )
}

function ReductionInstructionCard({
  fractureType,
  feedback,
  onContinue,
  onExit,
  onRestart,
  onToggleHint,
  progress,
  showHint,
  step,
}: {
  fractureType: FractureType
  feedback: ReductionFeedback
  onContinue: () => void
  onExit: () => void
  onRestart: () => void
  onToggleHint: () => void
  progress: ReductionProgress
  showHint: boolean
  step: ReductionStep
}) {
  const reductionFracture =
    fractureType === 'smith' ? 'smith' : 'colles'
  const content = getReductionStepContent(reductionFracture, step)
  const stepNumber = REDUCTION_STEP_ORDER.indexOf(step) + 1
  const actionStep = step === 'review' ? null : step
  const currentProgress = actionStep ? progress[actionStep] : 1
  const complete =
    currentProgress >= REDUCTION_STEP_COMPLETION_THRESHOLD

  return (
    <aside className="reduction-instruction-card" aria-live="polite">
      <p className="reduction-kicker">
        Step {stepNumber} of {REDUCTION_STEP_ORDER.length}
      </p>

      <h3>{content.title}</h3>
      <p className="reduction-instruction">{content.instruction}</p>

      {feedback === 'wrong' && step !== 'review' && (
        <p className="reduction-feedback warning">{content.wrong}</p>
      )}

      {(feedback === 'correct' || complete) && step !== 'review' && (
        <p className="reduction-feedback success">
          {complete
            ? content.success
            : 'Good — keep moving the ball along the highlighted path.'}
        </p>
      )}

      {step === 'review' && (
        <p className="reduction-feedback success">{content.success}</p>
      )}

      {showHint && <p className="reduction-hint">{content.hint}</p>}

      {step !== 'review' ? (
        <>
          <div
            aria-label={`${Math.round(currentProgress * 100)} percent complete`}
            className="reduction-progress"
          >
            <span style={{ width: `${currentProgress * 100}%` }} />
          </div>

          <div className="reduction-card-actions">
            <button
              className="secondary-button"
              onClick={onToggleHint}
              type="button"
            >
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>

            <button
              className="primary-button"
              disabled={!complete}
              onClick={onContinue}
              type="button"
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        <div className="reduction-card-actions">
          <button
            className="secondary-button"
            onClick={onRestart}
            type="button"
          >
            Restart
          </button>
          <button className="primary-button" onClick={onExit} type="button">
            Finish
          </button>
        </div>
      )}

      <p className="reduction-card-note">
        Exaggerated teaching motion for this synthetic model, not patient-specific
        procedural guidance.
      </p>
    </aside>
  )
}

function ReductionStepTracker({
  fractureType,
  step,
}: {
  fractureType: FractureType
  step: ReductionStep
}) {
  const currentIndex = REDUCTION_STEP_ORDER.indexOf(step)
  const reductionFracture =
    fractureType === 'smith' ? 'smith' : 'colles'

  return (
    <div className="reduction-step-bar" aria-label="Reduction sequence">
      {REDUCTION_STEP_ORDER.map((item, index) => {
        const state =
          index < currentIndex
            ? 'complete'
            : index === currentIndex
              ? 'active'
              : 'upcoming'

        return (
          <span className={`reduction-step-pill ${state}`} key={item}>
            <span className="reduction-step-number">{index + 1}</span>
            {getReductionStepContent(reductionFracture, item).shortTitle}
          </span>
        )
      })}
    </div>
  )
}

function Measurement({ label, value }: { label: string; value: string }) {
  return (
    <div className="measurement-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="legend-item">
      <span className="legend-swatch" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function XrayDrawer({
  fractureType,
  onClose,
  open,
}: {
  fractureType: FractureType
  onClose: () => void
  open: boolean
}) {
  const references = fractureReferences[fractureType]
  const [showAnnotations, setShowAnnotations] = useState(true)

  return (
    <aside
      aria-hidden={!open}
      className={`xray-drawer${open ? ' open' : ''}`}
    >
      <div className="xray-drawer-heading">
        <div>
          <p className="panel-label">Reference X-rays</p>
          <span>
            {references.ap || references.lateral
              ? 'Clinical reference example'
              : fractureType === 'smith'
                ? 'Smith reference pair to be added'
                : 'Reference images to be added'}
          </span>
        </div>
        <button className="drawer-close" onClick={onClose} type="button">
          Close
        </button>
      </div>

      {(references.ap || references.lateral) && (
        <button
          aria-pressed={showAnnotations}
          className="annotation-toggle"
          onClick={() => setShowAnnotations((shown) => !shown)}
          type="button"
        >
          Annotations {showAnnotations ? 'On' : 'Off'}
        </button>
      )}

      <ReferenceCard
        label="AP"
        reference={references.ap}
        showAnnotations={showAnnotations}
      />
      <ReferenceCard
        label="Lateral"
        reference={references.lateral}
        showAnnotations={showAnnotations}
      />

      {references.source && (
        <p className="reference-source">
          <a href={references.source.url} rel="noreferrer" target="_blank">
            {references.source.label}
          </a>
          {' · '}
          {references.source.licence}
          {references.source.note ? ` · ${references.source.note}` : ''}
        </p>
      )}
    </aside>
  )
}

function ReferenceCard({
  label,
  reference,
  showAnnotations,
}: {
  label: 'AP' | 'Lateral'
  reference?: XrayReferenceImage
  showAnnotations: boolean
}) {
  return (
    <div className="reference-card">
      <p>{label}</p>

      {reference ? (
        <div className={`reference-image-frame reference-crop-${reference.crop}`}>
          <img alt={reference.alt} src={reference.src} />

          {showAnnotations && (
            <svg
              aria-hidden="true"
              className="reference-annotation-overlay"
              viewBox="0 0 100 100"
            >
              {label === 'AP' ? <ApTeachingAnnotations /> : <LateralTeachingAnnotations />}
            </svg>
          )}
        </div>
      ) : (
        <div className="reference-placeholder">Reference image to be added</div>
      )}
    </div>
  )
}

function ApTeachingAnnotations() {
  return (
    <>
      <line className="xray-guide-primary" x1="28" y1="66" x2="69" y2="61" />
      <line className="xray-guide-muted" x1="49" y1="51" x2="49" y2="74" />
      <text className="xray-guide-label" x="13" y="57">
        Radial inclination
      </text>

      <line className="xray-guide-secondary" x1="22" y1="61" x2="22" y2="68" />
      <line className="xray-guide-secondary" x1="18" y1="61" x2="27" y2="61" />
      <line className="xray-guide-secondary" x1="18" y1="68" x2="27" y2="68" />
      <text className="xray-guide-label-secondary" x="10" y="76">
        Radial height
      </text>
    </>
  )
}

function LateralTeachingAnnotations() {
  return (
    <>
      <line className="xray-guide-muted" x1="49" y1="48" x2="49" y2="76" />
      <line className="xray-guide-primary" x1="35" y1="61" x2="65" y2="53" />
      <path className="xray-guide-arc" d="M49 62 A14 14 0 0 1 61 55" />
      <text className="xray-guide-label" x="50" y="48">
        Dorsal tilt
      </text>
    </>
  )
}

export default App
