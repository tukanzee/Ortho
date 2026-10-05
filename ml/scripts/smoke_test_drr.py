from __future__ import annotations

import inspect
import sys
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from wrist_ml.device import get_device
from wrist_ml.drr import save_normalized_projection
from wrist_ml.paths import OUTPUTS_DIR


def render_projection(device: torch.device) -> tuple[np.ndarray, str]:
    # Importing DiffDRR here makes check_environment.py the faster import smoke test.
    from diffdrr.data import load_example_ct
    from diffdrr.drr import DRR

    # Keep a direct reference to the installed module in the traceback if imports
    # ever fail on a developer machine.
    _ = inspect.getmodule(DRR)

    subject = load_example_ct()

    try:
        drr = DRR(
            subject,
            sdd=1020.0,
            height=128,
            delx=4.0,
            renderer="trilinear",
        ).to(device)
        rotations = torch.tensor([[0.0, 0.0, 0.0]], device=device)
        translations = torch.tensor([[0.0, 850.0, 0.0]], device=device)
        projection = drr(
            rotations,
            translations,
            parameterization="euler_angles",
            convention="ZYX",
        )
        return projection.squeeze().detach().cpu().numpy(), str(device)
    except Exception as error:
        if device.type != "cpu":
            print(f"DRR smoke test fell back to CPU from {device}: {error}")
            return render_projection(torch.device("cpu"))

        raise


def main() -> None:
    device = get_device()
    projection, render_device = render_projection(device)
    output_path = OUTPUTS_DIR / "drr_smoke_test.png"
    save_normalized_projection(projection, output_path)

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise SystemExit("DRR smoke-test output was not created.")

    print(f"DRR smoke test rendered on: {render_device}")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
