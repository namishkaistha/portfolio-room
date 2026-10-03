"""Cut each closet piece out of its photo with Segment Anything.

Usage: python segment_garments.py <photo dir of 900 x 1600 JPEGs> <mask dir>
Needs: pip install "rembg[cpu]" pillow numpy scipy
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

from pieces import PIECES, PREVIEW_WIDTH

SPECK_ITERATIONS = 3
GAP_ITERATIONS = 6
KEEP, DROP = 1, 0


def main(photo_dir, mask_dir):
    mask_dir.mkdir(parents=True, exist_ok=True)
    session = new_session("sam")
    for piece in PIECES:
        photo = Image.open(photo_dir / f"{piece.photo}.jpg").convert("RGB")
        raw = remove(photo, session=session, sam_prompt=prompts_for(piece, photo.width), only_mask=True)
        Image.fromarray(tidy(np.array(raw) > 127)).save(mask_dir / f"{piece.id}.png")
        print(f"{piece.id}: mask saved")


def prompts_for(piece, photo_width):
    scale = photo_width / PREVIEW_WIDTH
    labelled = [(point, KEEP) for point in piece.keep] + [(point, DROP) for point in piece.drop]
    return [{"type": "point", "data": [x * scale, y * scale], "label": label} for (x, y), label in labelled]


# Keeps the biggest region and fills the holes printed graphics leave behind.
def tidy(mask):
    mask = ndimage.binary_opening(mask, iterations=SPECK_ITERATIONS)
    regions, count = ndimage.label(mask)
    sizes = ndimage.sum(mask, regions, range(1, count + 1))
    mask = regions == 1 + int(np.argmax(sizes))
    mask = ndimage.binary_closing(mask, iterations=GAP_ITERATIONS)
    return (ndimage.binary_fill_holes(mask) * 255).astype(np.uint8)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
