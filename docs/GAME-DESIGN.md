# GAME DESIGN — Pasar Pagi (konsep baru)

> Dokumen keputusan. Setiap baris di sini sudah disetujui. Kalau ada perubahan, ubah di sini dulu.
> Terakhir diperbarui: 9 Nov 2026.

## 1. Konsep inti

Pemain adalah **petani sekaligus pemilik toko kecil**. Setiap hari: tanam di farm → panen →
isi rak → layani pelanggan di kasir → tutup toko → hitung untung.

**Simple dulu. Tanpa level, tanpa upgrade.** Toko kedua, dagangan lebih banyak, dan NPC
tambahan masuk daftar "nanti" (roadmap README), tidak dibangun sekarang.

## 2. Dua tempat + satu popup

| Tempat | Fungsi | Cara akses |
|---|---|---|
| **Farm** | Tanam bibit, tunggu tumbuh, panen | Scene Phaser |
| **Minimarket** | Isi rak, layani pelanggan, terima bayaran | Scene Phaser |
| **Toko bibit** | Beli bibit tanaman | **Popup overlay** (bukan scene) |

**Keputusan (9 Nov 2026):** toko bibit **tidak** dibuat sebagai tempat di map. Pemain tekan
tombol **🌱 BUY SEED** kapan saja → popup muncul di atas layar → beli → tutup → balik main.

Alasan:
- Hemat satu scene Phaser (≈1 hari kerja) — penting karena sisa waktu mepet
- Pemain tidak kehilangan waktu jalan ke tempat ketiga
- Pola UI popup ini bisa dipakai ulang untuk INVENTORY dan daftar rak
- Belanja bibit bukan bagian dari keseruan (tidak ada gameplay di jalan menuju toko)

Lihat contoh tampilan: `docs/popup-seed-shop.html`.

## 3. Tanaman & harga

| Tanaman | Harga jual | Harga bibit | Margin | Harga pasar nyata (Rp/kg) |
|---|---|---|---|---|
| 🌽 Jagung | 4 koin | 2 koin | +2 (50%) | ~15.000 |
| 🍅 Tomat | 6 koin | 4 koin | +2 (33%) | 20.000 |
| 🥕 Wortel | 4 koin | 3 koin | +1 (25%) | 20.000 |
| 🥔 Kentang | 6 koin | 3 koin | +3 (50%) | 18.000 |

Skala: **1 koin ≈ Rp 1.000**. Harga jual diturunkan dari harga pasar nyata, dibulatkan
supaya enak dibaca. Harga bibit = 50–75% dari harga jual.

**Laba per barang** = harga jual − harga bibit. Angka inilah yang menggerakkan bar
GOALS (bukan uang masuk): jagung +2, tomat +2, wortel +1, kentang +3.

## 4. Aturan tanam & panen

- **1 bibit = 1 unit panen.** Tanam 9 bibit → panen 9 unit.
- **1 rak = 15 slot** (3 baris × 5 item), satu rak untuk satu jenis tanaman. Empat rak = 60 slot.
- **Klik 1 petak = 1 bibit ditanam.** Selain itu ada tombol kecil **TANAM SEMUA**
  di bawah kanan setiap lahan: menanam bibit jenis itu sebanyak yang ada di inventory
  sampai 15 petak lahan penuh.
- **Klik 1 plot = panen 1 tanaman.** Sama: ada tombol **PANEN SEMUA** per jenis.
- **Refill rak: 1 klik per rak**, isi otomatis sampai penuh (15 slot) dari inventory.
- **Stok awal (dagangan contoh)**: saat game mulai rak sudah berisi —
  jagung 11/15, tomat 10/15, wortel 12/15, kentang 10/15. Stok ini tidak memotong inventory
  dan tidak menambah modal; pemain bisa langsung berjualan sebelum menanam.
  Kalau stok kurang, isi sebanyak yang ada.

## 5. Tempo permainan

**Satu ronde (level) = 150 detik (02:30)**, dihitung mulai tombol PLAY ditekan.
Fase tanam, tumbuh, dan panen **tidak** masuk hitungan waktu — pemain bebas.

| Fase | Durasi | Isi |
|---|---|---|
| 1. Tanam | bebas | Pemain di farm, beli bibit, tanam di plot |
| 2. Tumbuh | 20–30 detik | Progress bar; pemain boleh jalan ke toko sambil menunggu |
| 3. Panen | bebas | Panen masuk inventory |
| 4. Siapkan toko | bebas | Refill rak dari inventory |
| 5. Jualan | **150 detik** | Pelanggan datang bergelombang (2–3 orang berdekatan, lalu 1 menyusul) |
| 6. Tutup | — | Hitung hasil: penjualan − modal bibit = untung |

**Tombol PLAY** membuka toko dan memulai hitungan 150 detik.
Sebelum READY ditekan, waktu tidak jalan.

**Pelanggan:**
- Datang **bergelombang**: 2–3 orang berjarak 1–2 detik, 1 orang menyusul di tengah jeda,
  lalu gelombang berikutnya setelah jeda 15–25 detik (berulang sampai ronde habis)
- Beli **1–2 item** per pelanggan
- Jalan: pintu → rak → kasir → keluar
- **Kesabaran 30 detik** di kasir. Lewat dari itu, pelanggan pergi tanpa bayar
- Pemain **harus berdiri di kasir** untuk melayani. Tidak ada pembayaran otomatis

## 6. Uang

- Modal awal: **200 koin** (bukan 100 — biar hari pertama bisa isi 3 rak)
- **Tanpa biaya operasional harian.** Untung = penjualan − modal bibit. Bersih dan gampang dijelaskan.
- Saldo selalu kelihatan di HUD

### Kenapa 150 koin
Dengan harga bibit sekarang, mengisi 4 rak penuh (60 slot) butuh **180 koin**
(jagung 18 + tomat 36 + wortel 27 + kentang 27). Modal 150 koin berarti pemain bisa
mengisi semuanya dan masih punya 42 koin sisa — modal tidak lagi jadi batas pilihan.
Kalau mau pemain tetap harus memilih tanaman di hari pertama, modal perlu diturunkan
(usulan: 60–80 koin). Belum diputuskan.

## 7. Layout minimarket

Lihat `docs/layout-minimarket.html` (buka di browser) — diagram top-down:
- 4 lahan kayu, masing-masing **15 slot (3 baris × 5)**, posisi tengah-bawah
- Kasir kanan atas: meja kayu + komputer + gantungan "CASHIER"
- Area antrian di depan kasir dengan tali pembatas
- Pintu kanan bawah dengan tali pembatas
- HUD horizontal di atas: BUY SEED · KE FARM · INVENTORY · SALDO

## 8. Yang masih menunggu keputusan

- [ ] Visual farm (menanam / memanen) — sedang dijelaskan Bos Yoga
- [x] Visual toko bibit — **selesai: popup overlay**, lihat `docs/popup-seed-shop.html`
- [x] Berapa lama satu siklus tumbuh — **20–30 detik**, dihitung real-time
- [x] Efek pelanggan kabur — **tidak mengurangi reputasi**, cuma kehilangan penjualan
- [x] Kondisi "selesai" — **3 hari in-game** (keputusan 9 Nov 2026). Setelah hari ke-3,
      skor akhir = total keuntungan (penjualan − modal bibit). Lalu layar hasil.

## 9. Art & animasi

Lihat `docs/art-farm.html` (buka di browser):
- Karakter: petani muda perempuan, kartun vektor, topi jerami + overall hijau,
  4 pose (idle, jalan, menanam, memanen)
- Tanaman: 3 tahap (kecil → sedang → siap panen)
- Panen: buah melayang ke inventory

**Catatan teknis:** gambar di preview masih tampak depan. Untuk Phaser nanti digambar ulang
top-down dengan 4 arah hadap + 2 frame animasi jalan.

**Semua aset ini terpisah dari logika game.** Mengganti gambar karakter, warna, atau animasi
tidak menyentuh contract maupun aturan ekonomi. Jadi revisi visual bisa kapan saja tanpa
membangun ulang sistem.
