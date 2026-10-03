"""The closet pieces and how to find each one in its photo.

Prompt points are (x, y) in a 450 x 800 preview of the photo: `keep` points sit
on the garment, `drop` points on whatever lies next to or over it.
"""
from dataclasses import dataclass, field

PREVIEW_WIDTH = 450


@dataclass(frozen=True)
class Piece:
    id: str
    photo: str
    height_metres: float
    keep: list = field(default_factory=list)
    drop: list = field(default_factory=list)
    # A hoodie covers the vest's left shoulder, so that side is rebuilt from the right.
    mirror_axis_x: int | None = None


PIECES = [
    Piece("brown-corduroy", "IMG_7226", 1.0,
          keep=[(150, 250), (380, 350), (200, 450), (110, 550), (230, 150), (330, 520)],
          drop=[(200, 30), (425, 450), (170, 690), (255, 430), (30, 400)]),
    Piece("uncle-jeans", "IMG_7227", 1.0,
          keep=[(250, 200), (100, 400), (380, 400), (300, 550), (80, 550)],
          drop=[(200, 40), (250, 420), (240, 690), (420, 90)]),
    Piece("striped-button-down", "IMG_7228", 0.78,
          keep=[(250, 350), (260, 500), (150, 450), (400, 350), (40, 450), (300, 200)],
          drop=[(200, 720), (150, 50), (420, 680), (430, 180)]),
    Piece("nu-rose-bowl", "IMG_7229", 0.7,
          keep=[(225, 300), (225, 500), (60, 400), (400, 400), (230, 600), (330, 280)],
          drop=[(240, 175), (100, 720), (425, 520), (30, 60)]),
    Piece("brown-trousers", "IMG_7230", 1.0,
          keep=[(150, 250), (330, 300), (100, 500), (320, 550), (120, 600), (380, 450)],
          drop=[(250, 30), (230, 710), (440, 300), (20, 560)]),
    Piece("prince-vest", "IMG_7231", 0.68,
          keep=[(250, 450), (150, 400), (350, 500), (320, 250), (260, 600), (100, 550)],
          drop=[(100, 150), (80, 260), (300, 40), (410, 250), (200, 750)],
          mirror_axis_x=223),
    Piece("urban-indian", "IMG_7232", 0.68,
          keep=[(220, 350), (220, 500), (80, 350), (380, 380), (340, 550)],
          drop=[(100, 700), (300, 100), (230, 180), (30, 600)]),
]
