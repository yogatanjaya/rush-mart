// Uji jual kontrak Rush Mart di testnet: catat aksi, baca hasilnya.
// Key dibaca dari file di luar repo.
import fs from "fs";
import { connect, keyStores, KeyPair } from "near-api-js";

const KEY_FILE = process.argv[2];
const k = JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
const ACCOUNT = k.account_id;

const keyStore = new keyStores.InMemoryKeyStore();
await keyStore.setKey("testnet", ACCOUNT, KeyPair.fromString(k.secret_key));
const near = await connect({ networkId: "testnet", nodeUrl: "https://rpc.testnet.fastnear.com", keyStore, deps: { keyStore } });
const account = await near.account(ACCOUNT);

async function call(methodName, args) {
  const r = await account.functionCall({
    contractId: ACCOUNT,
    methodName,
    args,
    gas: "100000000000000",
    attachedDeposit: "0",
  });
  const ok = r.status?.SuccessValue !== undefined;
  const logs = (r.receipts_outcome || [])
    .flatMap((x) => x.outcome?.logs || [])
    .filter((l) => l.startsWith("EVENT_JSON:"));
  return { ok, logs };
}

const steps = [
  ["record_purchase", { crop: "corn", qty: 15, coins: 30 }],
  ["record_plant", { crop: "corn", qty: 15 }],
  ["record_harvest", { crop: "corn", qty: 12 }],
  ["record_refill", { crop: "corn", qty: 10 }],
  ["record_sale", { npc: "Village Woman", items: [["corn", 5]], coins: 20, profit: 10 }],
  ["record_fail", { npc: "Village Kid", reason: "wrong change", loss: 2 }],
  ["record_round", { profit: 118, served: 12, failed: 3, secs: 150 }],
];

for (const [m, a] of steps) {
  const r = await call(m, a);
  console.log(`${r.ok ? "OK " : "GAGAL"} ${m}`, r.logs.length ? "| event: " + r.logs[0].slice(0, 150) : "");
}

const view = (methodName, args) => account.viewFunction({ contractId: ACCOUNT, methodName, args });

console.log("\n--- hasil baca dari chain ---");
console.log("get_stats      :", JSON.stringify(await view("get_stats", { account_id: ACCOUNT })));
console.log("mt_balance corn:", JSON.stringify(await view("mt_balance_of", { account_id: ACCOUNT, token_id: "corn" })));
console.log("mt_supply corn :", JSON.stringify(await view("mt_supply", { token_id: "corn" })));
console.log("mt_metadata    :", JSON.stringify(await view("mt_metadata", { token_ids: ["corn", "tomato"] })));
console.log("get_top        :", JSON.stringify(await view("get_top", { n: 5 })));
const recent = await view("get_recent", { account_id: ACCOUNT });
console.log("get_recent     :", recent.length, "catatan; terakhir:", JSON.stringify(recent[recent.length - 1]));
