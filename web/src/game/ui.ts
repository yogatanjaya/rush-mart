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
