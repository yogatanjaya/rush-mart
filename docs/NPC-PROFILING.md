# Profiling NPC Rush Mart

Rancangan belanja 7 warga desa untuk minimarket. Tujuannya: **keranjang belanja
campur** (bukan 1 jenis barang lagi), dengan kepribadian yang berbeda-beda.

Status: **sudah diimplementasikan** (12 Nov 2026). Traffic (seberapa sering dan
seramai apa mereka datang) sudah diputuskan: **berbasis gelombang**.

## Harga acuan

| Barang | Harga jual | Harga bibit | Laba/barang |
|---|---|---|---|
| Jagung | 4 | 2 | **+2** |
| Tomat | 6 | 4 | **+2** |
| Wortel | 4 | 3 | **+1** |
| Kentang | 6 | 3 | **+3** |

## Profil 7 NPC

| # | Warga | Kepribadian | Jenis barang | Jumlah per jenis | Total item | Belanja (koin) | Laba |
|---|---|---|---|---|---|---|---|
| 1 | **Ibu desa** | belanja rumah tangga, sedang | 2–3 jenis | 2–3 | 4–9 | 16–54 | +7…+18 |
| 2 | **Petani tua** | hemat, beli kebutuhan sendiri | 1–2 jenis | 1–2 | 1–4 | 4–24 | +2…+10 |
| 3 | **Gadis desa** | pilih-pilih, sayur segar | 2 jenis | 1–2 | 2–4 | 8–24 | +3…+8 |
| 4 | **Pemuda** | cepat, tidak banyak mikir | 2–3 jenis | 1–3 | 2–6 | 8–36 | +4…+12 |
| 5 | **Pemuda desa** | borongan, bawa pulang banyak | 2 jenis | 3–4 | 6–8 | 24–48 | +10…+20 |
| 6 | **Nenek desa** | sedikit, teliti, tawar-menawar | 1–2 jenis | 1 | 1–2 | 4–12 | +1…+4 |
| 7 | **Anak kecil desa** | jajan, cuma pegang uang kecil | 1 jenis | 1 | 1 | 4 | +2 |

### Kecenderungan barang (bobot pilihan)

| Warga | Sering ambil | Jarang/tidak |
|---|---|---|
| Ibu desa | kentang, tomat, jagung | — |
| Petani tua | jagung, kentang | tomat |
| Gadis desa | tomat, wortel | kentang |
| Pemuda | jagung, tomat | wortel |
| Pemuda desa | kentang, tomat | — |
| Nenek desa | wortel | kentang |
| Anak kecil desa | jagung | wortel, kentang |

## Contoh keranjang (untuk membayangkan hitungan kasir)

| Warga | Isi keranjang | Total bayar | Laba |
|---|---|---|---|
| Ibu desa | 2 jagung + 2 tomat + 1 kentang | 8 + 12 + 6 = **26** | +11 |
| Petani tua | 2 jagung + 2 kentang | 8 + 12 = **20** | +10 |
| Gadis desa | 2 tomat + 1 wortel | 12 + 4 = **16** | +5 |
| Pemuda | 3 jagung + 1 tomat | 12 + 6 = **18** | +8 |
| Pemuda desa | 4 kentang + 3 tomat | 24 + 18 = **42** | +18 |
| Nenek desa | 2 wortel | **8** | +2 |
| Anak kecil desa | 1 jagung | **4** | +2 |

## Implikasi ke target GOALS 100

Rata-rata laba per pelanggan dari tabel di atas: **±8 koin**.
Artinya untuk mencapai laba 100 dibutuhkan **±12–13 pelanggan** dalam 2 menit 30 detik.

Angka ini penting untuk pembahasan traffic berikutnya:
- Kalau traffic terlalu sepi, target 100 tidak mungkin.
- Kalau terlalu ramai, pemain kewalahan menghitung di kasir.

## Aturan jalan yang dipakai di kode

- NPC mengunjungi **1–3 rak** sesuai profil, lalu ke kasir.
- Urutan rak **campuran**: 60% ambil yang paling dekat dari posisinya, 40% acak
  (biar terasa manusiawi, tidak selalu kiri-ke-kanan).
- Perpindahan rak lewat **lorong**: geser horizontal di lorong depan rak
  (y = 396 untuk baris atas, y = 610 untuk baris bawah), lalu naik/turun di celah
  antar kolom (x = 330). Jadi NPC tidak pernah menembus rak.
- Berhenti **1 detik** di tiap rak untuk "mengambil barang"; stok langsung berkurang.
- Rak kosong → dilewati dan lanjut ke rak berikutnya. Batal hanya kalau **semua**
  rak yang dituju kosong.
- Kesabaran (20–40 detik) tetap mulai dihitung saat NPC sampai di antrian kasir.

## Catatan teknis (untuk implementasi nanti)

- NPC sekarang hanya menghampiri **satu rak**. Dengan keranjang campur, NPC harus
  mengunjungi **2–3 rak berurutan** sebelum ke kasir. Jalur jalan perlu disusun
  sebagai daftar tujuan, bukan satu tujuan.
- Kapasitas rak kini **15 slot** (3 baris × 5 item). Dengan keranjang campur,
  rak tetap bisa cepat habis kalau beberapa warga belanja bersamaan — pemain jadi
  harus rajin mengisi rak.
- Hitungan kasir jadi lebih seru: 3 jenis × jumlah berbeda, bukan 1–2 barang.
- Pecahan uang (`BILLS = 10, 20, 50, 100`) masih cukup untuk total sampai ±48.
