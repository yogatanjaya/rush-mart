// Spike: wallet testnet + session key (function-call key).
// Modul wallet di-import dinamis supaya error-nya kelihatan di panel log, bukan diam.
import { Buffer } from "buffer";
// @ts-ignore
window.Buffer = window.Buffer || Buffer;
// Modul Meteor membaca process.env — sediakan shim kecil sebelum import dinamis.
// @ts-ignore
window.process = window.process || { env: { NODE_ENV: "production" } };

const CONTRACT = "rushmart722324.testnet";
const RPC = "https://rpc.testnet.fastnear.com";
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

const logEl = document.getElementById("log") as HTMLDivElement;
const btnConnect = document.getElementById("btn-connect") as HTMLButtonElement;
const btnKey = document.getElementById("btn-key") as HTMLButtonElement;
const btnSilent = document.getElementById("btn-silent") as HTMLButtonElement;
const btnRead = document.getElementById("btn-read") as HTMLButtonElement;

function log(msg: string, kind: "ok" | "err" | "" = "") {
  const line = document.createElement("div");
  if (kind) line.className = kind;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

let accountId = "";
let selector: any = null;
let modal: any = null;

log("boot: modul utama dimuat");

(window as any).addEventListener("error", (e: any) => log(`JS error: ${e.message}`, "err"));
(window as any).addEventListener("unhandledrejection", (e: any) =>
  log(`promise error: ${e?.reason?.message || e?.reason}`, "err"),
);

async function initWallet() {
  log("memuat modul wallet…");
  const core = await import("@near-wallet-selector/core");
  log("core ok");
  const modalUi = await import("@near-wallet-selector/modal-ui");
  log("modal-ui ok");
  const meteor = await import("@near-wallet-selector/meteor-wallet");
  log("modul Meteor ok");

  selector = await core.setupWalletSelector({
    network: "testnet",
    modules: [meteor.setupMeteorWallet()],
  });
  modal = modalUi.setupModal(selector, { contractId: CONTRACT });
  log(`modul terpasang: ${(selector.store.getState().modules || []).map((m: any) => m.id).join(", ")}`, "ok");

  btnConnect.onclick = () => {
    try {
      log("membuka modal wallet…");
      modal.show();
    } catch (e: any) {
      log(`modal gagal: ${e?.message || e}`, "err");
    }
  };

  selector.store.observable.subscribe((state: any) => {
    const signed = state.accounts.find((a: any) => a.active);
    if (signed) {
      accountId = signed.accountId;
      log(`terhubung sebagai ${accountId}`, "ok");
      btnConnect.textContent = `1. Terhubung: ${accountId}`;
      btnKey.disabled = false;
      btnRead.disabled = false;
      btnSilent.disabled = !sessionStorage.getItem("rushmart:session-key");
    }
  });

  btnConnect.disabled = false;
  log("siap. Tekan tombol 1 untuk connect wallet.");
}

btnConnect.disabled = true;

// 2. Tambah session key: satu transaksi AddKey, satu approval wallet.
btnKey.onclick = async () => {
  try {
    const nearApi = await import("near-api-js");
    const kp = nearApi.KeyPair.fromRandom("ed25519");
    const wallet = await selector.wallet();
    log(`membuat kunci sesi… ${kp.getPublicKey().toString().slice(0, 18)}…`);

    const action = nearApi.transactions.addKey(
      kp.getPublicKey(),
      nearApi.transactions.functionCallAccessKey(CONTRACT, METHODS, 500000000000000000000000n),
    );

    const res = await wallet.signAndSendTransaction({ receiverId: accountId, actions: [action as any] });
    log(`wallet menjawab: ${JSON.stringify(res).slice(0, 180)}`);
    sessionStorage.setItem("rushmart:session-key", JSON.stringify({ accountId, secret: kp.toString() }));
    btnSilent.disabled = false;
    log("kunci sesi tersimpan (sessionStorage)", "ok");
  } catch (e: any) {
    log(`GAGAL tambah kunci: ${e?.message || e}`, "err");
  }
};

// 3. Tanda tangan lokal dengan kunci sesi — tanpa popup wallet.
btnSilent.onclick = async () => {
  try {
    const nearApi = await import("near-api-js");
    const raw = sessionStorage.getItem("rushmart:session-key");
    if (!raw) throw new Error("belum ada kunci sesi");
    const { accountId: acc, secret } = JSON.parse(raw);

    const keyStore = new nearApi.keyStores.InMemoryKeyStore();
    await keyStore.setKey("testnet", acc, nearApi.KeyPair.fromString(secret));
    const near = await nearApi.connect({ networkId: "testnet", nodeUrl: RPC, keyStore, deps: { keyStore } });
    const account = await near.account(acc);

    log("mengirim record_harvest dengan kunci sesi (tanpa popup)…");
    const r = await account.functionCall({
      contractId: CONTRACT,
      methodName: "record_harvest",
      args: { crop: "corn", qty: 1 },
      gas: 50000000000000n,
      attachedDeposit: 0n,
    });
    log(`sukses: ${JSON.stringify(r.status).slice(0, 100)}`, "ok");
  } catch (e: any) {
    log(`GAGAL catat: ${e?.message || e}`, "err");
  }
};

// 4. Baca stats dari kontrak.
btnRead.onclick = async () => {
  try {
    const nearApi = await import("near-api-js");
    const keyStore = new nearApi.keyStores.InMemoryKeyStore();
    const near = await nearApi.connect({ networkId: "testnet", nodeUrl: RPC, keyStore, deps: { keyStore } });
    const account = await near.account(accountId);
    const stats = await account.viewFunction({ contractId: CONTRACT, methodName: "get_stats", args: { account_id: accountId } });
    const bal = await account.viewFunction({
      contractId: CONTRACT,
      methodName: "mt_balance_of",
      args: { account_id: accountId, token_id: "corn" },
    });
    log(`stats: ${JSON.stringify(stats)}`, "ok");
    log(`saldo corn (NEP-245): ${JSON.stringify(bal)}`, "ok");
  } catch (e: any) {
    log(`GAGAL baca: ${e?.message || e}`, "err");
  }
};

initWallet().catch((e) => log(`init wallet GAGAL: ${e?.message || e}`, "err"));
