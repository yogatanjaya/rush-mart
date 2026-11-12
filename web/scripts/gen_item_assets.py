"""
Pasar Pagi — sprite buah khusus RAK MINIMARKET.

Beda dari sprite kebun (crop-*-1..3, 32x32, 3 fase tumbuh): sprite ini
cuma untuk barang jadi yang dipajang di rak toko.

Ukuran art 24x18 -> di layar 48x36 (Phaser scale 2, pixelArt).
Muat 3 per baris di rak (tiap tingkat rak punya 3 slot).

Outline digambar otomatis dari alpha mask, jadi garis luarnya rata 1px
seperti aset Stardew.

Jalankan:  python scripts/gen_item_assets.py
Output:    web/public/assets/pixel/item-{jagung,tomat,wortel,kentang}.png
"""

import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)

W, H = 24, 18
INK = (30, 16, 6, 255)

CORN = (242, 199, 68, 255)
CORN_L = (255, 226, 130, 255)
CORN_D = (198, 148, 30, 255)
CORN_DD = (158, 110, 16, 255)

HUSK = (86, 152, 62, 255)
HUSK_L = (124, 196, 88, 255)
HUSK_D = (52, 106, 46, 255)

TOM = (214, 72, 56, 255)
TOM_L = (244, 108, 88, 255)
TOM_D = (146, 40, 30, 255)
TOM_H = (255, 170, 150, 255)

CAR = (226, 138, 44, 255)
CAR_L = (247, 174, 82, 255)
CAR_D = (166, 92, 18, 255)

POT = (172, 122, 74, 255)
POT_L = (204, 160, 110, 255)
POT_D = (112, 72, 34, 255)

STEM = (74, 138, 56, 255)
STEM_L = (116, 186, 82, 255)
STEM_D = (44, 96, 42, 255)


def canvas():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def px(d, x, y, c):
    d.point((x, y), fill=c)


def fill(d, x, y, w, h, c):
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def add_outline(img, color=INK):
    """Tambah outline 1px mengelilingi piksel opaque (4 arah)."""
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(H):
        for x in range(W):
            if src[x, y][3] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and src[nx, ny][3] != 0:
                    dst[x, y] = color
                    break
    return out


# ── Jagung ───────────────────────────────────────────────────────────────────
def jagung():
    """Tongkol diagonal dengan butir jelas; kelopak hanya di pangkal & ujung."""
    import math

    img, d = canvas()
    a = (8.5, 15.0)   # pangkal
    b = (16.0, 4.0)   # ujung

    # ── kelopak di balik ujung atas ──
    d.polygon([(15, 3), (19, 2), (20, 4), (18, 6)], fill=HUSK_D)
    d.polygon([(16, 4), (19, 3), (19, 5), (17, 6)], fill=HUSK)

    # ── kelopak di balik pangkal bawah ──
    d.polygon([(4, 16), (4, 12), (7, 12), (9, 15), (9, 16)], fill=HUSK_D)

    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux

    steps = 40
    for i in range(steps + 1):
        t = i / steps
        cx = a[0] + dx * t
        cy = a[1] + dy * t
        half = 1.0 + 2.2 * math.sin(math.pi * t) ** 0.6
        span = int(half)
        for k in range(-span, span + 1):
            x = int(round(cx + nx * k))
            y = int(round(cy + ny * k))
            edge = abs(k) >= span - 0.5
            if edge:
                c = CORN_D
            elif (x + y) % 2 == 0:
                c = CORN_L
            else:
                c = CORN
            px(d, x, y, c)
        x = int(round(cx + nx * span))
        y = int(round(cy + ny * span))
        px(d, x, y, CORN_DD)

    # ── kelopak depan di pangkal: baji kecil, tidak menutupi tongkol ──
    d.polygon([(4, 16), (5, 12), (8, 13), (9, 16)], fill=HUSK)
    d.polygon([(5, 15), (6, 13), (8, 14), (8, 15)], fill=HUSK_L)
    # serat kelopak
    px(d, 16, 3, HUSK_D)
    px(d, 5, 14, HUSK_D)
    return add_outline(img)


# ── Tomat ────────────────────────────────────────────────────────────────────
def tomat():
    img, d = canvas()
    d.ellipse([4, 4, 19, 16], fill=TOM)
    d.ellipse([5, 5, 17, 14], fill=TOM_L)
    d.ellipse([6, 6, 16, 13], fill=TOM)
    # bayangan bawah
    for xx in range(6, 18):
        px(d, xx, 16, TOM_D)
    for xx in range(5, 19):
        px(d, xx, 15, TOM_D if xx % 3 else TOM)
    # kilau
    fill(d, 7, 6, 3, 2, TOM_H)
    px(d, 6, 7, TOM_H)
    px(d, 10, 5, TOM_H)
    # tangkai
    fill(d, 11, 1, 3, 3, STEM_D)
    fill(d, 11, 1, 2, 2, STEM)
    # daun kecil
    px(d, 9, 2, STEM)
    px(d, 8, 3, STEM_L)
    px(d, 15, 2, STEM)
    px(d, 16, 3, STEM_L)
    px(d, 11, 4, STEM_D)
    return add_outline(img)


# ── Wortel ───────────────────────────────────────────────────────────────────
def wortel():
    img, d = canvas()
    # daun
    for (x, y, c) in [(16, 1, STEM_D), (18, 2, STEM), (17, 3, STEM_L),
                      (20, 4, STEM), (15, 3, STEM_D), (19, 1, STEM_L)]:
        fill(d, x, y, 2, 2, c)
    fill(d, 16, 4, 3, 2, STEM_D)
    # bonggol
    d.polygon([(15, 6), (18, 7), (18, 9), (9, 16), (7, 16), (7, 14), (14, 6)], fill=CAR)
    d.polygon([(14, 7), (17, 8), (17, 9), (9, 15), (8, 15), (8, 14)], fill=CAR_L)
    # rusuk
    for (x, y) in [(13, 9), (11, 11), (9, 13)]:
        px(d, x, y, CAR_D)
        px(d, x + 1, y, CAR_D)
    px(d, 7, 15, CAR_D)
    px(d, 17, 8, CAR_D)
    return add_outline(img)


# ── Kentang ──────────────────────────────────────────────────────────────────
def kentang():
    img, d = canvas()
    d.ellipse([3, 5, 20, 16], fill=POT)
    d.ellipse([4, 6, 18, 14], fill=POT_L)
    d.ellipse([5, 7, 17, 13], fill=POT)
    # bayangan bawah
    for xx in range(7, 18):
        px(d, xx, 15, POT_D)
    # kilau
    fill(d, 6, 7, 3, 2, POT_L)
    px(d, 6, 9, POT_L)
    # mata kentang (halus)
    for (x, y) in [(10, 9), (14, 8), (8, 12), (13, 12), (16, 11)]:
        px(d, x, y, POT_D)
    return add_outline(img)


def main():
    items = {
        "jagung": jagung(),
        "tomat": tomat(),
        "wortel": wortel(),
        "kentang": kentang(),
    }
    for name, img in items.items():
        path = os.path.join(OUT, f"item-{name}.png")
        img.save(path)
        print("wrote", path, img.size)

    # lembar review: 4 sprite berjejer di latar papan rak
    scale = 8
    pad = 14
    sheet = Image.new(
        "RGB",
        ((W * scale + pad) * 4 + pad, H * scale + pad * 2),
        (122, 74, 34),
    )
    for i, name in enumerate(["jagung", "tomat", "wortel", "kentang"]):
        big = items[name].resize((W * scale, H * scale), Image.NEAREST)
        sheet.paste(big, (pad + i * (W * scale + pad), pad), big)
    sheet.save(os.path.join(ROOT, "docs", "items-preview.png"))
    print("preview docs/items-preview.png")


if __name__ == "__main__":
    main()
