// Pasar Pagi — penjelasan harga untuk tooltip.
// SUMBER KEBENARAN aturan: PRICING.md di root repo. Jangan ubah rumus di sini
// tanpa mengubah PRICING.md dan contract/src/lib.rs (fn recompute_prices).

import type { WorldView } from "./types";
import { priceOf, stockOf } from "./types";

/** Base price per item — harus sama dengan `new()` di contract/src/lib.rs. */
export const BASE_PRICE: Record<string, number> = {
  beras: 10,
  sayur: 6,
  makanan: 25,
  kain: 12,
  pakaian: 40,
};

/** NPC pemegang stok + target_stock — harus sama dengan `npc_specs` di kontrak. */
export const HOLDER: Record<string, { npc: string; target: number; label: string }> = {
  beras: { npc: "bupasar", target: 20, label: "Bu Pasar" },
  sayur: { npc: "bupasar", target: 20, label: "Bu Pasar" },
  makanan: { npc: "busari", target: 10, label: "Bu Sari" },
  kain: { npc: "bupasar", target: 20, label: "Bu Pasar" },
  pakaian: { npc: "bupasar", target: 20, label: "Bu Pasar" },
};

const EVENT_PCT: Record<string, Partial<Record<string, number>>> = {
  gagal_panen: { beras: 40, sayur: 40 },
  festival: { makanan: 50, pakaian: 50 },
  paceklik: { beras: -20, sayur: -20, makanan: -20, kain: -20, pakaian: -20 },
};

export interface PriceExplanation {
  base: number;
  stock: number;
  target: number;
  scarcityPct: number;
  eventPct: number;
  event: string;
  price: number;
  text: string;
}

/** Hitung alasan harga sebuah item, persis seperti kontrak menghitungnya. */
export function explainPrice(world: WorldView, itemId: string): PriceExplanation {
  const base = BASE_PRICE[itemId] ?? 10;
  const holder = HOLDER[itemId];
  const npc = holder ? world.npcs.find((n) => n.npc_id === holder.npc) : undefined;
  const stock = npc ? stockOf(npc, itemId) : 0;
  const target = Math.max(holder?.target ?? 20, 1);

  let scarcityPct = 0;
  if (stock * 5 < target) scarcityPct = 60;
  else if (stock * 5 > target * 6) scarcityPct = -40;

  const eventPct = EVENT_PCT[world.event]?.[itemId] ?? 0;
  const price = priceOf(world, itemId);

  const parts: string[] = [`Harga dasar ${base} koin.`];

  if (scarcityPct > 0) {
    parts.push(`Stok tipis (${stock} dari target ${target}) → +${scarcityPct}%.`);
  } else if (scarcityPct < 0) {
    parts.push(`Stok menumpuk (${stock} vs target ${target}) → ${scarcityPct}%.`);
  } else {
    parts.push(`Stok wajar (${stock} dari target ${target}) → harga normal.`);
  }

  if (eventPct !== 0) {
    const name =
      world.event === "gagal_panen"
        ? "gagal panen"
        : world.event === "festival"
          ? "festival pasar"
          : "paceklik";
    parts.push(`Event ${name} → ${eventPct > 0 ? "+" : ""}${eventPct}%.`);
  }

  parts.push(`Harga sekarang ${price} koin.`);

  return { base, stock, target, scarcityPct, eventPct, event: world.event, price, text: parts.join(" ") };
}

/** Teks singkat untuk atribut `title` (tooltip native browser). */
export function priceReason(world: WorldView, itemId: string): string {
  return explainPrice(world, itemId).text;
}
