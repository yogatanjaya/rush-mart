// Deploy kontrak Rush Mart ke testnet.
// Key TIDAK ditulis di sini — dibaca dari file di luar repo.
// Pakai: node scripts/deploy.mjs <path-ke-key.json>
import fs from "fs";
import { connect, keyStores, KeyPair } from "near-api-js";

const KEY_FILE = process.argv[2];
if (!KEY_FILE) {
  console.error("pakai: node scripts/deploy.mjs <path-ke-key.json>");
  process.exit(1);
}

const WASM = process.env.RUSHMART_WASM;
if (!WASM) {
  console.error("set RUSHMART_WASM ke file .wasm hasil build");
  process.exit(1);
}

const k = JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
const ACCOUNT = k.account_id;
const SECRET = k.secret_key;

const keyStore = new keyStores.InMemoryKeyStore();
await keyStore.setKey("testnet", ACCOUNT, KeyPair.fromString(SECRET));
const near = await connect({
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.fastnear.com",
  keyStore,
  deps: { keyStore },
});
const account = await near.account(ACCOUNT);

const code = fs.readFileSync(WASM);
console.log("akun   :", ACCOUNT);
console.log("wasm   :", code.length, "bytes");

const before = await account.state();
console.log("saldo  :", (Number(before.amount) / 1e24).toFixed(3), "NEAR");

console.log("→ deploy kontrak...");
const dep = await account.deployContract(code);
console.log("   ok:", dep.status?.SuccessValue !== undefined ? "sukses" : JSON.stringify(dep.status).slice(0, 120));

console.log("→ panggil new(owner)...");
const init = await account.functionCall({
  contractId: ACCOUNT,
  methodName: "new",
  args: { owner: ACCOUNT },
  gas: "100000000000000",
  attachedDeposit: "0",
});
console.log("   ok:", JSON.stringify(init.status).slice(0, 160));

const stats = await account.viewFunction({
  contractId: ACCOUNT,
  methodName: "get_stats",
  args: { account_id: ACCOUNT },
});
console.log("→ get_stats:", JSON.stringify(stats));

const top = await account.viewFunction({
  contractId: ACCOUNT,
  methodName: "get_top",
  args: { n: 5 },
});
console.log("→ get_top  :", JSON.stringify(top));
