from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CollesParameters:
    dorsal_tilt_deg: float
    dorsal_translation_mm: float
    radial_shortening_mm: float
