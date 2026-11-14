// Integrasi NEAR: connect wallet (Meteor) + kunci sesi untuk pencatatan tanpa popup.
// Modul di-import dinamis supaya bundle game tetap ringan & error tidak mematikan game.
import { Buffer } from "buffer";

const CONTRACT = "rushmart722324.testnet";
const RPC = "https://rpc.testnet.fastnear.com";
const NETWORK = "testnet";
const ALLOWANCE = 500000000000000000000000n; // 0.5 NEAR
const KEY_STORAGE = "rushmart:session";
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

export type WalletStatus = "off" | "connecting" | "on";

type Listener = (s: { status: WalletStatus; accountId: string; pending: number }) => void;

let selector: any = null;
let modal: any = null;
let nearApi: any = null;
let accountId = "";
let status: WalletStatus = "off";
let queue: Array<() => Promise<void>> = [];
let running = false;
let sent = 0;
let failed = 0;
const listeners = new Set<Listener>();

function emit() {
  const snapshot = { status, accountId, pending: queue.length, sent, failed } as any;
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  fn({ status, accountId, pending: queue.length } as any);
  return () => listeners.delete(fn);
}

export function getCounters() {
  return { sent, failed };
}

function ensureGlobals() {
  // @ts-ignore
  if (!window.Buffer) window.Buffer = Buffer;
  // @ts-ignore
  if (!window.process) window.process = { env: { NODE_ENV: "production" } };
}

async function loadModules() {
  ensureGlobals();
  if (!nearApi) nearApi = await import("near-api-js");
  if (!selector) {
    const core = await import("@near-wallet-selector/core");
    const meteor = await import("@near-wallet-selector/meteor-wallet");
    const modalUi = await import("@near-wallet-selector/modal-ui");
    await import("@near-wallet-selector/modal-ui/styles.css");
    selector = await core.setupWalletSelector({ network: NETWORK, modules: [meteor.setupMeteorWallet()] });
    modal = modalUi.setupModal(selector, { contractId: CONTRACT });
    selector.store.observable.subscribe((state: any) => {
      const active = state.accounts.find((a: any) => a.active);
      if (active && active.accountId !== accountId) {
        accountId = active.accountId;
        emit();
        // kalau kunci sesi lama ada untuk akun ini, langsung aktif
        const saved = localStorage.getItem(KEY_STORAGE);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.accountId === accountId) setStatus("on");
          } catch {
            /* abaikan */
          }
        }
      }
    });
  }
}

function setStatus(s: WalletStatus) {
  status = s;
  emit();
}

/** Buka modal wallet. */
export async function connectWallet() {
  await loadModules();
  modal.show();
}

/** Pastikan ada kunci sesi; kalau belum, minta 1× approval wallet. */
export async function ensureSessionKey(): Promise<boolean> {
  await loadModules();
  if (!accountId) {
    await connectWallet();
    return false;
  }
  const saved = localStorage.getItem(KEY_STORAGE);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.accountId === accountId) {
        setStatus("on");
        return true;
      }
    } catch {
      /* lanjut buat baru */
    }
  }

  setStatus("connecting");
  try {
    const kp = nearApi.KeyPair.fromRandom("ed25519");
    const wallet = await selector.wallet();
    const action = nearApi.transactions.addKey(
      kp.getPublicKey(),
      nearApi.transactions.functionCallAccessKey(CONTRACT, METHODS, ALLOWANCE),
    );
    await wallet.signAndSendTransaction({ receiverId: accountId, actions: [action] });
    localStorage.setItem(KEY_STORAGE, JSON.stringify({ accountId, secret: kp.toString() }));
    setStatus("on");
    return true;
  } catch (e) {
    console.error("session key gagal", e);
    setStatus("off");
    return false;
  }
}

export function disconnect() {
  localStorage.removeItem(KEY_STORAGE);
  accountId = "";
  setStatus("off");
}

/** Kirim satu aksi ke chain memakai kunci sesi (tanpa popup). */
async function sendOnce(method: string, args: Record<string, unknown>) {
  await loadModules();
  const saved = localStorage.getItem(KEY_STORAGE);
  if (!saved) return;
  const { accountId: acc, secret } = JSON.parse(saved);

  const keyStore = new nearApi.keyStores.InMemoryKeyStore();
  await keyStore.setKey(NETWORK, acc, nearApi.KeyPair.fromString(secret));
  const near = await nearApi.connect({ networkId: NETWORK, nodeUrl: RPC, keyStore, deps: { keyStore } });
  const account = await near.account(acc);
  await account.functionCall({
    contractId: CONTRACT,
    methodName: method,
    args,
    gas: 100000000000000n,
    attachedDeposit: 0n,
  });
}

/** Masukkan aksi ke antrean (dikirim berurutan, di latar belakang). */
export function recordEvent(method: string, args: Record<string, unknown>) {
  if (status !== "on") return;
  queue.push(async () => {
    try {
      await sendOnce(method, args);
      sent += 1;
    } catch (e) {
      failed += 1;
      console.warn("record gagal", method, e);
    }
    emit();
  });
  void pump();
}

async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift()!;
    emit();
    await job();
  }
  running = false;
}


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
