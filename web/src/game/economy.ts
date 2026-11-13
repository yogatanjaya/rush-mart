// Rush Mart — ekonomi bersama antar-scene.
//
// Sebelumnya semua angka (koin, bibit, inventory) hidup di dalam FarmScene.
// Begitu ada MinimarketScene, angka yang sama harus dipakai di dua tempat.
// Modul ini jadi satu-satunya sumber kebenaran: scene farm dan minimarket
// membaca/menulis objek yang sama, jadi pindah scene tidak menghilangkan uang.

import { CROPS, type CropId } from "./types";

export interface EconomyState {
  coins: number;
  day: number;
  seeds: Record<CropId, number>;
  inventory: Record<CropId, number>;
  revenue: number;
  spent: number;
  /** Total kerugian (barang dibawa pelanggan yang kabur tanpa bayar). */
  loss: number;
  /**
   * Laba bersih kumulatif: untuk setiap barang terjual, (harga jual - harga bibit).
   * Inilah angka yang dipakai bar GOALS, bukan uang masuk kotor.
   */
  profit: number;
  /** Penanda awal hari: dipakai menghitung untung hari ini. */
  dayStartRevenue: number;
  dayStartSpent: number;
  dayStartLoss: number;
  dayStartProfit: number;
  /** Pelanggan yang berhasil dilayani di ronde ini (dipakai popup hasil). */
  served: number;
  /** Pelanggan yang gagal dilayani (kabur / salah hitung) di ronde ini. */
  failed: number;
}

const zero = (): Record<CropId, number> => ({ jagung: 0, tomat: 0, wortel: 0, kentang: 0 });

export const economy: EconomyState = {
  coins: 200,
  day: 1,
  seeds: zero(),
  inventory: zero(),
  revenue: 0,
  spent: 0,
  loss: 0,
  profit: 0,
  dayStartRevenue: 0,
  dayStartSpent: 0,
  dayStartLoss: 0,
  dayStartProfit: 0,
  served: 0,
  failed: 0,
};

/**
 * Laba bersih dari satu transaksi: untuk tiap barang, (harga jual - harga bibit).
 * Contoh: 1 jagung -> 4 - 2 = 2.
 */
export function saleProfit(items: { crop: CropId; qty: number; price: number }[]) {
  return items.reduce((sum, it) => sum + (it.price - CROPS[it.crop].seed) * it.qty, 0);
}

/** Dipakai kalau nanti butuh mulai ulang sesi. */
export function resetEconomy() {
  economy.coins = 200;
  economy.day = 1;
  economy.seeds = zero();
  economy.inventory = zero();
  economy.revenue = 0;
  economy.spent = 0;
  economy.loss = 0;
  economy.profit = 0;
  economy.dayStartRevenue = 0;
  economy.dayStartSpent = 0;
  economy.dayStartLoss = 0;
  economy.dayStartProfit = 0;
  economy.served = 0;
  economy.failed = 0;
}
