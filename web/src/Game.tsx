// Rush Mart — cangkang React untuk game Phaser.
//
// React memegang HUD (bar atas, popup bibit, inventory) karena HTML/CSS jauh
// lebih mudah dirapikan daripada UI di dalam canvas. Phaser memegang dunia:
// tanah, lahan, tanaman, karakter. Keduanya bicara lewat dua jalur sederhana:
//   React → Phaser : scene.buySeed(), scene.openStore()
//   Phaser → React : scene.snapshot() dibaca tiap 150 ms (polling ringan)

import { useCallback, useEffect, useRef, useState } from "react";
import { connectWallet, ensureSessionKey, disconnectWallet, subscribe as subscribeWallet, recordRound } from "./near/wallet";
import Phaser from "phaser";
import { FarmScene } from "./game/scenes/FarmScene";
import { onOpenSeedShop, onGoToScene, onPayNudge, onToolChanged, setTool, type Tool } from "./game/ui";
import { MinimarketScene } from "./game/scenes/MinimarketScene";
import { economy, resetEconomy } from "./game/economy";
import { isPlaying, startSession, stopSession } from "./game/flow";
import { CROPS, CROP_ORDER, type CropId, type WorldSnapshot } from "./game/types";

/** Alat di ujung kanan inventory bar (hanya ini yang bisa diklik). */
const TOOLS: { id: Tool; title: string }[] = [
  { id: "hand", title: "Tangan kosong — tanam (tombol 1)" },
  { id: "water", title: "Pot air — siram (tombol 2)" },
  { id: "hoe", title: "Cangkul — panen (tombol 3)" },
];
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
  noticeSeq: 0,
};

/** Ringkasan cara bermain — tampil di bawah papan, di layar PLAY & popup hasil. */
const HOW_TO_PLAY_STEPS = [
  "Walk with WASD or arrow keys, click to interact.",
  "Customers take items from the shelves, then line up at the QUEUE mat.",
  "Stand on the green mat, click the front customer, type the CHANGE, press DONE.",
  "Shelves run low \u2192 take the door to the FARM.",
  "Click the BUY SEED tent to buy seeds.",
  "Slot 1 \u2014 bare hand: click empty plots to plant",
  "Slot 2 \u2014 watering can: click each plot to water. Crops only grow once watered (15s).",
  "While waiting, serve the queue (the front customer waits 40s).",
  "Slot 3 \u2014 hoe: click ripe plots to harvest, then restock the shelves.",
  "Reach GOALS 100 before the 150s timer ends.",
];

function HowToPlay() {
  return (
    <div className="start-footer">
      <b className="start-footer-title">HOW TO PLAY</b>
      <ol>
        {HOW_TO_PLAY_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

export default function Game() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FarmScene | MinimarketScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [world, setWorld] = useState<WorldSnapshot>(EMPTY);
  const [showSeeds, setShowSeeds] = useState(false);

  // Status wallet on-chain (connect + kunci sesi). Game tetap jalan tanpa wallet.
  const [wallet, setWallet] = useState<{ status: string; accountId: string; pending: number; sent: number }>({
    status: "off",
    accountId: "",
    pending: 0,
    sent: 0,
  });
  const [walletPanel, setWalletPanel] = useState(false);
  const [chainHint, setChainHint] = useState<null | "off" | "on">(null);
  const [martTip, setMartTip] = useState(false);
  const [lowStockTip, setLowStockTip] = useState(false);
  const lowStockShown = useRef(false);
  const lowStockTimer = useRef<number | null>(null);
  const [payTip, setPayTip] = useState<null | { id: number; from: "farm" | "mart"; left: number }>(null);
  const payTipId = useRef(0);
  const [emptyShelves, setEmptyShelves] = useState(false);
  const [tool, setToolState] = useState<Tool>("hand");
  const [farmGuide, setFarmGuide] = useState(false);
  const farmGuideShown = useRef(false);
  const farmGuideTimer = useRef<number | null>(null);
  const emptySince = useRef<number | null>(null);
  /** waktu mulai ronde; dipakai menahan panel sebentar supaya data rak lama tidak memicunya. */
  const roundStart = useRef(0);
  const payTipTimer = useRef<number | null>(null);

  useEffect(() => subscribeWallet((s: any) => setWallet(s)) as any, []);


  // Tahap "sudah connect, menunggu izin pencatatan".

  const awaitingApproval = !!wallet.accountId && wallet.status !== "on";
  const NOTE_IDLE = "Wallet to get on-chain record";
  const NOTE_WAIT = "Waiting for approval...";
  const NOTE_DONE = "Wallet Connected & Approved";
  const [walletNote, setWalletNote] = useState(NOTE_IDLE);

  // Typewriter berulang selama menunggu approval; berhenti setelah disetujui.
  useEffect(() => {
    if (wallet.status === "on") {
      setWalletNote(NOTE_DONE);
      return;
    }
    if (!awaitingApproval) {
      setWalletNote(NOTE_IDLE);
      return;
    }
    let i = 0;
    let hold = 0;
    setWalletNote("");
    const id = window.setInterval(() => {
      if (i < NOTE_WAIT.length) {
        i += 1;
        setWalletNote(NOTE_WAIT.slice(0, i));
      } else if (hold < 10) {
        hold += 1; // jeda sebelum mengulang
      } else {
        i = 0;
        hold = 0;
        setWalletNote("");
      }
    }, 70);
    return () => window.clearInterval(id);
  }, [awaitingApproval, wallet.status]);

  // Setelah approval berhasil: panel tahap 2 menutup sendiri, kembali ke papan PLAY.
  useEffect(() => {
    if (wallet.status === "on") setWalletPanel(false);
  }, [wallet.status]);


  // Chip di HUD: tidak membuka wallet/panel — hanya notice 3 detik.
  const onHudWalletClick = useCallback(() => {
    setChainHint(wallet.status === "on" ? "on" : "off");
    window.setTimeout(() => setChainHint(null), 3000);
  }, [wallet.status]);

  // Klik chip: kalau belum ada akun -> langsung buka pemilihan wallet (tanpa panel).
  // Kalau sudah terhubung -> buka panel (tahap izin pencatatan / status / disconnect).

  const onWalletClick = useCallback(() => {
    if (!wallet.accountId) {
      void connectWallet();
      return;
    }
    setWalletPanel((v) => !v);
  }, [wallet.accountId]);

  // Begitu wallet terhubung tapi kunci sesi belum ada, panel tahap 2 terbuka sendiri.
  useEffect(() => {
    if (wallet.accountId && wallet.status !== "on") setWalletPanel(true);
  }, [wallet.accountId, wallet.status]);
  /** Notice bar di atas tenda BUY SEED — muncul 3 detik setiap masuk kebun. */

  const [musicOn, setMusicOn] = useState(true);

  // Suara tombol PLAY / PLAY AGAIN / TRY AGAIN
  useEffect(() => {
    const snd = new Audio("assets/sfx/play.wav");
    snd.volume = 0.1;
    snd.preload = "auto";
    playBtnSfxRef.current = snd;
  }, []);

  const playButtonSfx = useCallback(() => {
    const a = playBtnSfxRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => {});
  }, []);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  /** SFX saat berpindah tempat (tombol KE FARM / KE MINIMARKET). */
  const navSfxRef = useRef<HTMLAudioElement | null>(null);
  /** Waktu terakhir SFX pindah tempat diputar (untuk jeda minimum). */
  const navLastRef = useRef(0);
  /** SFX tombol BELI SEMUA di popup Toko Bibit. */
  const buySfxRef = useRef<HTMLAudioElement | null>(null);
  const playBtnSfxRef = useRef<HTMLAudioElement | null>(null);
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
  // Suara saat tenda BUY SEED ditekan (file: assets/sfx/shop.wav).
  const shopSfxRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const snd = new Audio("assets/sfx/shop.wav");
    snd.volume = 0.15;
    snd.preload = "auto";
    shopSfxRef.current = snd;
    return onOpenSeedShop(() => {
      setShowSeeds(true);
      const a = shopSfxRef.current;
      if (!a) return;
      a.currentTime = 0;
      void a.play().catch(() => {});
    });
  }, []);
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
  const [toast, setToast] = useState<{ text: string; seq: number } | null>(null);
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
  // Pakai nomor urut: pesan dengan teks sama tetap memicu toast baru.
  useEffect(() => {
    if (world.notice) setToast({ text: world.notice, seq: world.noticeSeq });
  }, [world.noticeSeq]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  /**
   * Pindah halaman. Kedua scene tetap hidup — hanya tampilan & input yang
   * dipindah, jadi ronde jualan (dan pertumbuhan tanaman) tidak berhenti.
   */
  /** Tampilkan notice tenda selama 3 detik. */

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

    const buy = new Audio("assets/sfx/buy.wav");
    buy.volume = 0.12;
    buy.preload = "auto";
    buySfxRef.current = buy;

    const nav = new Audio("assets/sfx/nav.wav");
    nav.volume = 0.085;
    nav.preload = "auto";
    navSfxRef.current = nav;

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

  /** SFX pindah tempat: satu pemutar saja + jeda minimum 250 ms.
   *  Tanpa penggandaan, amplitudo tidak pernah menumpuk walau di-spam. */
  const playNav = useCallback(() => {
    const base = navSfxRef.current;
    if (!base) return;
    const now = performance.now();
    if (now - navLastRef.current < 250) return;
    navLastRef.current = now;
    base.currentTime = 0;
    void base.play().catch(() => {});
  }, []);

  /** Bunyi kasir saat pembelian bibit berhasil. */
  const playBuy = useCallback(() => {
    const a = buySfxRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => {});
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
    playButtonSfx();
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

  // Jam bermain: berkurang 1 detik selama ronde berjalan.
  useEffect(() => {
    if (!playing || result !== null) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => (t === null ? null : Math.max(0, t - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, result]);

  // DEV: ?autoplay=1 menekan PLAY otomatis (dipakai untuk screenshot/demo).
  useEffect(() => {
    if (new URLSearchParams(location.search).has("autoplay")) {
      setTimeout(() => (document.querySelector(".start-play") as HTMLButtonElement)?.click(), 500);
    }
  }, []);

  // Tombol angka 1/2/3 memilih alat (sama seperti klik di inventory bar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (!playing || result) return;
      const map: Record<string, Tool> = { "1": "hand", "2": "water", "3": "hoe" };
      const picked = map[e.key];
      if (!picked) return;
      e.preventDefault();
      setToolState(picked);
      setTool(picked);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, result]);

  // Panduan kebun: sekali per ronde, saat pemain pertama kali masuk FARM.
  useEffect(() => {
    if (!playing) {
      farmGuideShown.current = false;
      if (farmGuideTimer.current !== null) {
        window.clearTimeout(farmGuideTimer.current);
        farmGuideTimer.current = null;
      }
      setFarmGuide(false);
      return;
    }
    if (world.activeScene !== "farm" || farmGuideShown.current) return;
    farmGuideShown.current = true;
    setFarmGuide(true);
    farmGuideTimer.current = window.setTimeout(() => {
      farmGuideTimer.current = null;
      setFarmGuide(false);
    }, 5000);
  }, [world.activeScene, playing]);

  // Alat bisa direset oleh scene (mis. setiap masuk kebun → tangan kosong).
  useEffect(() => onToolChanged((t) => setToolState(t)), []);

  // Semua rak kosong > 3 detik: panel bertahan sampai ada rak terisi lagi.
  useEffect(() => {
    if (!playing || result !== null) {
      emptySince.current = null;
      setEmptyShelves(false);
      return;
    }
    const allEmpty = world.shelves.length > 0 && world.shelves.every((s) => s.count === 0);
    if (!allEmpty) {
      emptySince.current = null;
      setEmptyShelves(false);
      return;
    }
    if (performance.now() - roundStart.current < 800) return;
    if (emptySince.current === null) emptySince.current = Date.now();
    const elapsed = Date.now() - emptySince.current;
    if (elapsed >= 3000) {
      setEmptyShelves(true);
      return;
    }
    const id = window.setTimeout(() => setEmptyShelves(true), 3000 - elapsed);
    return () => window.clearTimeout(id);
  }, [world.shelves, playing, result]);

  // Perintah dari scene: pelanggan terdepan menunggu > 12 detik.
  useEffect(() => {
    const off = onPayNudge((secondsLeft) => {
      const from = viewRef.current === "farm" ? "farm" : "mart";
      setPayTip({ id: ++payTipId.current, from, left: Math.max(0, secondsLeft) });
    });
    return off;
  }, []);

  // Panel pembayaran: hitung mundur sisa kesabaran + hilang sendiri setelah 5 detik.
  useEffect(() => {
    if (!payTip) return;
    const tick = window.setInterval(() => {
      setPayTip((p) => (p ? { ...p, left: Math.max(0, p.left - 1) } : p));
    }, 1000);
    const hide = window.setTimeout(() => setPayTip(null), 5000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(hide);
    };
  }, [payTip?.id]);

  // Ronde berakhir: bersihkan notice pembayaran.
  useEffect(() => {
    if (!playing || result !== null) setPayTip(null);
  }, [playing, result]);

  // Notice sekali per ronde: begitu ada rak <= 8 (muncul "FILL YOUR DISPLAY").
  // Timer disimpan di ref supaya tidak ikut dibatalkan saat data rak berubah.
  useEffect(() => {
    if (!playing || result !== null) {
      lowStockShown.current = false;
      if (lowStockTimer.current !== null) {
        window.clearTimeout(lowStockTimer.current);
        lowStockTimer.current = null;
      }
      setLowStockTip(false);
      return;
    }
    if (lowStockShown.current) return;
    // Jeda singkat: snapshot rak dari ronde sebelumnya masih terbaca beberapa frame.
    if (performance.now() - roundStart.current < 800) return;
    // Baru muncul kalau SUDAH ADA 2 rak yang menampilkan "FILL YOUR DISPLAY".
    if (world.shelves.filter((s) => s.count <= 8).length < 2) return;

    lowStockShown.current = true;
    setLowStockTip(true);
    lowStockTimer.current = window.setTimeout(() => {
      lowStockTimer.current = null;
      setLowStockTip(false);
    }, 5000);
  }, [world.shelves, playing]);

  // Cloud tip di atas kepala pemain: muncul saat ronde dimulai, hilang setelah 10 detik.
  useEffect(() => {
    if (!playing || result !== null) {
      setMartTip(false);
      return;
    }
    setMartTip(true);
    const id = window.setTimeout(() => setMartTip(false), 5000);
    return () => window.clearTimeout(id);
  }, [playing, result]);

  /** Ronde berakhir: kunci permainan dan tampilkan popup hasil. */
  const endRound = useCallback((kind: "success" | "fail") => {
    if (timeUpRef.current) return;
    timeUpRef.current = true;
    setResult(kind);
    // Catat hasil ronde ke chain (kalau wallet aktif; kalau tidak, dilewati).
    recordRound(economy.profit, economy.served, economy.failed, PLAY_SECONDS);
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
    playButtonSfx();
    resetEconomy();
    // Ronde baru selalu mulai dengan tangan kosong
    setTool("hand");
    setToolState("hand");
    timeUpRef.current = false;
    setResult(null);
    roundStart.current = performance.now();
    // Ronde baru = seperti refresh: semua panel sementara dibersihkan dulu,
    // supaya tidak ada panel sisa ronde sebelumnya yang bertabrakan dengan GUIDE.
    setLowStockTip(false);
    lowStockShown.current = false;
    setEmptyShelves(false);
    emptySince.current = null;
    setFarmGuide(false);
    farmGuideShown.current = false;
    setPayTip(null);
    if (payTipTimer.current !== null) {
      window.clearTimeout(payTipTimer.current);
      payTipTimer.current = null;
    }
    setTimeLeft(PLAY_SECONDS);
    startSession();
    setPlaying(true);

    // Kedua scene hidup terus, jadi cukup tampilkan minimarket lalu siapkan
    // ronde baru — tidak perlu membangun ulang scene.
    switchScene("MinimarketScene");
    const mini = gameRef.current?.scene.getScene("MinimarketScene") as MinimarketScene | null;
    mini?.resetRound();
    const farm = gameRef.current?.scene.getScene("FarmScene") as FarmScene | null;
    farm?.resetPlots();
  }, [switchScene]);

  // Pintu di peta memanggil ini lewat game/ui.ts (klik atau SPACE).
  useEffect(() => {
    const off = onGoToScene((target) => {
      if (target === "farm") {
        playNav();
        switchScene("FarmScene");
      } else {
        playNav();
        switchScene("MinimarketScene");
      }
    });
    return off;
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
            className={`hud-wallet ${wallet.status === "on" ? "is-on" : "is-off"}`}
            onClick={onHudWalletClick}
            title={wallet.accountId || "connect wallet to record on-chain"}
          >
            <span>on-chain</span>
            <span>record {wallet.status === "on" ? "on" : "off"}</span>
          </button>
          <button
            className={`hud-btn hud-music${musicOn ? "" : " is-off"}`}
            onClick={toggleMusic}
            title={musicOn ? "Matikan musik" : "Nyalakan musik"}
          >
            <span className="hud-music-icon" aria-hidden="true">♪</span>
            <span>{musicOn ? "ON" : "OFF"}</span>
          </button>
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

          {/* Bar inventory: 3 alat (kiri) + jeda 5 px + 4 hasil panen + 4 bibit. */}
          <div className="inv-bar">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`inv-cell inv-tool${tool === t.id ? " selected" : ""}`}
                title={t.title}
                onClick={() => {
                  setToolState(t.id);
                  setTool(t.id);
                }}
              >
                <img src={`assets/pixel/tool-${t.id}.png`} alt={t.title} />
              </button>
            ))}

            <div className="inv-gap" />

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
                <span>SEED STORE</span>
              </div>
              <button className="seedshop-x" onClick={() => setShowSeeds(false)} aria-label="Tutup">
                X
              </button>
            </div>

            <div className="seedshop-rows">
              {CROP_ORDER.map((crop) => {
                const c = CROPS[crop];
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
                  </div>
                );
              })}
            </div>

            <div className="seedshop-foot">
              <div className="seedshop-total">
                GRAND TOTAL <b>{totalSeedCost} <CoinIcon /></b>
                <span className="seedshop-sep">•</span>
                BALANCE <b>{world.coins} <CoinIcon /></b>
              </div>
              <button
                type="button"
                className="seedshop-buyall"
                disabled={totalSeedCost > world.coins || totalSeedCost === 0}
                onClick={() => {
                  let bought = 0;
                  for (const crop of CROP_ORDER) {
                    if (world.coins - bought >= CROPS[crop].seed * qty[crop]) {
                      if (farm()?.buySeed(crop, qty[crop], true)) bought += CROPS[crop].seed * qty[crop];
                    }
                  }
                  if (bought > 0) { setToast({ text: `Seed purchase: ${bought} coins`, seq: Date.now() }); playBuy(); }
                  setShowSeeds(false);
                }}
              >
                BUY ALL
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
                <span>CASHIER</span>
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
                <span>GRAND TOTAL</span>
                <b>
                  {billTotal} <CoinIcon />
                </b>
              </div>

              <div className="kasir-paid pay">
                <span>CUSTOMER PAID</span>
                <b>
                  {world.store.payment.paid} <CoinIcon />
                </b>
              </div>

              <label className="kasir-field">
                <span>CHANGE</span>
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
                Wrong change? Customer left with the items. Profit lost!
              </div>
              <button
                type="button"
                className="seedshop-buyall"
                disabled={payChange === ""}
                onClick={submitPay}
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`game-toast${world.activeScene === "farm" ? " farm-toast" : ""}`}>
          {toast.text}
        </div>
      )}
      {/* Disembunyikan saat pemain sudah berada di kebun (tidak perlu disuruh ke FARM). */}
      {emptyShelves && world.activeScene !== "farm" && (
        <div className="mart-tip empty-shelves" role="note">
          Shelves are empty - no NPC entering, go to FARM
        </div>
      )}
      {farmGuide && (
        <div className="mart-tip guide-panel" role="note">
          <b className="guide-panel-title">GUIDE</b>
          <ol>
            <li>Buy seeds &amp; plant with bare hand (Slot 1)</li>
            <li>Water crops &amp; wait 15s</li>
            <li>Harvest using the hoe (Slot 3)</li>
          </ol>
        </div>
      )}
      {payTip?.from === "farm" && (
        <div className="mart-tip low-stock pay-tip" role="note">
          <b>Head back to minimart.</b> Someone wants to pay! Step on the green mat and click the
          NPC, <span className="pay-tip-count">{payTip.left}s</span> left until NPC mad
        </div>
      )}
      {payTip?.from === "mart" && (
        <div className="mart-tip low-stock pay-tip" role="note">
          Someone wants to pay! Step on the green mat and click the NPC.
        </div>
      )}
      {lowStockTip && (
        <div className="mart-tip low-stock" role="note">
          Shelves will run out of stock! <b>Head to the farm</b> to plant &amp; harvest, then restock.
        </div>
      )}
      {martTip && (
        <div className="mart-tip guide-panel" role="note">
          <b className="guide-panel-title">GUIDE</b>
          <ol>
            <li>Serve customers at the cashier</li>
            <li>Plant &amp; harvest seeds on the farm</li>
            <li>Stock the minimart shelves</li>
          </ol>
        </div>
      )}
      {chainHint === "off" && (
        <div className="game-toast chain-hint">
          <b>Refresh</b> page, and <b>Connect</b> wallet to get on-chain record
        </div>
      )}
      {chainHint === "on" && (
        <div className="game-toast chain-hint">
          To <b>Disable</b> on-chain record, <b>Refresh</b> the page
        </div>
      )}

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
                <span>Customers Served</span>
                <b>{world.store.served}</b>
              </div>
              <div className="result-row bad">
                <span>Customers Missed</span>
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
          <HowToPlay />
        </div>
      )}

      {/* ─── Layar PLAY: pemain belum bisa bergerak sebelum menekan tombol ── */}
      {!playing && (
        <div className="start-backdrop">
          <div className="start-frame start-frame--play" role="dialog" aria-label="Mulai permainan">
            <div className="start-title">RUSH MART</div>
            <button type="button" className="start-play" onClick={startGame}>
              PLAY
            </button>
            <div className="start-hint">Press to Play</div>
            <div className="wallet-row">
              <button
                type="button"
                className={`wallet-chip ${wallet.status === "on" ? "is-on" : awaitingApproval ? "is-connected" : `is-${wallet.status}`}`}
                onClick={onWalletClick}
              >
                {wallet.accountId ? "Connected" : "⛓ CONNECT"}
              </button>
              <span className="wallet-note">{walletNote}</span>
            </div>
          </div>
          <HowToPlay />
          {walletPanel && (
            <div className="wallet-panel" role="dialog" aria-label="On-chain recording">
              <div className="wallet-panel-head">
                <span>ON-CHAIN RECORDING</span>
                <button type="button" className="wallet-panel-close" onClick={() => setWalletPanel(false)}>
                  ×
                </button>
              </div>

              {!wallet.accountId && (
                <>
                  <p className="wallet-panel-note">Optional — the game plays fine without a wallet.</p>
                  <button type="button" className="wallet-panel-btn" onClick={() => connectWallet()}>
                    CONNECT WALLET
                  </button>
                </>
              )}

              {wallet.accountId && wallet.status !== "on" && (
                <>
                  <p className="wallet-panel-acct">{wallet.accountId}</p>
                  <p className="wallet-panel-note">
                    Allow the game to record your actions (1 approval, then no more popups).
                  </p>
                  <button type="button" className="wallet-panel-btn" onClick={() => ensureSessionKey()}>
                    ENABLE RECORDING
                  </button>
                </>
              )}

              {wallet.status === "on" && (
                <>
                  <p className="wallet-panel-acct">{wallet.accountId}</p>
                  <p className="wallet-panel-live">● RECORDING ON-CHAIN</p>
                  <p className="wallet-panel-note">{wallet.sent} actions saved to the contract</p>
                  <button type="button" className="wallet-panel-btn is-ghost" onClick={() => disconnectWallet()}>
                    DISCONNECT
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
