/**
 * Saluran kecil antara Phaser dan React untuk hal-hal UI.
 *
 * Dipakai supaya scene bisa meminta React membuka popup (mis. Toko Bibit dari
 * tenda di peta) atau berpindah tempat (lewat pintu), tanpa bergantung pada
 * referensi instance scene yang bisa berbeda antar-reload.
 */

type Listener = () => void;
type SceneListener = (target: "farm" | "mart") => void;

let listeners: Listener[] = [];
let sceneListeners: SceneListener[] = [];

/** Daftarkan pendengar; kembalikan fungsi untuk melepasnya. */
export function onOpenSeedShop(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/** Panggil dari scene: minta React membuka popup Toko Bibit. */
export function openSeedShop() {
  for (const fn of listeners) fn();
}

/** Daftarkan pendengar pindah tempat (pintu). */
export function onGoToScene(fn: SceneListener): () => void {
  sceneListeners.push(fn);
  return () => {
    sceneListeners = sceneListeners.filter((l) => l !== fn);
  };
}

/** Panggil dari scene: pemain menembus/menekan pintu. */
export function goToScene(target: "farm" | "mart") {
  for (const fn of sceneListeners) fn(target);
}

let payNudgeListeners: ((secondsLeft: number) => void)[] = [];

/** React mendengarkan: pelanggan terdepan menunggu terlalu lama. */
export function onPayNudge(fn: (secondsLeft: number) => void): () => void {
  payNudgeListeners.push(fn);
  return () => {
    payNudgeListeners = payNudgeListeners.filter((l) => l !== fn);
  };
}

/** Dipanggil scene saat pelanggan pertama sudah menunggu > 12 detik. */
export function payNudge(secondsLeft: number) {
  for (const fn of payNudgeListeners) fn(secondsLeft);
}

export type Tool = "hand" | "water" | "hoe";

let activeTool: Tool = "hand";
let toolListeners: ((tool: Tool) => void)[] = [];

/** React mendengarkan perubahan alat (mis. saat scene mereset ke tangan kosong). */
export function onToolChanged(fn: (tool: Tool) => void): () => void {
  toolListeners.push(fn);
  return () => {
    toolListeners = toolListeners.filter((l) => l !== fn);
  };
}

/** React memilih alat di inventory bar. */
export function setTool(tool: Tool) {
  activeTool = tool;
  for (const fn of toolListeners) fn(tool);
}

/** Kembalikan ke tangan kosong (dipakai setiap masuk kebun). */
export function resetTool() {
  setTool("hand");
}

/** Scene membaca alat yang sedang dipegang pemain. */
export function getTool(): Tool {
  return activeTool;
}
