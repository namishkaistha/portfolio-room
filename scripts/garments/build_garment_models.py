"""Turn each cut-out closet photo into a puffy, double-sided 3D model (.glb).

The garment's outline becomes a cloth "pillow": thin at the seams, fuller in the
middle, with soft folds read from the photo's shading. The front wears the photo;
the back wears the same fabric with large prints smoothed away.

Usage: python build_garment_models.py <photo dir> <mask dir> <output dir>
Needs: pip install pillow numpy scipy opencv-python-headless
"""
import io
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

from glb import write_glb
from pieces import PIECES, PREVIEW_WIDTH

TEXTURE_HEIGHT = 1024
GRID_ROWS = 120
CROP_PADDING = 6
MIRROR_REACH = 0.45
EDGE_SOFTNESS = 2.5
SILHOUETTE_LEVEL = 0.5
SNAP_STEPS = 12
SNAP_RATE = 0.7
PUFF_RADIUS = 0.07
PUFF_HEIGHT = 0.045
FOLD_BLUR = 7
FOLD_DEPTH = 0.012
FOLD_CLAMP = 2.5
BACK_DEPTH_RATIO = 0.75
BACK_PRINT_BLUR = 61
BACK_GRAIN_BLUR = 2
BACK_GRAIN_LIMIT = 14
BACK_SHADE = 0.86
JPEG_QUALITY = 84


def main(photo_dir, mask_dir, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    for piece in PIECES:
        photo, mask = load_cutout(piece, photo_dir, mask_dir)
        photo, mask = fit_to_texture(photo, mask)
        mesh = build_mesh(photo, mask, piece.height_metres)
        write_glb(out_dir / f"{piece.id}.glb", piece.id, mesh, encode_jpeg(texture_atlas(photo, mask)))
        print(f"{piece.id}: {len(mesh['positions'])} vertices")


def load_cutout(piece, photo_dir, mask_dir):
    photo = np.array(Image.open(photo_dir / f"{piece.photo}.jpg").convert("RGB"))
    mask = np.array(Image.open(mask_dir / f"{piece.id}.png")) > 127
    if piece.mirror_axis_x is not None:
        photo, mask = rebuild_hidden_side(photo, mask, piece.mirror_axis_x * photo.shape[1] / PREVIEW_WIDTH)
    rows, columns = np.where(mask)
    top, left = max(rows.min() - CROP_PADDING, 0), max(columns.min() - CROP_PADDING, 0)
    bottom, right = rows.max() + CROP_PADDING, columns.max() + CROP_PADDING
    return photo[top:bottom, left:right], mask[top:bottom, left:right]


def rebuild_hidden_side(photo, mask, axis_x):
    mirrored_columns = np.clip(np.round(2 * axis_x - np.arange(photo.shape[1])).astype(int), 0, photo.shape[1] - 1)
    upper = np.zeros_like(mask)
    upper[: int(mask.shape[0] * MIRROR_REACH)] = True
    missing = mask[:, mirrored_columns] & ~mask & upper
    photo = np.where(missing[..., None], photo[:, mirrored_columns], photo)
    return photo, ndimage.binary_fill_holes(mask | missing)


def fit_to_texture(photo, mask):
    width = int(round(photo.shape[1] * TEXTURE_HEIGHT / photo.shape[0]))
    photo = cv2.resize(photo, (width, TEXTURE_HEIGHT), interpolation=cv2.INTER_AREA)
    mask = cv2.resize(mask.astype(np.uint8) * 255, (width, TEXTURE_HEIGHT), interpolation=cv2.INTER_LINEAR) > 127
    return photo, mask


def texture_atlas(photo, mask):
    front = bleed_into_background(photo, mask)
    return np.concatenate([front, back_of(front)], axis=1)


# Edge texels take the nearest garment colour so the bed never shows at the seams.
def bleed_into_background(photo, mask):
    _, (rows, columns) = ndimage.distance_transform_edt(~mask, return_indices=True)
    return photo[rows, columns]


def back_of(front):
    fabric = cv2.medianBlur(front, BACK_PRINT_BLUR).astype(float)
    grain = front.astype(float) - cv2.GaussianBlur(front, (0, 0), BACK_GRAIN_BLUR).astype(float)
    return np.clip(fabric * BACK_SHADE + np.clip(grain, -BACK_GRAIN_LIMIT, BACK_GRAIN_LIMIT), 0, 255).astype(np.uint8)


def build_mesh(photo, mask, height_metres):
    height, width = mask.shape
    silhouette = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), EDGE_SOFTNESS)
    grid = surface_grid(silhouette)
    x, y = grid["x"][grid["used"]], grid["y"][grid["used"]]
    depth = sample(surface_depth(photo, mask), x, y)
    depth[grid["outline"][grid["used"]]] = 0
    triangles = grid_triangles(grid)
    scale = height_metres / height
    front = np.stack([(x - width / 2) * scale, (height / 2 - y) * scale, depth * scale], 1)
    back = front * [1, 1, -BACK_DEPTH_RATIO]
    u, v = x / (2 * width), y / height
    positions = np.concatenate([front, back]).astype(np.float32)
    indices = np.concatenate([triangles, triangles[:, ::-1] + len(front)]).astype(np.uint32)
    return {
        "positions": positions,
        "normals": vertex_normals(positions, indices),
        "uvs": np.concatenate([np.stack([u, v], 1), np.stack([u + 0.5, v], 1)]).astype(np.float32),
        "indices": indices,
    }


def surface_grid(silhouette):
    height, width = silhouette.shape
    step = height / GRID_ROWS
    x, y = np.meshgrid(np.linspace(0, width - 1, int(width / step) + 1), np.linspace(0, height - 1, GRID_ROWS + 1))
    inside = sample(silhouette, x, y) > SILHOUETTE_LEVEL
    cells = inside[:-1, :-1] | inside[1:, :-1] | inside[:-1, 1:] | inside[1:, 1:]
    used = np.zeros_like(inside)
    for rows, columns in [(slice(None, -1), slice(None, -1)), (slice(1, None), slice(None, -1)), (slice(None, -1), slice(1, None)), (slice(1, None), slice(1, None))]:
        used[rows, columns] |= cells
    outline = used & ~inside
    x, y = snap_to_silhouette(silhouette, x, y, outline)
    index = -np.ones(inside.shape, int)
    index[used] = np.arange(used.sum())
    return {"x": x, "y": y, "used": used, "outline": outline, "cells": cells, "index": index}


# Newton steps slide the outer ring of grid points onto the smooth outline, so
# the edge follows the garment instead of stair-stepping along the grid.
def snap_to_silhouette(silhouette, x, y, outline):
    slope_y, slope_x = np.gradient(silhouette)
    height, width = silhouette.shape
    for _ in range(SNAP_STEPS):
        offset = sample(silhouette, x, y) - SILHOUETTE_LEVEL
        gx, gy = sample(slope_x, x, y), sample(slope_y, x, y)
        stride = offset / (gx ** 2 + gy ** 2 + 1e-6) * SNAP_RATE
        x = np.clip(np.where(outline, x - stride * gx, x), 0, width - 1)
        y = np.clip(np.where(outline, y - stride * gy, y), 0, height - 1)
    return x, y


def surface_depth(photo, mask):
    size = min(mask.shape)
    reach = np.clip(ndimage.distance_transform_edt(mask) / (PUFF_RADIUS * size), 0, 1)
    puff = PUFF_HEIGHT * size * np.sqrt(reach * (2 - reach))
    shading = cv2.GaussianBlur(cv2.cvtColor(photo, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), FOLD_BLUR)
    folds = np.clip((shading - shading[mask].mean()) / (shading[mask].std() + 1e-6), -FOLD_CLAMP, FOLD_CLAMP)
    return puff + folds * FOLD_DEPTH * size * reach


def grid_triangles(grid):
    index = grid["index"]
    rows, columns = np.where(grid["cells"])
    top_left, top_right = index[rows, columns], index[rows, columns + 1]
    bottom_left, bottom_right = index[rows + 1, columns], index[rows + 1, columns + 1]
    first = np.stack([top_left, bottom_left, top_right], 1)
    second = np.stack([top_right, bottom_left, bottom_right], 1)
    return np.concatenate([first, second])


def vertex_normals(positions, indices):
    corners = positions[indices]
    face_normals = np.cross(corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0])
    normals = np.zeros_like(positions)
    for corner in range(3):
        np.add.at(normals, indices[:, corner], face_normals)
    return (normals / (np.linalg.norm(normals, axis=1, keepdims=True) + 1e-9)).astype(np.float32)


def sample(image, x, y):
    rows = np.clip(np.round(y).astype(int), 0, image.shape[0] - 1)
    columns = np.clip(np.round(x).astype(int), 0, image.shape[1] - 1)
    return image[rows, columns]


def encode_jpeg(pixels):
    buffer = io.BytesIO()
    Image.fromarray(pixels).save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return buffer.getvalue()


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
