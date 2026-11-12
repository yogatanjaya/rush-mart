"""
Pasar Pagi — generator sprite NPC pelanggan minimarket (16-bit pixel art).

7 warga desa, 4 arah hadap, 2 frame jalan. Kanvas 20x26 — sama dengan sprite
pemain — supaya ukuran, titik pijak, dan physics body identik, jadi bisa
langsung dipakai di Phaser tanpa mengubah logika NPC.

Jalankan:  python scripts/gen_npc_assets.py
Output:    public/assets/pixel/npc-<desain>-<arah>-<frame>.png  (56 file)
           docs/npc-sheet.png  (lembar cek, 4x)
"""

import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "assets", "pixel"))
DOCS = os.path.join(ROOT, "docs")

W, H = 20, 26

OUTLINE = (36, 20, 8, 255)
DIRS = ("down", "up", "left", "right")

SKIN = "#E8B98F"
SKIN_D = "#C99468"
SKIN_L = "#F5D0AC"
DARK = "#2A1B10"
BOOT = "#4A3220"


# ── Bantuan warna ─────────────────────────────────────────────────────────────
def _rgb(c):
    return tuple(int(c[i : i + 2], 16) for i in (1, 3, 5))


def mix(c, other, t):
    a, b = _rgb(c), _rgb(other)
    return "#%02X%02X%02X" % tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def light(c, t=0.28):
    return mix(c, "#FFFFFF", t)


def dark(c, t=0.32):
    return mix(c, "#000000", t)


def rect(d, x, y, w, h, c):
    if w <= 0 or h <= 0:
        return
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


# ── Data 7 warga desa ─────────────────────────────────────────────────────────
NPCS = {
    # Ibu desa: celemek putih, gaun cokelat, keranjang sayur
    "ibu": dict(
        hair="#5A3520",
        hair_style="bun",
        top="#EFE3CB",
        bottom="#6B4630",
        apron="#FBF6EA",
        prop="basket",
    ),
    # Petani: topi jerami, janggut abu, rompi cokelat, celana hijau
    "petani": dict(
        hair="#B9B6AE",
        hair_style="short",
        beard=True,
        hat="straw",
        top="#8A6B45",
        bottom="#4C6B3A",
        prop="sack",
    ),
    # Gadis: ekor kuda, atasan merah, jeans biru, kantong kertas
    "gadis": dict(
        hair="#3A2216",
        hair_style="ponytail",
        top="#C0453F",
        bottom="#2F4E86",
        prop="paperbag",
    ),
    # Pemuda: topi cap, jaket navy, jeans gelap, keranjang
    "pemuda": dict(
        hair="#3A2A18",
        hair_style="short",
        hat="cap",
        top="#24304A",
        bottom="#2E3A55",
        prop="basket",
    ),
    # Pemuda desa: topi cokelat, mantel cokelat, keranjang
    "pemuda_desa": dict(
        hair="#4A3020",
        hair_style="short",
        hat="brownhat",
        top="#7A5232",
        bottom="#4A3520",
        prop="basket",
    ),
    # Nenek: sanggul abu, selendang merah, tas tangan
    "nenek": dict(
        hair="#B0AAA2",
        hair_style="bun",
        shawl="#A03A3A",
        top="#B59A78",
        bottom="#6B5A44",
        prop="handbag",
    ),
    # Anak kecil: kaos hijau, celana pendek, memegang tomat
    "anak": dict(
        child=True,
        hair="#4A2C18",
        top="#4E9A4A",
        bottom="#2F4E86",
    ),
}


# ── Props ─────────────────────────────────────────────────────────────────────
def draw_basket(d, x, y):
    """Keranjang anyaman berisi sayur. (x, y) = sudut kiri-atas. 7x7 px."""
    # isi menjulang di atas bibir keranjang
    d.point((x + 2, y), fill="#4E8A3A")
    d.point((x + 3, y), fill="#5DA84A")
    d.point((x + 4, y), fill="#E08A2E")
    d.point((x + 5, y), fill="#C4402F")
    d.point((x + 3, y + 1), fill="#4E8A3A")
    # pegangan
    d.point((x + 6, y + 1), fill="#B98450")
    # bibir
    rect(d, x, y + 1, 6, 1, "#D8A868")
    # badan
    rect(d, x + 1, y + 2, 4, 4, "#A9743C")
    for i in range(2):
        d.line([(x + 2 + i * 2, y + 2), (x + 2 + i * 2, y + 5)], fill="#8A5A2E")
    rect(d, x + 1, y + 6, 4, 1, "#7A4E26")


def draw_paperbag(d, x, y):
    """Kantong kertas belanjaan. 6x7 px."""
    d.point((x + 2, y), fill="#4E8A3A")
    d.point((x + 4, y), fill="#5DA84A")
    d.point((x + 3, y + 1), fill="#4E8A3A")
    rect(d, x + 1, y + 1, 5, 1, "#8A6236")
    rect(d, x + 1, y + 2, 5, 5, "#C09A62")
    rect(d, x + 2, y + 3, 3, 3, "#B08A52")
    d.line([(x + 3, y + 2), (x + 3, y + 6)], fill="#8A6236")


def draw_sack(d, x, y):
    """Karung goni kecil di bahu. 6x7 px."""
    rect(d, x + 1, y, 4, 2, "#B4BEC0")
    rect(d, x, y + 2, 6, 5, "#96754C")
    rect(d, x + 1, y + 2, 4, 4, "#C2A075")
    rect(d, x + 1, y + 2, 4, 1, "#D9BE97")
    d.point((x + 3, y + 6), fill="#7A5A38")


def draw_handbag(d, x, y):
    """Tas tangan kecil. (x, y) = sudut kiri-atas. 6x6 px."""
    rect(d, x + 2, y - 1, 2, 2, "#7A4A28")
    rect(d, x + 1, y + 1, 4, 1, "#8A5A34")
    rect(d, x, y + 2, 6, 4, "#6B3A28")
    rect(d, x + 1, y + 2, 4, 1, "#8A5236")
    d.point((x + 1, y + 4), fill="#C9A227")


def draw_tomato(d, x, y):
    rect(d, x, y, 3, 3, "#C4402F")
    d.point((x + 1, y), fill="#4E8A3A")
    d.point((x + 1, y + 1), fill="#D9584A")


# ── Kepala & rambut ───────────────────────────────────────────────────────────
def draw_head(d, cfg, direction):
    hair = cfg["hair"]
    hair_l = light(hair, 0.22)
    style = cfg.get("hair_style", "short")

    rect(d, 6, 5, 8, 5, SKIN)
    rect(d, 6, 9, 8, 1, SKIN_D)

    if direction == "up":
        # belakang kepala: penuh rambut
        rect(d, 6, 5, 8, 4, hair)
        rect(d, 7, 5, 6, 2, hair_l)
        rect(d, 6, 9, 8, 1, hair)
    else:
        rect(d, 6, 5, 8, 1, hair)
        rect(d, 6, 6, 1, 2, hair)
        rect(d, 13, 6, 1, 2, hair)

        if direction == "down":
            d.point((7, 7), fill=DARK)
            d.point((12, 7), fill=DARK)
            d.point((9, 8), fill=SKIN_D)
            d.point((10, 8), fill=SKIN_D)
            d.point((7, 6), fill=SKIN_L)
        elif direction == "left":
            d.point((7, 7), fill=DARK)
            rect(d, 6, 6, 2, 3, hair)
        else:
            d.point((12, 7), fill=DARK)
            rect(d, 12, 6, 2, 3, hair)

        if cfg.get("beard"):
            rect(d, 6, 9, 8, 2, hair)
            rect(d, 7, 8, 1, 1, hair)
            rect(d, 12, 8, 1, 1, hair)

    # gaya rambut tambahan
    if style == "bun":
        if direction == "up":
            rect(d, 8, 2, 4, 3, hair)
            rect(d, 9, 2, 2, 1, hair_l)
        else:
            rect(d, 8, 4, 4, 1, hair)
            rect(d, 9, 3, 2, 1, hair)
    elif style == "ponytail":
        if direction == "up":
            rect(d, 9, 8, 3, 4, hair)
            rect(d, 10, 9, 1, 2, hair_l)
        elif direction == "left":
            rect(d, 13, 6, 2, 4, hair)
            d.point((14, 9), fill=hair_l)
        else:
            rect(d, 5, 6, 2, 4, hair)
            d.point((5, 9), fill=hair_l)


# ── Topi ──────────────────────────────────────────────────────────────────────
def draw_hat(d, cfg, direction):
    hat = cfg.get("hat")
    if not hat:
        return
    if hat == "straw":
        rect(d, 6, 2, 8, 2, "#D9B355")
        rect(d, 4, 4, 12, 1, "#B8922E")
        rect(d, 5, 3, 10, 1, "#E6C86E")
        rect(d, 7, 1, 6, 1, "#D9B355")
        rect(d, 7, 3, 6, 1, "#8A6A20")
    elif hat == "cap":
        rect(d, 5, 2, 10, 2, "#A08E6A")
        rect(d, 6, 1, 8, 1, "#BFAE86")
        if direction == "right":
            rect(d, 5, 4, 10, 1, "#6B5C40")
        else:
            rect(d, 4, 4, 10, 1, "#6B5C40")
    elif hat == "brownhat":
        rect(d, 5, 2, 10, 2, "#8A6440")
        rect(d, 6, 1, 8, 1, "#A07A52")
        rect(d, 4, 3, 12, 1, "#9A7450")
        rect(d, 3, 4, 14, 1, "#523820")


# ── Badan, lengan, kaki ───────────────────────────────────────────────────────
def draw_body(d, cfg, direction, frame):
    top = cfg["top"]
    bottom = cfg["bottom"]
    skin_d = SKIN_D

    # lengan
    if direction in ("down", "up"):
        rect(d, 3, 11, 2, 4, SKIN)
        rect(d, 15, 11, 2, 4, SKIN)
        rect(d, 15, 14, 2, 1, skin_d)
    elif direction == "left":
        rect(d, 3, 11, 3, 4, SKIN)
        rect(d, 3, 14, 3, 1, skin_d)
        rect(d, 13, 12, 2, 3, skin_d)
    else:
        rect(d, 4, 12, 2, 3, skin_d)
        rect(d, 15, 11, 3, 4, SKIN)
        rect(d, 15, 14, 3, 1, skin_d)

    # badan
    rect(d, 5, 10, 10, 8, top)
    rect(d, 5, 10, 10, 1, light(top, 0.3))

    # selendang (nenek)
    if cfg.get("shawl"):
        rect(d, 5, 10, 10, 2, cfg["shawl"])
        rect(d, 8, 12, 4, 3, cfg["shawl"])
        rect(d, 8, 12, 4, 1, light(cfg["shawl"], 0.3))

    # celemek (ibu) — tidak digambar saat menghadap belakang
    if cfg.get("apron") and direction != "up":
        rect(d, 7, 12, 6, 6, cfg["apron"])
        rect(d, 8, 11, 4, 1, cfg["apron"])
        rect(d, 7, 17, 6, 1, dark(cfg["apron"], 0.18))

    # kaki + sepatu
    if frame == 1:
        rect(d, 7, 18, 3, 4, bottom)
        rect(d, 11, 18, 3, 4, bottom)
        rect(d, 6, 22, 4, 2, BOOT)
        rect(d, 11, 22, 4, 2, BOOT)
    else:
        rect(d, 7, 18, 3, 3, bottom)
        rect(d, 11, 18, 3, 4, bottom)
        rect(d, 6, 21, 4, 2, BOOT)
        rect(d, 11, 22, 4, 2, BOOT)

    # bawaan — hanya terlihat kalau menghadap kita / menyamping
    prop = cfg.get("prop")
    if prop and direction != "up":
        if prop == "basket":
            draw_basket(d, 1, 12)
        elif prop == "paperbag":
            draw_paperbag(d, 1, 12)
        elif prop == "handbag":
            draw_handbag(d, 11, 13)
        elif prop == "sack":
            draw_sack(d, 1, 12)


def draw_child(d, cfg, direction, frame):
    """Anak kecil: badan lebih pendek, kepala lebih besar."""
    rect(d, 7, 20, 2, 3, cfg["bottom"])
    rect(d, 11, 20, 2, 3, cfg["bottom"])
    rect(d, 6, 23, 4, 2, BOOT)
    rect(d, 11, 23, 4, 2, BOOT)

    rect(d, 6, 13, 8, 7, cfg["top"])
    rect(d, 6, 13, 8, 1, light(cfg["top"], 0.3))
    rect(d, 4, 14, 2, 4, SKIN)
    rect(d, 14, 14, 2, 4, SKIN)

    # kepala besar
    rect(d, 6, 7, 8, 6, SKIN)
    rect(d, 6, 12, 8, 1, SKIN_D)
    rect(d, 6, 6, 8, 2, cfg["hair"])
    rect(d, 5, 7, 1, 3, cfg["hair"])
    rect(d, 14, 7, 1, 3, cfg["hair"])
    if direction == "up":
        rect(d, 6, 7, 8, 4, cfg["hair"])
    else:
        d.point((7, 9), fill=DARK)
        d.point((12, 9), fill=DARK)
        d.point((9, 11), fill=SKIN_D)

    # tangan mengangkat tomat
    rect(d, 14, 9, 2, 4, SKIN)
    draw_tomato(d, 13, 6)


# ── Outline ───────────────────────────────────────────────────────────────────
def with_outline(img, color=OUTLINE, thresh=140):
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


def draw_npc(cfg, direction, frame):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # bayangan
    d.ellipse([3, 23, 16, 25], fill=(0, 0, 0, 55))

    if cfg.get("child"):
        draw_child(d, cfg, direction, frame)
        return with_outline(img)

    # tas/ransel di punggung hanya untuk arah tertentu (variasi silhouette)
    draw_body(d, cfg, direction, frame)
    draw_head(d, cfg, direction)
    draw_hat(d, cfg, direction)
    return with_outline(img)


def main():
    for name, cfg in NPCS.items():
        for direction in DIRS:
            for frame in (1, 2):
                spr = draw_npc(cfg, direction, frame)
                spr.save(os.path.join(OUT, f"npc-{name}-{direction}-{frame}.png"))

    # Lembar cek: tiap baris satu desain, kolom = down/left/right/up
    Z = 4
    cw, ch = W * Z, H * Z
    cols = 4
    sheet = Image.new("RGBA", (cols * cw, len(NPCS) * ch), (250, 246, 236, 255))
    for row, name in enumerate(NPCS):
        cfg = NPCS[name]
        for col, direction in enumerate(("down", "left", "right", "up")):
            spr = draw_npc(cfg, direction, 1).resize((cw, ch), Image.NEAREST)
            sheet.alpha_composite(spr, (col * cw, row * ch))
    sheet.convert("RGB").save(os.path.join(DOCS, "npc-sheet.png"))
    print(f"{len(NPCS) * 8} file NPC ditulis ke {OUT}")
    print("lembar cek:", os.path.join(DOCS, "npc-sheet.png"))


if __name__ == "__main__":
    main()
