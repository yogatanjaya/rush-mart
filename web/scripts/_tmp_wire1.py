import io

# ── 1. wallet.ts: peta nama tanaman + fungsi pembungkus ───────────────────
WP = r"C:\Hermes\.worktrees\near-hackathon\web\src\near\wallet.ts"
w = io.open(WP, encoding="utf-8").read()
if "export function recordPurchase" not in w:
    w += '''

// ── Pembungkus kejadian game (nama tanaman game -> token kontrak) ─────────
const CROP_KEY: Record<string, string> = {
  jagung: "corn",
  tomat: "tomato",
  wortel: "carrot",
  kentang: "potato",
};

function tokenOf(crop: string) {
  return CROP_KEY[crop] || crop;
}

export function recordPurchase(crop: string, qty: number, coins: number) {
  recordEvent("record_purchase", { crop: tokenOf(crop), qty, coins });
}

export function recordPlant(crop: string, qty: number) {
  recordEvent("record_plant", { crop: tokenOf(crop), qty });
}

export function recordHarvest(crop: string, qty: number) {
  recordEvent("record_harvest", { crop: tokenOf(crop), qty });
}

export function recordSale(npc: string, items: Array<{ crop: string; qty: number }>, coins: number, profit: number) {
  recordEvent("record_sale", {
    npc,
    items: items.map((it) => [tokenOf(it.crop), it.qty]),
    coins: Math.max(0, Math.min(500, Math.round(coins))),
    profit: Math.round(profit),
  });
}

export function recordFail(npc: string, reason: string, loss: number) {
  recordEvent("record_fail", { npc, reason, loss: Math.max(0, Math.min(500, Math.round(loss))) });
}

export function recordRefill(crop: string, qty: number) {
  recordEvent("record_refill", { crop: tokenOf(crop), qty });
}

export function recordRound(profit: number, served: number, failed: number, secs: number) {
  recordEvent("record_round", {
    profit: Math.max(-1000, Math.min(1000, Math.round(profit))),
    served,
    failed,
    secs,
  });
}
'''
    io.open(WP, "w", encoding="utf-8", newline="").write(w)
    print("wallet.ts: pembungkus kejadian ok")
else:
    print("wallet.ts: sudah ada")

# ── 2. FarmScene: beli bibit, tanam, panen ────────────────────────────────
FP = r"C:\Hermes\.worktrees\near-hackathon\web\src\game\scenes\FarmScene.ts"
f = io.open(FP, encoding="utf-8").read()

imp_anchor = 'import { CROPS'
idx = f.find(imp_anchor)
if idx < 0:
    raise SystemExit("import CROPS tidak ketemu")
line_end = f.find("\n", idx)
f = f[: line_end + 1] + 'import { recordPurchase, recordPlant, recordHarvest } from "../../near/wallet";\n' + f[line_end + 1 :]

# beli bibit
old_buy = """    this.seeds[crop] += qty;
    if (!quiet) this.say(`Bought ${qty} ${CROPS[crop].name} seeds – ${cost} coins.`);
    return true;"""
new_buy = """    this.seeds[crop] += qty;
    if (!quiet) this.say(`Bought ${qty} ${CROPS[crop].name} seeds – ${cost} coins.`);
    recordPurchase(crop, qty, cost);
    return true;"""
if old_buy not in f:
    raise SystemExit("buySeed tidak ketemu")
f = f.replace(old_buy, new_buy, 1)

# tanam 1 petak
old_plant = """    this.say(`${CROPS[slot.crop].name} planted.`);
    return true;"""
new_plant = """    this.say(`${CROPS[slot.crop].name} planted.`);
    recordPlant(slot.crop, 1);
    return true;"""
if old_plant not in f:
    raise SystemExit("plant() tidak ketemu")
f = f.replace(old_plant, new_plant, 1)

# panen 1 petak
old_harv = """    this.say(`${CROPS[slot.crop].name} harvested! Sent to inventory.`);"""
new_harv = """    this.say(`${CROPS[slot.crop].name} harvested! Sent to inventory.`);
    recordHarvest(slot.crop, 1);"""
if old_harv not in f:
    raise SystemExit("harvest() tidak ketemu")
f = f.replace(old_harv, new_harv, 1)

# panen satu lahan (agregat)
old_crop = """    this.say(`${n} ${CROPS[crop].name} harvested.`);"""
new_crop = """    this.say(`${n} ${CROPS[crop].name} harvested.`);
    recordHarvest(crop, n);"""
if old_crop not in f:
    raise SystemExit("harvestCrop tidak ketemu")
f = f.replace(old_crop, new_crop, 1)

io.open(FP, "w", encoding="utf-8", newline="").write(f)
print("FarmScene: beli + tanam + panen ok")
