"""
Pasar Pagi — generator latar minimarket (16-bit pixel art).

Kanvas 640x360 (sama seperti farm-bg.png), Phaser men-scale 2x.
Geometri mengikuti MinimarketScene.ts supaya logika pelanggan tidak berubah:

    ROOM      game (40,120,1200,560)   -> art (20,60,600,280)
    RAK       220x140 di (90,256) (380,256) (90,428) (380,428)
              -> art 110x70 di (45,128) (190,128) (45,214) (190,214)
    KASIR     game (798,216,364,76)    -> art (399,108,182,38)
    PINTU     game (1010,620,150,48)   -> art (505,310,75,24)
    KASIR PAD game (916,140,128,56)    -> art (458,70,64,28)
    KARPET    game (916,304,128,112)   -> art (458,152,64,56)

Jalankan:  python scripts/gen_market_assets.py
Output:    web/public/assets/pixel/market-bg.png
           docs/minimarket-v2-preview.png  (2x, untuk review)
"""

import os
import random

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)

W, H = 640, 360

# ── Palet ─────────────────────────────────────────────────────────────────────
FLOOR = "#DCC59B"
FLOOR_L = "#E6D2AB"
FLOOR_D = "#CEB387"
GROUT = "#B08A5E"

WALL = "#8A5A34"
WALL_L = "#9E6B3E"
WALL_D = "#6B4322"
WALL_XD = "#3F2210"

BEAM = "#5B3418"
BEAM_L = "#8A5A34"

WOOD = "#6B3F1E"
WOOD_L = "#8B5A2F"
WOOD_XL = "#A97A4A"
WOOD_D = "#3A1D0C"
WOOD_XD = "#241408"

IRON = "#4E4C48"
IRON_L = "#7A7770"

CRATE = "#A9784A"
CRATE_L = "#C49A6A"
CRATE_D = "#6B4522"

BASKET = "#C09468"
BASKET_L = "#D8B183"
BASKET_D = "#8A6236"

PAPER = "#FBF3DE"
PAPER_D = "#E0CDA6"
TEXT = "#2B1D0E"

BLUE = "#5A8FD6"
GLASS = "#D6EEF5"
GLASS_D = "#A9D4E0"
GREEN = "#3E7A46"
GREEN_L = "#5DA867"
GREEN_D = "#2A5530"

LEAF_D = "#25502A"
LEAF = "#2F6B33"
LEAF_L = "#56A344"
LEAF_H = "#74BE55"

SACK = "#C2A075"
SACK_D = "#96754C"

DARK = "#241408"


# ── Font 5x7 ──────────────────────────────────────────────────────────────────
FONT = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10011", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "W": ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10011", "10101", "10101", "10101", "11001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
    "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}


def text_w(s, scale=1):
    return (len(s) * 6 - 1) * scale


def draw_text(d, x, y, s, color=TEXT, scale=1):
    cx = x
    for ch in s.upper():
        g = FONT.get(ch)
        if g is None:
            cx += 6 * scale
            continue
        for ry, row in enumerate(g):
            for rx, bit in enumerate(row):
                if bit == "1":
                    d.rectangle(
                        [cx + rx * scale, y + ry * scale,
                         cx + rx * scale + scale - 1, y + ry * scale + scale - 1],
                        fill=color,
                    )
        cx += 6 * scale
    return cx


def rect(d, x, y, w, h, c):
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def bevel_box(d, x, y, w, h, body, light, dark, outline=WOOD_XD, t=2):
    rect(d, x, y, w, h, outline)
    rect(d, x + t, y + t, w - 2 * t, h - 2 * t, body)
    rect(d, x + t, y + t, w - 2 * t, 2, light)
    rect(d, x + t, y + t, 2, h - 2 * t, light)
    rect(d, x + t, y + h - t - 2, w - 2 * t, 2, dark)
    rect(d, x + w - t - 2, y + t, 2, h - 2 * t, dark)


# ── Lantai ────────────────────────────────────────────────────────────────────
def draw_floor(d, rng):
    rect(d, 0, 0, W, H, FLOOR)
    T = 20
    for ty in range(0, H, T):
        for tx in range(0, W, T):
            base = FLOOR_L if ((tx // T) + (ty // T)) % 2 == 0 else FLOOR
            rect(d, tx, ty, T, T, base)
            # grout kanan-bawah
            d.line([(tx + T - 1, ty), (tx + T - 1, ty + T - 1)], fill=GROUT)
            d.line([(tx, ty + T - 1), (tx + T - 1, ty + T - 1)], fill=GROUT)
            # grout tipis (tanpa kilau terang supaya tidak jadi quilt)
            d.line([(tx, ty), (tx + T - 2, ty)], fill="#CDB186")
    for _ in range(700):
        x, y = rng.randrange(W), rng.randrange(H)
        d.point((x, y), fill=rng.choice([FLOOR_D, FLOOR_L]))


# ── Dinding ───────────────────────────────────────────────────────────────────
def draw_wall_panel(d, x, y, w, h, rng, base=WALL, light=WALL_L, dark=WALL_D, gap=22):
    rect(d, x, y, w, h, base)
    for px in range(x, x + w, gap):
        d.line([(px, y), (px, y + h - 1)], fill=dark)
        d.line([(px + 1, y), (px + 1, y + h - 1)], fill=light)
    for _ in range(int(w * h / 26)):
        sx, sy = rng.randrange(x, x + w), rng.randrange(y, y + h)
        d.line([(sx, sy), (sx + rng.randrange(2, 6), sy)], fill=dark)


def draw_walls(d, rng):
    # dinding atas
    draw_wall_panel(d, 0, 0, W, 48, rng)
    # rail kayu
    rect(d, 0, 44, W, 5, BEAM_L)
    rect(d, 0, 44, W, 1, "#C09A6A")
    rect(d, 0, 48, W, 6, BEAM)
    rect(d, 0, 52, W, 2, WALL_XD)

    # dinding samping
    draw_wall_panel(d, 0, 0, 20, H, rng, WALL_D, WALL, WALL_XD, gap=22)
    draw_wall_panel(d, W - 20, 0, 20, H, rng, WALL_D, WALL, WALL_XD, gap=22)
    rect(d, 19, 0, 1, H, WALL_XD)
    rect(d, W - 20, 0, 1, H, WALL_XD)

    # (dinding coklat tambahan di belakang meja kasir dihapus — sekarang lantai,
    #  dipakai untuk karpet area kasir)

    # dinding depan bawah (y 340..360)
    rect(d, 0, 340, W, 20, BEAM)
    rect(d, 0, 340, W, 3, BEAM_L)
    rect(d, 0, 356, W, 4, WALL_XD)
    for x in range(0, W, 26):
        d.line([(x, 343), (x, 355)], fill=WALL_XD)


def draw_wall_decor(d):
    # pigura kecil di dinding kiri atas
    for (x, y, w, h, sky, hill) in [
        (56, 12, 34, 26, "#8FB6D8", "#4E7A3C"),
        (100, 16, 28, 22, "#E5C98A", "#8A5A34"),
    ]:
        rect(d, x, y, w, h, WOOD_XD)
        rect(d, x + 1, y + 1, w - 2, h - 2, WOOD_L)
        ix, iy, iw, ih = x + 3, y + 3, w - 6, h - 6
        rect(d, ix, iy, iw, ih, sky)
        # bukit
        for i in range(iw):
            hh = int(ih * 0.45 + (i % 5) - 2)
            d.line([(ix + i, iy + ih - 1), (ix + i, iy + ih - hh)], fill=hill)
        d.rectangle([ix + 2, iy + 2, ix + 4, iy + 4], fill="#FFF3C4")  # matahari
        rect(d, ix, iy + ih - 2, iw, 2, "#3E5E2E")
    # rak gantung dengan toples
    x, y, w = 200, 20, 62
    rect(d, x, y + 20, w, 4, BEAM)
    rect(d, x, y + 20, w, 1, "#C09A6A")
    for i in range(3):
        jx = x + 6 + i * 19
        rect(d, jx, y + 9, 13, 11, "#4A6B52")      # isi toples
        rect(d, jx + 1, y + 9, 11, 11, "#6E9C78")
        rect(d, jx + 2, y + 10, 3, 4, "#A9C9A4")   # kilau kaca
        rect(d, jx, y + 7, 13, 2, "#C9A227")       # tutup
        rect(d, jx + 1, y + 6, 11, 1, "#E5C25A")

    # rak gantung di dinding kanan-belakang area kasir
    draw_wall_shelf(d, 550, 26)


def draw_wall_shelf(d, x, y):
    """Rak dinding gantung: papan kayu + tanaman pot kecil + 2 toples. y = atas papan."""
    w = 58
    # penyangga
    for bx in (x + 5, x + w - 11):
        rect(d, bx, y + 3, 3, 5, WOOD_D)
        rect(d, bx + 1, y + 3, 1, 4, WOOD_L)
    # papan
    rect(d, x, y, w, 3, WOOD_D)
    rect(d, x, y, w, 1, WOOD_L)
    rect(d, x, y + 2, w, 1, "#2A1608")

    # tanaman pot kecil (kiri)
    draw_plant(d, x + 13, y, 1)

    # dua toples kaca berisi (kanan)
    for jx in (x + 32, x + 44):
        rect(d, jx, y - 8, 10, 8, "#4A6B52")
        rect(d, jx + 1, y - 8, 8, 8, "#6E9C78")
        rect(d, jx + 2, y - 7, 2, 3, "#A9C9A4")
        rect(d, jx, y - 10, 10, 2, "#C9A227")
        rect(d, jx + 1, y - 11, 8, 1, "#E5C25A")


# ── Rak ───────────────────────────────────────────────────────────────────────
def draw_shelf(d, x, y, w=100, h=75):
    """Rak kosong 3 tingkat: rangka besi gelap + 3 papan kayu.

    Tidak ada peti/keranjang/buah — buah digambar runtime oleh Phaser
    sesuai stok rak (0/9 .. 9/9).
    """
    # ── rangka besi ──
    rect(d, x, y, w, h, "#15130F")
    rect(d, x + 1, y + 1, w - 2, h - 2, "#3B3733")
    rect(d, x + 2, y + 2, w - 4, h - 4, "#5A544B")
    rect(d, x + 3, y + 3, w - 6, h - 6, "#2A2521")
    # kilau logam (kiri-atas)
    rect(d, x + 1, y + 1, w - 2, 1, "#7A7368")
    rect(d, x + 1, y + 1, 1, h - 2, "#7A7368")
    rect(d, x + 2, y + 2, w - 4, 1, "#6A6459")
    # sisi gelap (kanan-bawah)
    rect(d, x + 1, y + h - 2, w - 2, 1, "#0C0B09")
    rect(d, x + w - 2, y + 1, 1, h - 2, "#0C0B09")
    # sambungan sudut
    for (cx, cy) in [(x + 2, y + 2), (x + w - 6, y + 2), (x + 2, y + h - 6), (x + w - 6, y + h - 6)]:
        rect(d, cx, cy, 4, 4, "#3B3733")
        d.point((cx + 1, cy + 1), fill="#8A8378")

    # ── panel belakang kayu ──
    rect(d, x + 4, y + 4, w - 8, h - 8, "#5E3A1C")
    for yy in range(y + 6, y + h - 5, 7):
        d.line([(x + 5, yy), (x + w - 6, yy)], fill="#6B4322")
        d.line([(x + 5, yy + 1), (x + w - 6, yy + 1)], fill="#4A2A12")

    # ── 3 papan kayu ──
    for t in range(3):
        by = y + 18 + t * 22
        # bayangan di bawah papan
        rect(d, x + 4, by + 6, w - 8, 1, "#2A1608")
        # muka depan papan
        rect(d, x + 4, by + 2, w - 8, 4, "#7A4A22")
        rect(d, x + 4, by + 5, w - 8, 1, "#5A3418")
        # permukaan atas papan
        rect(d, x + 4, by, w - 8, 2, "#B8874F")
        rect(d, x + 4, by, w - 8, 1, "#D2A36B")
        # ujung papan menonjol sedikit
        rect(d, x + 4, by, 1, 6, "#3A1D0C")
        rect(d, x + w - 5, by, 1, 6, "#3A1D0C")


def draw_price_tag(d, cx, y, label, dot_color):
    """Tag kertas di tengah atas rak, sedikit menimpa rangka (seperti referensi)."""
    w = text_w(label) + 20
    h = 12
    x = int(cx - w / 2)
    # bayangan tag
    rect(d, x + 1, y + 1, w, h, "#00000022")
    rect(d, x, y, w, h, WOOD_XD)
    rect(d, x + 1, y + 1, w - 2, h - 2, PAPER)
    rect(d, x + 1, y + h - 2, w - 2, 1, PAPER_D)
    # paku di tengah atas
    rect(d, x + w // 2 - 1, y, 3, 2, "#8A8A8A")
    d.point((x + w // 2, y), fill="#C9C9C9")
    # titik warna tanaman
    d.rectangle([x + 3, y + 4, x + 5, y + 6], fill=dot_color)
    d.point((x + 3, y + 4), fill=DARK)
    draw_text(d, x + 9, y + 3, label)


# ── Kasir ─────────────────────────────────────────────────────────────────────
def draw_counter(d):
    """Meja kasir: muka kayu, permukaan terang, tiang di dua ujung."""
    x, y, w, h = 399, 108, 182, 38

    # ── tiang kayu di ujung kiri & kanan (lebih tinggi dari meja) ──
    for tx in (x, x + w - 18):
        rect(d, tx, y - 10, 18, h + 10, WALL_XD)
        rect(d, tx + 1, y - 9, 16, h + 8, WOOD)
        rect(d, tx + 1, y - 9, 16, 3, WOOD_XL)
        rect(d, tx + 1, y - 9, 2, h + 8, WOOD_L)

    # ── badan meja ──
    rect(d, x + 16, y, w - 32, h, WALL_XD)
    rect(d, x + 17, y + 1, w - 34, h - 2, WOOD)
    # permukaan atas (terang)
    rect(d, x + 17, y + 1, w - 34, 12, WOOD_XL)
    rect(d, x + 17, y + 1, w - 34, 2, "#C39A6B")
    rect(d, x + 17, y + 12, w - 34, 2, WOOD_D)
    # muka depan + papan
    for i in range(5):
        px = x + 26 + i * 27
        d.line([(px, y + 15), (px, y + h - 4)], fill=WOOD_D)
        d.line([(px + 1, y + 15), (px + 1, y + h - 4)], fill=WOOD_L)
    rect(d, x + 17, y + h - 4, w - 34, 2, "#2A1608")

    # ── monitor ──
    mx, my = 424, 90
    rect(d, mx, my, 30, 17, "#3F4A52")
    rect(d, mx + 1, my + 1, 28, 15, "#8EA6B4")
    rect(d, mx + 4, my + 4, 18, 9, "#CFEAF2")
    rect(d, mx + 4, my + 4, 18, 2, "#EDF7FB")
    rect(d, mx + 23, my + 5, 3, 3, "#5A6E7A")
    rect(d, mx + 23, my + 10, 3, 3, "#5A6E7A")
    rect(d, mx + 12, my + 17, 7, 2, "#3F4A52")
    rect(d, mx + 7, my + 19, 17, 1, "#2A333A")

    # ── scanner barcode ──
    sx, sy = 472, 102
    rect(d, sx, sy, 14, 6, "#2E2E2E")
    rect(d, sx + 1, sy + 1, 12, 2, "#5E5E5E")
    rect(d, sx + 5, sy + 3, 4, 2, "#C94F4F")

    # ── mesin kasir ──
    rx, ry = 516, 91
    rect(d, rx, ry, 32, 15, "#3F4A52")
    rect(d, rx + 1, ry + 1, 30, 13, "#6C7F93")
    rect(d, rx + 2, ry + 2, 16, 5, "#CFEAF2")
    for i in range(4):
        for j in range(2):
            d.point((rx + 4 + i * 4, ry + 9 + j * 3), fill="#2F3B4A")
    rect(d, rx + 20, ry + 2, 10, 8, "#8EA6B4")
    for i in range(2):
        for j in range(2):
            d.point((rx + 22 + i * 4, ry + 4 + j * 3), fill="#3F4A52")


def draw_kasir_sign(d):
    """Papan kayu 'CASHIER' ditempel di muka depan meja, di tengah."""
    label = "CASHIER"
    scale = 1.7          # ~15% lebih kecil dari skala 2 sebelumnya
    tw = text_w(label, scale)
    w = int(tw + 12)
    h = 18
    x = 490 - w // 2
    y = 123

    # bayangan tipis di bawah papan
    rect(d, x + 2, y + 2, w, h, "#5A3A1C")
    # papan
    rect(d, x, y, w, h, "#2A1608")
    rect(d, x + 1, y + 1, w - 2, h - 2, WOOD_L)
    rect(d, x + 1, y + 1, w - 2, 2, WOOD_XL)
    rect(d, x + 1, y + h - 3, w - 2, 2, WOOD_D)
    # paku di dua sudut
    d.point((x + 3, y + 3), fill="#2A1608")
    d.point((x + w - 4, y + 3), fill="#2A1608")
    draw_text(d, x + 6, y + 3, label, "#241408", scale)


def dashed_rect(d, x, y, w, h, color, dash=3, gap=2):
    for xx in range(x, x + w):
        if ((xx - x) // dash) % 2 == 0:
            d.point((xx, y), fill=color)
            d.point((xx, y + h - 1), fill=color)
    for yy in range(y, y + h):
        if ((yy - y) // dash) % 2 == 0:
            d.point((x, yy), fill=color)
            d.point((x + w - 1, yy), fill=color)


PAD = "#46604A"
PAD_L = "#54705A"
PAD_D = "#2A3C2E"
PAD_SHADOW = "#BFA378"


def _mat(d, x, y, w, h, col):
    """Kotak dengan sudut dipotong 2px — supaya terbaca sebagai karpet, bukan papan."""
    rect(d, x + 2, y, w - 4, h, col)
    rect(d, x + 1, y + 1, w - 2, h - 2, col)
    rect(d, x, y + 2, w, h - 4, col)


def draw_zones(d):
    """Karpet hijau area kasir — tempat pemain berdiri, di BELAKANG meja."""
    x, y, w, h = 458, 70, 64, 28

    # bayangan di lantai supaya karpet terlihat menempel lantai
    _mat(d, x + 2, y + 3, w, h, PAD_SHADOW)
    # tepi gelap + badan
    _mat(d, x, y, w, h, PAD_D)
    _mat(d, x + 2, y + 2, w - 4, h - 4, PAD)
    # anyaman karpet
    for yy in range(y + 4, y + h - 3, 4):
        for xx in range(x + 4, x + w - 3, 4):
            if ((xx - x) // 4 + (yy - y) // 4) % 2 == 0:
                rect(d, xx, yy, min(4, x + w - 3 - xx), min(4, y + h - 3 - yy), PAD_L)





CARPET = "#A8302C"
CARPET_L = "#C2433C"
CARPET_D = "#7A1F1C"
ROPE = "#8F2320"
STEEL = "#9AA0A6"
STEEL_D = "#5F666C"


def draw_queue_lane(d):
    """Karpet merah 'QUEUE' besar + tiang penyangga tali di dua sisi."""
    cx = 490
    x0, x1 = cx - 32, cx + 32
    top, bot = 152, 208

    # karpet
    rect(d, x0, top, x1 - x0, bot - top, CARPET_D)
    rect(d, x0 + 2, top + 1, x1 - x0 - 4, bot - top - 1, CARPET)
    for yy in range(top + 1, bot, 6):
        d.line([(x0 + 2, yy), (x1 - 3, yy)], fill=CARPET_L)
    # tepi kiri-kanan lebih gelap
    for xx in (x0, x0 + 1, x1 - 2, x1 - 1):
        d.line([(xx, top), (xx, bot - 1)], fill=CARPET_D)
    # tulisan QUEUE
    tw = text_w("QUEUE", 2)
    draw_text(d, cx - tw // 2, top + 8, "QUEUE", "#F6EFE2", 2)

    # tiang + tali
    for px_ in (x0 - 12, x1 + 8):
        for py_ in (top + 2, bot - 12):
            # tiang
            rect(d, px_ + 1, py_ + 3, 3, 9, STEEL_D)
            rect(d, px_ + 2, py_ + 3, 1, 9, STEEL)
            # bola atas
            rect(d, px_, py_, 5, 4, STEEL_D)
            rect(d, px_ + 1, py_ + 1, 3, 2, STEEL)
            # alas
            rect(d, px_, py_ + 11, 5, 2, STEEL_D)
        # tali menyambung antar dua tiang (sedikit lendut ke luar)
        y_a, y_b = top + 6, bot - 14
        side = -1 if px_ < cx else 1
        for yy in range(y_a, y_b + 1):
            t = (yy - y_a) / max(1, (y_b - y_a))
            bow = int(2 * (1 - (2 * t - 1) ** 2))
            d.point((px_ + 2 + side * bow, yy), fill=ROPE)


def draw_door(d):
    # digeser ke kiri supaya sejajar dengan karpet QUEUE (x kanvas 980)
    x, y, w, h = 452, 288, 75, 52

    # kusen hijau
    rect(d, x, y, w, h, WOOD_XD)
    rect(d, x + 1, y + 1, w - 2, h - 2, GREEN_D)
    rect(d, x + 2, y + 2, w - 4, h - 4, GREEN)
    rect(d, x + 2, y + 2, w - 4, 2, GREEN_L)
    # kaca
    rect(d, x + 6, y + 6, w - 12, h - 12, GLASS)
    rect(d, x + 6, y + 6, w - 12, 3, "#EFFBFD")
    rect(d, x + 6, y + h - 12, w - 12, 3, GLASS_D)
    # refleksi diagonal
    for i in range(10):
        d.point((x + 12 + i, y + 12 + i), fill="#FFFFFF")
        d.point((x + 13 + i, y + 12 + i), fill="#EAF7FA")
    # garis tengah pintu geser
    d.line([(x + w // 2, y + 4), (x + w // 2, y + h - 5)], fill=GREEN)
    rect(d, x + w // 2 - 6, y + 20, 2, 9, "#8FA9B4")
    rect(d, x + w // 2 + 4, y + 20, 2, 9, "#8FA9B4")

    # papan kecil "ENTRY" — nempel di atas pintu, di dalam, tengah
    label = "ENTRY"
    tw = text_w(label)
    pw_, ph_ = tw + 8, 11
    px_ = x + w // 2 - pw_ // 2
    py_ = y + 4
    rect(d, px_, py_, pw_, ph_, WOOD_XD)
    rect(d, px_ + 1, py_ + 1, pw_ - 2, ph_ - 2, PAPER)
    rect(d, px_ + 1, py_ + 1, pw_ - 2, 1, "#FFFFFF")
    draw_text(d, px_ + 4, py_ + 2, label, TEXT)

    # panah masuk
    draw_arrow(d, x + 18, y + 26, 1)
    draw_arrow(d, x + w - 26, y + 26, -1)


def draw_arrow(d, x, y, dirx):
    for i in range(5):
        d.point((x + dirx * i, y), fill=BLUE)
    for i in range(1, 3):
        d.point((x + dirx * i, y - i), fill=BLUE)
        d.point((x + dirx * i, y + i), fill=BLUE)


# ── Dekorasi ──────────────────────────────────────────────────────────────────
def draw_plant(d, x, y, s=1):
    pw, ph = 12 * s, 9 * s
    # outline gelap supaya pot tetap terbaca di dinding kayu
    rect(d, x - pw // 2 - 1, y - ph - 1, pw + 2, ph + 1, "#2A1608")
    rect(d, x - pw // 2, y - ph, pw, ph, "#8A4B2A")
    rect(d, x - pw // 2, y - ph, pw, 2, "#A85F35")
    rect(d, x - pw // 2, y - 2, pw, 2, "#5E2F18")
    for (dx, dy, c) in [(-5, -14, LEAF_D), (0, -19, LEAF), (5, -14, LEAF_L),
                        (-3, -9, LEAF_L), (3, -9, LEAF), (0, -12, LEAF_H)]:
        rect(d, x + dx * s - s, y - ph + dy * s, 4 * s, 5 * s, c)
    rect(d, x - s, y - ph - 15 * s, 2 * s, 3 * s, LEAF_H)


def draw_sack(d, x, y):
    """Karung goni: badan menggembung (sudut dipotong), leher terikat. y = alas."""
    # badan
    _mat(d, x - 8, y - 15, 16, 15, SACK_D)
    _mat(d, x - 7, y - 14, 14, 13, SACK)
    # sisi kanan lebih gelap (volume)
    rect(d, x + 3, y - 13, 4, 11, "#B08C5F")
    # kilau atas
    rect(d, x - 6, y - 14, 12, 2, "#D9BE97")
    # lipatan bawah
    rect(d, x - 6, y - 4, 12, 1, SACK_D)
    # leher + ikatan
    rect(d, x - 3, y - 19, 6, 5, SACK_D)
    rect(d, x - 2, y - 19, 4, 4, SACK)
    rect(d, x - 4, y - 16, 8, 1, "#6B4A28")
    d.point((x - 1, y - 20), fill="#7A5A38")


def draw_crate(d, x, y, w=26, h=16):
    """Peti kayu (dipakai hanya untuk dekorasi sudut, bukan isi rak)."""
    rect(d, x, y, w, h, CRATE_D)
    rect(d, x, y, w, 5, "#5A3A1C")
    rect(d, x, y, w, 1, "#472B12")
    rect(d, x + 1, y + 5, w - 2, h - 6, CRATE)
    rect(d, x + 1, y + 5, w - 2, 2, CRATE_L)
    for i in range(1, 4):
        d.line([(x + 1 + i * (w - 2) // 4, y + 7), (x + 1 + i * (w - 2) // 4, y + h - 2)], fill=CRATE_D)
    rect(d, x + 1, y + h - 2, w - 2, 1, "#553617")


def draw_crate_stack(d, x, y, tomato=True):
    draw_crate(d, x, y - 16, 26, 16)
    if tomato:
        for i in range(3):
            d.ellipse([x + 3 + i * 7, y - 22, x + 9 + i * 7, y - 16], fill="#D14B3C", outline="#8F2B21")
    draw_crate(d, x, y - 32, 26, 16)


def draw_corner_store(d):
    """Karung goni + peti kayu + jun keramik di sudut kanan belakang meja kasir."""
    # karung belakang
    draw_sack(d, 570, 96)
    # karung depan (menutupi sebagian yang belakang)
    draw_sack(d, 582, 98)
    # peti kayu
    draw_crate(d, 592, 82, 24, 16)
    # jun keramik di atas peti
    jx, jy = 599, 82
    rect(d, jx, jy - 9, 12, 9, "#8A5A34")
    rect(d, jx + 1, jy - 8, 10, 7, "#B4805A")
    rect(d, jx + 3, jy - 12, 6, 4, "#8A5A34")
    rect(d, jx + 3, jy - 13, 6, 1, "#5E3A1C")
    rect(d, jx + 2, jy - 7, 2, 2, "#D9AE84")
    rect(d, jx, jy - 2, 12, 1, "#6B4322")


# ── Shadow ────────────────────────────────────────────────────────────────────
def shadows():
    sl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(sl)
    for (x, y, w, h) in [
        (44, 117, 104, 81),
        (184, 117, 104, 81),
        (44, 224, 104, 81),
        (184, 224, 104, 81),
        (397, 98, 186, 52),
        (503, 286, 80, 58),
        (22, 292, 40, 52),
        (560, 78, 58, 22),
    ]:
        d.rectangle([x, y, x + w, y + h], fill=(70, 45, 22, 55))
    return sl.filter(ImageFilter.GaussianBlur(2))


def main():
    rng = random.Random(7)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    draw_floor(d, rng)
    draw_walls(d, rng)
    draw_wall_decor(d)

    img.alpha_composite(shadows())
    d = ImageDraw.Draw(img)

    # dekorasi lantai / sudut
    draw_crate_stack(d, 24, 336)
    draw_plant(d, 32, 120, 1)
    draw_plant(d, 32, 196, 1)
    draw_plant(d, 32, 268, 1)
    draw_sack(d, 600, 336)
    draw_sack(d, 586, 338)
    draw_plant(d, 614, 336, 1)
    draw_corner_store(d)

    # 4 rak + papan harga
    tags = [
        (45, 118, "JAGUNG — 10", "#E5B93C"),
        (185, 118, "TOMAT — 15", "#D14B3C"),
        (45, 225, "WORTEL — 15", "#E08A2E"),
        (185, 225, "KENTANG — 12", "#B98D62"),
    ]
    for (x, y, label, dot) in tags:
        draw_shelf(d, x, y)

    draw_counter(d)
    draw_kasir_sign(d)
    draw_zones(d)
    draw_queue_lane(d)
    draw_door(d)

    out = os.path.join(OUT, "market-bg.png")
    img.save(out)
    img.resize((W * 2, H * 2), Image.NEAREST).convert("RGB").save(
        os.path.join(ROOT, "docs", "minimarket-v2-preview.png")
    )
    print("wrote", out, img.size)


if __name__ == "__main__":
    main()
