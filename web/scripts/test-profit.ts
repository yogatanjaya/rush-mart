// Uji cepat rumus laba bersih untuk bar GOALS.
// Jalankan: npx esbuild scripts/test-profit.ts --bundle --platform=node --outfile=... && node ...
import { CROPS, GOAL_COINS } from "../src/game/types";
import { saleProfit } from "../src/game/economy";

type Case = { label: string; items: { crop: keyof typeof CROPS; qty: number; price: number }[]; want: number };

const cases: Case[] = [
  { label: "1 jagung (4 - 2)", items: [{ crop: "jagung", qty: 1, price: CROPS.jagung.price }], want: 2 },
  { label: "2 jagung", items: [{ crop: "jagung", qty: 2, price: CROPS.jagung.price }], want: 4 },
  { label: "1 tomat (6 - 4)", items: [{ crop: "tomat", qty: 1, price: CROPS.tomat.price }], want: 2 },
  { label: "1 wortel (4 - 3)", items: [{ crop: "wortel", qty: 1, price: CROPS.wortel.price }], want: 1 },
  { label: "1 kentang (6 - 3)", items: [{ crop: "kentang", qty: 1, price: CROPS.kentang.price }], want: 3 },
  {
    label: "campur: 1 jagung + 1 tomat",
    items: [
      { crop: "jagung", qty: 1, price: CROPS.jagung.price },
      { crop: "tomat", qty: 1, price: CROPS.tomat.price },
    ],
    want: 2 + 2,
  },
];

let fail = 0;
for (const c of cases) {
  const got = saleProfit(c.items);
  const ok = got === c.want;
  if (!ok) fail++;
  console.log(`${ok ? "OK  " : "GAGAL"} ${c.label} -> laba ${got} (harap ${c.want})`);
}

// Berapa barang minimal untuk tembus target 100?
const best = saleProfit([{ crop: "kentang", qty: 1, price: CROPS.kentang.price }]);
const worst = saleProfit([{ crop: "wortel", qty: 1, price: CROPS.wortel.price }]);
console.log(
  `\nTarget ${GOAL_COINS} laba: butuh ~${Math.ceil(GOAL_COINS / best)} barang termahal ` +
    `sampai ~${Math.ceil(GOAL_COINS / worst)} barang termurah.`
);
console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
