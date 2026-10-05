# AGENTS.md

## Project

**Wrist Reduction Trainer**

A browser-based interactive teaching tool for junior doctors learning how to interpret and reduce a Colles-type distal radius fracture.

The long-term vision is a patient-specific wrist digital twin reconstructed from AP and lateral radiographs.

The current project is deliberately much smaller.

## Current Goal

Build an exploratory browser-based teaching prototype for an FY2-level learner.

The learner should be able to:

1. View a Colles fracture on AP and lateral radiographic-style views.
2. Explore the corresponding wrist in 3D.
3. Switch between full limb appearance, translucent limb, and bones only.
4. Understand the relationship between the 2D radiographs and the 3D deformity.
5. Learn the principles of reduction.
6. Apply traction and corrective manipulation interactively.
7. See the 3D fracture change during manipulation.
8. See AP and lateral projection views update as the 3D model changes.
9. Place pressure points on an already-applied cast to learn moulding principles.
10. Explore relevant wrist anatomy.

This is an **interactive textbook**, not an assessment system.

There is currently:
- no scoring
- no clinical decision support
- no AI
- no hospital integration
- no patient-specific reconstruction
- no backend
- no database

## Target User

Primary learner:

**Foundation Year 2 / junior ED doctor with limited experience of distal radius fracture reduction.**

The interface should assume basic medical knowledge but little practical fracture-reduction experience.

## Clinical Scope

Version 1 contains only:

**Adult Colles-type distal radius fracture and its reduction.**

Do not add additional fracture types unless explicitly requested.

## Core Educational Principle

The central learning loop is:

**Radiograph → 3D deformity → manipulation → bone movement → changed radiographic appearance**

The application should help the learner understand how forces applied to the limb affect the underlying fracture.

## Main Application Modes

### 1. Explore
- rotate model
- zoom
- select bones
- anatomy labels
- switch between limb / translucent / bone views
- inspect the wrist freely from dorsal, volar, radial, ulnar, lateral, and oblique views

Relevant structures:
- radius
- ulna
- scaphoid
- lunate
- triquetrum
- pisiform
- trapezium
- trapezoid
- capitate
- hamate
- metacarpals
- radial styloid
- ulnar styloid
- DRUJ
- radiocarpal joint

### 2. Understand

Explain the Colles deformity.

Show:
- fracture plane
- proximal fragment
- distal fragment
- dorsal displacement
- dorsal angulation / tilt
- shortening where appropriate

Useful interaction:

**Show me what happened**

Transition between approximately normal alignment and the fractured position.

### 3. Reduce

Reduction should be interactive and guided.

Possible sequence:
1. positioning
2. disimpaction where represented
3. traction
4. corrective translation
5. correction of angulation
6. holding the reduction

Do not simulate exact forces in Newtons.

Represent:
- direction
- relative magnitude
- sequence

Prefer direct spatial interaction over sliders.

### 4. Cast

The cast is already applied automatically.

Do not simulate wrapping plaster.

The learner should explore:
- pressure points on the cast
- pressure direction
- counter-pressure
- underlying bone position
- three-point moulding principles

## Interaction Design

The application must work on:
- desktop
- laptop
- tablet
- mobile phone

Primary interaction must work with:
- mouse
- touch
- pen

Keyboard shortcuts are optional accelerators and must never be required.

Potential shortcuts:
- R — reset
- B — toggle bone/limb view
- X — radiograph view
- T — traction/reduction mode
- M — cast moulding mode
- 1 — AP view
- 2 — lateral view

## 3D Interaction

Default:
- drag empty scene → rotate camera
- wheel / pinch → zoom
- tap bone → identify/select bone

When Reduction Mode starts:
- camera manipulation must be clearly separated from fracture manipulation
- learner should not accidentally rotate the camera while reducing the fracture

Prefer explicit reduction handles / force vectors.

## Responsive Layout

### Desktop

Preferred:
**AP view | large 3D model | lateral view**

### Mobile

Prefer:
- large central 3D view
- tabs/buttons for AP / lateral / anatomy
- teaching panel underneath
- optional landscape split view

## Radiograph Views

Version 1 does not need physically accurate X-ray attenuation.

Current V1 uses AP and lateral as static reference-image panels, not camera
presets.

Use synthetic radiographic-style projections derived from 3D geometry.

The educational relationship is:

**3D position ↔ AP appearance ↔ lateral appearance**

## Anatomy Model

Use anatomically realistic bone models.

Preferred file format:
**glTF / GLB**

Individual bones should remain separate meshes where possible.

## Visual Limb

Provide three display modes:
1. Limb
2. Translucent
3. Skeleton

## Internal Fracture Representation

Do not hard-code the simulator entirely around a single animation.

Represent fracture configuration as data/state.

Conceptually:

```ts
type FractureState = {
  translation: {
    dorsalVolar: number
    radialUlnar: number
    proximalDistal: number
  }
  rotation: {
    flexionExtension: number
    pronationSupination: number
    axialRotation: number
  }
}
```

The important principle:

**fracture geometry should be controlled through state/data rather than baked animation.**

Current V1 contains a Normal / Colles selector with a simplified animated distal
fragment deformity. It is illustrative teaching geometry, not a validated
clinical reconstruction.

## Long-Term Architecture

Eventually:

AP radiograph + lateral radiograph
↓
Python / ML reconstruction system
↓
patient-specific geometry or fracture parameters
↓
same browser simulator

## Technology

Preferred frontend:
- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- @react-three/drei

Consider `@use-gesture/react` only if required.

Version 1 remains entirely client-side.

Do not add:
- backend
- database
- authentication
- cloud infrastructure
- Python

unless explicitly requested.

## Coding Principles

Keep code understandable for someone learning web development.

Prefer:
- small components
- descriptive variable names
- TypeScript types
- comments for unusual 3D mathematics
- reusable state
- clear separation between UI and simulation logic

Avoid:
- premature abstraction
- complex state-management libraries
- unnecessary dependencies
- clever code that is difficult to understand

## Clinical Safety

This prototype is an educational simulation tool.

It must not present itself as:
- clinical decision support
- a replacement for supervised training
- a validated reduction planning system
- patient-specific guidance

Do not imply that simulated forces represent exact real-world force magnitude.

## Development Approach

Build one good vertical slice before expanding.

Recommended order:
1. render wrist bones
2. camera controls
3. anatomy labels
4. limb / translucent / skeleton toggle
5. fracture state
6. Colles deformity
7. reduction interaction
8. AP/lateral projections
9. guided teaching
10. cast moulding interaction
11. mobile refinement

Do not start ML work during this phase.

## Agent Behaviour

When implementing features:
1. Read this file first.
2. Keep the project focused on the current Colles MVP.
3. Avoid adding major dependencies without explaining why.
4. Do not silently redesign the product.
5. Prefer the simplest implementation that preserves future extensibility.
6. Keep mobile/touch interaction in mind.
7. Run the app/build after significant changes.
8. Explain errors in plain English.
9. When giving terminal commands, provide exact commands that can be copied.
10. Assume the user is learning while vibecoding and briefly explain important architectural decisions.
