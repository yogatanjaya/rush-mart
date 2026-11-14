# Rush Mart — keputusan kontrak (13 Nov 2026, malam)

Dokumen ini adalah ringkasan obrolan terakhir sebelum tidur. Kirim ulang isinya
besok saat Bos Yoga mengucapkan **"to do tadi malam"**.

## Posisi kita

| # | Langkah | Status |
|---|---|---|
| 1 | Akun testnet top-level | ✅ `rushmart722324.testnet` (10 NEAR testnet) |
| 2 | Rancangan pencatatan | ✅ **selesai diputuskan** (isi di bawah) |
| 3 | Tulis kontrak Rust | ⬜ berikutnya |
| 4 | Build wasm (WSL) | ⬜ |
| 5 | Deploy + verifikasi | ⬜ |
| 6 | Spike wallet + session key | ⬜ |
| 7 | UI connect/status/riwayat | ⬜ |
| 8 | Uji ujung-ke-ujung | ⬜ |
| 9 | README, repo, demo | ⬜ |

Private key: `C:\Users\User Win 10\nearops-rushmart\rushmart-key.json` (di luar repo).

## Keputusan yang sudah dikunci

1. **Daftar kejadian lengkap (7):** beli bibit, tanam, panen, NPC bayar, NPC gagal, isi rak, akhir ronde.
2. **Dua lapis penyimpanan:** rincian per aksi → **event log** (NEP-297, hanya gas);
   ringkasan (total beli, total panen, total laba, rekor, papan skor) → **state** kontrak.
3. **Nama NPC ditulis teks penuh:** `Village Woman`, `Village Kid`, dst.
4. **Isi rak ikut dicatat.**
5. **Session key** (function-call access key) dipilih: catat per aksi tanpa popup wallet.

## Kontraknya jenis apa

**Bukan NEP-245** (bukan token). Kontrak Rust biasa (`near-sdk`) + **event NEP-297** +
opsional **NEP-330** (metadata sumber). NEP-245 hanya relevan kalau nanti hasil panen
ingin dijadikan item yang bisa diperdagangkan — itu masuk roadmap, bukan sekarang.

## Bentuk fungsi

```
init(owner)
record_event(kind, crop, qty, coins, npc)   ← per aksi (session key)
record_round(profit, served, failed, secs)  ← sekali di akhir ronde
get_stats(account)   → total beli, total panen, total laba, rekor
get_top(n)           → papan skor
get_recent(account)  → catatan ringkas terakhir
```

## Contoh isi catatan (event)

```
14:32:07 UTC  buy_seeds    Corn ×15     30 koin
14:32:19 UTC  plant        Corn ×15
14:33:40 UTC  harvest      Corn ×12
14:33:52 UTC  npc_paid     Village Woman · 12 item · 62 koin · laba +18
14:34:01 UTC  npc_failed   Village Kid · salah kembalian · rugi 2 koin
14:35:10 UTC  round_end    laba 118 · dilayani 12 · gagal 3
```

Timestamp berasal dari blok (tidak bisa dipalsukan pemain).

## Pengamanan yang sudah terpasang

`.gitignore` memuat: `*.key`, `*.secret`, `nearops/`, `*-key.json`, `.env`,
`web/dist/`, `dist/`, `node_modules/`.

## Satu pertanyaan yang masih menggantung

**Pagu gas session key**: usulanku **0,5 NEAR testnet** per sesi (±ratusan transaksi),
bisa di-top-up dengan menekan tombol lagi. Belum dijawab Bos Yoga.
