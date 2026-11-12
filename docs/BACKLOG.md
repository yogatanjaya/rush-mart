# Backlog — catatan yang belum dikerjakan

Hal-hal yang perlu dibahas/dikerjakan tapi **belum disentuh**. Diisi dari sesi
bersama Bos Yoga. Jangan dikerjakan tanpa aba-aba.

## Bug / perilaku yang perlu dibereskan

### 0. ~~Pindah ke kebun menghentikan ronde jualan~~ (SELESAI 12 Nov 2026)

Dulu `KE FARM` memakai `scene.switch()` yang mematikan halaman minimarket:
rak, pelanggan, antrian, dan timer ikut mati. Saat kembali, halaman dibangun
ulang dari nol dan tokonya tidak bisa dibuka lagi (READY sudah dihapus).

Perbaikan: **kedua halaman hidup berdampingan**. Pindah halaman hanya
menyembunyikan/menampilkan (`setFront()` di kedua scene: `scene.setVisible`,
input & keyboard dimatikan untuk halaman yang disembunyikan). Konsekuensi yang
disengaja: saat pemain di kebun, pelanggan **tetap datang, mengantri, lalu kabur**
(stok & koin berkurang). Tanaman tetap tumbuh.

### 1. ~~TRY AGAIN / PLAY AGAIN dari halaman kebun tidak kembali ke minimarket~~ (SELESAI 12 Nov 2026)

Dulu: menekan TRY AGAIN / PLAY AGAIN saat pemain di halaman kebun hanya mengulang
jam, tapi pemain tetap di kebun.

Perbaikan:
- `restartRound()` sekarang memindahkan scene ke minimarket kalau pemain di kebun,
  lalu membuka toko begitu scene minimarket siap (lewat `pendingStartRef` di polling).
- Ditambah `resetRuntimeState()` di `MinimarketScene.create()`: rak, collider,
  pelanggan, antrian, dan status toko dikosongkan setiap scene dibangun ulang.
  Tanpa ini, saat pemain bolak-balik kebun ↔ minimarket, rak dan collider menumpuk
  dua kali (Phaser memakai ulang instance scene yang sama).

## Menunggu keputusan / data

### 2. ~~Traffic NPC (jumlah & ritme kedatangan)~~ (SELESAI 12 Nov 2026)

Ritme final: **gelombang 2–3 orang** (jarak 1–2 detik) + **1 orang menyusul di tengah jeda**
+ jeda **15–25 detik** sebelum gelombang berikutnya. Berulang sampai ronde habis
(tidak ada kuota 12 lagi). Target tetap **100 laba** dalam 150 detik.

Catatan dari simulasi (`web/scripts/sim_traffic.py`): ritme ini menghasilkan ~40+ orang
per ronde, sedangkan pemain hanya mampu melayani ±17–19 orang. Jadi banyak pelanggan
kabur dan stok rak cepat habis — sengaja dibiarkan untuk diuji langsung oleh Bos Yoga.

### 3. ~~Stok awal rak vs kapasitas baru~~ (SELESAI 12 Nov 2026)

Kapasitas rak **15 slot** (3 baris × 5 item); stok awal sudah disesuaikan Bos Yoga:
**jagung 11, tomat 10, wortel 12, kentang 10**.

### 4. Ekonomi level / target

- Target GOALS masih **100 laba**; diukur per ronde 02:30 (150 detik penuh).
- Ronde **selalu dihabiskan sampai 00:00**; hasil baru dinilai saat waktu habis:
  laba ≥ target → SUCCESS, kurang → FAIL. (Dulu SUCCESS muncul begitu target
  tercapai, jadi ronde berhenti lebih awal — perilaku itu sudah dihapus.)
- Belum ada keputusan apakah ada level 2, 3, dan seterusnya.

---

_Terakhir diperbarui: 12 Nov 2026_

### 5. ~~Pertumbuhan tanaman 40 detik~~ (SELESAI 12 Nov 2026)

Diganti jadi **15 detik total** (`STAGE_SECONDS = 7.5`, 2 transisi). Tujuannya supaya
pemain bisa menanam → panen → isi ulang rak di tengah ronde 150 detik.
Bibit tetap harus dibeli (tidak gratis).

### 6. Hukuman pelanggan kabur (ditetapkan 12 Nov 2026)

Pelanggan kabur (kesabaran habis) **dan** salah hitung memakai hukuman yang sama:
koin dipotong seharga **bibit** barang yang dibawa, dan **laba juga dipotong**
seharga yang sama, sehingga bar GOALS ikut turun dan **boleh minus** (mis. -12/100).
Bar tetap kosong saat nilainya negatif; angka di HUD menunjukkan minus.
Koin sendiri tidak pernah minus (berhenti di 0).

### 7. Isi popup hasil ronde (ditetapkan 12 Nov 2026)

Popup SUCCESS/FAIL menampilkan tiga kotak bergaya baris kasir:
**Pelanggan dilayani** (hijau sage), **Pelanggan gagal** (coral), dan **GOALS laba/target** (krem).
Hitungan dilayani/gagal hidup di `economy.served` / `economy.failed` supaya tetap benar
walau ronde berakhir saat pemain sedang di kebun.

### 8. Tombol TANAM SEMUA per lahan (ditetapkan 12 Nov 2026)

Tiap lahan punya tombol kecil **TANAM SEMUA** di bawah kanan bingkai lahan.
Fungsinya menanam bibit jenis itu dari inventory ke petak kosong sampai 15 petak penuh.
Animasi tanam: sprite mulai skala 0,6 lalu membesar ke skala normal (220 ms, Back.easeOut),
diberi jeda 55 ms per petak supaya terlihat berurutan. (Bos Yoga mau mengubah animasi ini.)

### 9. Tenda "BUY SEED" di peta farm (12 Nov 2026)

Tenda digambar **di aset latar** (`gen_pixel_assets.py` -> `draw_seed_stall`), bukan objek terpisah:
kanopi merah-putih, papan nama (teks "BUY SEED" digambar runtime di `FarmScene.drawLabels`),
meja dengan karung/peti/pot, pedagang kecil, tunggul di kiri-bawah, dan jalan tanah yang
diteruskan sampai tepi kiri lalu ditutup semak (seolah menembus hutan).
Hutan kiri hanya dikurangi di celah tenda. **Belum ada fungsi/klik** — tombol BUY SEEDS di HUD
sengaja masih dipakai sampai mekanik tenda disepakati.

## Sisa besar (diingatkan lagi ke Bos Yoga nanti)

1. **Deploy publik**: repo GitHub publik + hosting statis (butuh HTTPS untuk wallet).
2. **Tahap NEAR**: sambung kontrak testnet ke game (wallet login, simpan hasil on-chain).
3. **Demo video** + post X (#NEARHackathon) + submission form.
4. Deadline **14 Nov 2026 23:59 UTC**.

Catatan: tombol **BUY SEEDS di HUD sudah dihapus** (12 Nov 2026) — toko bibit hanya lewat
tenda di peta. Animasi tanam/harvest ditunda. Traffic dianggap cukup sementara.
