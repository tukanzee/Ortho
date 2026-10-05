# Product Specification

## Product Name

Working title:

**Wrist Reduction Trainer**

## Problem

Interpreting a distal radius fracture from AP and lateral radiographs requires the learner to mentally reconstruct a three-dimensional deformity.

Junior clinicians may recognise a Colles fracture but still find it difficult to understand:
- where the distal fragment has moved
- how the AP and lateral views represent that movement
- where to position their hands
- why traction is used
- what direction corrective manipulation should occur
- how cast moulding helps maintain reduction

## Product Goal

Create an interactive educational experience that connects:

**2D radiographs ↔ 3D fracture anatomy ↔ physical reduction principles**

## Primary User

Foundation Year 2 doctor / junior ED doctor.

Assumptions:
- understands basic wrist anatomy
- can recognise common fractures with guidance
- has limited fracture-reduction experience
- may not have independently reduced a distal radius fracture

## Learning Objective

After using the application, the learner should have a stronger conceptual understanding of:

1. the 3D anatomy represented by AP and lateral wrist views
2. the characteristic deformity of a Colles fracture
3. why traction/disimpaction may be required
4. the direction of corrective manipulation
5. how movement of the distal fragment changes the radiographic appearance
6. how moulding pressure can help maintain reduction

## V1 Scope

One fracture:

**Colles-type distal radius fracture**

One teaching pathway:

**Interpret → Understand → Reduce → Cast**

No examination or scoring.

## Stage 1 — Explore

Learner can:
- rotate
- zoom
- change viewing angle
- select anatomy
- switch display mode

The primary 3D interaction is free orbit around the wrist so the learner can
inspect dorsal, volar, radial, ulnar, lateral, and oblique views.

Display modes:
- Limb
- Translucent
- Skeleton

## Stage 2 — Understand the Fracture

Identify:
- fracture location
- proximal fragment
- distal fragment

Teaching interaction:

**Show me what happened**

Transition from approximately normal alignment to the Colles deformity.

V1 represents this with a Normal / Colles selector and a simplified animated
distal-fragment deformity.

In this slice, AP and lateral are static reference panels linked to the selected
fracture state, not 3D camera modes.

## Stage 3 — Reduction

Button:

**Start Reduction**

The learner is guided through:
- positioning
- disimpaction
- traction
- corrective manipulation
- reviewing alignment

Teaching guidance focuses on cause and effect rather than scoring.

## Stage 4 — Cast Moulding

Once reduction teaching is complete, a cast appears.

The learner does not wrap the cast.

They instead explore:
- where pressure should be placed
- direction of pressure
- counter-pressure
- underlying bone position

## Guidance Style

Interactive textbook.

Prefer:

**observe → explain → retry**

rather than:

**correct / incorrect**

## 3D Model

Anatomically realistic bones.

Approximate model extent:

**mid-forearm to hand/fingers**

## Limb Appearance

Three states:

```text
Limb
Translucent
Skeleton
```

## Radiographic Views

Display:
- AP
- lateral

Desktop may show both simultaneously.

Mobile may use tabs/overlays.

These are educational projections, not true clinical radiographs.

## Desktop Layout

```text
┌─────────────┬─────────────────────────┬─────────────┐
│     AP      │        3D WRIST         │   LATERAL   │
└─────────────┴─────────────────────────┴─────────────┘

        Guided teaching / controls
```

## Mobile Layout

```text
┌─────────────────────────┐
│ Colles Reduction Trainer│
├─────────────────────────┤
│        3D WRIST         │
├─────────────────────────┤
│ AP | Lateral | Anatomy  │
├─────────────────────────┤
│ Teaching                │
└─────────────────────────┘
```

## Input

Primary:
- pointer/mouse
- touchscreen

Secondary:
- keyboard shortcuts

Anything possible by keyboard must also be possible without keyboard.

## Reduction Controls

Prefer spatial manipulation.

Avoid using numeric sliders as the main learner interaction.

Debug controls may use sliders during development.

## Visual Force Representation

Use arrows.

Arrow direction:
**direction of manipulation**

Arrow length:
**relative magnitude**

Do not label forces in Newtons.

## State Model

Fracture state must exist independently of the visuals.

```text
Normal wrist
    ↓
Colles fracture
    ↓
Reduction manipulation
    ↓
Reduced state
```

## Future Digital Twin

```text
Real AP + lateral radiographs
           ↓
image preprocessing
           ↓
bone/fracture detection
           ↓
2D-to-3D reconstruction
           ↓
patient-specific mesh
           ↓
browser simulator
```

The future ML pipeline will likely be implemented separately in Python.

## Non-Goals for V1

Do not attempt:
- diagnostic AI
- hospital PACS integration
- DICOM networking
- patient-identifiable data
- finite-element simulation
- exact soft-tissue biomechanics
- validated force measurement
- automatic X-ray reconstruction
- CT reconstruction
- VR
- user accounts
- analytics
- scoring

## Success Criteria

The prototype is successful if a learner can:

1. open it in a browser
2. see a wrist
3. rotate and inspect it
4. toggle between limb and skeleton
5. understand which fragment is displaced
6. manipulate the distal fragment during a reduction exercise
7. see the AP/lateral projection change
8. explore cast pressure points
