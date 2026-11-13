// Shapes returned by the Rush Mart contract (JSON over RPC).

export type U128 = string;

export interface NpcView {
  npc_id: string;
  account_id: string;
  kind: string;
  cash: number;
  open: boolean;
  bankrupt_days: number;
  stock: [string, U128][];
}

export interface PricePoint {
  day: number;
  beras: U128;
  sayur: U128;
  makanan: U128;
  pakaian: U128;
}

export interface WorldView {
  day: number;
  event: string;
  event_days_left: number;
  prices: [string, U128][];
  npcs: NpcView[];
  history: PricePoint[];
  log: string[];
}

export interface PlayerView {
  account_id: string;
  koin: U128;
  energy: number;
  shares: Record<string, U128>;
}

export type Action =
  | { type: "work" }
  | { type: "rest" }
  | { type: "buy"; item_id: string; qty: number }
  | { type: "sell"; item_id: string; qty: number }
  | { type: "invest"; npc_id: string };

export type QueuedAction = Action & { uid: string };

export function priceOf(world: WorldView, itemId: string): number {
  const row = world.prices.find(([id]) => id === itemId);
  return row ? Number(row[1]) : 0;
}

export function stockOf(npc: NpcView, itemId: string): number {
  const row = npc.stock.find(([id]) => id === itemId);
  return row ? Number(row[1]) : 0;
}
