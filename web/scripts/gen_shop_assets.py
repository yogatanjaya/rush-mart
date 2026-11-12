"""
Pasar Pagi — generator aset pixel art untuk popup TOKO BIBIT.

Kanvas kecil (80x80 / 24x24) lalu di-upscale NEAREST supaya pixel-nya
tetap kotak dan tajam. Tidak ada antialias di mana pun.

Output (web/public/assets/pixel/):
  shop-frame.png          bingkai kayu 9-slice, 160x160, slice 32
  icon-pixel-jagung.png
  icon-pixel-tomat.png
  icon-pixel-wortel.png
  icon-pixel-kentang.png
  icon-pixel-sprout.png

Jalankan: python scripts/gen_shop_assets.py
"""

import os

from PIL import Image, ImageChops, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)

# ── Palet kayu & kertas ───────────────────────────────────────────────────────
WOOD_HI = (198, 148, 98, 255)
WOOD = (138, 90, 52, 255)
WOOD_MID = (122, 74, 34, 255)
WOOD_DK = (94, 53, 23, 255)
OUTLINE = (42, 22, 8, 255)

GREEN = (78, 155, 58, 255)
GREEN_D = (47, 107, 51, 255)
GREEN_L = (108, 190, 82, 255)


def rounded_mask(w, h, inset=0, c=8, step=4):
    """Mask persegi dengan sudut bertangga (pixel-art rounded)."""
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    x0, y0 = inset, inset
    x1, y1 = w - inset - 1, h - inset - 1
    d.rectangle([x0, y0, x1, y1], fill=255)
    d.rectangle([x0, y0, x0 + c - 1, y0 + step - 1], fill=0)
    d.rectangle([x0, y0, x0 + step - 1, y0 + c - 1], fill=0)
    d.rectangle([x1 - c + 1, y0, x1, y0 + step - 1], fill=0)
    d.rectangle([x1 - step + 1, y0, x1, y0 + c - 1], fill=0)
    d.rectangle([x0, y1 - step + 1, x0 + c - 1, y1], fill=0)
    d.rectangle([x0, y1 - c + 1, x0 + step - 1, y1], fill=0)
    d.rectangle([x1 - c + 1, y1 - step + 1, x1, y1], fill=0)
    d.rectangle([x1 - step + 1, y1 - c + 1, x1, y1], fill=0)
    return m


def build_frame():
    """Bingkai kayu 9-slice: sudut luar bertangga, tepi dalam lurus."""
    W = 80
    T = 16  # tebal bingkai (art px)

    outer = rounded_mask(W, W, inset=0, c=8, step=4)
    inner = rounded_mask(W, W, inset=2, c=6, step=4)

    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    img.paste(Image.new("RGBA", (W, W), OUTLINE), (0, 0), outer)
    img.paste(Image.new("RGBA", (W, W), WOOD), (0, 0), inner)

    d = ImageDraw.Draw(img)

    # serat kayu (rata sepanjang tepi -> aman saat di-tile)
    d.line([8, 7, 71, 7], fill=WOOD_MID)
    d.line([8, 10, 71, 10], fill=WOOD_MID)
    d.line([8, 71, 71, 71], fill=WOOD_MID)
    d.line([7, 8, 7, 71], fill=WOOD_MID)
    d.line([10, 8, 10, 71], fill=WOOD_MID)
    d.line([71, 8, 71, 71], fill=WOOD_MID)

    # bevel: atas/kiri terang, bawah/kanan gelap
    d.rectangle([8, 2, 71, 3], fill=WOOD_HI)
    d.rectangle([2, 8, 3, 71], fill=WOOD_HI)
    d.rectangle([8, 76, 71, 77], fill=WOOD_DK)
    d.rectangle([76, 8, 77, 71], fill=WOOD_DK)

    # lubang kertas
    hole = Image.new("L", (W, W), 0)
    ImageDraw.Draw(hole).rectangle([T, T, W - T - 1, W - T - 1], fill=255)
    img.paste((0, 0, 0, 0), (0, 0), hole)

    # garis dalam gelap 2px mengelilingi lubang
    ring = Image.new("L", (W, W), 0)
    ImageDraw.Draw(ring).rectangle([T - 2, T - 2, W - T + 1, W - T + 1], fill=255)
    img.paste(Image.new("RGBA", (W, W), OUTLINE), (0, 0), ImageChops.subtract(ring, hole))

    return img.resize((W * 2, W * 2), Image.NEAREST)


def _icon():
    return Image.new("RGBA", (24, 24), (0, 0, 0, 0)), None


def icon_corn():
    img, _ = _icon()
    d = ImageDraw.Draw(img)
    # daun
    d.polygon([(11, 5), (5, 2), (4, 8), (9, 10)], fill=GREEN, outline=GREEN_D)
    d.polygon([(13, 5), (19, 2), (20, 8), (15, 10)], fill=GREEN, outline=GREEN_D)
    # tongkol
    d.rounded_rectangle([9, 6, 15, 21], radius=3, fill=(242, 199, 68, 255), outline=(138, 90, 16, 255))
    # biji-biji
    for y in range(8, 20, 2):
        for x in range(10, 15, 2):
            d.rectangle([x, y, x, y], fill=(210, 158, 40, 255))
    return img


def icon_tomato():
    img, _ = _icon()
    d = ImageDraw.Draw(img)
    d.ellipse([4, 7, 20, 22], fill=(216, 64, 47, 255), outline=(122, 31, 22, 255))
    d.ellipse([7, 9, 12, 13], fill=(240, 106, 82, 255))
    d.rectangle([11, 4, 13, 8], fill=GREEN_D, outline=GREEN_D)
    d.polygon([(7, 8), (11, 5), (12, 9), (8, 11)], fill=GREEN, outline=GREEN_D)
    d.polygon([(17, 8), (13, 5), (12, 9), (16, 11)], fill=GREEN, outline=GREEN_D)
    return img


def icon_carrot():
    img, _ = _icon()
    d = ImageDraw.Draw(img)
    d.polygon([(8, 7), (16, 7), (12, 22)], fill=(232, 130, 58, 255), outline=(138, 74, 20, 255))
    for y in range(10, 20, 3):
        d.line([10, y, 14, y], fill=(242, 160, 94, 255))
    d.polygon([(9, 7), (5, 2), (10, 4)], fill=GREEN, outline=GREEN_D)
    d.polygon([(12, 7), (12, 1), (14, 5)], fill=GREEN_L, outline=GREEN_D)
    d.polygon([(15, 7), (19, 3), (16, 8)], fill=GREEN, outline=GREEN_D)
    return img


def icon_potato():
    img, _ = _icon()
    d = ImageDraw.Draw(img)
    d.ellipse([3, 7, 21, 21], fill=(168, 122, 70, 255), outline=(91, 58, 28, 255))
    d.ellipse([6, 9, 11, 13], fill=(196, 156, 100, 255))
    for x, y in ((10, 16), (14, 12), (17, 17), (7, 18)):
        d.rectangle([x, y, x + 1, y + 1], fill=(122, 84, 48, 255))
    return img


def icon_sprout():
    img, _ = _icon()
    d = ImageDraw.Draw(img)
    d.rectangle([11, 12, 12, 22], fill=GREEN_D)
    d.polygon([(12, 15), (4, 10), (5, 5), (12, 10)], fill=GREEN_L, outline=GREEN_D)
    d.polygon([(12, 13), (20, 7), (19, 2), (12, 8)], fill=GREEN, outline=GREEN_D)
    return img


# ── Kantong bibit (paket seed) ────────────────────────────────────────────────
# Dipakai di popup TOKO BIBIT dan bagian BIBIT TANAMAN di inventory. Buahnya
# sendiri tetap pakai icon_corn/tomato/carrot/potato di atas.
PAPER_L = (248, 226, 184, 255)
PAPER = (226, 196, 146, 255)
PAPER_D = (186, 152, 104, 255)
PAPER_DK = (146, 114, 72, 255)


def _packet(label_rgb):
    """Kantong kertas 24x24 dengan jendela label berwarna."""
    img, _ = _icon()
    d = ImageDraw.Draw(img)
    ink = OUTLINE
    # badan kantong
    d.rectangle([4, 5, 19, 21], fill=PAPER, outline=ink)
    # kilau kiri + bayangan kanan
    d.rectangle([5, 7, 6, 20], fill=PAPER_L)
    d.rectangle([18, 7, 18, 20], fill=PAPER_D)
    # lipatan atas (segitiga kertas)
    d.rectangle([4, 5, 19, 7], fill=PAPER_D, outline=ink)
    d.rectangle([4, 4, 19, 4], fill=ink)
    d.point([(6, 4), (13, 4)], fill=PAPER_L)
    # jendela label
    d.rectangle([7, 9, 16, 16], fill=label_rgb, outline=ink)
    d.rectangle([8, 10, 15, 10], fill=tuple(min(255, c + 40) for c in label_rgb[:3]) + (255,))
    # dasar kantong lebih gelap
    d.rectangle([5, 19, 18, 20], fill=PAPER_D)
    # jahitan tepi
    for y in (12, 15):
        d.point([(4, y), (19, y)], fill=PAPER_DK)
    return img


def icon_packet_corn():
    img = _packet((242, 199, 68, 255))
    d = ImageDraw.Draw(img)
    # biji jagung: tiga titik kuning tua
    for x in (10, 12, 14):
        d.rectangle([x, 12, x, 13], fill=(160, 112, 24, 255))
    d.rectangle([11, 11, 13, 11], fill=(255, 238, 170, 255))
    return img


def icon_packet_tomato():
    img = _packet((216, 64, 47, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([10, 12, 13, 14], fill=(255, 148, 128, 255))
    d.rectangle([11, 11, 12, 11], fill=GREEN_L)
    d.rectangle([9, 12, 9, 13], fill=GREEN_D)
    d.rectangle([14, 12, 14, 13], fill=GREEN_D)
    return img


def icon_packet_carrot():
    img = _packet((232, 130, 58, 255))
    d = ImageDraw.Draw(img)
    d.polygon([(11, 11), (13, 11), (12, 15)], fill=(255, 190, 130, 255))
    d.rectangle([11, 10, 12, 10], fill=GREEN_L)
    return img


def icon_packet_potato():
    img = _packet((168, 122, 70, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([10, 12, 13, 14], fill=(214, 176, 122, 255))
    for x, y in ((10, 13), (13, 12)):
        d.rectangle([x, y, x, y], fill=(110, 76, 40, 255))
    return img


PACKETS = {
    "jagung": icon_packet_corn,
    "tomat": icon_packet_tomato,
    "wortel": icon_packet_carrot,
    "kentang": icon_packet_potato,
}



# ── Koin emas ─────────────────────────────────────────────────────────────────
# Logo koin untuk harga bibit dan saldo. Art 16x16, di-upscale 2x jadi 32x32
# supaya tetap tajam saat dipakai di 16px (downscale 2:1, tanpa blur).
GOLD = (224, 168, 60, 255)
GOLD_L = (242, 199, 68, 255)
GOLD_D = (176, 120, 30, 255)
GOLD_HI = (255, 246, 192, 255)


def icon_coin():
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([1, 1, 14, 14], fill=GOLD, outline=OUTLINE)
    d.ellipse([3, 3, 12, 12], outline=GOLD_D)
    d.ellipse([4, 4, 11, 11], outline=GOLD_L)
    # kilau atas-kiri
    d.rectangle([5, 4, 6, 4], fill=GOLD_HI)
    d.rectangle([4, 5, 4, 6], fill=GOLD_HI)
    # bayangan bawah
    d.rectangle([5, 12, 10, 12], fill=GOLD_D)
    return img.resize((32, 32), Image.NEAREST)


def main():
    build_frame().save(os.path.join(OUT, "shop-frame.png"))
    icon_coin().save(os.path.join(OUT, "coin.png"))
    icon_corn().save(os.path.join(OUT, "icon-pixel-jagung.png"))
    icon_tomato().save(os.path.join(OUT, "icon-pixel-tomat.png"))
    icon_carrot().save(os.path.join(OUT, "icon-pixel-wortel.png"))
    icon_potato().save(os.path.join(OUT, "icon-pixel-kentang.png"))
    icon_sprout().save(os.path.join(OUT, "icon-pixel-sprout.png"))
    for crop, fn in PACKETS.items():
        fn().save(os.path.join(OUT, f"icon-packet-{crop}.png"))

    for f in sorted(os.listdir(OUT)):
        if f.startswith("shop-frame") or f.startswith("icon-pixel") or f.startswith("icon-packet") or f.startswith("coin"):
            print(" -", f)


if __name__ == "__main__":
    main()
