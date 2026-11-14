// Rush Mart — MinimarketScene (Tahap 3 · langkah 2 & 3)
//
// Panggung toko: lantai keramik, 4 rak kayu (jagung, tomat, wortel, kentang),
// meja kasir di kanan atas, pintu pelanggan di kanan bawah. Pemain jalan bebas.
//
// Langkah 2: klik rak untuk mengisi dari inventory hasil panen.
// Langkah 3: pelanggan NPC masuk lewat pintu, belanja ke rak, mengantri di
// kasir. Pemain harus berdiri di area kasir untuk melayani. Hari toko berjalan
// 180 detik; satu pelanggan datang tiap 15 detik (12 per hari). Sabar 30 detik.
//
// Ekonomi (koin, bibit, inventory) dibaca dari modul economy bersama supaya
// pindah scene tidak menghilangkan uang atau hasil panen.

import Phaser from "phaser";
import {
  CROPS,
  GOAL_COINS,
  type CropId,
  type PaymentRequest,
  type WorldSnapshot,
} from "../types";
import { economy, saleProfit } from "../economy";
import { goToScene, payNudge } from "../ui";
import { isPlaying } from "../flow";
import { recordSale, recordFail, recordRefill } from "../../near/wallet";

const W = 1280;
const H = 720;

/** Ruangan toko. Dinding atas/bawah/kiri/kanan digambar di dalam area ini. */
const ROOM = { x: 40, y: 120, w: 1200, h: 560 };

/** Rak dianggap perlu diisi kalau stok tinggal segini atau kurang. */
const FILL_HINT_AT = 8;

const SHELF_W = 200;
const SHELF_H = 150;
/** Satu rak = 3 baris x 5 item = 15 slot. */
const SHELF_COLS = 5;
const SHELF_ROWS = 3;
const SHELF_SLOTS = SHELF_COLS * SHELF_ROWS;

/** 4 rak: dua kolom, dua baris. */
const SHELF_POS: { crop: CropId; x: number; y: number }[] = [
  { crop: "jagung", x: 90, y: 216 },
  { crop: "tomat", x: 370, y: 216 },
  { crop: "wortel", x: 90, y: 430 },
  { crop: "kentang", x: 370, y: 430 },
];

const COUNTER = { x: 798, y: 216, w: 364, h: 76 };

// Pemain muncul di tengah karpet kasir (pusat CASHIER_MAT 916+64, 140+28),
// bukan lagi di pintu ENTRY, supaya langsung terlihat saat masuk minimarket.
const PLAYER_SPAWN = { x: 980, y: 168 };

// Pintu kayu ke kebun di kiri bawah (digambar di market-bg oleh generator).
const FARM_DOOR = { x: 132, y: 596, w: 92, h: 84 };
const DOOR_REACH = 120;

/**
 * Traffic pelanggan berbasis gelombang (disetujui Bos Yoga):
 * 2–3 orang datang berdekatan (jarak 1–2 detik), lalu 1 orang menyusul di
 * tengah jeda, lalu gelombang berikutnya. Jeda antar gelombang 15–25 detik.
 */
const WAVE_SIZE = { min: 2, max: 3 };
const WAVE_GAP_SEC = { min: 1, max: 2 };
const WAVE_PAUSE_SEC = { min: 15, max: 25 };

/**
 * Stok yang sudah ada di rak saat game dimulai. Ini "dagangan contoh" supaya
 * pemain bisa langsung jualan tanpa menanam dulu; tidak memotong inventory.
 */
const START_STOCK: Record<CropId, number> = { jagung: 11, tomat: 10, wortel: 12, kentang: 10 };
/** Kesabaran pelanggan: 40 detik, dihitung sejak ia JADI ORANG PERTAMA di antrian. */
const PATIENCE_MS = 40000;
/** Pecahan uang yang dipakai pelanggan membayar. */
const BILLS = [10, 20, 50, 100];

/** Pemain harus berdiri di karpet hijau ini (di belakang meja) supaya bisa melayani. */
/** Kotak karpet hijau di latar: dipakai untuk sorotan DAN area pemain berdiri. */
const CASHIER_MAT = { x: 916, y: 140, w: 128, h: 56 };
/** Tempat pelanggan berdiri saat membayar (di atas karpet, x = 980). */
const QUEUE_SLOTS = [
  { x: 980, y: 320 },
  { x: 980, y: 358 },
  { x: 980, y: 396 },
  // dua slot tambahan mengantri di lantai (karpet tidak diperpanjang)
  { x: 980, y: 434 },
  { x: 980, y: 472 },
];

/** 7 warga desa (lihat scripts/gen_npc_assets.py). */
const NPC_DESIGNS = ["ibu", "petani", "gadis", "pemuda", "pemuda_desa", "nenek", "anak"] as const;
type NpcDesign = (typeof NPC_DESIGNS)[number];

/**
 * Profil belanja tiap warga (docs/NPC-PROFILING.md).
 * kinds = jumlah jenis barang, qty = jumlah per jenis.
 * `prefer` = urutan kesukaan; makin depan makin sering diambil.
 */
interface NpcProfile {
  design: NpcDesign;
  name: string;
  minKinds: number;
  maxKinds: number;
  minQty: number;
  maxQty: number;
  prefer: CropId[];
}

const NPC_PROFILES: NpcProfile[] = [
  {
    design: "ibu",
    name: "Village Woman",
    minKinds: 2,
    maxKinds: 3,
    minQty: 2,
    maxQty: 3,
    prefer: ["kentang", "tomat", "jagung", "wortel"],
  },
  {
    design: "petani",
    name: "Old Farmer",
    minKinds: 1,
    maxKinds: 2,
    minQty: 1,
    maxQty: 2,
    prefer: ["jagung", "kentang", "wortel", "tomat"],
  },
  {
    design: "gadis",
    name: "Village Girl",
    minKinds: 2,
    maxKinds: 2,
    minQty: 1,
    maxQty: 2,
    prefer: ["tomat", "wortel", "jagung", "kentang"],
  },
  {
    design: "pemuda",
    name: "Young Man",
    minKinds: 2,
    maxKinds: 3,
    minQty: 1,
    maxQty: 3,
    prefer: ["jagung", "tomat", "kentang", "wortel"],
  },
  {
    design: "pemuda_desa",
    name: "Village Youth",
    minKinds: 2,
    maxKinds: 2,
    minQty: 3,
    maxQty: 4,
    prefer: ["kentang", "tomat", "jagung", "wortel"],
  },
  {
    design: "nenek",
    name: "Village Grandma",
    minKinds: 1,
    maxKinds: 2,
    minQty: 1,
    maxQty: 1,
    prefer: ["wortel", "jagung", "tomat", "kentang"],
  },
  {
    design: "anak",
    name: "Village Kid",
    minKinds: 1,
    maxKinds: 1,
    minQty: 1,
    maxQty: 1,
    prefer: ["jagung", "tomat", "wortel", "kentang"],
  },
];

/** Nama tampilan NPC dari id desainnya (dipakai saat mencatat ke chain). */
function npcName(id: NpcDesign) {
  return NPC_PROFILES.find((p) => p.design === id)?.name ?? String(id);
}


/** Lorong vertikal di celah antar kolom rak — dipakai untuk pindah baris. */
const LANE_X = 330;
/** Lama pelanggan "mengambil barang" saat sampai di satu rak. */
const PICK_MS = 1000;
/** Titik pintu masuk pelanggan. */
const DOOR_X = 979;
const DOOR_Y = 596;

interface Customer {
  sprite: Phaser.Physics.Arcade.Sprite;
  /** Model karakter yang dipakai pelanggan ini. */
  design: NpcDesign;
  /** Daftar belanja: rak mana saja yang dikunjungi dan berapa banyak. */
  plan: { crop: CropId; qty: number }[];
  /** Indeks rak yang sedang dituju (0..plan.length-1). */
  planIndex: number;
  cart: CropId[];
  state: "toShelf" | "shopping" | "toCashier" | "toQueue" | "waiting" | "leaving";
  path: { x: number; y: number }[];
  waitUntil: number;
  patienceUntil: number;
  slot: number;
  lastDir: "down" | "up" | "left" | "right";
  serving: number;
  /** Sudah pernah memicu notice "someone wants to pay". */
  nudged?: boolean;
  /** y jalur aman menuju kasir (di bawah rak baris 1 atau baris 2). */
  rowY: number;
}

interface Shelf {
  crop: CropId;
  x: number;
  y: number;
  slots: (CropId | null)[];
  items: (Phaser.GameObjects.Image | null)[];
  badge: Phaser.GameObjects.Text;
  /** Peringatan "FILL YOUR DISPLAY" di dalam rak (berkedip saat stok menipis). */
  hint: Phaser.GameObjects.Text;
  outline: Phaser.GameObjects.Rectangle;
}

export class MinimarketScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;

  /** Suara koin memakai pemutar HTML (Phaser tetap "terkunci" karena klik
   *  terjadi di tombol React, bukan di kanvas). */
  private coinSfx?: HTMLAudioElement;
  private failSfx?: HTMLAudioElement;
  private enterSfx?: HTMLAudioElement;
  private refillSfx?: HTMLAudioElement;
  /** Waktu terakhir tiap SFX diputar (kunci: src), untuk jeda minimum. */
  private sfxLastAt: Record<string, number> = {};
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  /** True kalau halaman minimarket yang sedang ditampilkan. */
  private front = true;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastDir: "down" | "up" | "left" | "right" = "down";

  notice: string | null = null;
  private noticeUntil = 0;
  private shelves: Shelf[] = [];
  private customers: Customer[] = [];
  private queue: Customer[] = [];

  private storeState: "closed" | "open" | "ended" = "closed";
  private spawned = 0;

  /** Transaksi yang sedang menunggu dihitung pemain. */
  private paymentRequest: PaymentRequest | null = null;
  private pendingCustomer: Customer | null = null;
  private paymentSeq = 0;
  private cashierMat: Phaser.GameObjects.Rectangle | null = null;
  /** Tulisan "STAY HERE / PRESS NPC" di dalam panel karpet kasir. */
  private cashierHint: Phaser.GameObjects.Text | null = null;
  private matBlink: Phaser.Tweens.Tween | null = null;

  constructor() {
    // active: false → scene terdaftar tapi tidak ikut start otomatis.
    // FarmScene yang jalan duluan; minimarket baru dibangun saat dipindah.
    super({ key: "MinimarketScene", active: false });
  }

  preload() {
    const base = "assets/";
    // Tekstur global milik Phaser. Scene farm sudah memuat sebagian; jangan
    // memuat ulang key yang sama supaya tidak ada peringatan texture dobel.
    const loadIfMissing = (key: string, file: string) => {
      if (!this.textures.exists(key)) this.load.svg(key, base + file);
    };

    if (!this.textures.exists("market-bg")) {
      this.load.image("market-bg", base + "pixel/market-bg.png?v=11");
    }
    for (const crop of ["jagung", "tomat", "wortel", "kentang"]) {
      if (!this.textures.exists(`item-${crop}`)) {
        this.load.image(`item-${crop}`, base + `pixel/item-${crop}.png`);
      }
    }
    if (!this.textures.exists("coin-icon")) {
      this.load.image("coin-icon", base + "pixel/coin.png");
    }

    for (const dir of ["down", "up", "left", "right"]) {
      for (const frame of [1, 2]) {
        loadIfMissing(`player-${dir}-${frame}`, `player-${dir}-${frame}.svg`);
        // versi bergaris tepi tebal — khusus karakter pemain
        if (!this.textures.exists(`player-${dir}-${frame}-out`)) {
          this.load.image(`player-${dir}-${frame}-out`, base + `pixel/player-${dir}-${frame}-out.png`);
        }
      }
    }

    // sprite pelanggan: 7 warga desa x 4 arah x 2 frame
    for (const design of NPC_DESIGNS) {
      for (const dir of ["down", "up", "left", "right"]) {
        for (const frame of [1, 2]) {
          if (!this.textures.exists(`npc-${design}-${dir}-${frame}`)) {
            this.load.image(`npc-${design}-${dir}-${frame}`, base + `pixel/npc-${design}-${dir}-${frame}.png`);
          }
        }
      }
    }
  }

  create() {
    // Phaser memakai ulang instance scene yang sama setiap kali pemain pindah
    // halaman, dan nilai field class tidak dijalankan ulang. Jadi status ronde
    // (rak, pelanggan, antrian, status toko) harus dikosongkan di sini — kalau
    // tidak, rak dan collider menumpuk dua kali setiap kembali dari kebun.
    this.resetRuntimeState();

    // Siapkan pemutar suara koin sekali saja (dipakai tiap transaksi berhasil).
    if (!this.coinSfx) {
      this.coinSfx = new Audio("assets/sfx/coin.wav");
      this.coinSfx.preload = "auto";
    }
    if (!this.failSfx) {
      this.failSfx = new Audio("assets/sfx/fail.wav");
      this.failSfx.preload = "auto";
    }
    if (!this.enterSfx) {
      this.enterSfx = new Audio("assets/sfx/enter.wav");
      this.enterSfx.preload = "auto";
      this.enterSfx.volume = 0.04;

      this.refillSfx = new Audio("assets/sfx/refill.wav");
      this.refillSfx.volume = 0.075;
    }

    this.physics.world.setBounds(ROOM.x + 20, ROOM.y + 30, ROOM.w - 40, ROOM.h - 60);
    this.cameras.main.setBounds(0, 0, W, H);

    this.drawRoom();
    this.drawShelves();
    this.prefillShelves();
    this.drawCounter();
    this.drawDoor();
    this.createPlayer();
    this.createAnimations();
    // Petunjuk ditunda: dipanggil dari update() setelah tombol PLAY ditekan.
    // Klik pada canvas: dipakai untuk memilih pelanggan di kasir.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onSceneClick(p));

    // Minimarket adalah halaman awal: pastikan tampil di atas kebun.
    this.applyFront();
  }

  /** Kosongkan semua status yang menempel di instance scene (dipakai create()). */
  private resetRuntimeState() {
    this.shelves = [];
    this.colliders = [];
    this.customers = [];
    this.queue = [];
    this.storeState = "closed";
    this.spawned = 0;
    this.spawnTimer = null;
    this.paymentRequest = null;
    this.pendingCustomer = null;
    this.notice = null;
    this.noticeUntil = 0;
    this.cashierMat = null;
    this.cashierHint = null;
    this.matBlink = null;
  }

  /**
   * Tampilkan/sembunyikan halaman minimarket. Kedua halaman tetap hidup, jadi
   * ronde jualan terus berjalan walau pemain sedang di kebun.
   */
  setFront(front: boolean) {
    this.front = front;
    this.applyFront();
  }

  /** Terapkan tampilan/input sesuai nilai `front` saat ini. */
  private applyFront() {
    this.scene.setVisible(this.front);
    if (this.input) this.input.enabled = this.front;
    if (this.input?.keyboard) this.input.keyboard.enabled = this.front;
    if (this.front) this.scene.bringToTop();
  }

  // ─── Dunia ───────────────────────────────────────────────────────────────

  private drawRoom() {
    // Seluruh ruangan (lantai, dinding, rak, meja kasir, papan, pintu) sudah
    // "dibakar" ke satu latar pixel art 640x360 lalu di-scale 2x.
    this.add.image(0, 0, "market-bg").setOrigin(0, 0).setScale(2).setDepth(0);
  }

  private drawShelves() {
    SHELF_POS.forEach((pos) => {
      // Rak + papan harga sudah "dibakar" ke latar market-bg.png.
      // Yang digambar runtime hanya penghitung stok, sorotan, dan area klik.

      // ── papan harga: nama — harga + logo koin (60-70% lebar rak) ──
      const c = CROPS[pos.crop];
      const cx = pos.x + SHELF_W / 2;
      const SIGN_W = 140;
      const SIGN_H = 26;
      const signY = pos.y - 12;

      // bayangan + plat kertas
      this.add
        .rectangle(cx + 2, signY + 3, SIGN_W, SIGN_H, 0x1a0f05, 0.22)
        .setDepth(3.04);
      this.add
        .rectangle(cx, signY, SIGN_W, SIGN_H, 0xfbf3de, 0.99)
        .setStrokeStyle(2, 0x2a1608)
        .setDepth(3.05);

      // teks nama — harga, lalu logo koin, disusun satu grup di tengah
      const nameTxt = this.add
        .text(0, signY, `${c.name.toUpperCase()} — ${c.price}`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "8px",
          color: "#2b1d0e",
        })
        .setOrigin(0, 0.5)
        .setDepth(3.1);
      const coinIcon = this.add
        .image(0, signY, "coin-icon")
        .setDisplaySize(14, 14)
        .setDepth(3.1);
      const gap = 6;
      const total = nameTxt.width + gap + 14;
      nameTxt.setX(cx - total / 2);
      coinIcon.setX(cx - total / 2 + nameTxt.width + gap + 7);

      // ── badge stok, menempel di tepi kanan papan ──
      const bx = cx + SIGN_W / 2 - 6;
      const BADGE_W = 44; // cukup untuk "15/15"
      this.add
        .rectangle(bx + BADGE_W / 2, signY, BADGE_W, 22, 0xfbf3de, 0.99)
        .setStrokeStyle(2, 0x2a1608)
        .setDepth(3.06);
      const badge = this.add
        .text(bx + BADGE_W / 2, signY, `0/${SHELF_SLOTS}`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "9px",
          color: "#2b1d0e",
        })
        .setOrigin(0.5)
        .setDepth(3.2);

      // peringatan isi ulang: di dalam rak (bukan di lantai), berkedip saat stok ≤ 8
      const hint = this.add
        .text(pos.x + SHELF_W / 2, pos.y + SHELF_H - 7, "FILL YOUR DISPLAY", {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "8px",
          color: "#ffd166",
          // garis luar gelap supaya tetap terbaca di kayu rak yang gelap
          stroke: "#2a1608",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(2.65)
        .setAlpha(0.5)
        .setVisible(false);
      this.tweens.add({
        targets: hint,
        alpha: { from: 0.45, to: 1 },
        duration: 620,
        yoyo: true,
        repeat: -1,
      });

      // garis hijau saat kursor di atas rak
      const outline = this.add
        .rectangle(pos.x + SHELF_W / 2, pos.y + SHELF_H / 2, SHELF_W, SHELF_H)
        .setStrokeStyle(3, 0x2f7d4f, 1)
        .setVisible(false)
        .setDepth(2.6);

      // klik rak = isi dari inventory (satu klik sampai penuh)
      const zone = this.add
        .zone(pos.x + SHELF_W / 2, pos.y + SHELF_H / 2, SHELF_W, SHELF_H)
        .setDepth(2.7)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        if (isPlaying() && this.front) this.fillShelf(pos.crop);
      });

      // tabrakan rak
      const block = this.add.rectangle(
        pos.x + SHELF_W / 2,
        pos.y + SHELF_H / 2,
        SHELF_W,
        SHELF_H,
        0x000000,
        0
      );
      this.physics.add.existing(block, true);
      this.colliders.push(block);

      this.shelves.push({
        crop: pos.crop,
        x: pos.x,
        y: pos.y,
        slots: new Array(SHELF_SLOTS).fill(null),
        items: new Array(SHELF_SLOTS).fill(null),
        badge,
        hint,
        outline,
      });
    });
  }

  /** Titik tengah slot ke-i (0..14, baris demi baris, 5 item per baris). */
  private slotCenter(shelf: Shelf, i: number) {
    const col = i % SHELF_COLS;
    const row = Math.floor(i / SHELF_COLS);
    const padX = 8;
    return {
      x: shelf.x + padX + ((SHELF_W - padX * 2) / SHELF_COLS) * (col + 0.5),
      y: shelf.y + 12 + ((SHELF_H - 24) / SHELF_ROWS) * (row + 0.5),
    };
  }

  /** Gambar satu unit barang di slot ke-i dan tandai slot itu terisi. */
  private placeItem(shelf: Shelf, i: number) {
    shelf.slots[i] = shelf.crop;
    const p = this.slotCenter(shelf, i);
    const row = Math.floor(i / SHELF_COLS);
    shelf.items[i] = this.add
      .image(p.x, shelf.y + 40 + 44 * row, `item-${shelf.crop}`)
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(2.4);
  }

  /** Isi rak dengan dagangan awal (tanpa mengurangi inventory). */
  private prefillShelves() {
    for (const shelf of this.shelves) {
      const want = START_STOCK[shelf.crop] ?? 0;
      for (let i = 0; i < Math.min(want, shelf.slots.length); i++) this.placeItem(shelf, i);
      this.updateBadge(shelf);
    }
  }

  /**
   * Isi rak dari inventory pemain. Satu klik mengisi semua slot kosong
   * (maksimal 9) selama stok tanaman itu masih ada.
   * Dipanggil oleh klik rak di dunia dan tombol "Isi rak" di HUD.
   */
  fillShelf(crop: CropId): number {
    const shelf = this.shelves.find((s) => s.crop === crop);
    if (!shelf) return 0;

    let moved = 0;
    for (let i = 0; i < shelf.slots.length; i++) {
      if (shelf.slots[i]) continue;
      if (economy.inventory[crop] <= 0) break;

      economy.inventory[crop] -= 1;
      this.placeItem(shelf, i);
      moved++;
    }

    this.updateBadge(shelf);

    if (moved > 0) {
      this.playSfx(this.refillSfx);
      this.say(`${moved} ${CROPS[crop].name} added to the shelf.`);
      recordRefill(crop, moved);
    } else if (economy.inventory[crop] <= 0) {
      this.say(`No ${CROPS[crop].name} in inventory – harvest some from the FARM first.`);
    } else {
      this.say(`${CROPS[crop].name} shelf is full.`);
    }

    return moved;
  }

  private updateBadge(shelf: Shelf) {
    const count = shelf.slots.filter(Boolean).length;
    shelf.badge.setText(`${count}/${shelf.slots.length}`);
    // stok menipis -> ingatkan pemain untuk mengisi rak
    shelf.hint.setVisible(count <= FILL_HINT_AT);
    shelf.outline.setVisible(false);
  }

  private countIn(shelf: Shelf) {
    return shelf.slots.filter(Boolean).length;
  }

  private drawCounter() {
    // Meja kasir, mesin kasir, papan KASIR, dan karpet hijau area kasir sudah
    // "dibakar" ke latar market-bg.png. Yang runtime hanya sorot lembut saat
    // pemain sudah berdiri di area kasir + tabrakan meja.

    this.cashierMat = this.add
      .rectangle(
        CASHIER_MAT.x + CASHIER_MAT.w / 2,
        CASHIER_MAT.y + CASHIER_MAT.h / 2,
        CASHIER_MAT.w,
        CASHIER_MAT.h,
        0xffffff,
        0
      )
      .setDepth(1.5);

    // Tulisan di dalam panel: tampil hanya saat ada pelanggan menunggu
    // dan pemain belum berdiri di karpet kasir.
    this.cashierHint = this.add
      .text(
        CASHIER_MAT.x + CASHIER_MAT.w / 2,
        CASHIER_MAT.y + CASHIER_MAT.h / 2,
        "STAY HERE\nPRESS NPC",
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "7px",
          color: "#eafff2",
          align: "center",
          lineSpacing: 4,
          stroke: "#0d2a1a",
          strokeThickness: 3,
        }
      )
      .setOrigin(0.5)
      .setDepth(1.6)
      .setVisible(false);


    const block = this.add.rectangle(
      COUNTER.x + COUNTER.w / 2,
      COUNTER.y + COUNTER.h / 2,
      COUNTER.w,
      COUNTER.h,
      0x000000,
      0
    );
    this.physics.add.existing(block, true);
    this.colliders.push(block);
  }

  private drawDoor() {
    // Pintu kaca, panah, dan papan "PINTU PELANGGAN" sudah ada di latar.
    // Pelanggan & pemain spawn di area pintu (lihat spawnCustomer).
  }

  private colliders: Phaser.GameObjects.Rectangle[] = [];
  private spaceKey?: Phaser.Input.Keyboard.Key;
  /** Papan "FARM" di dalam pintu kayu (papannya berkedip saat rak perlu diisi). */
  private farmDoorSign?: Phaser.GameObjects.Container;
  /** Tulisan "Too far!" di bawah pintu (kedip 4x saat klik dari jauh). */
  private tooFarHint?: Phaser.GameObjects.Text;
  private tooFarTween?: Phaser.Tweens.Tween;
  private farmDoorBlink?: Phaser.Tweens.Tween;

  private createPlayer() {
    this.player = this.physics.add.sprite(PLAYER_SPAWN.x, PLAYER_SPAWN.y, "player-down-1-out");
    this.player.setDepth(4);
    // sedikit lebih besar dari pelanggan (skala 1.9) supaya peran pemain menonjol
    this.player.setScale(2.15);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(14, 10);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(3, 15);

    for (const block of this.colliders) {
      this.physics.add.collider(this.player, block);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on("down", () => this.tryUseFarmDoor());

    // Pintu kayu ke kebun: digambar di sini (bukan di latar) supaya posisi
    // gambar, zona klik, dan papan FARM selalu sama persis.
    this.createTooFarHint();
    const dz = this.drawFarmDoor();
    dz.on("pointerdown", () => this.tryUseFarmDoor());
  }

  /** Teks arahan kecil di bawah pintu FARM (disembunyikan, muncul saat salah jarak). */
  private createTooFarHint() {
    this.tooFarHint = this.add
      .text(178, 684, "Too far! Stand in front\nof the door and click it.", {
        fontFamily: '"VT323", monospace',
        fontSize: "14px",
        color: "#ffd166",
        stroke: "#2a1608",
        strokeThickness: 3,
        align: "center",
        lineSpacing: -2,
      })
      .setOrigin(0.5, 0)
      .setDepth(8)
      .setVisible(false);
  }

  /** Kedip 4 kali lalu hilang (dipakai saat pemain klik pintu dari jauh). */
  private flashTooFarHint() {
    if (!this.tooFarHint) return;
    this.tooFarTween?.stop();
    this.tooFarHint.setVisible(true).setAlpha(1);
    this.tooFarTween = this.tweens.add({
      targets: this.tooFarHint,
      alpha: { from: 1, to: 0.25 },
      duration: 260,
      yoyo: true,
      repeat: 3, // 4 kali kedip
      onComplete: () => this.tooFarHint?.setVisible(false),
    });
  }

  /** Pintu kayu ke kebun + papan "FARM" (papannya berkedip saat rak menipis). */
  private drawFarmDoor() {
    const { x, y, w, h } = FARM_DOOR;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const parts: Phaser.GameObjects.GameObject[] = [];

    // Pintu dibuat seperti PINTU GUDANG di kebun: cekungan gelap di dinding,
    // dua daun pintu dengan garis tengah, dan gagang kuningan kecil.
    // (Versi sebelumnya terang & menonjol, jadi terlihat seperti punggung pintu.)
    parts.push(this.add.rectangle(cx, cy, w, h, 0x2a1608).setOrigin(0.5, 0.5));            // kusen gelap
    parts.push(this.add.rectangle(cx, cy + 2, w - 6, h - 6, 0x4a2410).setOrigin(0.5, 0.5)); // cekungan
    parts.push(this.add.rectangle(cx, y + 7, w - 8, 2, 0x6b3a20).setOrigin(0.5, 0.5));      // kilau atas

    // garis tengah (dua daun pintu)
    parts.push(this.add.rectangle(cx, cy + 4, 2, h - 12, 0x2a1608).setOrigin(0.5, 0.5));

    // garis papan tipis di tiap daun
    for (const dx of [-18, -9, 9, 18]) {
      parts.push(
        this.add.rectangle(cx + dx, cy + 6, 1, h - 20, 0x3a1d10).setOrigin(0.5, 0.5)
      );
    }

    // ambang bawah (bayangan)
    parts.push(this.add.rectangle(cx, y + h - 7, w - 8, 4, 0x2a1608).setOrigin(0.5, 0.5));

    // gagang kuningan di daun kanan
    parts.push(this.add.rectangle(cx + 12, cy + 8, 4, 4, 0xc9a26a).setOrigin(0.5, 0.5));

    // papan nama: bingkai gelap + kertas krem + teks (gaya papan ENTRY).
    // Dibuat sebagai kontainer TERPISAH supaya hanya papannya yang berkedip.
    const plateY = y + 16;
    const plate: Phaser.GameObjects.GameObject[] = [
      this.add.rectangle(cx, plateY, 62, 20, 0x4a2410).setOrigin(0.5, 0.5),
      this.add.rectangle(cx, plateY, 56, 15, 0xf2e2c2).setOrigin(0.5, 0.5),
      this.add
        .text(cx, plateY + 1, "FARM", {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "7px",
          color: "#4A2410",
        })
        .setOrigin(0.5, 0.5),
    ];
    this.farmDoorSign = this.add.container(0, 0, plate).setDepth(1.5);
    // Outer glow sungguhan (WebGL post-processing). Otomatis dilewati kalau renderer canvas.
    try {
      this.farmDoorSign.postFX?.addGlow(0xffd75e, 3, 1, false, 8, 12);
    } catch {
      /* canvas renderer: tidak ada glow, kedip tetap jalan */
    }

    // Kedip halus (tween yoyo), tidak dihitung per-frame.
    this.farmDoorBlink = this.tweens.add({
      targets: this.farmDoorSign,
      alpha: { from: 1, to: 0.45 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    const zone = this.add
      .zone(cx, cy, w, h)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(7);
    return zone;
  }

  /** Pemain menekan SPACE / mengklik pintu kayu: pindah ke kebun kalau cukup dekat. */
  private tryUseFarmDoor() {
    if (!isPlaying() || !this.front || !this.player) return;
    const cx = FARM_DOOR.x + FARM_DOOR.w / 2;
    const cy = FARM_DOOR.y + FARM_DOOR.h / 2;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy);
    if (d > DOOR_REACH) {
      this.flashTooFarHint();
      return;
    }
    goToScene("farm");
  }

  private createAnimations() {
    for (const dir of ["down", "up", "left", "right"]) {
      if (!this.anims.exists(`walk-${dir}`)) {
        this.anims.create({
          key: `walk-${dir}`,
          frames: [{ key: `player-${dir}-1-out` }, { key: `player-${dir}-2-out` }],
          frameRate: 7,
          repeat: -1,
        });
      }
    }
    // animasi jalan per model pelanggan
    for (const design of NPC_DESIGNS) {
      for (const dir of ["down", "up", "left", "right"]) {
        const key = `walk-${design}-${dir}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: [{ key: `npc-${design}-${dir}-1` }, { key: `npc-${design}-${dir}-2` }],
            frameRate: 6,
            repeat: -1,
          });
        }
      }
    }
  }

  // ─── Loop ────────────────────────────────────────────────────────────────

  update(_time: number, _delta: number) {
    // Sebelum PLAY pemain tidak bisa bergerak dan pelanggan belum berjalan.
    if (!isPlaying()) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }
    // Saat halaman ini disembunyikan (pemain di kebun), pemain berhenti tapi
    // pelanggan tetap datang, mengantri, dan bisa kabur — ronde tidak berhenti.
    if (this.front) this.movePlayer();
    else (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.updateCashierMat();
    this.updateShelfHover();
    this.updateCustomers();

    if (this.notice && this.time.now > this.noticeUntil) this.notice = null;

    // Papan FARM berkedip halus saat ada rak dengan stok <= 8.
    if (this.farmDoorBlink && this.farmDoorSign) {
      const needRefill = this.shelves.some((s) => this.countIn(s) <= 8);
      if (needRefill && this.farmDoorBlink.isPaused()) this.farmDoorBlink.resume();
      if (!needRefill && !this.farmDoorBlink.isPaused()) {
        this.farmDoorBlink.pause();
        this.farmDoorSign.setAlpha(1);
      }
    }
  }

  /** Sorotan rak mengikuti posisi pointer — tidak bergantung event zone. */
  private updateShelfHover() {
    const p = this.input.activePointer;
    for (const s of this.shelves) {
      const inside =
        p.x >= s.x && p.x <= s.x + SHELF_W && p.y >= s.y && p.y <= s.y + SHELF_H;
      s.outline.setVisible(inside);
    }
  }

  private movePlayer() {
    const speed = 210;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;

    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;

    body.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy)) this.lastDir = vx < 0 ? "left" : "right";
      else this.lastDir = vy < 0 ? "up" : "down";
      this.player.anims.play(`walk-${this.lastDir}`, true);
    } else {
      this.player.anims.stop();
      this.player.setTexture(`player-${this.lastDir}-1-out`);
    }
  }

  private say(msg: string) {
    this.notice = msg;
    this.noticeUntil = this.time.now + 2400;
  }

  // ─── Toko: buka / tutup / hari ────────────────────────────────────────────

  /** Dipanggil tombol BUKA TOKO di HUD. */
  openStore() {
    if (this.storeState !== "closed") return;
    this.storeState = "open";
    this.spawned = 0;
    this.time.delayedCall(1000, () => this.scheduleWave());
  }

  /**
   * Satu gelombang: 2–3 pelanggan beruntun (jarak 1–2 detik), satu pelanggan
   * tambahan di tengah jeda, lalu gelombang berikutnya setelah 5–10 detik.
   * Berhenti sendiri kalau toko sudah tutup.
   */
  private scheduleWave() {
    if (this.storeState !== "open") return;

    const count = Phaser.Math.Between(WAVE_SIZE.min, WAVE_SIZE.max);

    let offset = 0;
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(offset * 1000, () => this.spawnCustomer());
      offset += Phaser.Math.FloatBetween(WAVE_GAP_SEC.min, WAVE_GAP_SEC.max);
    }

    const pause = Phaser.Math.Between(WAVE_PAUSE_SEC.min, WAVE_PAUSE_SEC.max);
    // 1 orang menyusul di tengah jeda
    this.time.delayedCall((offset + pause / 2) * 1000, () => this.spawnCustomer());

    this.time.delayedCall((offset + pause) * 1000, () => this.scheduleWave());
  }

  /** Hentikan kedatangan pelanggan (dipakai saat ronde selesai). */
  private stopSpawning() {
    this.spawnTimer?.remove(false);
    this.spawnTimer = null;
  }

  /** Ronde selesai (waktu habis atau target tercapai): toko berhenti melayani. */
  timeUp() {
    if (this.storeState !== "open") return;
    this.storeState = "closed";
    this.stopSpawning();
    this.clearPayment();
    this.queue = [];
  }

  /**
   * Siapkan ronde baru setelah pemain menekan PLAY AGAIN / TRY AGAIN:
   * pelanggan dibersihkan, pemain kembali ke pintu, rak diisi ulang sesuai
   * stok awal, lalu toko dibuka lagi.
   */
  resetRound() {
    this.stopSpawning();
    this.clearPayment();

    for (const c of this.customers) c.sprite.destroy();
    this.customers = [];
    this.queue = [];
    this.spawned = 0;

    // kosongkan rak, lalu isi ulang seperti stok awal
    for (const shelf of this.shelves) {
      for (let i = 0; i < shelf.items.length; i++) {
        shelf.items[i]?.destroy();
        shelf.items[i] = null;
        shelf.slots[i] = null;
      }
    }
    this.prefillShelves();

    this.player.setPosition(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    this.storeState = "closed";
    this.openStore();
  }

  // ─── Pelanggan NPC ───────────────────────────────────────────────────────

  private spawnCustomer() {
    if (this.storeState !== "open") return;

    const profile = Phaser.Utils.Array.GetRandom(NPC_PROFILES);
    const plan = this.buildBasket(profile);
    if (plan.length === 0) {
      // Semua rak kosong: pelanggan tidak jadi masuk.
      // Pemberitahuannya ditangani panel React (tengah perempatan rak).
      return;
    }

    // bel masuk: setiap NPC yang benar-benar masuk toko
    this.playSfx(this.enterSfx);

    const design = profile.design;
    const sprite = this.physics.add.sprite(DOOR_X, DOOR_Y, `npc-${design}-down-1`);
    sprite.setScale(1.9).setDepth(4);
    sprite.body?.setSize(14, 10);
    (sprite.body as Phaser.Physics.Arcade.Body).setOffset(3, 15);
    for (const block of this.colliders) this.physics.add.collider(sprite, block);

    const first = this.stationOf(plan[0].crop);
    const c: Customer = {
      sprite,
      design,
      plan,
      planIndex: 0,
      cart: [],
      state: "toShelf",
      // dari pintu: naik/turun dulu di x pintu, baru geser di lorong depan rak
      path: [
        { x: DOOR_X, y: first.rowY },
        { x: first.x, y: first.rowY },
      ],
      waitUntil: 0,
      patienceUntil: 0,
      slot: 0,
      lastDir: "down",
      serving: 0,
      rowY: first.rowY,
    };
    this.customers.push(c);
    this.spawned++;
    this.say(`${profile.name} entered.`);
  }

  /** Titik berdiri di depan satu rak + y lorongnya. */
  private stationOf(crop: CropId) {
    const pos = SHELF_POS.find((p) => p.crop === crop)!;
    const rowY = pos.y + SHELF_H + 10;
    return { x: pos.x + SHELF_W / 2, y: rowY, rowY };
  }

  /**
   * Susun daftar belanja sesuai profil: jenis barang, jumlahnya, lalu urutkan
   * raknya campuran "paling dekat dulu" dan acak supaya terasa manusiawi.
   */
  private buildBasket(profile: NpcProfile) {
    const stocked = new Set(this.shelves.filter((s) => this.countIn(s) > 0).map((s) => s.crop));
    const pool = profile.prefer.filter((c) => stocked.has(c));
    if (pool.length === 0) return [];

    const kinds = Math.min(
      Phaser.Math.Between(profile.minKinds, profile.maxKinds),
      pool.length
    );

    const picked: CropId[] = [];
    while (picked.length < kinds && pool.length > 0) {
      // bobot menurun: pilihan pertama profil paling sering muncul
      const weights = pool.map((_, i) => Math.max(1, pool.length - i));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let idx = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }

    const plan = picked.map((crop) => ({
      crop,
      qty: Phaser.Math.Between(profile.minQty, profile.maxQty),
    }));

    return this.orderStations(plan);
  }

  /**
   * Urutkan kunjungan rak: 60% ambil yang paling dekat dari posisi sekarang,
   * 40% acak — campuran "efisien" dan "manusiawi".
   */
  private orderStations(plan: { crop: CropId; qty: number }[]) {
    let from = { x: DOOR_X, y: DOOR_Y };
    const rest = [...plan];
    const ordered: { crop: CropId; qty: number }[] = [];

    while (rest.length > 0) {
      const sorted = [...rest].sort((a, b) => {
        const sa = this.stationOf(a.crop);
        const sb = this.stationOf(b.crop);
        const da = Math.hypot(sa.x - from.x, sa.rowY - from.y);
        const db = Math.hypot(sb.x - from.x, sb.rowY - from.y);
        return da - db;
      });
      const chosen = Math.random() < 0.6 ? sorted[0] : rest[Math.floor(Math.random() * rest.length)];
      ordered.push(chosen);
      rest.splice(rest.indexOf(chosen), 1);
      from = this.stationOf(chosen.crop);
    }
    return ordered;
  }

  /**
   * Jalur dari posisi sekarang ke depan rak tujuan, lewat lorong:
   * geser horizontal di lorong baris asal, lalu naik/turun di celah kolom.
   */
  private pathToStation(c: Customer, crop: CropId) {
    const to = this.stationOf(crop);
    const fromX = c.sprite.x;
    const fromRowY = c.rowY;
    const pts: { x: number; y: number }[] = [];

    if (Math.abs(fromRowY - to.rowY) < 1) {
      // satu baris: cukup geser di lorong depan rak
      pts.push({ x: fromX, y: fromRowY });
      pts.push({ x: to.x, y: to.rowY });
    } else {
      pts.push({ x: fromX, y: fromRowY });
      pts.push({ x: LANE_X, y: fromRowY });
      pts.push({ x: LANE_X, y: to.rowY });
      pts.push({ x: to.x, y: to.rowY });
    }
    c.rowY = to.rowY;
    return pts;
  }

  /** Gerakkan pelanggan menuju waypoint berikutnya. true = sudah sampai tujuan. */
  private moveAlong(c: Customer, speed: number): boolean {
    const target = c.path[0];
    if (!target) {
      c.sprite.setVelocity(0, 0);
      return true;
    }

    const dx = target.x - c.sprite.x;
    const dy = target.y - c.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 5) {
      c.sprite.setPosition(target.x, target.y);
      c.sprite.setVelocity(0, 0);
      c.path.shift();
      if (c.path.length === 0) {
        c.sprite.anims.stop();
        c.sprite.setTexture(`npc-${c.design}-${c.lastDir}-1`);
        return true;
      }
      return false;
    }

    c.sprite.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    if (Math.abs(dx) > Math.abs(dy)) c.lastDir = dx < 0 ? "left" : "right";
    else c.lastDir = dy < 0 ? "up" : "down";
    c.sprite.anims.play(`walk-${c.design}-${c.lastDir}`, true);
    return false;
  }

  private updateCustomers() {
    const now = this.time.now;

    for (const c of this.customers) {
      if (c.state === "leaving") {
        if (this.moveAlong(c, 150)) c.sprite.destroy();
        continue;
      }

      if (c.state === "toShelf") {
        if (this.moveAlong(c, 150)) {
          const step = c.plan[c.planIndex];
          // Ambil barang SEKARANG: stok rak langsung berkurang saat diambil.
          const taken = this.removeFromShelf(step.crop, step.qty);
          for (let i = 0; i < taken; i++) c.cart.push(step.crop);

          if (taken === 0) {
            // rak kosong: lewati saja, lanjut ke rak berikutnya
            c.planIndex += 1;
            if (c.planIndex < c.plan.length) {
              c.path = this.pathToStation(c, c.plan[c.planIndex].crop);
              continue;
            }
            if (c.cart.length === 0) {
              this.say("Shelves are empty – customer left without buying.");
              this.leave(c);
              continue;
            }
            c.state = "toCashier";
            c.path = [
              { x: DOOR_X, y: c.rowY },
              { x: DOOR_X, y: 385 },
            ];
            continue;
          }

          c.state = "shopping";
          c.waitUntil = now + PICK_MS;
        }
      } else if (c.state === "shopping") {
        if (now >= c.waitUntil) {
          c.planIndex += 1;
          if (c.planIndex < c.plan.length) {
            // masih ada rak lain: jalan lewat lorong ke rak berikutnya
            c.path = this.pathToStation(c, c.plan[c.planIndex].crop);
            c.state = "toShelf";
          } else {
            c.state = "toCashier";
            c.path = [
              { x: DOOR_X, y: c.rowY },
              { x: DOOR_X, y: 385 },
            ];
          }
        }
      } else if (c.state === "toCashier") {
        if (this.moveAlong(c, 150)) {
          c.state = "toQueue";
          c.slot = this.queue.length;
          this.queue.push(c);
          const slot = QUEUE_SLOTS[Math.min(c.slot, QUEUE_SLOTS.length - 1)];
          c.path = [{ x: slot.x, y: slot.y }];
        }
      } else if (c.state === "toQueue") {
        if (this.moveAlong(c, 150)) {
          c.state = "waiting";
          // Kesabaran hanya berjalan untuk orang pertama di antrian.
          c.patienceUntil = c.slot === 0 ? now + PATIENCE_MS : 0;
        }
      } else if (c.state === "waiting") {
        // Orang pertama yang menunggu > 12 detik: beri tahu pemain (sekali per pelanggan).
        // Tidak perlu diingatkan kalau pemain sudah membuka panel bayar pelanggan ini.
        if (c.slot === 0 && c.patienceUntil > 0 && !c.nudged && this.pendingCustomer !== c) {
          const waitedMs = PATIENCE_MS - (c.patienceUntil - now);
          if (waitedMs >= 12000) {
            c.nudged = true;
            payNudge();
          }
        }
        if (c.patienceUntil > 0 && now >= c.patienceUntil) {
          // Kabur tanpa bayar: barang hangus, pemain rugi seharga bibit.
          if (this.pendingCustomer === c) this.clearPayment();
          this.floatProfit(-this.applyAbandonPenalty(c));
          this.removeFromQueue(c);
          this.leave(c);
        }
      }
    }

    // Buang pelanggan yang sudah selesai keluar.
    this.customers = this.customers.filter((c) => c.sprite.active);
  }

  /**
   * Rugi karena pelanggan pergi tanpa bayar (kabur atau salah hitung):
   * koin dipotong seharga bibit barang yang dibawa, dan laba ikut dipotong
   * supaya bar GOALS turun (boleh sampai minus).
   */
  private applyAbandonPenalty(c: Customer): number {
    const loss = c.cart.reduce((sum, cr) => sum + CROPS[cr].seed, 0);
    if (loss > 0) {
      economy.coins = Math.max(0, economy.coins - loss);
      economy.loss += loss;
      economy.profit -= loss;
      economy.failed += 1;
      this.say(`Customer ran off – lost ${loss} coins.`);
      recordFail(npcName(c.design), "ran off (patience)", loss);
    } else {
      this.say("Customer left – unserved.");
      recordFail(npcName(c.design), "unserved (empty shelves)", 0);
    }
    return loss;
  }

  private clearPayment() {
    this.paymentRequest = null;
    this.pendingCustomer = null;
  }

  /** Klik di mana pun: kalau kena pelanggan terdepan di antrian, buka kasir. */
  private onSceneClick(pointer: Phaser.Input.Pointer) {
    if (!isPlaying() || !this.front) return;
    if (this.paymentRequest) return;
    const front = this.queue[0];
    if (!front || !front.sprite.active || front.state !== "waiting") return;

    const b = front.sprite.getBounds();
    const pad = 26; // toleransi klik, sprite aslinya cuma ~40 px
    if (
      pointer.worldX < b.x - pad ||
      pointer.worldX > b.right + pad ||
      pointer.worldY < b.y - pad ||
      pointer.worldY > b.bottom + pad
    ) {
      return;
    }
    this.tryServe(front);
  }

  /** Efek "kena tekan" saat pelanggan diklik. */
  private punch(sprite: Phaser.Physics.Arcade.Sprite) {
    this.tweens.add({
      targets: sprite,
      scaleX: 2.05,
      scaleY: 2.05,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    });
    sprite.setTintFill(0xfff6e0);
    this.time.delayedCall(70, () => {
      if (sprite.active) sprite.clearTint();
    });
  }

  /** Pemain mengklik pelanggan: buka kasir kalau syaratnya terpenuhi. */
  private tryServe(c: Customer) {
    this.punch(c.sprite);

    if (this.paymentRequest) return;
    if (c.state !== "waiting") return;
    if (this.queue[0] !== c) {
      this.say("Not their turn in line yet.");
      return;
    }
    if (!this.isPlayerAtCashier()) {
      this.say("Stand on the green mat first to open the register.");
      return;
    }

    // Kelompokkan keranjang jadi baris per jenis.
    const counts = new Map<CropId, number>();
    for (const crop of c.cart) counts.set(crop, (counts.get(crop) ?? 0) + 1);
    const items = [...counts.entries()].map(([crop, qty]) => ({
      crop,
      qty,
      price: CROPS[crop].price,
    }));
    const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    // Pelanggan membayar dengan pecahan kertas terkecil yang cukup.
    const paid = BILLS.find((b) => b >= total) ?? BILLS[BILLS.length - 1];

    this.paymentSeq += 1;
    this.paymentRequest = { id: this.paymentSeq, items, paid };
    this.pendingCustomer = c;
  }

  /** Dipanggil HUD saat pemain menekan OKE. */
  submitPayment(totalInput: number, changeInput: number) {
    const req = this.paymentRequest;
    const c = this.pendingCustomer;
    if (!req || !c) return;

    const trueTotal = req.items.reduce((s, it) => s + it.price * it.qty, 0);
    const trueChange = req.paid - trueTotal;
    this.clearPayment();

    if (totalInput === trueTotal && changeInput === trueChange) {
      // Laba bersih = (harga jual - harga bibit) per barang, bukan total belanja.
      const profitDelta = saleProfit(req.items);
      economy.coins += trueTotal;
      economy.revenue += trueTotal;
      economy.profit += profitDelta;
      economy.served += 1;
      this.floatProfit(profitDelta);
      this.say(`Correct payment – +${trueTotal} coins earned, profit +${profitDelta}.`);
      recordSale(
        npcName(c.design),
        req.items.map((it) => ({ crop: it.crop, qty: it.qty })),
        trueTotal,
        profitDelta,
      );
      this.removeFromQueue(c);
      this.leave(c);
    } else {
      // Salah hitung: pelanggan kesal dan pergi, barangnya hangus.
      this.floatProfit(-this.applyAbandonPenalty(c));
      this.say(`Incorrect change – customer left.`);
      recordFail(npcName(c.design), "wrong change", 0);
      this.removeFromQueue(c);
      this.leave(c);
    }
  }

  /**
   * Angka laba melayang naik di atas meja kasir lalu memudar.
   * Dipanggil tepat setelah pemain menekan OKE pada transaksi yang benar.
   */
  /** Putar satu efek suara (HTMLAudio — tidak kena kunci audio Phaser). */
  /** Putar satu efek suara dengan SATU pemutar saja + jeda minimum.
   *  Tanpa penggandaan, beberapa picu beruntun tidak menumpuk amplitudo
   *  (dulu terasa jauh lebih keras saat di-spam). */
  private playSfx(audio?: HTMLAudioElement, minGapMs = 200) {
    if (!audio) return;
    const key = audio.src;
    const now = performance.now();
    if ((this.sfxLastAt[key] ?? 0) + minGapMs > now) return;
    this.sfxLastAt[key] = now;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }

  private floatProfit(delta: number) {
    if (delta === 0) return; // tidak ada laba/rugi: jangan tampilkan angka
    const x = COUNTER.x + COUNTER.w / 2 + Phaser.Math.Between(-40, 40);
    const y = COUNTER.y + COUNTER.h - 8;
    const label = `${delta > 0 ? "+" : ""}${delta}`;
    const t = this.add
      .text(x, y, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "19px",
        color: delta > 0 ? "#8CF7B4" : "#FF5A47",
        stroke: "#2A1608",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setScale(0.6);

    // Bunyi: koin untuk laba, buzz untuk rugi (HTMLAudio, bukan Phaser).
    const sfx = delta > 0 ? this.coinSfx : this.failSfx;
    if (sfx) {
      try {
        sfx.currentTime = 0;
        // koin 0.3, buzz rugi 0.25 (sedikit lebih pelan)
        sfx.volume = delta > 0 ? 0.17 : 0.065;
        void sfx.play().catch(() => {});
      } catch {
        /* diabaikan: suara opsional */
      }
    }

    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: "Back.easeOut" });
    this.tweens.add({
      targets: t,
      y: y - 52,
      duration: 1000,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: t,
      alpha: 0,
      duration: 700,
      delay: 300,
      ease: "Quad.easeIn",
      onComplete: () => t.destroy(),
    });
  }

  /** Karpet kasir: berkedip + tulisan saat ada antrian tapi pemain belum di karpet. */
  private updateCashierMat() {
    if (!this.cashierMat) return;
    const onMat = this.isPlayerAtCashier();
    const waiting = this.queue.length > 0;

    // 1) Pemain sudah di karpet: lampu menyala tetap, tulisan hilang.
    if (onMat) {
      this.stopMatBlink();
      this.cashierMat.setFillStyle(0x7BF0AA, 0.18);
      this.cashierHint?.setVisible(false);
      return;
    }

    // 2) Ada pelanggan menunggu tapi pemain masih jauh: berkedip + petunjuk.
    if (waiting) {
      this.cashierHint?.setVisible(true);
      if (!this.matBlink) this.startMatBlink();
      return;
    }

    // 3) Tidak ada antrian: panel padam.
    this.stopMatBlink();
    this.cashierMat.setFillStyle(0xffffff, 0);
    this.cashierHint?.setVisible(false);
  }

  private startMatBlink() {
    if (!this.cashierMat) return;
    this.cashierMat.setFillStyle(0x7BF0AA, 0.08);
    this.matBlink = this.tweens.add({
      targets: this.cashierMat,
      fillAlpha: { from: 0.08, to: 0.32 },
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private stopMatBlink() {
    if (this.matBlink) {
      this.matBlink.remove();
      this.matBlink = null;
    }
    this.cashierMat?.setFillStyle(0x7BF0AA, 0.18);
  }

  private isPlayerAtCashier() {
    return (
      this.player.x >= CASHIER_MAT.x &&
      this.player.x <= CASHIER_MAT.x + CASHIER_MAT.w &&
      this.player.y >= CASHIER_MAT.y &&
      this.player.y <= CASHIER_MAT.y + CASHIER_MAT.h
    );
  }

  /** Buang barang dari rak; mengembalikan jumlah yang benar-benar terbuang. */
  private removeFromShelf(crop: CropId, n: number): number {
    const shelf = this.shelves.find((s) => s.crop === crop);
    if (!shelf) return 0;
    let removed = 0;
    for (let i = shelf.slots.length - 1; i >= 0 && n > 0; i--) {
      if (shelf.slots[i]) {
        shelf.slots[i] = null;
        shelf.items[i]?.destroy();
        shelf.items[i] = null;
        n--;
        removed++;
      }
    }
    this.updateBadge(shelf);
    return removed;
  }

  private removeFromQueue(c: Customer) {
    this.queue = this.queue.filter((x) => x !== c);
    this.queue.forEach((x, i) => {
      x.slot = i;
      const slot = QUEUE_SLOTS[Math.min(i, QUEUE_SLOTS.length - 1)];
      x.path = [{ x: slot.x, y: slot.y }];
      x.state = "toQueue";
      x.serving = 0;
    });
  }

  private leave(c: Customer) {
    c.state = "leaving";
    c.serving = 0;
    c.path = [
      { x: DOOR_X, y: 385 },
      { x: DOOR_X, y: DOOR_Y + 8 },
    ];
  }

  // ─── Jembatan ke HUD ─────────────────────────────────────────────────────

  snapshot(): WorldSnapshot {
    return {
      activeScene: "minimarket",
      coins: economy.coins,
      day: economy.day,
      seeds: { ...economy.seeds },
      inventory: { ...economy.inventory },
      plots: [],
      shelves: this.shelves.map((s) => ({
        crop: s.crop,
        count: this.countIn(s),
        capacity: s.slots.length,
      })),
      store: {
        state: this.storeState,
        goal: GOAL_COINS,
        revenue: economy.revenue - economy.dayStartRevenue,
        profit: economy.profit - economy.dayStartProfit,
        spent: economy.spent - economy.dayStartSpent,
        loss: economy.loss - economy.dayStartLoss,
        payment: this.paymentRequest,
        customers: this.customers.length,
        served: economy.served,
        failed: economy.failed,
        total: 0, // traffic sekarang berbasis gelombang, bukan kuota tetap
      },
      revenue: economy.revenue,
      spent: economy.spent,
      notice: this.notice,
    };
  }
}
