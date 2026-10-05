# Architecture

## Frontend

React + TypeScript + Vite

## 3D

Three.js via React Three Fiber.

## Application

Entirely client-side.

## Key separation

```text
UI
↓
Teaching logic
↓
Fracture state
↓
3D renderer
↓
AP/lateral projection renderer
```

The fracture state must not depend on the source of the anatomy.

Future:

```text
ML reconstruction
↓
fracture/anatomy data
↓
same simulator
```
