// Pasar Pagi — read-only on-chain verifier.
// Tanpa secret key, tanpa wallet. Cukup Node.js 20+ (fetch bawaan).
//
// Pakai:  node scripts/verify.mjs
// Atau:   node scripts/verify.mjs <contract-id>
//
// Exit code 0 kalau contract hidup dan state-nya valid; 1 kalau gagal.

const CONTRACT = process.argv[2] || "pasar-pagi-17536.testnet";
const RPC = "https://rpc.testnet.near.org";

const ITEMS = ["beras", "sayur", "makanan", "kain", "pakaian"];
const NPCS = ["paktani", "bupasar", "busari", "pabrik", "warga"];

function decode(bytes) {
  return JSON.parse(Buffer.from(bytes).toString("utf8"));
}

async function view(method, args = {}) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: CONTRACT,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      },
    }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.data || json.error.message || "RPC error");
  }
  return decode(json.result.result);
}

function asPairs(rows) {
  return Object.fromEntries((rows || []).map(([k, v]) => [k, String(v)]));
}

const world = await view("get_world");
const items = asPairs(world.prices);
const npcs = world.npcs || [];
const bankrupt = npcs.filter((n) => !n.open);

const checks = [
  ["day >= 1", Number(world.day) >= 1],
  ["semua 5 item ada", ITEMS.every((id) => id in items)],
  ["semua 5 NPC ada", NPCS.every((id) => npcs.some((n) => n.npc_id === id))],
  ["harga >= 1 koin", ITEMS.every((id) => Number(items[id]) >= 1)],
  ["ada log pasar", Array.isArray(world.log) && world.log.length > 0],
];

console.log(`Contract : ${CONTRACT}`);
console.log(`Hari     : ${world.day}   Event: ${world.event}`);
console.log(`Harga    : ${ITEMS.map((id) => `${id}=${items[id]}`).join("  ")}`);
console.log(
  `NPC      : ${npcs
    .map((n) => `${n.npc_id}:${n.cash}${n.open ? "" : "(TUTUP)"}`)
    .join("  ")}`,
);
console.log(`Bangkrut : ${bankrupt.length} toko`);
console.log(`Log tail : ${world.log.slice(-2).join(" | ")}`);
console.log("");

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  if (!pass) ok = false;
}

console.log("");
if (ok) {
  console.log("OK: contract hidup dan state valid.");
} else {
  console.log("GAGAL: ada cek yang tidak lolos.");
}
process.exitCode = ok ? 0 : 1;
