/**
 * Saluran kecil antara Phaser dan React untuk hal-hal UI.
 *
 * Dipakai supaya scene bisa meminta React membuka popup (mis. Toko Bibit dari
 * tenda di peta) tanpa bergantung pada referensi instance scene yang bisa
 * berbeda antar-reload.
 */

type Listener = () => void;

let listeners: Listener[] = [];

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
