import { useCallback, useEffect, useState } from "react";
import { setupWalletSelector, type WalletSelector, type Wallet } from "@near-wallet-selector/core";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { CONTRACT_ID, ITEMS, NPC_LABEL, NPC_ICON, EVENT_LABEL, EVENT_ICON } from "./config";
import { getWorld, getPlayer, playDay, fastForward, registerPlayer } from "./near";
import type { Action, PlayerView, QueuedAction, WorldView } from "./types";
import { priceOf } from "./types";
import { explainPrice } from "./pricing";
import "./App.css";

export default function App() {
  const [world, setWorld] = useState<WorldView | null>(null);
  const [player, setPlayer] = useState<PlayerView | null>(null);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // ---------------------------------------------------------------- load state
  const refresh = useCallback(async () => {
    try {
      const w = await getWorld();
      setWorld(w);
      if (accountId) {
        try {
          setPlayer(await getPlayer(accountId));
          setRegistered(true);
        } catch {
          setPlayer(null);
          setRegistered(false);
        }
      }
    } catch (e) {
      setErr(String(e));
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ------------------------------------------------------------- wallet setup
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sel = await setupWalletSelector({
          network: "testnet",
          modules: [setupMeteorWallet()],
        });
        if (!mounted) return;
        setSelector(sel);

        const applyAccounts = async (ids: string[]) => {
          if (ids.length === 0) {
            setAccountId(null);
            setWallet(null);
            setPlayer(null);
            return;
          }
          setAccountId(ids[0]);
          setWallet(await sel.wallet());
        };

        // initial sync + poll (the core store has no subscribe in this version)
        const sync = async () => {
          const accounts = sel.store.getState().accounts;
          await applyAccounts(accounts.map((a) => a.accountId));
        };
        await sync();
        const timer = setInterval(sync, 1500);
        return () => clearInterval(timer);
      } catch (e) {
        setErr("Wallet gagal dimuat: " + String(e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const connect = () => {
    if (!selector) {
      setErr("Wallet belum siap — tunggu sebentar lalu coba lagi.");
      return;
    }
    setShowLogin(true);
  };

  const signInWithMeteor = async () => {
    if (!selector) return;
    setBusy(true);
    setErr(null);
    try {
      const w = await selector.wallet("meteor-wallet");
      await w.signIn({ contractId: CONTRACT_ID } as any);
      const accounts = selector.store.getState().accounts;
      if (accounts.length > 0) {
        setAccountId(accounts[0].accountId);
        setWallet(await selector.wallet());
      }
      setShowLogin(false);
      setMsg("Berhasil masuk. Selamat datang di Rush Mart!");
    } catch (e) {
      setErr("Login gagal: " + String(e).slice(0, 300));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!wallet) return;
    await wallet.signOut();
    setAccountId(null);
    setWallet(null);
    setPlayer(null);
  };

  // ------------------------------------------------------------- game actions
  const enqueue = (a: Action) => {
    if (queue.length >= 8) {
      setErr("Maksimal 8 aksi per hari.");
      return;
    }
    setQueue((q) => [...q, { ...a, uid: crypto.randomUUID() } as QueuedAction]);
  };

  const run = async (fn: () => Promise<unknown>, note: string) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(note);
      setQueue([]);
      await refresh();
    } catch (e) {
      setErr(String(e).slice(0, 300));
    } finally {
      setBusy(false);
    }
  };

  const submitDay = () =>
    run(async () => {
      if (!wallet || !accountId) throw new Error("Connect wallet dulu.");
      const actions: Action[] = queue.map(({ uid: _uid, ...a }) => a as Action);
      if (actions.length === 0) actions.push({ type: "rest" });
      return playDay(wallet, accountId, actions);
    }, "Hari selesai! Ekonomi bergerak.");

  const skipWeek = () =>
    run(async () => {
      if (!wallet || !accountId) throw new Error("Connect wallet dulu.");
      return fastForward(wallet, accountId, 7);
    }, "7 hari disimulasikan.");

  const register = () =>
    run(async () => {
      if (!wallet || !accountId) throw new Error("Connect wallet dulu.");
      return registerPlayer(wallet, accountId);
    }, "Kamu terdaftar dengan 100 koin.");

  // ------------------------------------------------------------------ helpers
  const price = (id: string) => (world ? priceOf(world, id) : 0);

  const event = world?.event ?? "normal";
  const showRegister = Boolean(accountId && world && !registered);

  if (err && !world) {
    return <div className="fatal">Gagal memuat kontrak: {err}</div>;
  }

  if (!world) return <div className="loading">Memuat Rush Mart…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🌅</span>
          <div>
            <h1>Rush Mart</h1>
            <p>Ekonomi yang hidup di NEAR</p>
          </div>
        </div>
        <div className="hud">
          <span className="pill">Hari {world.day}</span>
          <span className="pill event">
            {EVENT_ICON[event] ?? "☀️"} {EVENT_LABEL[event] ?? event}
            {world.event_days_left > 0 ? ` · ${world.event_days_left}h` : ""}
          </span>
          {accountId ? (
            <>
              <span className="pill wallet">{accountId}</span>
              <button className="ghost" onClick={disconnect}>
                Keluar
              </button>
            </>
          ) : (
            <button className="primary" onClick={connect}>
              Masuk{selector ? "" : " (menyiapkan…)"}
            </button>
          )}
        </div>
      </header>

      {msg && <div className="toast ok">{msg}</div>}
      {err && <div className="toast bad">{err}</div>}

      {showLogin && (
        <div className="login-overlay" onClick={() => setShowLogin(false)}>
          <div className="login-card" onClick={(e) => e.stopPropagation()}>
            <h2>Masuk ke Rush Mart</h2>
            <p className="muted">
              Pakai Meteor Wallet — masuk lewat email, tanpa seed phrase. Dompet ini juga
              menerima hadiah NEAR kalau kamu menang.
            </p>
            <button className="primary wide" disabled={busy} onClick={signInWithMeteor}>
              {busy ? "Menghubungkan…" : "Lanjut dengan Meteor Wallet"}
            </button>
            <button className="ghost wide" disabled={busy} onClick={() => setShowLogin(false)}>
              Batal
            </button>
            <small className="muted">
              Satu persetujuan per hari in-game. Fast-forward juga satu persetujuan.
            </small>
          </div>
        </div>
      )}

      <main className="grid">
        {/* ------------------------------------------------------ player panel */}
        <section className="card player">
          <h2>Dompetmu</h2>
          {!accountId && <p className="muted">Masuk pakai email lewat Meteor Wallet — tanpa seed phrase.</p>}
          {showRegister && (
            <button className="primary wide" disabled={busy} onClick={register}>
              Daftar jadi warga (gratis 100 koin)
            </button>
          )}
          {player && (
            <>
              <div className="stat">
                <span>Koin</span>
                <strong>{Number(player.koin)}</strong>
              </div>
              <div className="stat">
                <span>Energi</span>
                <strong>{player.energy}/100</strong>
              </div>
              <div className="stat">
                <span>Saham toko</span>
                <strong>{Object.keys(player.shares).length}</strong>
              </div>
            </>
          )}
          {accountId && !player && !showRegister && <p className="muted">Memuat data pemain…</p>}
        </section>

        {/* -------------------------------------------------------- market list */}
        <section className="card market">
          <h2>Pasar</h2>
          <div className="table">
            <div className="row head">
              <span>Barang</span>
              <span>Harga</span>
              <span>Aksi</span>
            </div>
            {ITEMS.map((it) => (
              <div className="row" key={it.id}>
                <span>
                  {it.icon} {it.label}
                </span>
                <span className="price" title={explainPrice(world, it.id).text}>
                  {price(it.id)} koin <span className="price-info">ⓘ</span>
                </span>
                <span className="actions">
                  <button
                    className="mini"
                    disabled={busy}
                    onClick={() => enqueue({ type: "buy", item_id: it.id, qty: 1 })}
                  >
                    Beli
                  </button>
                  <button
                    className="mini alt"
                    disabled={busy}
                    onClick={() => enqueue({ type: "sell", item_id: it.id, qty: 1 })}
                  >
                    Jual
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------- npc panel */}
        <section className="card npcs">
          <h2>Warga kota</h2>
          <div className="npc-list">
            {world.npcs.map((n) => (
              <div className={`npc ${n.open ? "" : "closed"}`} key={n.npc_id}>
                <div className="npc-head">
                  <span className="npc-icon">{NPC_ICON[n.npc_id] ?? "🏠"}</span>
                  <div>
                    <strong>{NPC_LABEL[n.npc_id] ?? n.npc_id}</strong>
                    <small>{n.kind}</small>
                  </div>
                  <span className={`badge ${n.open ? "open" : "shut"}`}>{n.open ? "Buka" : "Tutup"}</span>
                </div>
                <div className="npc-body">
                  <span>Kas: {n.cash} koin</span>
                  <span className="stockline">
                    {n.stock
                      .filter(([, v]) => Number(v) > 0)
                      .map(([id, v]) => `${ITEMS.find((i) => i.id === id)?.icon ?? ""}${v}`)
                      .join(" ")}
                  </span>
                </div>
                {!n.open && (
                  <button
                    className="mini invest"
                    disabled={busy}
                    onClick={() => enqueue({ type: "invest", npc_id: n.npc_id })}
                  >
                    Investasi 100 koin
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- action panel */}
        <section className="card actions">
          <h2>Aksi hari ini</h2>
          <div className="btnrow">
            <button className="mini" disabled={busy} onClick={() => enqueue({ type: "work" })}>
              Kerja +20 koin
            </button>
            <button className="mini alt" disabled={busy} onClick={() => enqueue({ type: "rest" })}>
              Istirahat -10 koin
            </button>
          </div>

          <div className="queue">
            <h3>Rencana ({queue.length}/8)</h3>
            {queue.length === 0 && (
              <p className="muted">Belum ada aksi. Tambahkan dari pasar atau warga kota.</p>
            )}
            <ul>
              {queue.map((a) => (
                <li key={a.uid}>
                  <span>{describe(a)}</span>
                  <button className="x" onClick={() => setQueue((q) => q.filter((x) => x.uid !== a.uid))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="btnrow">
            <button className="primary wide" disabled={busy || !accountId} onClick={submitDay}>
              {busy ? "Mengirim…" : "Jalankan hari"}
            </button>
            <button className="ghost wide" disabled={busy || !accountId} onClick={skipWeek}>
              Fast-forward 7 hari
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------------- log */}
        <section className="card log">
          <h2>Catatan pasar</h2>
          <ul>
            {[...world.log].reverse().map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------------- price chart */}
        <section className="card chart">
          <h2>Harga 7 hari terakhir</h2>
          <PriceChart world={world} />
        </section>
      </main>

      <footer className="foot">
        <span>{CONTRACT_ID}</span>
        <span>the economy is the gameplay</span>
      </footer>
    </div>
  );
}

function describe(a: QueuedAction): string {
  switch (a.type) {
    case "work":
      return "Kerja shift (+20 koin)";
    case "rest":
      return "Istirahat (+40 energi, -10 koin)";
    case "buy":
      return `Beli ${a.qty} ${ITEMS.find((i) => i.id === a.item_id)?.label ?? a.item_id}`;
    case "sell":
      return `Jual ${a.qty} ${ITEMS.find((i) => i.id === a.item_id)?.label ?? a.item_id}`;
    case "invest":
      return `Investasi ke ${NPC_LABEL[a.npc_id] ?? a.npc_id}`;
    default:
      return "Aksi";
  }
}

function PriceChart({ world }: { world: WorldView }) {
  const series = [
    { id: "beras", color: "#e8b04b" },
    { id: "sayur", color: "#4caf50" },
    { id: "makanan", color: "#e0713c" },
    { id: "pakaian", color: "#7c5cff" },
  ];
  const history = world.history.slice(-7);
  const max =
    Math.max(
      1,
      ...history.flatMap((h) => series.map((s) => Number((h as unknown as Record<string, string>)[s.id] ?? 0))),
    );
  const W = 300;
  const H = 110;
  const stepX = history.length > 1 ? W / (history.length - 1) : W;

  if (history.length === 0) return <p className="muted">Belum ada riwayat. Jalankan beberapa hari.</p>;

  return (
    <div className="chartbox">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="110">
        {series.map((s) => {
          const pts = history.map((h, i) => {
            const v = Number((h as unknown as Record<string, string>)[s.id] ?? 0);
            const y = H - (v / max) * (H - 12) - 4;
            return `${i * stepX},${y}`;
          });
          return <polyline key={s.id} points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth="2" />;
        })}
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.id} style={{ color: s.color }}>
            ● {ITEMS.find((i) => i.id === s.id)?.label}
          </span>
        ))}
      </div>
    </div>
  );
}
