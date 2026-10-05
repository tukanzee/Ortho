from __future__ import annotations

from pathlib import Path


ML_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = ML_ROOT.parent
DATA_DIR = ML_ROOT / "data"
RAW_CT_DIR = DATA_DIR / "raw_ct"
GENERATED_DATA_DIR = DATA_DIR / "generated"
OUTPUTS_DIR = ML_ROOT / "outputs"
CONFIGS_DIR = ML_ROOT / "configs"
