// Uji mekanisme session key di testnet TANPA wallet UI:
//  1. buat kunci baru
//  2. tambahkan sebagai FunctionCall access key (dibatasi ke kontrak + method game)
//  3. pakai kunci itu untuk memanggil record_harvest (mensimulasikan "tanpa popup")
// Key akun dibaca dari file di luar repo; kunci sesi hanya hidup di memori script ini.
import fs from "fs";
import { connect, keyStores, KeyPair, transactions } from "near-api-js";

const KEY_FILE = process.argv[2];
const ACCOUNT = JSON.parse(fs.readFileSync(KEY_FILE, "utf8")).account_id;
const SECRET = JSON.parse(fs.readFileSync(KEY_FILE, "utf8")).secret_key;
const CONTRACT = ACCOUNT;
const METHODS = [
  "record_purchase",
  "record_plant",
  "record_harvest",
  "record_sale",
  "record_fail",
  "record_refill",
  "record_round",
  "mt_transfer",
];

const masterStore = new keyStores.InMemoryKeyStore();
await masterStore.setKey("testnet", ACCOUNT, KeyPair.fromString(SECRET));
const nearMaster = await connect({ networkId: "testnet", nodeUrl: "https://rpc.testnet.fastnear.com", keyStore: masterStore, deps: { keyStore: masterStore } });
const master = await nearMaster.account(ACCOUNT);

// 1) kunci sesi
const session = KeyPair.fromRandom("ed25519");
console.log("kunci sesi dibuat:", session.getPublicKey().toString());

// 2) daftarkan sebagai FunctionCall key (allowance 0.5 NEAR)
const addKey = transactions.addKey(
  session.getPublicKey(),
  transactions.functionCallAccessKey(CONTRACT, METHODS, 500000000000000000000000n),
);
const r1 = await master.signAndSendTransaction({ receiverId: ACCOUNT, actions: [addKey] });
console.log("add_key:", r1.status?.SuccessValue !== undefined ? "OK" : JSON.stringify(r1.status).slice(0, 160));

// 3) pakai kunci sesi untuk menulis (tanpa key akun)
const sStore = new keyStores.InMemoryKeyStore();
await sStore.setKey("testnet", ACCOUNT, session);
const nearS = await connect({ networkId: "testnet", nodeUrl: "https://rpc.testnet.fastnear.com", keyStore: sStore, deps: { keyStore: sStore } });
const acc = await nearS.account(ACCOUNT);

const before = await acc.viewFunction({ contractId: CONTRACT, methodName: "mt_balance_of", args: { account_id: ACCOUNT, token_id: "corn" } });

const r2 = await acc.functionCall({
  contractId: CONTRACT,
  methodName: "record_harvest",
  args: { crop: "corn", qty: 3 },
  gas: 50000000000000n,
  attachedDeposit: 0n,
});
console.log("record_harvest via session key:", r2.status?.SuccessValue !== undefined ? "OK" : JSON.stringify(r2.status).slice(0, 200));

const after = await acc.viewFunction({ contractId: CONTRACT, methodName: "mt_balance_of", args: { account_id: ACCOUNT, token_id: "corn" } });
console.log(`saldo corn: ${before} -> ${after}`);

// 4) pastikan kunci sesi TIDAK bisa memanggil method di luar daftar
try {
  await acc.functionCall({ contractId: CONTRACT, methodName: "get_stats", args: { account_id: ACCOUNT }, gas: 10000000000000n, attachedDeposit: 0n });
  console.log("PERINGATAN: method di luar daftar tetap bisa dipanggil");
} catch (e) {
  console.log("pembatasan method bekerja: panggilan di luar daftar ditolak");
}
