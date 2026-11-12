"""
Pasar Pagi — generator aset pixel art 16-bit (farm).

Kanvas dasar 640x360, digambar 1x lalu Phaser men-scale 2x dengan
pixelArt:true. Setiap pixel dasar = 2x2 di layar, jadi tetap tajam.

Fokus versi ini: tekstur organik, kedalaman, dan bayangan lembut —
bukan lagi bentuk geometris datar.

Jalankan:  python scripts/gen_pixel_assets.py
Output:    web/public/assets/pixel/*.png
"""

import os
import random

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)

W, H = 640, 360

# ── Palet ─────────────────────────────────────────────────────────────────────
GRASS = "#4E8F3C"
GRASS_L = "#63A64B"
GRASS_L2 = "#74B857"
GRASS_D = "#3C7330"
GRASS_D2 = "#2F5E2A"

PATH = "#9C7A4E"
PATH_L = "#B08A5E"
PATH_L2 = "#C2A075"
PATH_D = "#7A5A3C"
PATH_D2 = "#63472E"

SOIL = "#6B4226"
SOIL_L = "#8A5A34"
SOIL_L2 = "#9A6A40"
SOIL_D = "#4E2E18"
SOIL_D2 = "#3D2312"

WOOD = "#7A4A22"
WOOD_L = "#A27852"
WOOD_L2 = "#B98D62"
WOOD_D = "#4A2410"
WOOD_D2 = "#341708"

LEAF_D = "#25502A"
LEAF = "#2F6B33"
LEAF_M = "#3E8639"
LEAF_L = "#56A344"
LEAF_H = "#74BE55"

TRUNK = "#5B2B19"
TRUNK_L = "#7A4426"

DARK = "#2B1D0E"
STONE = "#8A8A7A"
STONE_L = "#A8A896"

# ── Posisi lahan (koordinat 1x) ───────────────────────────────────────────────
PLOT_W, PLOT_H = 160, 136
PLOTS = {
    "jagung": (140, 48),
    "tomat": (340, 48),
    "wortel": (140, 208),
    "kentang": (340, 208),
}
SLOT_COLS, SLOT_ROWS = 5, 3
SLOT_W, SLOT_H = 144 // SLOT_COLS, 40  # 28 x 40 (tanah 144x120)

# Jalan: menyilang di tengah, berhenti sedikit di luar 4 lahan (bukan ke tepi layar)
PATH_H = (184, 208)      # y atas/bawah jalan horizontal
PATH_V = (300, 340)      # x kiri/kanan jalan vertikal
PATH_H_X = (-6, 582)    # ujung kiri/kanan (kanan menyambung ke gudang)
PATH_V_Y = (44, 348)     # ujung atas/bawah


def rect(d, x, y, w, h, c):
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def shadow_layer():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def add_shadow(sl, x, y, w, h, alpha=70):
    d = ImageDraw.Draw(sl)
    d.ellipse([x, y, x + w, y + h], fill=(0, 0, 0, alpha))


# ── Rumput ────────────────────────────────────────────────────────────────────
def draw_grass(d, rng):
    rect(d, 0, 0, W, H, GRASS)
    # bercak besar supaya tidak rata
    for _ in range(90):
        x, y = rng.randrange(-20, W), rng.randrange(-20, H)
        w, h = rng.randrange(30, 90), rng.randrange(20, 60)
        d.ellipse([x, y, x + w, y + h], fill=rng.choice([GRASS_L, GRASS_D, GRASS_L2]))
    # butir tekstur
    for _ in range(5200):
        x, y = rng.randrange(W), rng.randrange(H)
        d.rectangle([x, y, x, y + 1], fill=rng.choice([GRASS_D, GRASS_D2, GRASS_L, GRASS_MIX]))


GRASS_MIX = "#589B44"


def draw_tuft(d, x, y, rng):
    """Rumpun rumput kecil, bukan garis lurus."""
    c = rng.choice([GRASS_D2, GRASS_D, GRASS_L2])
    d.rectangle([x, y + 3, x, y + 5], fill=c)
    d.rectangle([x + 2, y + 1, x + 2, y + 5], fill=c)
    d.rectangle([x + 4, y + 2, x + 4, y + 5], fill=c)
    if rng.random() < 0.4:
        d.rectangle([x + 1, y + 4, x + 1, y + 6], fill=GRASS_L)


def draw_flower(d, x, y, rng):
    petal = rng.choice(["#F2D14E", "#E86A8A", "#F4F0E4", "#B98BE0", "#E8903C"])
    d.rectangle([x + 1, y + 2, x + 1, y + 4], fill=GRASS_D2)
    d.rectangle([x, y, x + 2, y + 1], fill=petal)
    d.rectangle([x + 1, y + 1, x + 1, y + 1], fill="#F7E9A0")


def draw_stone(d, x, y):
    d.ellipse([x, y, x + 3, y + 2], fill=STONE)
    d.rectangle([x + 1, y, x + 2, y], fill=STONE_L)


# ── Jalan ─────────────────────────────────────────────────────────────────────
def draw_path_h(d, x0, x1, y0, y1, rng):
    rect(d, x0, y0, x1 - x0, y1 - y0, PATH)
    for _ in range((x1 - x0) * (y1 - y0) // 3):
        gx, gy = rng.randrange(x0, x1), rng.randrange(y0, y1)
        d.rectangle([gx, gy, gx + 1, gy + 1], fill=rng.choice([PATH_D, PATH_L, PATH_L2, "#8E6A42"]))
    # tepi kasar: gerigi acak
    for gx in range(x0, x1):
        if rng.random() < 0.55:
            d.rectangle([gx, y0 - rng.randrange(0, 2), gx, y0], fill=GRASS_D)
        if rng.random() < 0.55:
            d.rectangle([gx, y1, gx, y1 + rng.randrange(0, 2)], fill=GRASS_D)
    # bercak rumput menembus jalan
    for _ in range(22):
        gx = rng.randrange(x0 + 4, x1 - 4)
        gy = rng.randrange(y0 + 2, y1 - 2)
        d.rectangle([gx, gy, gx + 1, gy], fill=GRASS_L)


def draw_path_v(d, x0, x1, y0, y1, rng):
    rect(d, x0, y0, x1 - x0, y1 - y0, PATH)
    for _ in range((x1 - x0) * (y1 - y0) // 3):
        gx, gy = rng.randrange(x0, x1), rng.randrange(y0, y1)
        d.rectangle([gx, gy, gx + 1, gy + 1], fill=rng.choice([PATH_D, PATH_L, PATH_L2, "#8E6A42"]))
    for gy in range(y0, y1):
        if rng.random() < 0.55:
            d.rectangle([x0 - rng.randrange(0, 2), gy, x0, gy], fill=GRASS_D)
        if rng.random() < 0.55:
            d.rectangle([x1, gy, x1 + rng.randrange(0, 2), gy], fill=GRASS_D)
    for _ in range(16):
        gx = rng.randrange(x0 + 2, x1 - 2)
        gy = rng.randrange(y0 + 4, y1 - 4)
        d.rectangle([gx, gy, gx, gy + 1], fill=GRASS_L)


def draw_pebbles(d, rng):
    """Kerikil kecil di sepanjang jalan."""
    spots = []
    for _ in range(70):
        spots.append((rng.randrange(PATH_H_X[0], PATH_H_X[1]), rng.randrange(PATH_H[0] + 2, PATH_H[1] - 2)))
    for _ in range(40):
        spots.append((rng.randrange(PATH_V[0] + 2, PATH_V[1] - 2), rng.randrange(PATH_V_Y[0], PATH_V_Y[1])))
    for (x, y) in spots:
        d.rectangle([x, y, x + 1, y], fill=rng.choice([PATH_L2, "#D6C09A", PATH_D, "#B99A72"]))
        if rng.random() < 0.35:
            d.rectangle([x + 1, y + 1, x + 1, y + 1], fill=PATH_D2)


# ── Pohon ─────────────────────────────────────────────────────────────────────
def draw_tree(d, x, y, rng, variant=0):
    """Pohon berlapis: batang + 3 tingkat kanopi + highlight."""
    tw = 4 if variant else 5
    d.rectangle([x + 18, y + 26, x + 18 + tw, y + 38], fill=TRUNK)
    d.rectangle([x + 19, y + 26, x + 19 + tw, y + 34], fill=TRUNK_L)
    d.rectangle([x + 16, y + 36, x + 22 + tw, y + 38], fill=WOOD_D)

    # tingkat bawah (gelap)
    clusters = [(-2, 16, 13), (12, 18, 12), (26, 16, 12), (4, 8, 13), (20, 8, 13)]
    for (dx, dy, r) in clusters:
        d.ellipse([x + 10 + dx - r, y + 10 + dy - r, x + 10 + dx + r, y + 10 + dy + r], fill=LEAF_D)
    # tingkat tengah
    clusters2 = [(0, 16, 10), (13, 18, 10), (26, 15, 9), (5, 9, 10), (19, 9, 10)]
    for (dx, dy, r) in clusters2:
        d.ellipse([x + 10 + dx - r, y + 9 + dy - r, x + 10 + dx + r, y + 9 + dy + r], fill=LEAF)
    # tingkat atas (terang)
    for (dx, dy, r) in [(4, 12, 7), (16, 14, 7), (25, 12, 6)]:
        d.ellipse([x + 10 + dx - r, y + 8 + dy - r, x + 10 + dx + r, y + 8 + dy + r], fill=LEAF_M)
    # highlight daun
    for _ in range(9):
        hx = x + 6 + rng.randrange(26)
        hy = y + 4 + rng.randrange(18)
        d.rectangle([hx, hy, hx + 1, hy], fill=rng.choice([LEAF_L, LEAF_H]))
    # bayangan di dalam kanopi
    for _ in range(6):
        sx = x + 8 + rng.randrange(24)
        sy = y + 12 + rng.randrange(12)
        d.rectangle([sx, sy, sx, sy + 1], fill=LEAF_D)


def draw_bush(d, x, y, rng):
    d.ellipse([x, y + 3, x + 18, y + 15], fill=LEAF_D)
    d.ellipse([x + 2, y + 2, x + 15, y + 13], fill=LEAF)
    d.ellipse([x + 4, y + 1, x + 12, y + 9], fill=LEAF_M)
    d.rectangle([x + 6, y + 2, x + 8, y + 3], fill=LEAF_L)
    if rng.random() < 0.5:
        d.rectangle([x + 13, y + 5, x + 14, y + 6], fill=LEAF_H)
        d.rectangle([x + 4, y + 8, x + 5, y + 9], fill=LEAF_H)



# ── Tenda "BUY SEED" di sisi kiri peta ────────────────────────────────────────
STALL_X, STALL_Y = 46, 96
STALL_W = 78


def draw_stump(d, x, y):
    """Tunggul pohon kecil: lingkaran kayu dengan cincin."""
    d.ellipse([x, y + 3, x + 13, y + 11], fill="#5A3A20")
    d.ellipse([x + 1, y + 1, x + 12, y + 8], fill="#8A5A34")
    d.ellipse([x + 4, y + 3, x + 9, y + 6], fill="#A9754A")
    d.rectangle([x + 6, y + 4, x + 7, y + 5], fill="#C39A6B")


def draw_seed_stall(d, rng):
    """Tenda pasar kecil: kanopi merah-putih, papan nama, peti, karung, pedagang."""
    x, y, w = STALL_X, STALL_Y, STALL_W

    # papan nama (teks "BUY SEED" digambar runtime di FarmScene)
    px, py, pw, ph = x + 8, y, w - 16, 13
    rect(d, px, py, pw, ph, "#E8D5A8")
    d.rectangle([px + 1, py + 1, px + pw - 2, py + 2], fill="#FFF3D9")
    d.rectangle([px, py, px + pw - 1, py], fill="#4A2410")
    d.rectangle([px, py + ph - 1, px + pw - 1, py + ph - 1], fill="#4A2410")
    d.rectangle([px, py, px, py + ph - 1], fill="#4A2410")
    d.rectangle([px + pw - 1, py, px + pw - 1, py + ph - 1], fill="#4A2410")

    # kanopi bergaris merah-putih (menjorok keluar dari papan)
    ay = y + 17
    aw = w + 8
    ax = x - 4
    for i in range(0, aw, 8):
        col = "#C0392B" if (i // 8) % 2 == 0 else "#F2E2C2"
        d.rectangle([ax + i, ay, ax + i + 7, ay + 13], fill=col)
    # tepi atas & bayangan bawah kanopi
    d.rectangle([ax, ay, ax + aw - 1, ay + 1], fill="#8E2A20")
    d.rectangle([ax, ay + 12, ax + aw - 1, ay + 13], fill="#8E2A20")
    # gelombang bawah kanopi
    for i in range(0, aw, 8):
        col = "#C0392B" if (i // 8) % 2 == 0 else "#F2E2C2"
        d.ellipse([ax + i, ay + 11, ax + i + 7, ay + 17], fill=col)

    # tiang
    d.rectangle([ax + 1, ay + 14, ax + 3, ay + 54], fill="#6B4226")
    d.rectangle([ax + aw - 4, ay + 14, ax + aw - 2, ay + 54], fill="#6B4226")

    # meja/kounter
    cy = ay + 30
    rect(d, x + 2, cy, w - 4, 22, "#8A5A34")
    d.rectangle([x + 2, cy, x + w - 5, cy + 2], fill="#C39A6B")
    for i in range(x + 6, x + w - 6, 7):
        d.rectangle([i, cy + 4, i, cy + 20], fill="#6B4226")
    d.rectangle([x + 2, cy + 20, x + w - 5, cy + 22], fill="#4A2410")

    # barang di atas meja: karung, peti, pot
    d.ellipse([x + 8, cy - 8, x + 22, cy + 2], fill="#C9A26A")
    d.ellipse([x + 10, cy - 9, x + 20, cy - 1], fill="#E0BE86")
    d.rectangle([x + 26, cy - 9, x + 40, cy + 1], fill="#A9754A")
    d.rectangle([x + 26, cy - 9, x + 40, cy - 7], fill="#C39A6B")
    d.rectangle([x + 44, cy - 7, x + 55, cy + 1], fill="#6B4226")
    d.ellipse([x + 46, cy - 11, x + 53, cy - 5], fill="#4E8F3C")

    # dagangan di depan tenda: karung & peti
    d.ellipse([x + 4, cy + 24, x + 20, cy + 38], fill="#C9A26A")
    d.ellipse([x + 6, cy + 23, x + 18, cy + 33], fill="#E0BE86")
    d.rectangle([x + 22, cy + 26, x + 38, cy + 40], fill="#A9754A")
    d.rectangle([x + 22, cy + 26, x + 38, cy + 28], fill="#C39A6B")
    d.rectangle([x + 44, cy + 26, x + 60, cy + 40], fill="#8A5A34")
    d.rectangle([x + 44, cy + 26, x + 60, cy + 28], fill="#C39A6B")

    # pedagang kecil di sisi kanan tenda
    mx = x + w - 12
    my = cy + 8
    d.rectangle([mx + 2, my - 10, mx + 7, my - 3], fill="#E8C39E")   # kepala
    d.rectangle([mx + 2, my - 12, mx + 7, my - 11], fill="#3F2A16")  # rambut
    d.rectangle([mx + 1, my - 3, mx + 8, my + 8], fill="#5B7DB1")    # baju
    d.rectangle([mx + 1, my + 8, mx + 8, my + 12], fill="#3F5C86")   # celana
    d.rectangle([mx + 2, my - 2, mx + 3, my + 2], fill="#F2E2C2")    # celemek
    d.rectangle([mx + 6, my - 2, mx + 7, my + 2], fill="#F2E2C2")


# ── Gudang ────────────────────────────────────────────────────────────────────
def draw_barn_sign(d, x, y):
    """Papan nama kayu kecil yang dipasang di atas pintu gudang."""
    w, h = 44, 12
    rect(d, x, y, w, h, "#E8D5A8")
    # kilau atas & bayangan bawah
    d.rectangle([x + 1, y + 1, x + w - 2, y + 2], fill="#FFF3D9")
    d.rectangle([x + 1, y + h - 2, x + w - 2, y + h - 1], fill="#C9A26A")
    # garis luar gelap
    d.rectangle([x, y, x + w - 1, y], fill="#4A2410")
    d.rectangle([x, y + h - 1, x + w - 1, y + h - 1], fill="#4A2410")
    d.rectangle([x, y, x, y + h - 1], fill="#4A2410")
    d.rectangle([x + w - 1, y, x + w - 1, y + h - 1], fill="#4A2410")
    # paku kiri & kanan
    d.rectangle([x + 3, y + 4, x + 4, y + 5], fill="#C9A26A")
    d.rectangle([x + w - 5, y + 4, x + w - 4, y + 5], fill="#C9A26A")


def draw_barn(d, x, y):
    """Gudang kayu dengan atap sirap miring, jendela, jerami, peti, karung."""
    # badan
    rect(d, x, y + 22, 104, 54, "#8B5A2B")
    # papan vertikal
    for i in range(x + 4, x + 104, 7):
        d.rectangle([i, y + 24, i, y + 75], fill="#7A4A22")
        d.rectangle([i + 1, y + 24, i + 1, y + 75], fill="#946232")
    # atap sirap (miring ke kanan)
    for row in range(6):
        yy = y + 2 + row * 4
        for col in range(-2, 26):
            sx = x + col * 4 + row * 2
            d.rectangle([sx, yy, sx + 3, yy + 3], fill=("#5B2B19" if (row + col) % 2 else "#6E3720"))
    d.polygon([(x - 6, y + 24), (x + 52, y - 6), (x + 110, y + 24)], fill="#6E3720")
    d.polygon([(x - 6, y + 24), (x + 52, y - 6), (x + 110, y + 24)], outline="#3F1C0E")
    # garis sirap
    for k in range(1, 7):
        d.line([(x - 6 + k * 16, y + 24 - k * 4), (x + 6 + k * 16, y + 24 - k * 4 + 2)], fill="#4A2410")
    # pintu
    rect(d, x + 38, y + 40, 28, 36, "#4A2410")
    d.rectangle([x + 38, y + 40, x + 65, y + 41], fill="#6B3A20")
    d.rectangle([x + 50, y + 40, x + 51, y + 75], fill="#6B3A20")
    d.rectangle([x + 56, y + 56, x + 57, y + 57], fill="#C9A26A")
    # jendela kiri
    rect(d, x + 12, y + 38, 18, 16, "#3A2A18")
    d.rectangle([x + 14, y + 40, x + 27, y + 51], fill="#8FB6C9")
    d.rectangle([x + 20, y + 40, x + 21, y + 51], fill="#4A2410")
    d.rectangle([x + 14, y + 45, x + 27, y + 46], fill="#4A2410")
    # jendela kanan
    rect(d, x + 76, y + 38, 16, 14, "#3A2A18")
    d.rectangle([x + 78, y + 40, x + 89, y + 49], fill="#8FB6C9")
    d.rectangle([x + 83, y + 40, x + 84, y + 49], fill="#4A2410")
    # jerami di sisi kanan
    for k in range(4):
        d.ellipse([x + 96, y + 58 + k * 3, x + 112, y + 66 + k * 3], fill="#D9AE46")
        d.rectangle([x + 98, y + 60 + k * 3, x + 108, y + 61 + k * 3], fill="#F2C94E")
    # peti
    rect(d, x + 108, y + 68, 18, 14, "#8B5A2B")
    d.rectangle([x + 108, y + 68, x + 125, y + 69], fill="#A27852")
    d.rectangle([x + 108, y + 74, x + 125, y + 75], fill="#6B3A20")
    # karung
    d.ellipse([x + 92, y + 74, x + 104, y + 82], fill="#C9A26A")
    d.rectangle([x + 95, y + 76, x + 101, y + 80], fill="#B08A4E")
    d.rectangle([x + 96, y + 74, x + 100, y + 75], fill="#8B6A3E")
    # papan nama di atas pintu
    draw_barn_sign(d, x + 30, y + 28)


# ── Pagar ─────────────────────────────────────────────────────────────────────
def draw_fence_h(d, x0, x1, y):
    d.rectangle([x0, y, x1, y + 1], fill=WOOD_L)
    d.rectangle([x0, y + 2, x1, y + 2], fill=WOOD_D)
    for x in range(x0, x1 + 1, 12):
        d.rectangle([x, y - 2, x + 2, y + 6], fill=WOOD)
        d.rectangle([x, y - 2, x + 2, y - 1], fill=WOOD_L2)
        d.rectangle([x, y + 5, x + 2, y + 6], fill=WOOD_D)


def draw_fence_v(d, x, y0, y1):
    d.rectangle([x, y0, x + 1, y1], fill=WOOD_L)
    d.rectangle([x + 2, y0, x + 2, y1], fill=WOOD_D)
    for y in range(y0, y1 + 1, 12):
        d.rectangle([x - 2, y, x + 6, y + 2], fill=WOOD)
        d.rectangle([x - 2, y, x - 2, y + 2], fill=WOOD_L2)
        d.rectangle([x + 6, y, x + 6, y + 2], fill=WOOD_D)


# ── Lahan ─────────────────────────────────────────────────────────────────────
def draw_plot(d, x, y, rng):
    # bingkai kayu tebal + dimensi
    rect(d, x, y, PLOT_W, PLOT_H, WOOD)
    # papan atas: terang di atas, gelap di bawah
    d.rectangle([x, y, x + PLOT_W - 1, y + 2], fill=WOOD_L)
    d.rectangle([x, y + PLOT_H - 3, x + PLOT_W - 1, y + PLOT_H - 1], fill=WOOD_D)
    d.rectangle([x, y, x + 2, y + PLOT_H - 1], fill=WOOD_L)
    d.rectangle([x + PLOT_W - 3, y, x + PLOT_W - 1, y + PLOT_H - 1], fill=WOOD_D)
    # sambungan papan
    for i in range(x + 16, x + PLOT_W - 4, 16):
        d.rectangle([i, y, i, y + 7], fill=WOOD_D)
        d.rectangle([i, y + PLOT_H - 8, i, y + PLOT_H - 1], fill=WOOD_D2)
    for i in range(y + 16, y + PLOT_H - 4, 16):
        d.rectangle([x, i, x + 7, i], fill=WOOD_D)
        d.rectangle([x + PLOT_W - 8, i, x + PLOT_W - 1, i], fill=WOOD_D2)
    # kilau atas bingkai
    d.rectangle([x + 9, y + 9, x + PLOT_W - 10, y + 10], fill="#C79A6E")

    # tanah dalam: bayangan tepi
    ix, iy = x + 8, y + 8
    iw, ih = PLOT_W - 16, PLOT_H - 16
    rect(d, ix, iy, iw, ih, SOIL)
    d.rectangle([ix, iy, ix + iw - 1, iy + 2], fill=SOIL_D)
    d.rectangle([ix, iy, ix + 2, iy + ih - 1], fill=SOIL_D)
    d.rectangle([ix + iw - 3, iy, ix + iw - 1, iy + ih - 1], fill=SOIL_L)
    d.rectangle([ix, iy + ih - 3, ix + iw - 1, iy + ih - 1], fill=SOIL_L)

    # alur tanah: garis tidak rata
    for row in range(SLOT_ROWS):
        base = iy + 10 + row * SLOT_H
        for gx in range(ix + 6, ix + iw - 6):
            if rng.random() < 0.7:
                d.rectangle([gx, base, gx, base + 1], fill=SOIL_D)
            if rng.random() < 0.25:
                d.rectangle([gx, base + 3, gx, base + 3], fill=SOIL_L2)
    # gumpalan tanah
    for _ in range(260):
        sx = ix + 3 + rng.randrange(iw - 6)
        sy = iy + 3 + rng.randrange(ih - 6)
        d.rectangle([sx, sy, sx + 1, sy + 1], fill=rng.choice([SOIL_L, SOIL_D, SOIL_L2, "#5A3320"]))

    # 15 kotak slot (5 x 3): bingkai tipis menjorok ke dalam (pembeda antar slot)
    for i in range(SLOT_COLS):
        for j in range(SLOT_ROWS):
            cx = ix + i * SLOT_W
            cy = iy + j * SLOT_H
            # bingkai gelap 2px di dalam kotak
            d.rectangle([cx, cy, cx + SLOT_W - 1, cy + 1], fill=SOIL_D2)
            d.rectangle([cx, cy, cx + 1, cy + SLOT_H - 1], fill=SOIL_D2)
            d.rectangle([cx, cy + SLOT_H - 2, cx + SLOT_W - 1, cy + SLOT_H - 1], fill=SOIL_D)
            d.rectangle([cx + SLOT_W - 2, cy, cx + SLOT_W - 1, cy + SLOT_H - 1], fill=SOIL_D)
            # kilau tipis di sisi atas (kesan timbul)
            d.rectangle([cx + 2, cy + 2, cx + SLOT_W - 3, cy + 2], fill=SOIL_L)
            d.rectangle([cx + 2, cy + 2, cx + 2, cy + SLOT_H - 3], fill=SOIL_L2)

    # paku sudut
    for (cx, cy) in [(x + 4, y + 4), (x + PLOT_W - 6, y + 4), (x + 4, y + PLOT_H - 6), (x + PLOT_W - 6, y + PLOT_H - 6)]:
        d.rectangle([cx, cy, cx + 1, cy + 1], fill="#C9A26A")


def draw_sign(d, x, y):
    """Papan nama kayu kecil di atas lahan."""
    rect(d, x, y, 64, 16, "#E8D5A8")
    d.rectangle([x + 1, y + 1, x + 62, y + 2], fill="#FFF3D9")
    d.rectangle([x + 1, y + 12, x + 62, y + 13], fill="#C9A26A")
    d.rectangle([x, y, x + 63, y], fill=WOOD_D)
    d.rectangle([x, y + 15, x + 63, y + 15], fill=WOOD_D)
    d.rectangle([x, y, x, y + 15], fill=WOOD_D)
    d.rectangle([x + 63, y, x + 63, y + 15], fill=WOOD_D)
    d.rectangle([x + 30, y + 16, x + 33, y + 21], fill=WOOD_D)
    d.rectangle([x + 30, y + 16, x + 30, y + 21], fill=WOOD)


# ── Latar ─────────────────────────────────────────────────────────────────────
def build_background():
    img = Image.new("RGB", (W, H), GRASS)
    d = ImageDraw.Draw(img)
    rng = random.Random(2026)
    draw_grass(d, rng)

    # bayangan: pohon, gudang
    sh = shadow_layer()

    # jalan menyilang
    draw_path_h(d, *PATH_H_X, *PATH_H, rng)
    draw_path_v(d, *PATH_V, *PATH_V_Y, rng)
    # lebaran di persimpangan supaya menyatu
    rect(d, PATH_V[0], PATH_H[0], PATH_V[1] - PATH_V[0], PATH_H[1] - PATH_H[0], PATH)
    for _ in range(120):
        gx = rng.randrange(PATH_V[0], PATH_V[1])
        gy = rng.randrange(PATH_H[0], PATH_H[1])
        d.rectangle([gx, gy, gx + 1, gy + 1], fill=rng.choice([PATH_D, PATH_L, PATH_L2]))
    draw_pebbles(d, rng)

    # jalan tanah bercabang dari jalan utama ke pintu gudang
    draw_path_v(d, 552, 582, 118, 184, rng)

    # rumput liar menembus tepi jalan
    for _ in range(60):
        tx = rng.choice([PATH_H_X[0] - 2, PATH_H_X[1] + 2])
        ty = rng.randrange(PATH_H[0], PATH_H[1])
        draw_tuft(d, tx, ty, rng)
    for _ in range(40):
        tx = rng.randrange(PATH_V[0], PATH_V[1])
        ty = rng.choice([PATH_V_Y[0] - 2, PATH_V_Y[1] + 2])
        draw_tuft(d, tx, ty, rng)

    # bayangan gudang (digambar nanti, setelah hutan, supaya tidak tertutup)
    add_shadow(sh, 508, 104, 132, 26, 80)

    # 4 lahan
    for crop, (px_, py_) in PLOTS.items():
        draw_plot(d, px_, py_, rng)
        # papan nama lahan digambar runtime di FarmScene.drawLabels() (lebar ikut teks)

    # ── hutan pinggir ─────────────────────────────────────────────────────────
    # kiri (rimbun, dua lapis) — disisakan celah untuk tenda BUY SEED
    def tree_blocks_stall(tx, ty):
        return (
            tx + 34 > STALL_X - 12
            and tx < STALL_X + STALL_W + 16
            and ty + 46 > STALL_Y - 8
            and ty < STALL_Y + 106
        )

    for y in range(-8, H + 8, 26):
        for (tx, dy) in [(-4, 0), (22, 12), (48, -4), (72, 10)]:
            ty = y + dy
            if tree_blocks_stall(tx, ty):
                continue
            draw_tree(d, tx, ty, rng, variant=rng.randrange(2))

    # tenda BUY SEED mengisi celah di tepi hutan kiri
    draw_seed_stall(d, rng)
    # ujung jalan ditutup semak, seolah jalan lanjut menembus hutan
    for (bx, by) in [
        (-16, 168), (-6, 184), (-18, 200), (-4, 158),
        (10, 180), (18, 196), (27, 184), (2, 206), (33, 202), (14, 208),
    ]:
        draw_bush(d, bx, by, rng)
    # tunggul pohon di rumput kiri-bawah
    for (sx, sy) in [(44, 244), (72, 260), (26, 274)]:
        draw_stump(d, sx, sy)
    # kanan (area gudang dikosongkan: y 26..132)
    for y in range(-8, H + 8, 26):
        for (tx, dy) in [(536, 0), (560, 12), (584, -4), (604, 10)]:
            ty = y + dy
            if 480 <= tx < 620 and ty < 200:
                continue  # halaman gudang: tanpa pohon/semak
            draw_tree(d, tx, ty, rng, variant=rng.randrange(2))
    # atas (menutup ujung jalan, berhenti sebelum papan nama di y=32)
    for x in range(96, 544, 26):
        draw_tree(d, x, -16, rng, variant=rng.randrange(2))
        draw_tree(d, x + 13, -6, rng, variant=rng.randrange(2))
    # bawah (satu baris, tidak menutupi lahan baris kedua)
    for x in range(96, 544, 24):
        draw_tree(d, x, 340, rng, variant=rng.randrange(2))

    # pagar halaman gudang: hanya di depan rumah, dengan celah untuk jalan
    draw_fence_h(d, 502, 546, 148)
    draw_fence_h(d, 588, 626, 148)

    # gudang digambar paling akhir: menimpa pohon di belakangnya
    draw_barn(d, 516, 40)

    # semak pengisi celah
    for (bx, by) in [(96, 158), (100, 214), (486, 268), (486, 296),
                     (96, 296), (604, 268), (256, 4), (366, 4)]:
        draw_bush(d, bx, by, rng)

    # bunga liar, batu, rumpun rumput di sisa area
    for _ in range(120):
        x, y = rng.randrange(W), rng.randrange(H)
        if 130 < x < 490 and 40 < y < 350:
            continue  # jangan di atas lahan/jalan
        draw_flower(d, x, y, rng)
    for _ in range(60):
        x, y = rng.randrange(W), rng.randrange(H)
        if 130 < x < 490 and 40 < y < 350:
            continue
        draw_stone(d, x, y)
    for _ in range(180):
        x, y = rng.randrange(W), rng.randrange(H)
        if PATH_H[0] <= y <= PATH_H[1] or PATH_V[0] <= x <= PATH_V[1]:
            continue
        draw_tuft(d, x, y, rng)

    # komposit bayangan pohon (lembut)
    sh = sh.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img.convert("RGBA"), sh).convert("RGB")

    # bayangan gudang: di bawah gudang, di atas rumput
    shb = shadow_layer()
    add_shadow(shb, 492, 104, 132, 26, 80)
    shb = shb.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img.convert("RGBA"), shb).convert("RGB")

    # gudang digambar terakhir supaya tidak tertutup pohon
    d = ImageDraw.Draw(img)
    draw_barn(d, 516, 40)

    img.save(os.path.join(OUT, "farm-bg.png"))


# ── Tanaman ───────────────────────────────────────────────────────────────────
def canvas(w=32, h=32):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def crop_corn(stage):
    img, d = canvas()
    if stage == 1:
        d.rectangle([15, 22, 16, 29], fill="#4C8A3A")
        d.rectangle([15, 22, 15, 28], fill="#6BC24E")
        d.rectangle([11, 20, 14, 22], fill="#6BC24E")
        d.rectangle([17, 20, 20, 22], fill="#6BC24E")
        d.rectangle([15, 18, 16, 20], fill="#7FCB5A")
    elif stage == 2:
        d.rectangle([15, 13, 16, 29], fill="#4C8A3A")
        d.rectangle([15, 13, 15, 28], fill="#6BC24E")
        for yy in (17, 21):
            d.rectangle([10, yy, 14, yy + 1], fill="#6BC24E")
            d.rectangle([17, yy, 21, yy + 1], fill="#6BC24E")
        d.rectangle([13, 11, 14, 13], fill="#7FCB5A")
        d.rectangle([17, 11, 18, 13], fill="#7FCB5A")
        d.rectangle([15, 9, 16, 11], fill="#C9A24A")
        d.rectangle([15, 9, 15, 10], fill="#E0BC5E")
    else:
        d.rectangle([15, 7, 16, 29], fill="#4C8A3A")
        d.rectangle([15, 7, 15, 28], fill="#6BC24E")
        for yy in (13, 17, 21):
            d.rectangle([9, yy, 14, yy + 1], fill="#6BC24E")
            d.rectangle([17, yy, 22, yy + 1], fill="#6BC24E")
            d.rectangle([9, yy, 10, yy], fill="#7FCB5A")
            d.rectangle([21, yy, 22, yy], fill="#7FCB5A")
        # tongkol jagung: kuning berbaris
        d.rectangle([12, 11, 19, 19], fill="#F2C14E")
        d.rectangle([13, 12, 18, 18], fill="#F7D06B")
        for yy in range(12, 19):
            d.rectangle([13, yy, 18, yy], fill="#E8B43E" if yy % 2 else "#F7D06B")
        d.rectangle([12, 11, 12, 19], fill="#6BC24E")
        d.rectangle([19, 11, 19, 19], fill="#6BC24E")
        d.rectangle([15, 8, 16, 10], fill="#C9A24A")
        d.rectangle([14, 20, 17, 21], fill="#8FD46A")
    return img


def crop_tomato(stage):
    img, d = canvas()
    if stage == 1:
        d.rectangle([15, 22, 16, 29], fill="#4C8A3A")
        d.rectangle([12, 20, 15, 22], fill="#6BC24E")
        d.rectangle([17, 20, 20, 22], fill="#6BC24E")
    elif stage == 2:
        d.rectangle([15, 18, 16, 29], fill="#4C8A3A")
        d.ellipse([8, 13, 23, 23], fill="#3F7A33")
        d.ellipse([10, 15, 21, 21], fill="#4C8A3A")
        d.rectangle([12, 20, 13, 21], fill="#7FCB5A")
        d.rectangle([18, 18, 19, 19], fill="#7FCB5A")
        d.rectangle([15, 15, 16, 17], fill="#8FD46A")
    else:
        d.rectangle([15, 18, 16, 29], fill="#4C8A3A")
        d.ellipse([7, 11, 24, 23], fill="#3F7A33")
        d.ellipse([9, 13, 22, 21], fill="#4C8A3A")
        # buah tomat: 4 buah dengan highlight
        for (tx, ty) in [(10, 14), (17, 13), (12, 19), (19, 18)]:
            d.ellipse([tx, ty, tx + 3, ty + 2], fill="#D8321F")
            d.rectangle([tx + 1, ty, tx + 2, ty], fill="#F26A5A")
        d.rectangle([15, 15, 16, 16], fill="#6BC24E")
        d.rectangle([15, 16, 16, 18], fill="#7FCB5A")
    return img


def crop_carrot(stage):
    img, d = canvas()
    if stage == 1:
        d.rectangle([15, 22, 16, 29], fill="#4C8A3A")
        d.rectangle([12, 20, 15, 22], fill="#6BC24E")
        d.rectangle([17, 20, 20, 22], fill="#6BC24E")
    elif stage == 2:
        d.rectangle([15, 20, 16, 29], fill="#4C8A3A")
        d.rectangle([11, 17, 15, 20], fill="#6BC24E")
        d.rectangle([17, 17, 21, 20], fill="#6BC24E")
        d.rectangle([13, 14, 14, 18], fill="#7FCB5A")
        d.rectangle([17, 14, 18, 18], fill="#7FCB5A")
    else:
        d.rectangle([15, 17, 16, 28], fill="#4C8A3A")
        d.rectangle([10, 15, 15, 18], fill="#6BC24E")
        d.rectangle([17, 15, 22, 18], fill="#6BC24E")
        d.rectangle([12, 11, 14, 16], fill="#7FCB5A")
        d.rectangle([17, 11, 19, 16], fill="#7FCB5A")
        d.rectangle([15, 9, 16, 12], fill="#8FD46A")
        # umbi wortel oranye
        d.rectangle([13, 23, 18, 28], fill="#E8722A")
        d.rectangle([14, 24, 17, 27], fill="#F58C4B")
        d.rectangle([15, 28, 16, 29], fill="#C95A1E")
        d.rectangle([13, 23, 13, 25], fill="#C95A1E")
    return img


def crop_potato(stage):
    img, d = canvas()
    if stage == 1:
        d.rectangle([15, 22, 16, 29], fill="#4C8A3A")
        d.rectangle([12, 20, 15, 22], fill="#6BC24E")
        d.rectangle([17, 20, 20, 22], fill="#6BC24E")
    elif stage == 2:
        d.rectangle([15, 19, 16, 29], fill="#4C8A3A")
        d.ellipse([8, 13, 23, 23], fill="#3F7A33")
        d.ellipse([10, 15, 21, 21], fill="#6BC24E")
        d.rectangle([12, 17, 13, 18], fill="#7FCB5A")
        d.rectangle([18, 19, 19, 20], fill="#7FCB5A")
    else:
        d.rectangle([15, 19, 16, 28], fill="#4C8A3A")
        d.ellipse([7, 12, 24, 23], fill="#3F7A33")
        d.ellipse([9, 14, 22, 21], fill="#6BC24E")
        d.rectangle([15, 15, 16, 16], fill="#7FCB5A")
        # umbi kentang muncul di tanah
        for (tx, ty) in [(10, 25), (17, 24), (13, 27)]:
            d.ellipse([tx, ty, tx + 3, ty + 2], fill="#B08A4A")
            d.rectangle([tx, ty, tx + 2, ty], fill="#C9A26A")
            d.rectangle([tx + 1, ty + 2, tx + 1, ty + 2], fill="#8B6A3E")
    return img


CROPS = {
    "jagung": crop_corn,
    "tomat": crop_tomato,
    "wortel": crop_carrot,
    "kentang": crop_potato,
}


# ── Karakter ──────────────────────────────────────────────────────────────────
SKIN = "#F0C090"
SKIN_D = "#D9A070"
SKIN_L = "#F8D4AE"
HAT = "#E8C060"
HAT_D = "#C99A3E"
HAT_L = "#F6D77E"
HAIR = "#5B2B19"
HAIR_L = "#7A4426"
SHIRT = "#3E7BC4"
SHIRT_D = "#2E5F9E"
SHIRT_L = "#5E9BDC"
OVER = "#2E4A7A"
OVER_D = "#22375C"
BOOT = "#3F2214"
BAG = "#8B5A2B"
BAG_L = "#A27852"


def draw_player(direction, frame):
    img = Image.new("RGBA", (20, 26), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # bayangan
    d.ellipse([3, 23, 16, 25], fill=(0, 0, 0, 55))

    # tas ransel (di belakang badan)
    if direction == "down":
        d.rectangle([3, 11, 5, 17], fill=BAG)
        d.rectangle([3, 11, 3, 17], fill=BAG_L)
    elif direction == "up":
        d.rectangle([4, 10, 15, 18], fill=BAG)
        d.rectangle([4, 10, 15, 11], fill=BAG_L)
        d.rectangle([9, 13, 10, 15], fill="#6B3A20")
    else:
        d.rectangle([12, 11, 15, 17], fill=BAG)
        d.rectangle([12, 11, 12, 17], fill=BAG_L)

    # topi jerami: lebar + pita
    d.rectangle([6, 2, 13, 3], fill=HAT)
    d.rectangle([4, 4, 15, 4], fill=HAT_D)
    d.rectangle([5, 3, 14, 3], fill=HAT_L)
    d.rectangle([7, 1, 12, 2], fill=HAT)
    d.rectangle([7, 4, 12, 4], fill="#B8862E")

    # kepala
    d.rectangle([6, 5, 13, 9], fill=SKIN)
    d.rectangle([6, 5, 13, 5], fill=HAIR)
    d.rectangle([6, 5, 6, 7], fill=HAIR)
    d.rectangle([13, 5, 13, 7], fill=HAIR)

    if direction == "down":
        d.rectangle([7, 7, 7, 7], fill=DARK)
        d.rectangle([12, 7, 12, 7], fill=DARK)
        d.rectangle([9, 9, 10, 9], fill=SKIN_D)
        d.rectangle([7, 8, 7, 8], fill=SKIN_L)
    elif direction == "up":
        d.rectangle([6, 5, 13, 8], fill=HAIR)
        d.rectangle([7, 6, 12, 7], fill=HAIR_L)
        d.rectangle([6, 9, 13, 9], fill=SKIN_D)
    elif direction == "left":
        d.rectangle([6, 5, 13, 8], fill=SKIN)
        d.rectangle([6, 5, 13, 6], fill=HAIR)
        d.rectangle([6, 7, 6, 7], fill=DARK)
        d.rectangle([6, 9, 13, 9], fill=SKIN_D)
    else:
        d.rectangle([6, 5, 13, 8], fill=SKIN)
        d.rectangle([6, 5, 13, 6], fill=HAIR)
        d.rectangle([13, 7, 13, 7], fill=DARK)
        d.rectangle([6, 9, 13, 9], fill=SKIN_D)

    # badan: kemeja + overall
    d.rectangle([5, 10, 14, 17], fill=SHIRT)
    d.rectangle([5, 10, 14, 10], fill=SHIRT_L)
    d.rectangle([7, 12, 12, 17], fill=OVER)
    d.rectangle([7, 12, 7, 17], fill=OVER_D)
    d.rectangle([8, 11, 11, 12], fill=OVER)
    d.rectangle([8, 11, 11, 11], fill="#3B5C93")

    # lengan
    if direction in ("down", "up"):
        d.rectangle([3, 11, 4, 14], fill=SKIN)
        d.rectangle([15, 11, 16, 14], fill=SKIN)
        d.rectangle([15, 14, 16, 14], fill=SKIN_D)
    elif direction == "left":
        d.rectangle([3, 11, 5, 14], fill=SKIN)
        d.rectangle([3, 14, 5, 14], fill=SKIN_D)
        d.rectangle([13, 12, 14, 14], fill=SKIN_D)
    else:
        d.rectangle([4, 12, 5, 14], fill=SKIN_D)
        d.rectangle([15, 11, 17, 14], fill=SKIN)
        d.rectangle([15, 14, 17, 14], fill=SKIN_D)

    # kaki + sepatu
    if frame == 1:
        d.rectangle([7, 18, 9, 21], fill=OVER)
        d.rectangle([11, 18, 13, 21], fill=OVER)
        d.rectangle([6, 22, 9, 23], fill=BOOT)
        d.rectangle([11, 22, 14, 23], fill=BOOT)
    else:
        d.rectangle([7, 18, 9, 20], fill=OVER)
        d.rectangle([11, 18, 13, 21], fill=OVER)
        d.rectangle([6, 21, 9, 22], fill=BOOT)
        d.rectangle([11, 22, 14, 23], fill=BOOT)

    return img


def with_outline(img, color=(36, 20, 8, 255), thresh=140):
    """Garis tepi gelap 1px mengikuti siluet, digambar di dalam kanvas yang sama.

    Hanya piksel transparan yang bersentuhan dengan piksel solid yang diwarnai,
    jadi bentuk aslinya tidak berubah sama sekali — cuma dapat pinggiran tebal.
    """
    w, h = img.size
    src = img.load()
    out = img.copy()
    od = ImageDraw.Draw(out)
    for y in range(h):
        for x in range(w):
            if src[x, y][3] >= thresh:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] >= thresh:
                    od.point((x, y), fill=color)
                    break
    return out


def main():
    build_background()

    for crop, fn in CROPS.items():
        for stage in (1, 2, 3):
            spr = fn(stage)
            spr.save(os.path.join(OUT, f"crop-{crop}-{stage}.png"))
            # versi bergaris tepi — dipakai di lahan supaya tanaman menonjol
            with_outline(spr).save(os.path.join(OUT, f"crop-{crop}-{stage}-out.png"))

    for direction in ("down", "up", "left", "right"):
        for frame in (1, 2):
            spr = draw_player(direction, frame)
            spr.save(os.path.join(OUT, f"player-{direction}-{frame}.png"))
            # versi bergaris tepi — dipakai khusus karakter pemain
            with_outline(spr).save(os.path.join(OUT, f"player-{direction}-{frame}-out.png"))

    files = sorted(os.listdir(OUT))
    print(f"{len(files)} file di {OUT}")
    for f in files:
        print(" -", f)


if __name__ == "__main__":
    main()
