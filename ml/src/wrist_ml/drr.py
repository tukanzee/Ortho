from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


def save_normalized_projection(projection: np.ndarray, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    image = projection.astype(np.float32)
    image -= float(image.min())

    maximum = float(image.max())
    if maximum > 0:
        image /= maximum

    Image.fromarray((image * 255).astype(np.uint8)).save(output_path)
