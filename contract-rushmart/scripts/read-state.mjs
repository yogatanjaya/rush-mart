// Baca state kontrak Rush Mart dari testnet.
import fs from "fs";
import { connect, keyStores } from "near-api-js";

const KEY_FILE = process.argv[2];
const ACC = JSON.parse(fs.readFileSync(KEY_FILE, "utf8")).account_id;
const CONTRACT = ACC;

const store = new keyStores.InMemoryKeyStore();
const near = await connect({ networkId: "testnet", nodeUrl: "https://rpc.testnet.fastnear.com", keyStore: store, deps: { keyStore: store } });
const acc = await near.account(ACC);

const stats = await acc.viewFunction({ contractId: CONTRACT, methodName: "get_stats", args: { account_id: ACC } });
console.log("STATS:", JSON.stringify(stats));

const top = await acc.viewFunction({ contractId: CONTRACT, methodName: "get_top", args: { n: 5 } });
console.log("TOP:", JSON.stringify(top));

const recent = await acc.viewFunction({ contractId: CONTRACT, methodName: "get_recent", args: { account_id: ACC, limit: 15 } });
console.log("RECENT_COUNT:", recent.length);
for (const r of recent) console.log("RECENT:", JSON.stringify(r));

for (const t of ["corn", "tomato", "carrot", "potato"]) {
  const b = await acc.viewFunction({ contractId: CONTRACT, methodName: "mt_balance_of", args: { account_id: ACC, token_id: t } });
  console.log(`MT ${t}:`, JSON.stringify(b));
}
