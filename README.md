# Wrist Reduction Trainer

An interactive browser-based teaching tool for learning how a Colles-type distal radius fracture appears in 2D radiographs, what the deformity looks like in 3D, and how reduction and cast moulding affect the fracture.

## Why?

Junior doctors often learn to recognise a Colles fracture from AP and lateral radiographs but translating those images into a three-dimensional understanding of the deformity can be difficult.

This project aims to connect:

**recognising the fracture → understanding the 3D deformity → understanding reduction forces**

## Version 1

The first prototype focuses only on:

**Colles-type distal radius fracture reduction**

for an FY2 / junior ED doctor.

Planned features:
- anatomically realistic wrist bones
- realistic hand/forearm appearance
- skin / translucent / skeleton views
- AP and lateral radiographic-style views
- interactive anatomy labels
- visualisation of the fracture deformity
- guided reduction
- interactive traction/manipulation
- linked 3D and AP/lateral views
- cast moulding pressure-point teaching
- desktop and mobile support

The application is exploratory rather than scored.

## Teaching Flow

```text
View fracture
      ↓
Explore AP + lateral
      ↓
View fracture in 3D
      ↓
Understand displacement
      ↓
Perform guided reduction
      ↓
Watch bone position change
      ↓
Observe AP/lateral changes
      ↓
Apply virtual cast
      ↓
Explore moulding forces
```

## Technology

Initial stack:
- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- @react-three/drei

The first version runs entirely in the browser.

No backend, database or machine-learning system is required.

## Long-Term Vision

Potential future workflow:

```text
AP radiograph
      +
Lateral radiograph
      ↓
3D reconstruction model
      ↓
Patient-specific wrist digital twin
      ↓
Interactive reduction simulation
      ↓
Cast moulding simulation
```

The future reconstruction pipeline will likely be a separate Python/ML project.

## Important

This project is an educational prototype.

It is not intended to provide patient-specific treatment recommendations or replace supervised clinical training.

## Current Status

**Planning / prototype stage**

Current focus:

> Build one high-quality interactive Colles fracture teaching case before expanding to other injuries.

## Planned Development

1. Project setup
2. Load anatomical wrist model
3. Build 3D viewer
4. Add anatomy interaction
5. Implement fracture representation
6. Create Colles deformity
7. Implement reduction controls
8. Add AP/lateral projections
9. Add guided teaching
10. Add cast moulding mode
11. Optimise mobile experience
