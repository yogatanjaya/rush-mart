# RUSH MART — Rancangan Game Loop (v1, 6 Nov 2026)

> Track: `games` — "the economy is the gameplay"
> Panggung: satu pasar kecil + kota. Roda kehidupan: petani → pedagang → rumah makan → warga pekerja → balik lagi.
> Pemain: satu warga baru yang punya dompet, bisa kerja, dagang, dan menanam modal.

---

## 1. Peta Ekonomi (siapa memberi apa ke siapa)

| Aktor | Menghasilkan | Membeli dari | Menjual ke | Punya dompet? |
|---|---|---|---|---|
| **Pak Tani** | Beras, Sayur | — (produksi sendiri) | Pedagang | Ya |
| **Bu Pasar** (pedagang) | — (barang dari petani) | Pak Tani | Warga, Pemain | Ya |
| **Rumah Makan Bu Sari** | Makanan Jadi | Bu Pasar | Warga, Pemain | Ya |
| **Warga Pekerja** (3–5 NPC) | Tenaga kerja | Bu Pasar, Rumah Makan | — (mereka dapat gaji) | Ya |
| **Pemain** | Tenaga kerja / modal | Semua | Semua | Ya |

Uang mengalir: **kota bayar gaji ke warga → warga belanja ke pedagang & rumah makan → pedagang restock ke petani → petani produksi lagi.**
Uang "hilang" saat makanan dikonsumsi (sink), uang "masuk" saat gaji dibayar (source). Ini yang bikin ekonomi nggak meledak jadi inflasi.

## 2. Barang (satu contract NEP-245, semua jenis item)

| ID | Nama | Kategori | Harga dasar | Dipakai untuk |
|---|---|---|---|---|
| `beras` | Beras | Bahan | 10 | Makanan jadi |
| `sayur` | Sayur | Bahan | 6 | Makanan jadi |
| `makanan` | Makanan Jadi | Konsumsi | 25 | Dipakai warga (habis) |
| `kain` | Kain | Bahan | 12 | Pakaian |
| `pakaian` | Pakaian | Konsumsi | 40 | Dipakai warga (habis) |

Pemain mulai dengan **100 koin** dan 0 barang.

## 3. Loop 30 detik — "satu aksi"

Pemain selalu lihat 5 tombol. Tiap klik = 1 jam in-game lewat.

1. **Kerja shift** → +20 koin, −20 energi
2. **Beli** barang dari NPC (harga saat itu)
3. **Jual** barang ke NPC (harga saat itu)
4. **Investasi** ke toko yang bangkrut (min. 100 koin)
5. **Istirahat** → +40 energi, −10 koin (atau gratis kalau punya kamar)

Energi maksimal 100. Kalau energi 0, cuma bisa istirahat. Ini yang bikin pemain harus kerja, bukan cuma dagang doang.

## 4. Loop 5 menit — "satu hari"

Setelah 8 aksi, hari berganti. Yang terjadi otomatis:

- Warga NPC belanja sesuai kebutuhan (demand tercatat)
- Petani panen (supply masuk ke Bu Pasar)
- Rumah makan masak kalau bahannya cukup
- **Harga semua barang dihitung ulang**
- Muncul 1 sinyal di layar, misal: *"Stok beras di Bu Pasar tinggal 4 karung. Warga beli 11 karung kemarin."*

Pemain lihat ini sebagai **tooltip alasan harga** — wajib menurut brief. Contoh isi tooltip:

> **Beras — 14 koin (+40%)**
> Stok tinggal 4 dari biasanya 20. Penjualan 3 hari terakhir naik. Kalau panen berikutnya gagal, harga bisa naik lagi.

## 5. Aturan Harga NPC (satu file, bisa dibaca juri)

Rumus sederhana, sengaja gampang dibaca:

```
harga = harga_dasar
      × (1 + tekanan_permintaan)      # 0.0 – 0.8
      × (1 + kelangkaan)              # -0.4 – +0.6
      × (1 + event_musim)             # -0.5 – +0.8
```

- `tekanan_permintaan` = penjualan 3 hari terakhir dibanding rata-rata
- `kelangkaan` = naik kalau stok di bawah 20% kapasitas, turun kalau di atas 120%
- `event_musim` = gagal panen / festival / paceklik

Semua NPC pakai rumus yang sama, beda parameter saja. Jadi juri bisa baca satu file dan paham seluruh ekonomi.

## 6. Bangkrut & Investasi (hook utama)

- Toko punya kas. Kalau kas minus 3 hari berturut-turut → **toko tutup**, NPC berhenti jualan.
- Pemain bisa **investasi** koin ke toko tutup → toko buka lagi, pemain dapat **30% profit** toko itu selamanya.
- Kalau pemain nggak menyelamatkan? Toko tetap tutup, dan rantai pasok putus: rumah makan kehabisan bahan, warga kelaparan, demand bergeser. **Ekonomi jadi lebih miskin karena keputusan pemain.**
- Ini yang bikin pemain merasa ekonominya hidup, bukan cuma angka.

## 7. Loop 1 sesi — "seminggu"

7 hari in-game = 1 sesi. Di akhir minggu ada **event**:

| Event | Efek |
|---|---|
| Gagal panen | Supply beras & sayur −50% selama 3 hari |
| Festival kota | Demand makanan & pakaian +80% selama 2 hari |
| Paceklik | Gaji warga turun 30%, demand turun |

Pemain harus adaptasi: stockpile sebelum event, atau jual saat harga puncak. Ini yang bikin sesi pendek tetap punya cerita.

**Progres pemain:** nilai kekayaan (koin + barang + nilai saham toko). Target demo: dari 100 koin jadi pemilik 2 toko dalam seminggu in-game.

## 8. Fast-Forward (wajib, ini fitur penilaian)

Satu tombol: **"Percepat 7 hari"** → simulasikan seminggu penuh dalam ±5 detik, dengan grafik harga bergerak live dan log kejadian:

```
Hari 1  Beras 10 → 11   (warga belanja lebih banyak)
Hari 3  Gagal panen! Supply beras −50%
Hari 4  Beras 11 → 19   (kelangkaan)
Hari 5  Rumah Makan Bu Sari bangkrut (bahan terlalu mahal)
Hari 7  Pemain investasi 120 koin → toko buka lagi
```

Ini yang bikin juri bisa "melihat ekonomi bergerak" dalam 60 detik tanpa main lama. Bisa di-pause kapan saja.

## 9. Demo 60 detik untuk juri

1. Login pakai email — nggak ada popup wallet (5 detik)
2. Kerja 2 shift, beli beras, jual ke rumah makan (15 detik)
3. Klik **Percepat 7 hari** → grafik harga naik-turun + satu toko bangkrut (20 detik)
4. Klik **Investasi** → toko buka, profit masuk tiap hari (10 detik)
5. Layar ringkasan: "kekayaanmu naik 3×, ekonomi kota pulih" (10 detik)

## 10. Padanan teknis di NEAR (biar juri lihat "ini pakai NEAR")

| Kebutuhan game | Di NEAR |
|---|---|
| Semua barang (5 jenis) | Satu contract **NEP-245** multi-token |
| Dompet NPC | Akun NEAR sungguhan per NPC (testnet), bukan akun dev |
| Login pemain | Social/email login (account abstraction) — tanpa seed phrase |
| Harga & kas NPC | State di contract + file aturan harga yang readable |
| Bukti ekonomi bergerak | Event log on-chain + grafik di frontend |
| Demo | Testnet, boleh mainnet |

## 11. Yang TIDAK kita bangun (tetap ditulis di README sebagai visi)

- Distrik pakaian, restoran mewah, bank, sekolah
- Multiplayer / PvP dagang
- Grafik 3D, animasi karakter
- Token ekonomi terpisah / trading antar pemain

Alasan: 8 hari. Fitur di atas bikin demo nggak fokus. Dicatat sebagai roadmap = juri lihat visi besar tanpa risiko.

---

## Keputusan Sutradara (6 Nov 2026)

1. **Nama:** Rush Mart
2. **Rasa/visual:** ringan & lucu — kartun, warna cerah, paling aman untuk demo
3. **Pemain mulai:** warga biasa, modal 100 koin (roda kehidupan paling kerasa)
4. **Panggung:** pasar kecil + kota (petani, pedagang, rumah makan, warga pekerja)
5. **Peran Bos Yoga:** Sutradara + mau belajar sedikit alurnya
6. **Event mingguan:** gagal panen, festival, paceklik (3 event, tidak ditambah)
