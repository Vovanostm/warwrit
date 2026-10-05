# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["torch==2.9.0", "transformers==4.57.1", "pillow==11.3.0", "numpy==2.3.4"]
# ///
"""Offline depth assets; run with uv, never from the game/client build."""
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageFilter
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "assets/art/m1/places"
OUTPUT = ART / "depth-v1"
MODEL = "depth-anything/Depth-Anything-V2-Small-hf"
MODEL_REVISION = "5426e4f0f36572d16453bbda7a8389317b1bef99"
SOURCES = {
    "bereznyak": "settlements-v2/bereznyak-painting.png",
    "kamenny-brod": "settlements-v2/kamenny-brod-painting.png",
    "tikhaya-gat": "settlements-v2/tikhaya-gat-painting.png",
    "severny-dvor": "settlements-v2/severny-dvor-painting.png",
    "staraya-melnitsa": "staraya-melnitsa.png",
}


def main():
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    processor = AutoImageProcessor.from_pretrained(
        MODEL, revision=MODEL_REVISION, use_fast=False
    )
    model = AutoModelForDepthEstimation.from_pretrained(
        MODEL, revision=MODEL_REVISION
    ).to(device).eval()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, source in SOURCES.items():
        image = Image.open(ART / source).convert("RGB")
        image.thumbnail((768, 768), Image.Resampling.LANCZOS)
        inputs = processor(images=image, return_tensors="pt").to(device)
        with torch.inference_mode():
            prediction = model(**inputs)
        depth = processor.post_process_depth_estimation(
            prediction, target_sizes=[(image.height, image.width)]
        )[0]["predicted_depth"].cpu().numpy()
        low, high = np.percentile(depth, (1, 99))
        normalized = np.clip((depth - low) / max(high - low, 1e-6), 0, 1)
        # Near=white. Remove tiny texture bumps while retaining architectural slopes.
        result = Image.fromarray((normalized * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(0.6)
        )
        result.save(OUTPUT / f"{name}.png")
        print(f"Prepared {name}: {result.width}x{result.height} ({device})", flush=True)
    provenance = {
        "operation": "offline monocular depth estimation; near is white",
        "model": MODEL,
        "modelRevision": model.config._commit_hash,
        "modelLicense": "Apache-2.0 (Depth Anything V2 Small)",
        "script": "scripts/prepare-place-depth.py",
        "normalization": "1st/99th percentiles, clipped to [0,1], 8-bit grayscale, Gaussian radius 0.6",
        "sources": {
            f"assets/art/m1/places/depth-v1/{name}.png": f"assets/art/m1/places/{source}"
            for name, source in SOURCES.items()
        },
        "status": "derived render data; does not alter source art or canonical geography",
    }
    (OUTPUT / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")


if __name__ == "__main__":
    main()
