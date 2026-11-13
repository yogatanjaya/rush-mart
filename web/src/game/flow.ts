// Rush Mart — penanda alur sesi.
//
// Game tidak langsung bisa dimainkan: scene kebun/minimarket sudah tampil, tapi
// pemain beku sampai menekan tombol PLAY. Semua penanganan gerak dan klik
// memeriksa isPlaying() lebih dulu, jadi sebelum PLAY tidak ada yang bergeser.

let started = false;

/** True setelah pemain menekan PLAY. */
export const isPlaying = () => started;

/** Dipanggil sekali oleh tombol PLAY di HUD. */
export function startSession() {
  started = true;
}

/** Dipanggil saat waktu bermain habis: pemain kembali beku. */
export function stopSession() {
  started = false;
}
