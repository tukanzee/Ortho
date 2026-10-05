from __future__ import annotations

import platform
import sys
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from wrist_ml.device import get_device


def import_status(module_name: str) -> tuple[bool, str | None]:
    try:
        module = __import__(module_name)
    except Exception as error:  # pragma: no cover - diagnostic script
        return False, str(error)

    return True, getattr(module, "__version__", None)


def main() -> None:
    device = get_device()
    diffdrr_ok, diffdrr_version = import_status("diffdrr")
    sitk_ok, sitk_version = import_status("SimpleITK")

    print(f"Python: {sys.version.split()[0]}")
    print(f"Platform: {platform.platform()}")
    print(f"Torch: {torch.__version__}")
    print(f"Selected device: {device}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"MPS available: {torch.backends.mps.is_available()}")
    print(f"NumPy: {np.__version__}")
    print(f"DiffDRR import: {diffdrr_ok} ({diffdrr_version})")
    print(f"SimpleITK import: {sitk_ok} ({sitk_version})")

    tensor = torch.tensor([1.0, 2.0, 3.0], device=device)
    result = (tensor * 2).sum().item()
    print(f"Tiny tensor check: {result:.1f}")

    if not diffdrr_ok or not sitk_ok:
        raise SystemExit("One or more required imports failed.")

    print("ML environment ready.")


if __name__ == "__main__":
    main()
