// Rush Mart — tipe & konstanta bersama antara scene Phaser dan HUD React.

export type CropId = "jagung" | "tomat" | "wortel" | "kentang";

/** Scene yang sedang aktif. HUD memakainya untuk memilih tombol yang tampil. */
export type SceneId = "farm" | "minimarket";

/** 0 = kosong, 1 = tunas, 2 = sedang, 3 = siap panen */
export type Stage = 0 | 1 | 2 | 3;

export const CROPS: Record<
  CropId,
  { name: string; icon: string; price: number; seed: number; accent: string }
> = {
  jagung: { name: "Corn", icon: "icon-corn", price: 4, seed: 2, accent: "#f6c945" },
  tomat: { name: "Tomato", icon: "icon-tomato", price: 6, seed: 4, accent: "#e14b3b" },
  wortel: { name: "Carrot", icon: "icon-carrot", price: 4, seed: 3, accent: "#e88a2c" },
  kentang: { name: "Potato", icon: "icon-potato", price: 6, seed: 3, accent: "#c08a4e" },
};

export const CROP_ORDER: CropId[] = ["jagung", "tomat", "wortel", "kentang"];

/** Detik nyata per tahap tumbuh. 3 tahap = 2 transisi = 15 detik total. */
export const STAGE_SECONDS = 7.5;

/** Slot per lahan: 3 × 3. */
export const SLOTS_PER_PLOT = 15;

/** Target koin yang harus dikumpulkan dalam satu sesi jualan. */
export const GOAL_COINS = 100;

/** Satu baris belanjaan pelanggan di kasir. */
export interface PaymentItem {
  crop: CropId;
  qty: number;
  /** Harga satuan. Total sengaja TIDAK dikirim — pemain yang menghitung. */
  price: number;
}

/** Permintaan pembayaran yang sedang menunggu dihitung pemain. */
export interface PaymentRequest {
  /** Naik tiap transaksi; dipakai HUD untuk mengosongkan kolom input. */
  id: number;
  items: PaymentItem[];
  /** Uang yang diserahkan pelanggan (pecahan bulat). */
  paid: number;
}

/** Keadaan toko selama satu sesi jualan. */
export interface StoreSnapshot {
  state: "closed" | "open" | "ended";
  /** Target koin sesi ini — pengganti hitungan waktu. */
  goal: number;
  /** Pendapatan sesi ini (uang masuk kotor dari penjualan ke pelanggan). */
  revenue: number;
  /** Laba bersih sesi ini: jumlah (harga jual - harga bibit) tiap barang terjual. */
  profit: number;
  /** Belanja bibit hari ini. */
  spent: number;
  /** Kerugian hari ini (barang pelanggan yang kabur tanpa bayar). */
  loss: number;
  /** Transaksi kasir yang menunggu dihitung; null kalau tidak ada. */
  payment: PaymentRequest | null;
  /** Pelanggan yang masih di toko. */
  customers: number;
  /** Pelanggan yang berhasil dilayani hari ini. */
  served: number;
  /** Pelanggan yang gagal dilayani (kabur / salah hitung). */
  failed: number;
  /** Target pelanggan per hari. */
  total: number;
}

/** Isi satu rak di minimarket. */
export interface ShelfSnapshot {
  crop: CropId;
  count: number;
  capacity: number;
}

export interface PlotSnapshot {
  crop: CropId;
  /** stage per slot, index 0..8 (baris demi baris, kiri→kanan). */
  stages: Stage[];
}

/** Keadaan dunia yang dipakai HUD. Dibaca lewat polling ringan. */
export interface WorldSnapshot {
  /** Scene yang sedang dijalankan. */
  activeScene: SceneId;
  coins: number;
  day: number;
  seeds: Record<CropId, number>;
  inventory: Record<CropId, number>;
  plots: PlotSnapshot[];
  /** Rak minimarket; kosong saat pemain di kebun. */
  shelves: ShelfSnapshot[];
  /** Keadaan toko; di kebun selalu "closed". */
  store: StoreSnapshot;
  revenue: number;
  spent: number;
  /** pesan singkat untuk toast di HUD */
  notice: string | null;
}
