# Wrist ML

Purpose: develop a research prototype that estimates Colles fracture geometry
from paired AP and lateral radiographs.

V1 targets:

- dorsal tilt
- dorsal translation
- radial shortening

Current milestone: CT to DRR environment setup.

## Quick Start

```bash
cd ml
source .venv/bin/activate
python scripts/check_environment.py
python scripts/smoke_test_drr.py
```

Synthetic images will initially be CT-derived digitally reconstructed
radiographs using DiffDRR. The first dataset is planned to contain about 10,000
paired AP/lateral cases. V1 focuses only on Colles fractures; Smith fractures
are deliberately excluded from the ML dataset for now.

Real clinical X-rays come later. Do not commit patient data or
patient-identifiable information to Git.

## Future Generated Dataset Format

```text
data/generated/
case_000001/
├── ap.png
├── lateral.png
└── labels.json
```

Example `labels.json`:

```json
{
  "dorsal_tilt_deg": 20.4,
  "dorsal_translation_mm": 4.2,
  "radial_shortening_mm": 5.1
}
```

## Future Model Shape

The first model will use two image encoders and a regression head:

```text
AP image
    ↓
CNN encoder
       \
        -> feature concatenation -> regression head -> 3 outputs
       /
Lateral image
    ↓
CNN encoder
```

Outputs:

1. dorsal tilt
2. dorsal translation
3. radial shortening

## Current Limitation

The DRR smoke test uses DiffDRR's bundled example chest CT to verify the
rendering pipeline only. It is not a wrist CT and is not clinical data. If
DiffDRR rendering is not supported on Apple MPS for a local operation, the smoke
test falls back to CPU while leaving training device detection unchanged.
