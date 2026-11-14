// Rush Mart — FarmScene (gaya pixel art 16-bit)
//
// Panggung: kebun top-down dengan 4 lahan 3x3 (jagung, tomat, wortel,
// kentang). Semua gambar statis — rumput, jalan, pohon, gudang, bingkai
// lahan, papan nama — sudah "dibakar" ke satu latar PNG (farm-bg.png)
// oleh scripts/gen_pixel_assets.py. Scene ini menggambar tanaman dan
// karakter di atasnya.
//
// Skala: aset dibuat 1x (kanvas dasar 640x360), lalu digambar 2x dengan
// pixelArt:true. Jadi satu pixel aset = 2x2 pixel layar, tetap tajam.
//
// TAHAP 1 BELUM menyentuh blockchain. Semua state hidup di scene ini.

import Phaser from "phaser";
import {
  CROPS,
  STAGE_SECONDS,
  SLOTS_PER_PLOT,
  GOAL_COINS,
  type CropId,
  type PlotSnapshot,
  type Stage,
  type WorldSnapshot,
} from "../types";
import { economy } from "../economy";
import { isPlaying } from "../flow";
import { openSeedShop } from "../ui";

const WORLD_W = 1280;
/** Titik muncul pemain di kebun: tengah persimpangan jalan (biar langsung terlihat). */
const FARM_SPAWN = { x: 640, y: 392 };
const WORLD_H = 720;
const SCALE = 2;

/** Ukuran satu lahan di layar (bingkai + tanah 5x3 slot = 15 slot). */
const PLOT_W = 320;
const PLOT_H = 272;

/** Susunan slot di dalam satu lahan: 3 baris, 5 slot per baris. */
const SLOT_COLS = 5;
const SLOT_ROWS = 3;

/** Posisi 4 lahan. Dua kolom, dua baris, jalan menyilang di tengah. */
/**
 * Area di depan tenda BUY SEED: pemain harus berdiri di sini dulu
 * sebelum tombol "BELI BIBIT" muncul.
 */
const STALL_ZONE = { x: 78, y: 340, w: 196, h: 96 };
/** Titik tengah tenda (koordinat canvas) untuk efek kilat & tombol. */
const STALL_CX = 170;
const STALL_CY = 268;

const PLOT_POS: { crop: CropId; x: number; y: number }[] = [
  { crop: "jagung", x: 280, y: 96 },
  { crop: "tomat", x: 680, y: 96 },
  { crop: "wortel", x: 280, y: 416 },
  { crop: "kentang", x: 680, y: 416 },
];

const INSET = 16;
/** Lebar/tinggi slot mengikuti ukuran lahan supaya 15 slot tetap muat. */
const SLOT_W = (PLOT_W - INSET * 2) / SLOT_COLS; // 57.6
const SLOT_H = (PLOT_H - INSET * 2) / SLOT_ROWS; // 80
/** Skala gambar tanaman: sedikit lebih kecil dari slot supaya tidak tumpang tindih. */
const CROP_SCALE = SCALE * 0.85;
/** Jeda antar petak saat menekan "TANAM SEMUA" (ms). */
const PLANT_ALL_SFX_OFFSETS = [0, 300, 600, 900];
const PLANT_ALL_SFX_VOLUME = 0.06;

const PLANT_STEP_MS = 110;
/** Jeda antar petak saat menekan "PANEN" (ms). */
const HARVEST_STEP_MS = 110;

/** Titik tengah tiap slot di dalam satu lahan. */
const slotCenter = (i: number, j: number) => ({
  x: INSET + SLOT_W / 2 + SLOT_W * i,
  y: INSET + SLOT_H / 2 + SLOT_H * j,
});

interface Slot {
  crop: CropId;
  plotIndex: number;
  slotIndex: number;
  stage: Stage;
  plantedAt: number;
  sprite: Phaser.GameObjects.Image | null;
  zone: Phaser.GameObjects.Zone;
  ring: Phaser.GameObjects.Rectangle;
}

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;

  /** Suara tanam 1 bibit (HTMLAudio: bebas kunci audio Phaser). */
  private plantSfx?: HTMLAudioElement;
  private plantSfxAt = 0;
  /** Suara TANAM SEMUA yang sedang berbunyi (polifoni, maks 3). */
  private plantAllVoices: HTMLAudioElement[] = [];

  private stallSign?: Phaser.GameObjects.Text;
  private stallFlash?: Phaser.GameObjects.Rectangle;
  private nearStall = false;
  /** True kalau halaman kebun yang sedang ditampilkan. */
  private front = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private slots: Slot[] = [];
  private lastDir: "down" | "up" | "left" | "right" = "down";

  // ekonomi dibaca dari modul bersama supaya minimarket memakai angka yang sama
  get coins() {
    return economy.coins;
  }
  set coins(v: number) {
    economy.coins = v;
  }

  get day() {
    return economy.day;
  }
  set day(v: number) {
    economy.day = v;
  }

  get seeds(): Record<CropId, number> {
    return economy.seeds;
  }

  get inventory(): Record<CropId, number> {
    return economy.inventory;
  }

  get revenue() {
    return economy.revenue;
  }
  set revenue(v: number) {
    economy.revenue = v;
  }

  get spent() {
    return economy.spent;
  }
  set spent(v: number) {
    economy.spent = v;
  }

  notice: string | null = null;
  private noticeUntil = 0;

  constructor() {
    super("FarmScene");
  }

  preload() {
    const base = "assets/pixel/";
    this.load.image("farm-bg", base + "farm-bg.png");

    for (const crop of ["jagung", "tomat", "wortel", "kentang"] as CropId[]) {
      for (const stage of [1, 2, 3]) {
        this.load.image(`crop-${crop}-${stage}`, `${base}crop-${crop}-${stage}.png`);
        // versi bergaris tepi — dipakai di lahan
        this.load.image(`crop-${crop}-${stage}-out`, `${base}crop-${crop}-${stage}-out.png`);
      }
    }
    for (const dir of ["down", "up", "left", "right"]) {
      for (const frame of [1, 2]) {
        this.load.image(`player-${dir}-${frame}`, `${base}player-${dir}-${frame}.png`);
        // versi bergaris tepi tebal — khusus karakter pemain, biar beda dari NPC
        this.load.image(`player-${dir}-${frame}-out`, `${base}player-${dir}-${frame}-out.png`);
      }
    }
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Latar: rumput, jalan, pohon, gudang, bingkai lahan, papan nama.
    this.add.image(0, 0, "farm-bg").setOrigin(0, 0).setScale(SCALE).setDepth(0);

    this.drawLabels();
    this.createPlots();
    this.createPlantAllButtons();

    const plantSnd = new Audio("assets/sfx/plant.wav");
    plantSnd.volume = 0.08;
    plantSnd.preload = "auto";
    this.plantSfx = plantSnd;
    this.createStallInteraction();
    this.createPlayer();
    this.createAnimations();
    this.createHint();

    // Scene ini dinyalakan sejak awal tapi harus tetap tersembunyi sampai
    // pemain pindah ke halaman kebun. Tanpa baris ini, Phaser menampilkan
    // kebun di atas minimarket setiap kali halaman di-refresh.
    this.applyFront();
  }

  // ─── Dunia ───────────────────────────────────────────────────────────────

  /** Nama tanaman di papan kayu yang sudah tergambar di latar. */
  private drawLabels() {
    for (const p of PLOT_POS) {
      const cx = p.x + PLOT_W / 2;
      const h = 22;
      // papan menempel langsung ke pagar atas lahan (tanpa jarak)
      const cy = p.y - h / 2 + 1;

      // Teks digambar dulu untuk mengukur lebarnya, baru papannya dibuat
      // selebar teks + sedikit ruang (tidak mepet, tidak kepanjangan).
      const label = this.add
        .text(cx, cy, CROPS[p.crop].name, {
          fontFamily: "Verdana, system-ui, sans-serif",
          fontSize: "14px",
          color: "#2B1D0E",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(1.3);

      const w = Math.round(label.width) + 18;

      // bayangan papan
      this.add.rectangle(cx + 2, cy + 2, w, h, 0x2a1608, 0.3).setDepth(1.1);
      // papan krem
      this.add
        .rectangle(cx, cy, w, h, 0xe8d5a8)
        .setStrokeStyle(2, 0x2a1608)
        .setDepth(1.15);
      // kilau tipis di sisi atas papan
      this.add.rectangle(cx, cy - h / 2 + 3, w - 8, 2, 0xfff3d9).setDepth(1.2);
    }

    // Papan nama tenda BUY SEED di sisi kiri peta (papan digambar di aset latar).
    this.stallSign = this.add
      .text(170, 208, "BUY SEED", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "9px",
        color: "#4A2410",
      })
      .setOrigin(0.5)
      .setDepth(1.3);

    // Papan nama gudang: teks duduk di papan kayu yang tergambar di atas pintu
    // (aset: draw_barn_sign di scripts/gen_pixel_assets.py, x+30 y+28, 44x12).
    this.add
      .text(1136, 148, "Warehouse", {
        fontFamily: "Verdana, system-ui, sans-serif",
        fontSize: "10px",
        color: "#4A2410",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(1.2);
  }

  private createPlots() {
    PLOT_POS.forEach((p, plotIndex) => {
      // kolam 9 slot di atas tanah yang sudah dibakar di latar
      for (let j = 0; j < SLOT_ROWS; j++) {
        for (let i = 0; i < SLOT_COLS; i++) {
          const c = slotCenter(i, j);
          const slotIndex = j * SLOT_COLS + i;
          const x = p.x + c.x;
          const y = p.y + c.y;

          // penanda slot kosong: kotak tipis di tanah (bukan bulat)
          const ring = this.add
            .rectangle(x, y, SLOT_W - 12, SLOT_H - 12, 0x000000, 0)
            .setStrokeStyle(2, 0x4a2410, 0.25)
            .setDepth(1.1);

          const zone = this.add
            .zone(x, y, SLOT_W - 8, SLOT_H - 8)
            .setOrigin(0.5)
            .setDepth(1.6)
            .setInteractive({ useHandCursor: true });

          const slot: Slot = {
            crop: p.crop,
            plotIndex,
            slotIndex,
            stage: 0,
            plantedAt: 0,
            sprite: null,
            zone,
            ring,
          };

          zone.on("pointerover", () => {
            if (slot.stage === 0) ring.setStrokeStyle(2, 0xfff8ec, 0.8);
            else if (slot.stage === 3) ring.setStrokeStyle(3, 0x3f9d5a, 1);
            else ring.setStrokeStyle(2, 0xfff8ec, 0.4);
          });
          zone.on("pointerout", () => {
            ring.setStrokeStyle(2, 0x4a2410, 0.25);
          });
          zone.on("pointerdown", () => {
            if (isPlaying() && this.front) this.clickSlot(slot);
          });

          this.slots.push(slot);
        }
      }

      // tabrakan: pemain tidak bisa jalan menembus lahan
      const block = this.add.rectangle(p.x + PLOT_W / 2, p.y + PLOT_H / 2, PLOT_W, PLOT_H, 0x000000, 0);
      this.physics.add.existing(block, true);
      (block as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody }).body.setSize(
        PLOT_W,
        PLOT_H
      );
      this.pendingColliders.push(block);
    });
  }

  private pendingColliders: Phaser.GameObjects.Rectangle[] = [];

  private createPlayer() {
    this.player = this.physics.add.sprite(FARM_SPAWN.x, FARM_SPAWN.y, "player-down-1-out");
    this.player.setDepth(3);
    // sedikit lebih besar dari NPC toko (skala 2) supaya peran pemain menonjol
    this.player.setScale(SCALE * 1.1);
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    // badan lebih kecil dari gambar, biar gerakan terasa pas
    this.player.body?.setSize(14, 10);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(3, 15);

    for (const block of this.pendingColliders) {
      this.physics.add.collider(this.player, block);
    }
    this.pendingColliders = [];

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private createAnimations() {
    for (const dir of ["down", "up", "left", "right"]) {
      if (!this.anims.exists(`walk-${dir}`)) {
        this.anims.create({
          key: `walk-${dir}`,
          frames: [{ key: `player-${dir}-1-out` }, { key: `player-${dir}-2-out` }],
          frameRate: 6,
          repeat: -1,
        });
      }
    }
  }

  private createHint() {
    // Petunjuk kontrol "WASD / panah ..." sudah dihapus atas permintaan
    // (tertutup bar inventory & tidak diperlukan lagi).
  }
  // ─── Aksi pemain ─────────────────────────────────────────────────────────

  /** Tenda BUY SEED: kilatan, area klik, dan tombol yang muncul saat dekat. */
  private createStallInteraction() {
    // kilatan putih lembut di atas tenda saat ditekan
    this.stallFlash = this.add
      .rectangle(STALL_CX, STALL_CY, 170, 160, 0xfff3d9, 0)
      .setDepth(3.0);

    // area tenda yang bisa diklik (efeknya sama dengan menekan tombol)
    const hit = this.add
      .rectangle(STALL_CX, STALL_CY + 18, 170, 200, 0xffffff, 0)
      .setDepth(3.05)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      if (this.canUseStall()) this.pressStall();
    });

    // Tidak ada tombol mengapung: tenda cukup diklik saat pemain berdiri di depannya.
  }

  /** Pemain boleh memakai tenda kalau ronde jalan, halaman kebun aktif, dan dia di depan tenda. */
  private canUseStall() {
    return isPlaying() && this.front && this.nearStall;
  }

  /** Efek "kena tekan" tenda lalu buka toko bibit. */
  private pressStall() {
    if (this.stallFlash) {
      this.stallFlash.setAlpha(0.55);
      this.tweens.add({
        targets: this.stallFlash,
        alpha: 0,
        duration: 240,
        ease: "Quad.easeOut",
      });
    }
    if (this.stallSign) {
      this.tweens.add({
        targets: this.stallSign,
        y: this.stallSign.y - 5,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
    openSeedShop();
  }

  /** Perbarui status "pemain berdiri di depan tenda". */
  private updateStallPrompt() {
    const zone = new Phaser.Geom.Rectangle(
      STALL_ZONE.x,
      STALL_ZONE.y,
      STALL_ZONE.w,
      STALL_ZONE.h,
    );
    this.nearStall = Phaser.Geom.Rectangle.Contains(zone, this.player.x, this.player.y);
  }

  /** Tombol kecil "TANAM SEMUA" di bawah kanan setiap lahan. */
  private createPlantAllButtons() {
    for (const pos of PLOT_POS) {
      // ── tombol PANEN: vertikal, menempel di sisi lahan ──
      // Kolom kiri (jagung & wortel) di sisi kiri, kolom kanan di sisi kanan.
      const leftSide = pos.x < 640;
      const hx = leftSide ? pos.x - 9 : pos.x + PLOT_W + 9;
      // Ukuran tombol PANEN: 22 x 88 (tebal sama dengan TANAM SEMUA, lebih ramping)
      const H_BTN_W = 22;
      const H_BTN_H = 88;
      // ujung bawah tombol menempel ke ujung pagar bawah lahan
      const hy = pos.y + PLOT_H - H_BTN_H / 2;
      const hb = this.add
        .rectangle(hx, hy, H_BTN_W, H_BTN_H, 0x2a1608, 0.92)
        .setStrokeStyle(2, 0xe8d5a8)
        .setDepth(3.2)
        .setInteractive({ useHandCursor: true });
      // Huruf ditumpuk vertikal (tidak diputar) supaya terbaca tegak.
      this.add
        .text(hx, hy, "H\nA\nR\nV\nE\nS\nT", {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "7px",
          color: "#f4e2b8",
          align: "center",
          lineSpacing: 3,
        })
        .setOrigin(0.5)
        .setDepth(3.3);
      hb.on("pointerover", () => hb.setFillStyle(0x4a2410, 0.95));
      hb.on("pointerout", () => hb.setFillStyle(0x2a1608, 0.92));
      hb.on("pointerdown", () => {
        if (isPlaying() && this.front) this.harvestCrop(pos.crop);
      });

      const x = leftSide ? pos.x + 54 : pos.x + PLOT_W - 54;
      const y = pos.y + PLOT_H + 12;
      const bg = this.add
        .rectangle(x, y, 104, 22, 0x2a1608, 0.92)
        .setStrokeStyle(2, 0xe8d5a8)
        .setDepth(3.2)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, "PLANT ALL", {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "7px",
          color: "#f4e2b8",
        })
        .setOrigin(0.5)
        .setDepth(3.3);

      bg.on("pointerover", () => bg.setFillStyle(0x4a2410, 0.95));
      bg.on("pointerout", () => bg.setFillStyle(0x2a1608, 0.92));
      bg.on("pointerdown", () => {
        if (isPlaying() && this.front) this.plantAll(pos.crop);
      });
    }
  }

  private clickSlot(slot: Slot) {
    if (slot.stage === 0) {
      if (this.plant(slot)) this.playPlantSfx();
    } else if (slot.stage === 3) {
      this.harvest(slot);
      this.playPlantSfx();
    } else {
      const left = Math.max(0, Math.ceil(STAGE_SECONDS * 2 - (this.time.now - slot.plantedAt) / 1000));
      this.say(`Still Growing – ${left}s left.`);
    }
  }

  /**
   * TANAM SEMUA: bunyi tanam diputar 4x berjeda, mengikuti ritme 15 petak
   * (tiap petak 110 ms). Tiap bunyi memakai pemutar sendiri, jadi tidak
   * saling memotong kalau tombol ditekan di lahan lain.
   */
  private playPlantAllSfx() {
    if (!this.plantSfx) return;
    for (const ms of PLANT_ALL_SFX_OFFSETS) {
      this.time.delayedCall(ms, () => this.spawnPlantVoice(PLANT_ALL_SFX_VOLUME));
    }
  }

  /** Satu "suara" tanam; maksimal 3 berbunyi bersamaan. */
  private spawnPlantVoice(volume: number) {
    const base = this.plantSfx;
    if (!base) return;
    this.plantAllVoices = this.plantAllVoices.filter((v) => !v.ended && !v.paused);
    if (this.plantAllVoices.length >= 3) return;

    const voice = base.cloneNode(true) as HTMLAudioElement;
    voice.volume = volume;
    voice.addEventListener("ended", () => {
      this.plantAllVoices = this.plantAllVoices.filter((v) => v !== voice);
    });
    this.plantAllVoices.push(voice);
    void voice.play().catch(() => {});
  }

  private playPlantSfx() {
    const a = this.plantSfx;
    if (!a) return;
    const now = performance.now();
    if (now - this.plantSfxAt < 80) return;
    this.plantSfxAt = now;
    a.currentTime = 0;
    void a.play().catch(() => {});
  }

  private plant(slot: Slot): boolean {
    if (this.seeds[slot.crop] <= 0) {
      this.say(`Out of ${CROPS[slot.crop].name} seeds. Get more via BUY SEED.`);
      return false;
    }
    this.seeds[slot.crop] -= 1;
    slot.stage = 1;
    slot.plantedAt = this.time.now;
    slot.sprite = this.add
      .image(slot.zone.x, slot.zone.y, `crop-${slot.crop}-1-out`)
      .setOrigin(0.5, 0.5)
      .setScale(CROP_SCALE)
      .setDepth(2);

    // animasi kecil saat bibit masuk tanah (skala dasar 2x)
    slot.sprite.setScale(CROP_SCALE * 0.6);
    this.tweens.add({ targets: slot.sprite, scale: CROP_SCALE, duration: 220, ease: "Back.easeOut" });
    this.say(`${CROPS[slot.crop].name} planted.`);
    return true;
  }

  private harvest(slot: Slot) {
    this.inventory[slot.crop] += 1;
    // Catatan: panen TIDAK menambah revenue. Revenue hanya dari penjualan
    // ke pelanggan di minimarket, supaya untung = penjualan - modal bibit.

    const sprite = slot.sprite;
    slot.stage = 0;
    slot.sprite = null;
    slot.ring.setStrokeStyle(2, 0x4a2410, 0.25);

    if (sprite) {
      // animasi: hasil panen melayang naik lalu hilang
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 70,
        alpha: 0,
        scale: CROP_SCALE * 1.25,
        duration: 520,
        ease: "Quad.easeOut",
        onComplete: () => sprite.destroy(),
      });
    }
    this.say(`${CROPS[slot.crop].name} harvested! Sent to inventory.`);
  }

  /** Panen satu petak tanpa pesan — dipakai panen berurutan. */
  private harvestQuiet(slot: Slot) {
    this.inventory[slot.crop] += 1;
    const sprite = slot.sprite;
    slot.stage = 0;
    slot.sprite = null;
    slot.ring.setStrokeStyle(2, 0x4a2410, 0.25);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 70,
        alpha: 0,
        scale: CROP_SCALE * 1.25,
        duration: 520,
        ease: "Quad.easeOut",
        onComplete: () => sprite.destroy(),
      });
    }
  }

  /**
   * Tanam semua bibit jenis ini yang ada di inventory ke slot kosong di lahan
   * itu (maksimal 15 slot). Dipanggil tombol "TANAM SEMUA" di bawah lahan.
   */
  plantAll(crop: CropId) {
    const empty = this.slots.filter((s) => s.crop === crop && s.stage === 0);
    if (empty.length === 0) {
      this.say(`${CROPS[crop].name} plot is full.`);
      return;
    }
    if (this.seeds[crop] <= 0) {
      this.say(`Out of ${CROPS[crop].name} seeds. Get more via BUY SEED.`);
      return;
    }

    this.playPlantAllSfx();

    // Tanam berurutan: petak 1, tunggu PLANT_STEP_MS, petak 2, dan seterusnya.
    let n = 0;
    for (const slot of empty) {
      if (this.seeds[crop] <= 0) break;
      this.seeds[crop] -= 1;

      const delayMs = n * PLANT_STEP_MS;
      slot.stage = 1;
      // waktu tanam dimundurkan sesuai jeda, supaya umur tanaman dihitung
      // sejak bibit benar-benar muncul (bukan sejak tombol ditekan).
      slot.plantedAt = this.time.now + delayMs;

      this.time.delayedCall(delayMs, () => {
        slot.sprite = this.add
          .image(slot.zone.x, slot.zone.y, `crop-${crop}-1-out`)
          .setOrigin(0.5, 0.5)
          .setScale(CROP_SCALE * 0.55)
          .setDepth(2);
        this.tweens.add({
          targets: slot.sprite,
          scale: CROP_SCALE,
          duration: 200,
          ease: "Back.easeOut",
        });
      });

      n += 1;
    }

    this.say(`${n} ${CROPS[crop].name} seeds planted.`);
  }

  /** Panen hanya satu jenis tanaman. */
  /**
   * Panen semua yang siap di lahan itu, satu petak demi satu petak dengan jeda
   * (dipanggil tombol PANEN vertikal di samping kanan lahan).
   */
  harvestCrop(crop: CropId) {
    const ready = this.slots.filter((s) => s.crop === crop && s.stage === 3);
    if (ready.length === 0) {
      this.say(`No ${CROPS[crop].name} ready to harvest yet.`);
      return;
    }
    this.playPlantAllSfx();

    let n = 0;
    for (const slot of ready) {
      this.time.delayedCall(n * HARVEST_STEP_MS, () => this.harvestQuiet(slot));
      n += 1;
    }
    this.say(`${n} ${CROPS[crop].name} harvested.`);
  }

  /** Dipanggil HUD: beli bibit. Mengembalikan false kalau koin kurang.
   *  quiet = true dipakai BUY ALL supaya tidak memunculkan 4 pesan beruntun. */
  buySeed(crop: CropId, qty: number, quiet = false): boolean {
    const cost = CROPS[crop].seed * qty;
    if (cost > this.coins) {
      if (!quiet) this.say(`Not enough coins. Need ${cost} coins.`);
      return false;
    }
    this.coins -= cost;
    this.spent += cost;
    this.seeds[crop] += qty;
    if (!quiet) this.say(`Bought ${qty} ${CROPS[crop].name} seeds – ${cost} coins.`);
    return true;
  }

  private say(msg: string) {
    this.notice = msg;
    this.noticeUntil = this.time.now + 2600;
  }

  // ─── Loop ────────────────────────────────────────────────────────────────

  /**
   * Tampilkan/sembunyikan halaman kebun. Kalau disembunyikan, pemain berhenti
   * tapi tanaman TETAP tumbuh (update tetap jalan di balik minimarket).
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
    if (this.front) {
      this.scene.bringToTop();
      // Setiap masuk kebun, pemain muncul di tengah jalan (persimpangan).
      this.player?.setPosition(FARM_SPAWN.x, FARM_SPAWN.y);
      this.player?.setVelocity(0, 0);
    }
  }

  update() {
    if (!isPlaying()) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }
    if (this.front) this.movePlayer();
    else (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.growCrops();
    this.updateStallPrompt();
    if (this.notice && this.time.now > this.noticeUntil) this.notice = null;
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
      // arah dominan menentukan animasi
      if (Math.abs(vx) > Math.abs(vy)) this.lastDir = vx < 0 ? "left" : "right";
      else this.lastDir = vy < 0 ? "up" : "down";
      this.player.anims.play(`walk-${this.lastDir}`, true);
    } else {
      this.player.anims.stop();
      this.player.setTexture(`player-${this.lastDir}-1-out`);
    }
  }

  private growCrops() {
    const now = this.time.now;
    for (const slot of this.slots) {
      if (slot.stage === 0 || slot.stage === 3) continue;
      const age = (now - slot.plantedAt) / 1000;
      const next: Stage = age >= STAGE_SECONDS * 2 ? 3 : age >= STAGE_SECONDS ? 2 : 1;
      if (next !== slot.stage) {
        slot.stage = next;
        if (slot.sprite) {
          slot.sprite.setTexture(`crop-${slot.crop}-${next}-out`);
          this.tweens.add({ targets: slot.sprite, scale: CROP_SCALE * 1.12, duration: 180, yoyo: true });
        }
      }
    }
  }

  // ─── Jembatan ke HUD ─────────────────────────────────────────────────────

  snapshot(): WorldSnapshot {
    const plots: PlotSnapshot[] = PLOT_POS.map((p) => ({
      crop: p.crop,
      stages: this.slots.filter((s) => s.crop === p.crop).map((s) => s.stage),
    }));
    return {
      activeScene: "farm",
      coins: this.coins,
      day: this.day,
      seeds: { ...this.seeds },
      inventory: { ...this.inventory },
      plots,
      shelves: [],
      store: {
        state: "closed",
        // Progres target tetap terbaca di kebun (uangnya sama-sama dipakai).
        goal: GOAL_COINS,
        revenue: economy.revenue - economy.dayStartRevenue,
        profit: economy.profit - economy.dayStartProfit,
        spent: 0,
        loss: 0,
        payment: null,
        customers: 0,
        served: economy.served,
        failed: economy.failed,
        total: 0,
      },
      revenue: this.revenue,
      spent: this.spent,
      notice: this.notice,
    };
  }

  /** Dipakai HUD untuk menampilkan harga jual/bibit. */
  static slotsPerPlot() {
    return SLOTS_PER_PLOT;
  }
}
