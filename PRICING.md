# Pasar Pagi — Aturan Harga NPC (satu file, bisa dibaca mesin)

> Requirement hackathon: *"Aturan harga NPC di satu file readable + tooltip alasan harga."*
> File ini adalah **satu-satunya sumber kebenaran** untuk harga. Implementasi kontrak ada di
> `contract/src/lib.rs` (`fn recompute_prices`, sekitar baris 719), implementasi tooltip ada di
> `web/src/pricing.ts`. Kalau salah satu berubah, ubah file ini juga.

## 1. Harga dasar (base price)

| Item ID | Nama | Kategori | Base price (koin) | Pemegang stok (NPC) | target_stock |
|---|---|---|---|---|---|
| `beras` | Beras | bahan | 10 | `bupasar` (Bu Pasar) | 20 |
| `sayur` | Sayur | bahan | 6 | `bupasar` (Bu Pasar) | 20 |
| `makanan` | Makanan Jadi | konsumsi | 25 | `busari` (Bu Sari) | 10 |
| `kain` | Kain | bahan | 12 | `bupasar` (Bu Pasar) | 20 |
| `pakaian` | Pakaian | konsumsi | 40 | `bupasar` (Bu Pasar) | 20 |

Harga dasar dipakai sebagai patokan. Harga jual di pasar **tidak pernah** di bawah 1 koin.

## 2. Rumus harga

```
harga = base_price
      × (100 + scarcity_pct) / 100
      × (100 + event_pct)    / 100
```

Dihitung ulang **setiap hari** (setelah semua aksi harian selesai diproses).

### 2a. Faktor kelangkaan (`scarcity_pct`)

Berdasarkan stok NPC pemegang item dibanding `target_stock`-nya:

| Kondisi | `scarcity_pct` | Arti |
|---|---|---|
| `stok × 5 < target_stock` | **+60%** | Stok sangat tipis → harga naik |
| `stok × 5 > target_stock × 6` | **−40%** | Stok menumpuk → harga turun |
| selain itu | **0%** | Harga normal |

### 2b. Faktor event (`event_pct`)

Event kota berjalan beberapa hari dan menggeser harga:

| Event | Item terdampak | `event_pct` |
|---|---|---|
| `gagal_panen` (gagal panen) | `beras`, `sayur` | **+40%** |
| `festival` (festival pasar) | `makanan`, `pakaian` | **+50%** |
| `paceklik` (paceklik) | semua item | **−20%** |
| `normal` (hari biasa) | — | **0%** |

## 3. Contoh perhitungan (bisa diverifikasi)

Anggap hari normal (`event_pct = 0`), `bupasar` memegang `beras`:

| Stok beras | target | `scarcity_pct` | Harga |
|---|---|---|---|
| 2 | 20 | +60% | `10 × 1.60 = 16` |
| 20 | 20 | 0% | `10 × 1.00 = 10` |
| 130 | 20 | −40% | `10 × 0.60 = 6` |

Kalau event `gagal_panen` aktif: `16 × 1.40 = 22` koin.

## 4. Aturan transaksi pemain

| Aksi | Harga yang dipakai |
|---|---|
| Pemain **membeli** dari pasar | harga retail (`price_of(item)`) |
| Pemain **menjual** ke pasar | **90%** dari harga retail (`price × 9 / 10`) |

Selisih 10% adalah margin pedagang — inilah yang membuat pedagang bisa untung/rugi
dan pada akhirnya bangkrut.

## 5. Hubungan harga ↔ ekonomi

- Warga belanja **jumlah tetap** tiap hari (1 makanan + 2 beras per warga, dikali
  pengali event `festival` = 180%). Harga naik **tidak** otomatis menahan belanja
  warga — yang menahan belanja adalah kas warga yang habis. Ini disengaja: jumlah
  tetap membuat simulasi stabil dan mudah diprediksi saat demo.
- Pasar (`bupasar`) beli dari petani di **70% harga retail** (margin grosir 30%).
- Rumah makan (`busari`) beli bahan dari pasar di **harga retail penuh (100%)** —
  bukan 70%. Marginnya datang dari selisih harga bahan vs harga makanan jadi.
- Toko bangkrut tetap ada di dunia game dan bisa **diinvestasi** pemain; investor dapat
  bagi hasil 30% dari revenue harian toko saat toko buka kembali.

## 6. Tooltip di UI

Setiap harga di halaman Pasar punya tooltip yang menjelaskan **kenapa** harganya begitu,
dengan format:

```
Harga dasar 10 koin.
Stok tipis (2 dari target 20) → +60%.
Event gagal panen → +40%.
Harga sekarang 22 koin. Beli sekarang, besok bisa lebih mahal.
```

Logika teks ini ada di `web/src/pricing.ts` → `priceReason(world, itemId)`.
