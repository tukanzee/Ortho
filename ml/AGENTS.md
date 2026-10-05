# AGENTS.md

## Project Aim

Train an interpretable model to infer Colles fracture parameters from paired
radiographs.

## Current Targets

- dorsal tilt
- dorsal translation
- radial shortening

## Rules

- Keep `web/` independent from `ml/`.
- Do not commit patient-identifiable data.
- Do not commit generated datasets.
- Put configuration values in YAML or config modules.
- Maintain CPU fallback.
- Prefer MPS on supported Apple hardware.
- Avoid unnecessary ML complexity.
- Validate synthetic generation before training models.
- Do not claim clinical validation.
