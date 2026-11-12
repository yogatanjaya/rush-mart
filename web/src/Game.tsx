// Pasar Pagi — cangkang React untuk game Phaser.
//
// React memegang HUD (bar atas, popup bibit, inventory) karena HTML/CSS jauh
// lebih mudah dirapikan daripada UI di dalam canvas. Phaser memegang dunia:
// tanah, lahan, tanaman, karakter. Keduanya bicara lewat dua jalur sederhana:
//   React → Phaser : scene.buySeed(), scene.openStore()
//   Phaser → React : scene.snapshot() dibaca tiap 150 ms (polling ringan)

import { useCallback, useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { FarmScene } from "./game/scenes/FarmScene";
import { onOpenSeedShop } from "./game/ui";
import { MinimarketScene } from "./game/scenes/MinimarketScene";
import { economy, resetEconomy } from "./game/economy";
import { isPlaying, startSession, stopSession } from "./game/flow";
import { CROPS, CROP_ORDER, type CropId, type WorldSnapshot } from "./game/types";
import "./game.css";

function CoinIcon() {
  return <img className="coin-ico" src="assets/pixel/coin.png" alt="koin" />;
}

/** Lama satu level bermain: 2 menit 30 detik. */
const PLAY_SECONDS = 150;

const EMPTY: WorldSnapshot = {
  activeScene: "farm",
  coins: 0,
  day: 1,
  seeds: { jagung: 0, tomat: 0, wortel: 0, kentang: 0 },
  inventory: { jagung: 0, tomat: 0, wortel: 0, kentang: 0 },
  plots: [],
  shelves: [],
  store: {
    state: "closed",
    goal: 0,
    revenue: 0,
    profit: 0,
    spent: 0,
    loss: 0,
    payment: null,
    customers: 0,
    served: 0,
    failed: 0,
    total: 0,
  },
  revenue: 0,
  spent: 0,
  notice: null,
};

export default function Game() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FarmScene | MinimarketScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [world, setWorld] = useState<WorldSnapshot>(EMPTY);
  const [showSeeds, setShowSeeds] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);






  // Kotak peta selalu 16:9 dan terpusat; HUD di dalamnya diskalakan mengikuti
  // lebar peta (basis desain 1280x720), jadi tidak pernah melipat/turun baris.
  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!root || !stage || !layer) return;

    const apply = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (!w || !h) return;
      const sw = Math.min(w, (h * 16) / 9);
      const sh = (sw * 9) / 16;
      stage.style.width = `${sw}px`;
      stage.style.height = `${sh}px`;
      layer.style.transform = `scale(${sw / 1280})`;
      if (modalLayerRef.current) {
        modalLayerRef.current.style.transform = `scale(${sw / 1280})`;
      }
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Tenda di peta boleh meminta popup Toko Bibit dibuka (lihat game/ui.ts).
  useEffect(() => onOpenSeedShop(() => setShowSeeds(true)), []);
  // Default 15 per tanaman = satu lahan penuh (15 slot). Total 4 x 15 = 180 koin,
  // masih terjangkau dengan modal awal 200 koin.
  // Pemain beku sampai tombol PLAY ditekan (lihat src/game/flow.ts).
  const [playing, setPlaying] = useState(isPlaying());
  // Waktu bermain per level. Mulai jalan setelah PLAY ditekan.
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const modalLayerRef = useRef<HTMLDivElement>(null);
  const timeUpRef = useRef(false);
  /** Halaman yang sedang tampil — kedua scene tetap hidup, jadi perlu ditrack. */
  const viewRef = useRef<"farm" | "minimarket">("minimarket");
  // Hasil ronde: null = belum selesai, "success" = target tercapai, "fail" = waktu habis.
  const [result, setResult] = useState<"success" | "fail" | null>(null);
  const [qty, setQty] = useState<Record<CropId, number>>({
    jagung: 15,
    tomat: 15,
    wortel: 15,
    kentang: 15,
  });
  const [toast, setToast] = useState<string | null>(null);
  // Isian kasir: total belanja dihitung otomatis, pemain hanya mengisi kembalian.
  const [payChange, setPayChange] = useState("");
  const changeRef = useRef<HTMLInputElement>(null);
  const payId = world.store.payment?.id ?? 0;



  const billTotal = world.store.payment
    ? world.store.payment.items.reduce((sum, it) => sum + it.price * it.qty, 0)
    : 0;

  // Kosongkan kolom kembalian tiap kali transaksi baru dibuka.
  useEffect(() => {
    setPayChange("");
  }, [payId]);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 1280,
      height: 720,
      backgroundColor: "#4D963E",
      // Pixel art: matikan antialias & bulatkan posisi supaya tepi pixel tetap tajam.
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      // Game belum memakai suara. Tanpa ini Phaser membuat AudioContext yang
      // lalu ditutup saat preview ditutup/di-reload, dan browser melempar
      // "Cannot suspend a closed AudioContext" ke console. Nanti kalau sudah
      // ada efek suara, hapus baris ini dan tangani siklus audio-nya.
      audio: { noAudio: true },
      // Jangan pasang listener pointer di window: kalau aktif, klik pada tombol HUD
      // (yang mengapung di atas canvas) ikut terbaca Phaser dan menanam tanaman.
      input: { windowEvents: false },
      // Minimarket lebih dulu: pemain spawn di toko, bukan di kebun.
      scene: [MinimarketScene, FarmScene],
    });
    gameRef.current = game;
    // Kedua halaman hidup berdampingan: kebun dinyalakan sekarang tapi
    // disembunyikan, supaya pindah halaman tidak menghentikan ronde jualan.
    game.scene.start("FarmScene");
    const farmScene = game.scene.getScene("FarmScene") as FarmScene | null;
    farmScene?.setFront(false);
    const miniScene = game.scene.getScene("MinimarketScene") as MinimarketScene | null;
    miniScene?.setFront(true);
    // Hook debug: hanya di mode dev, supaya skrip uji bisa membaca scene aktif.
    if (import.meta.env.DEV) {
      const w = window as unknown as { __game?: Phaser.Game; __economy?: typeof economy };
      w.__game = game;
      w.__economy = economy;
    }

    // Polling snapshot untuk HUD. Sekaligus melacak scene mana yang aktif
    // (farm atau minimarket) supaya HUD tahu tombol mana yang harus tampil.
    const poll = window.setInterval(() => {
      const key = viewRef.current === "farm" ? "FarmScene" : "MinimarketScene";
      const sc = game.scene.getScene(key) as FarmScene | MinimarketScene | null;
      if (!sc) return;
      sceneRef.current = sc;
      setWorld(sc.snapshot());
    }, 150);

    return () => {
      window.clearInterval(poll);
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // Toast dari notice scene
  useEffect(() => {
    if (world.notice) setToast(world.notice);
  }, [world.notice]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  /**
   * Pindah halaman. Kedua scene tetap hidup — hanya tampilan & input yang
   * dipindah, jadi ronde jualan (dan pertumbuhan tanaman) tidak berhenti.
   */
  const switchScene = useCallback((key: "FarmScene" | "MinimarketScene") => {
    const game = gameRef.current;
    if (!game) return;
    const mini = game.scene.getScene("MinimarketScene") as MinimarketScene | null;
    const farm = game.scene.getScene("FarmScene") as FarmScene | null;
    const toMini = key === "MinimarketScene";
    mini?.setFront(toMini);
    farm?.setFront(!toMini);
    viewRef.current = toMini ? "minimarket" : "farm";
    sceneRef.current = toMini ? mini : farm;
    if (mini) setWorld((toMini ? mini : (farm as FarmScene)).snapshot());
  }, []);

  /** Aksi kebun hanya valid kalau scene aktif adalah FarmScene. */
  const farm = () => (sceneRef.current instanceof FarmScene ? sceneRef.current : null);

  /**
   * Tombol PLAY: mulai sesi (pemain bisa bergerak) sekaligus membuka toko
   * hari itu. Tidak ada lagi tombol READY, jadi PLAY yang jadi pemicunya.
   */
  // Backsound: diputar begitu ada interaksi pertama (browser melarang autoplay penuh).
  useEffect(() => {
    const audio = new Audio("assets/audio/backsound.mp3");
    audio.loop = true;
    audio.volume = 0.006;
    audio.preload = "auto";
    musicRef.current = audio;

    const startMusic = (ev?: Event) => {
      // kalau interaksi pertama justru menekan tombol musik, biar tombol itu yang mengatur
      const el = ev?.target as HTMLElement | undefined;
      if (el?.closest?.(".hud-music")) return;
      if (!mutedRef.current) void audio.play().catch(() => {});
      window.removeEventListener("pointerdown", startMusic);
      window.removeEventListener("keydown", startMusic);
    };
    window.addEventListener("pointerdown", startMusic);
    window.addEventListener("keydown", startMusic);

    return () => {
      window.removeEventListener("pointerdown", startMusic);
      window.removeEventListener("keydown", startMusic);
      audio.pause();
      musicRef.current = null;
    };
  }, []);

  const toggleMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!audio) return;
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) audio.pause();
    else void audio.play().catch(() => {});
    setMusicOn(!mutedRef.current);
  }, []);

  const startGame = useCallback(() => {
    startSession();
    setPlaying(true);
    timeUpRef.current = false;
    setTimeLeft(PLAY_SECONDS);
    switchScene("MinimarketScene");
    const mini = gameRef.current?.scene.getScene("MinimarketScene") as MinimarketScene | null;
    mini?.openStore();
  }, [switchScene]);

  /** Kirim jawaban pemain (total & kembalian) ke scene untuk dinilai. */
  const submitPay = useCallback(() => {
    if (payChange === "") return;
    if (sceneRef.current instanceof MinimarketScene) {
      sceneRef.current.submitPayment(billTotal, Number(payChange));
    }
    setPayChange("");
  }, [billTotal, payChange]);

  const buy = useCallback((crop: CropId, n: number) => {
    const ok = farm()?.buySeed(crop, n);
    if (ok) setToast(`Bibit ${CROPS[crop].name} +${n}`);
  }, []);

  // Jam bermain: berkurang 1 detik selama ronde berjalan.
  useEffect(() => {
    if (!playing || result !== null) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => (t === null ? null : Math.max(0, t - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, result]);

  /** Ronde berakhir: kunci permainan dan tampilkan popup hasil. */
  const endRound = useCallback((kind: "success" | "fail") => {
    if (timeUpRef.current) return;
    timeUpRef.current = true;
    setResult(kind);
    stopSession();
    if (sceneRef.current instanceof MinimarketScene) sceneRef.current.timeUp();
  }, []);

  // Waktu habis -> ronde selesai. Hasilnya dinilai dari laba akhir:
  // target tercapai = SUCCESS, belum = FAIL. Jam selalu dihabiskan 150 detik.
  useEffect(() => {
    if (!playing || result !== null || timeLeft !== 0) return;
    const reached = world.store.goal > 0 && world.store.profit >= world.store.goal;
    endRound(reached ? "success" : "fail");
  }, [playing, result, timeLeft, world.store.goal, world.store.profit, endRound]);

  /**
   * PLAY AGAIN / TRY AGAIN: reset seluruh permainan lalu mulai ronde baru.
   * Uang, bibit, inventory kembali ke awal; rak diisi ulang; jam mulai lagi.
   */
  const restartRound = useCallback(() => {
    resetEconomy();
    timeUpRef.current = false;
    setResult(null);
    setTimeLeft(PLAY_SECONDS);
    startSession();
    setPlaying(true);

    // Kedua scene hidup terus, jadi cukup tampilkan minimarket lalu siapkan
    // ronde baru — tidak perlu membangun ulang scene.
    switchScene("MinimarketScene");
    const mini = gameRef.current?.scene.getScene("MinimarketScene") as MinimarketScene | null;
    mini?.resetRound();
  }, [switchScene]);

  const totalSeedCost = CROP_ORDER.reduce((sum, c) => sum + CROPS[c].seed * qty[c], 0);
  return (
    <div className={`game-root${playing ? " is-playing" : ""}`} ref={rootRef}>
      {/* Peta + HUD berbagi satu kotak acuan 16:9 supaya posisi HUD selalu
          sejajar dengan peta, seberapapun lebar jendela. */}
      <div className="stage" ref={stageRef}>
        <div className="game-canvas" ref={hostRef} />
        <div className="hud-layer" ref={layerRef}>

      {/* ─── HUD atas ───────────────────────────────────────────────────── */}
      <div className="hud" onPointerDown={(e) => e.stopPropagation()}>
        <div className="hud-left">
          <button
            className={`hud-btn hud-music${musicOn ? "" : " is-off"}`}
            onClick={toggleMusic}
            title={musicOn ? "Matikan musik" : "Nyalakan musik"}
          >
            <span className="hud-music-icon" aria-hidden="true">♪</span>
            <span>{musicOn ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Pindah halaman + TUTUP TOKO. Tombol mulai jualan ada di layar PLAY. */}
        <div className="hud-center">
          {world.activeScene === "farm" ? (
            <button className="hud-btn" onClick={() => switchScene("MinimarketScene")}>
              KE MINIMARKET
            </button>
          ) : (
            <button className="hud-btn" onClick={() => switchScene("FarmScene")}>
              KE FARM
            </button>
          )}
        </div>

        <div className="hud-right">
          <div className={`hud-chip goal ${world.store.state}`}>
            <div className="goal-line">
              <span className="chip-label">GOALS</span>
              <b>
                {world.store.profit}/{world.store.goal}
              </b>
            </div>
            <div className="goal-bar">
              <i
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Math.round((world.store.profit / Math.max(1, world.store.goal)) * 100))
                  )}%`,
                }}
              />
            </div>
          </div>
          <div className="hud-chip coins">
            <CoinIcon />
            <b>{world.coins}</b>
          </div>
        </div>
      </div>

      {/* Jam bermain — mengapung di area atas, di bawah baris tombol HUD */}
      {timeLeft !== null && (
        <div className={`hud-clock${timeLeft === 0 ? " out" : ""}`}>
          {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
          {String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

          {/* Bar inventory: 4 kotak hasil panen + 4 kotak bibit. */}
          <div className="inv-bar">
            {CROP_ORDER.map((crop) => (
              <div
                key={`hasil-${crop}`}
                className={`inv-cell${world.inventory[crop] === 0 ? " empty" : ""}`}
                title={`${CROPS[crop].name} (hasil panen)`}
              >
                <img src={`assets/pixel/icon-pixel-${crop}.png`} alt="" />
                {world.inventory[crop] > 0 && <b>{world.inventory[crop]}</b>}
              </div>
            ))}
            {CROP_ORDER.map((crop) => (
              <div
                key={`bibit-${crop}`}
                className={`inv-cell${world.seeds[crop] === 0 ? " empty" : ""}`}
                title={`Bibit ${CROPS[crop].name}`}
              >
                <img src={`assets/pixel/icon-packet-${crop}.png`} alt="" />
                {world.seeds[crop] > 0 && <b>{world.seeds[crop]}</b>}
              </div>
            ))}
          </div>
        </div>

        {/* Semua popup (toko bibit, inventory, kasir, hasil ronde, layar PLAY)
            ikut kotak peta: diskalakan bersama peta, bukan mengikuti jendela. */}
        <div className="modal-layer" ref={modalLayerRef}>

      {/* ─── Popup toko bibit — 16-bit pixel art ─────────────────────────── */}
      {showSeeds && (
        <div className="seedshop-backdrop" onClick={() => setShowSeeds(false)}>
          <div className="seedshop" onClick={(e) => e.stopPropagation()}>
            <div className="seedshop-head">
              <div className="seedshop-title">
                <img className="seedshop-sprout" src="assets/pixel/icon-pixel-sprout.png" alt="" />
                <span>TOKO BIBIT</span>
              </div>
              <button className="seedshop-x" onClick={() => setShowSeeds(false)} aria-label="Tutup">
                X
              </button>
            </div>

            <div className="seedshop-rows">
              {CROP_ORDER.map((crop) => {
                const c = CROPS[crop];
                const maxAffordable = Math.max(0, Math.floor(world.coins / c.seed));
                return (
                  <div className="seedshop-row" key={crop}>
                    <img className="seedshop-icon" src={`assets/pixel/icon-packet-${crop}.png`} alt="" />
                    <div className="seedshop-meta">
                      <b>{c.name}</b>
                      <span className="seedshop-price">
                        — {c.seed} <CoinIcon />
                      </span>
                    </div>
                    <div className="seedshop-qty">
                      <button
                        type="button"
                        aria-label={`Kurangi ${c.name}`}
                        onClick={() => setQty((q) => ({ ...q, [crop]: Math.max(1, q[crop] - 1) }))}
                      >
                        −
                      </button>
                      <span>{qty[crop]}</span>
                      <button
                        type="button"
                        aria-label={`Tambah ${c.name}`}
                        onClick={() => setQty((q) => ({ ...q, [crop]: Math.min(27, q[crop] + 1) }))}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="seedshop-buy"
                      disabled={maxAffordable < qty[crop]}
                      onClick={() => buy(crop, qty[crop])}
                    >
                      Beli
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="seedshop-foot">
              <div className="seedshop-total">
                Total belanja <b>{totalSeedCost} <CoinIcon /></b>
                <span className="seedshop-sep">•</span>
                saldo <b>{world.coins} <CoinIcon /></b>
              </div>
              <button
                type="button"
                className="seedshop-buyall"
                disabled={totalSeedCost > world.coins || totalSeedCost === 0}
                onClick={() => {
                  let bought = 0;
                  for (const crop of CROP_ORDER) {
                    if (world.coins - bought >= CROPS[crop].seed * qty[crop]) {
                      if (farm()?.buySeed(crop, qty[crop])) bought += CROPS[crop].seed * qty[crop];
                    }
                  }
                  if (bought > 0) setToast(`Belanja bibit ${bought} koin`);
                  setShowSeeds(false);
                }}
              >
                BELI SEMUA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Kasir: pemain menghitung total & kembalian ───────────────── */}
      {world.store.payment && (
        <div className="seedshop-backdrop">
          <div className="seedshop narrow kasir">
            <div className="seedshop-head">
              <div className="seedshop-title">
                <CoinIcon />
                <span>KASIR</span>
              </div>
            </div>

            <div className="seedshop-rows">
              <div className="kasir-items">
                {world.store.payment.items.map((it) => (
                  <div className="kasir-item" key={it.crop}>
                    <img src={`assets/pixel/icon-pixel-${it.crop}.png`} alt="" />
                    <span className="kasir-name">{CROPS[it.crop].name}</span>
                    <span className="kasir-qty">×{it.qty}</span>
                    <span className="kasir-at">@</span>
                    <span className="kasir-unit">
                      {it.price} <CoinIcon />
                    </span>
                  </div>
                ))}
              </div>

              <div className="kasir-paid total">
                <span>Total belanja</span>
                <b>
                  {billTotal} <CoinIcon />
                </b>
              </div>

              <div className="kasir-paid pay">
                <span>Dia membayar</span>
                <b>
                  {world.store.payment.paid} <CoinIcon />
                </b>
              </div>

              <label className="kasir-field">
                <span>Kembalian</span>
                <input
                  ref={changeRef}
                  autoFocus
                  inputMode="numeric"
                  placeholder="?"
                  value={payChange}
                  onChange={(e) => setPayChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitPay();
                  }}
                />
                <i className="kasir-coin">
                  <CoinIcon />
                </i>
              </label>
            </div>

            <div className="seedshop-foot">
              <div className="seedshop-total">
                Salah hitung? Pelanggan pergi & barangnya hangus.
              </div>
              <button
                type="button"
                className="seedshop-buyall"
                disabled={payChange === ""}
                onClick={submitPay}
              >
                OKE
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="game-toast">{toast}</div>}

      {/* ─── Hasil ronde: SUCCESS / FAIL ───────────────────────────────── */}
      {result !== null && (
        <div className="start-backdrop">
          <div className="start-frame result-frame" role="dialog" aria-label="Hasil permainan">
            <div className={`result-head ${result}`}>{result === "success" ? "SUCCESS" : "FAIL"}</div>
            <div className="result-sub">
              {result === "success" ? "you are a great farmer" : "you ran out of time, keep it up"}
            </div>
            <div className="result-rows">
              <div className="result-row ok">
                <span>Pelanggan dilayani</span>
                <b>{world.store.served}</b>
              </div>
              <div className="result-row bad">
                <span>Pelanggan gagal</span>
                <b>{world.store.failed}</b>
              </div>
              <div className="result-row goals">
                <span>GOALS</span>
                <b>
                  {world.store.profit}/{world.store.goal}
                </b>
              </div>
            </div>
            <button type="button" className="start-play" onClick={restartRound}>
              {result === "success" ? "PLAY AGAIN" : "TRY AGAIN"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Layar PLAY: pemain belum bisa bergerak sebelum menekan tombol ── */}
      {!playing && (
        <div className="start-backdrop">
          <div className="start-frame" role="dialog" aria-label="Mulai permainan">
            <div className="start-title">PASAR PAGI</div>
            <button type="button" className="start-play" onClick={startGame}>
              PLAY
            </button>
            <div className="start-hint">tekan untuk mulai</div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
