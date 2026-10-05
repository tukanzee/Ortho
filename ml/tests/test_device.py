from __future__ import annotations

import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from wrist_ml.device import get_device


def test_get_device_returns_torch_device() -> None:
    assert isinstance(get_device(), torch.device)
