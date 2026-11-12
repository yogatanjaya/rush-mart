# Pasar Pagi — Roda Kehidupan Sehari-hari

> Game simulasi ekonomi di NEAR. Uang benar-benar berputar: pekerja dapat upah →
> belanja → pedagang dapat uang → restock → pekerja lain dapat kerja.
> Kalau toko bangkrut, pemain bisa menyuntik modal dan dapat bagi hasil.

**NEAR Hackathon 2026 — track `games`** ("the economy is the gameplay").
Contract: **`pasar-pagi-17536.testnet`** (NEAR Testnet).
License: MIT.

---

## 1. Ringkasan untuk mesin (TL;DR — do X, see Y)

Bagian ini ditulis supaya coding agent (Claude Code / Codex) bisa memverifikasi
project tanpa menebak. Semua perintah dijalankan dari root repo.

| # | Lakukan ini | Lihat hasil ini |
|---|---|---|
| 1 | `node scripts/verify.mjs` | Print state on-chain + 5 baris `PASS`, lalu `OK: contract hidup dan state valid.` Exit code 0. Tidak butuh wallet/secret key. |
| 1b | `curl -s -X POST https://rpc.testnet.near.org -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"call_function","finality":"final","account_id":"pasar-pagi-17536.testnet","method_name":"get_world","args_base64":""}}'` | JSON berisi `day`, `event`, `prices`, `npcs`, `history`, `log`. Contract hidup. |
| 2 | decode `result.result` (array byte) → JSON | `day` ≥ 1, `prices` berisi 5 item (`beras`, `sayur`, `makanan`, `kain`, `pakaian`), `npcs` berisi 5 NPC. |
| 3 | `cd web && npm install && npm run build` | exit code 0, `vite build` selesai. |
| 4 | `cd web && npm run dev` | server di `http://127.0.0.1:5173`, halaman Pasar Pagi tampil dengan data **live** dari testnet. |
| 5 | Baca `PRICING.md` | aturan harga NPC lengkap di satu file; rumus + contoh angka yang bisa dihitung ulang. |
| 6 | Hover harga di halaman Pasar | tooltip menjelaskan **kenapa** harga naik/turun (stok tipis, event, dll). |
| 7 | Klik aksi → **Jalankan hari** | satu persetujuan wallet untuk semua aksi yang diantrikan; state hari maju. |
| 8 | Klik **Fast-forward** | simulasi banyak hari sekaligus (satu persetujuan). |

---

## 2. Masalah yang dipecahkan

Game ekonomi di blockchain biasanya cuma menempelkan token hadiah di atas game biasa.
Di Pasar Pagi, **ekonominya sendiri yang jadi gameplay**:

- Setiap NPC punya **dompet, kas, dan stok sendiri** (akun NEAR sungguhan di testnet).
- Harga bergerak karena **stok vs permintaan**, bukan karena angka hardcoded.
- Aksi pemain benar-benar menggeser harga: membanjiri pasar dengan beras → beras murah.
- Toko yang salah kelola **bangkrut** dan tutup. Pemain bisa **investasi** untuk buka lagi
  dan dapat **30% bagi hasil** dari revenue harian toko itu.
- Pemain tidak perlu tahu ini blockchain — login pakai email, chain-nya invisible.

---

## 3. Peran ekonomi (NPC)

| Peran | Fungsi ekonomi |
|---|---|
| **Petani** (`paktani`) | Jual bahan mentah; stok tergantung musim |
| **Pedagang pasar** (`bupasar`) | Beli dari petani, jual ke warga; harga naik kalau stok tipis |
| **Rumah makan** (`busari`) | Beli bahan, jual makanan jadi; bisa bangkrut kalau bahan terlalu mahal |
| **Pabrik** (`pabrik`) | Produksi kain & pakaian |
| **Warga pekerja** (`warga`) | Punya gaji, belanja rutin → inilah yang menggerakkan *demand* |
| **Pemain** | Kerja → dapat koin → belanja/jual → investasi toko bangkrut |

Setiap NPC adalah akun NEAR testnet: `paktani.pasar-pagi-17536.testnet`, dst.

---

## 4. Requirement hackathon — status

| Requirement resmi | Status | Di mana |
|---|---|---|
| Item = **NEP-245 multi token** (satu contract semua item) | ✅ | `contract/src/lib.rs` — `mt_balance_of`, `mt_transfer`, `mt_batch_transfer`, `mt_supply` |
| **Login email / social** — tanpa seed phrase | ✅ | Meteor Wallet via wallet selector; login lewat email + OTP, tanpa seed phrase |
| Gas prompt tidak muncul di loop normal | ⚠️ Sebagian | Semua aksi hari itu di-batch jadi **satu approval per hari in-game** (bukan per klik). Fast-forward juga satu approval. Bukan zero-popup penuh — lihat bagian 8 |
| **Aturan harga NPC di satu file readable** + tooltip alasan | ✅ | `PRICING.md` + `web/src/pricing.ts` + tooltip di UI |
| **Fast-forward** seminggu trading dalam 1 menit | ✅ | `fast_forward(days)` di contract + tombol Fast-forward di UI |

---

## 5. Game loop (30 detik / 5 menit / 1 sesi)

| Rentang | Yang dilakukan pemain |
|---|---|
| **30 detik** | Pilih aksi: kerja shift, istirahat, beli bahan, jual barang, atau investasi toko bangkrut |
| **5 menit** | Satu hari in-game lewat; harga update; NPC memberi sinyal ("stok beras habis, harga naik") |
| **1 sesi** | Beberapa hari in-game; event muncul (gagal panen / festival / paceklik) yang memaksa pemain ubah strategi |

Aksi yang tersedia (enum `Action` di contract):

```rust
pub enum Action {
    Work,                                        // kerja → dapat koin, energi turun
    Rest,                                        // istirahat → energi pulih
    Buy  { item_id: String, qty: u32 },          // beli dari pasar (harga retail)
    Sell { item_id: String, qty: u32 },          // jual ke pasar (90% harga retail)
    Invest { npc_id: String },                   // suntik modal ke toko bangkrut
}
```

---

## 6. Aturan harga (ringkas — lengkap di `PRICING.md`)

```
harga = base_price × (100 + scarcity_pct)/100 × (100 + event_pct)/100
```

- `scarcity_pct`: **+60%** kalau stok < target/5, **−40%** kalau stok > target×6, selain itu **0%**.
- `event_pct`: gagal panen +40% (beras/sayur), festival +50% (makanan/pakaian), paceklik −20% (semua).
- Pemain beli di harga retail; pemain jual di **90%** harga retail (margin pedagang 10%).
- Semua rumus dan contoh angka ada di **`PRICING.md`**; UI menampilkan alasannya lewat tooltip.

---

## 7. Arsitektur teknis

```
contract/                 Rust smart contract (NEAR SDK 5.30.1)
  src/lib.rs              NEP-245 multi token + logika ekonomi kota
  Cargo.toml
web/                      Frontend React 19 + Vite 8 + TypeScript
  src/config.ts           CONTRACT_ID, network, daftar item & NPC
  src/near.ts             baca state via JSON-RPC, tulis via wallet selector
  src/pricing.ts          penjelasan harga untuk tooltip (mirror PRICING.md)
  src/App.tsx             UI game: pasar, NPC, antrian aksi, grafik harga
  src/polyfills.ts        polyfill Buffer/process untuk NEAR SDK di browser
PRICING.md                aturan harga NPC (satu file, sumber kebenaran)
GAME-LOOP.md              rancangan game loop di atas kertas
TECHNICAL-DESIGN.md       keputusan teknis & trade-off
HACKATHON.md              aturan resmi hackathon
```

**Alur data:** UI → `near.ts` → RPC `call_function` ke contract → JSON `WorldView`
(`day`, `event`, `prices`, `npcs`, `history`, `log`). Transaksi ditandatangani
wallet selector (Meteor), dikirim sebagai satu `functionCall` berisi array aksi.

---

## 8. Login & batasan yang jujur

- Login memakai **Meteor Wallet** lewat NEAR Wallet Selector. User masuk dengan
  **email + kode OTP**, tanpa seed phrase.
- **Satu approval per hari in-game.** Pemain mengantrikan beberapa aksi di UI,
  lalu menyetujui satu transaksi yang mengirim semuanya. Fast-forward juga satu approval.
- **Bukan zero-popup penuh.** Zero-popup sesungguhnya butuh session key + relayer gas
  (2–3 hari kerja tambahan). Itu ditulis sebagai roadmap, bukan diklaim sudah ada.
- Frontend memakai polyfill (`Buffer`, `process`, `global`) karena NEAR SDK masih
  mengharapkan global Node.js.

---

## 9. Menjalankan sendiri (reproduksi)

### Prasyarat
- Node.js 20+ dan npm
- (Untuk build contract) Rust + target `wasm32-unknown-unknown`; di Windows paling
  mudah lewat WSL Ubuntu. Build butuh linker — di Windows native sering gagal.

### Frontend
```bash
# verifikasi on-chain tanpa wallet (paling cepat)
node scripts/verify.mjs

cd web
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # production build, harus exit 0
```

`web/vite.config.ts` mem-proxy `/near-rpc` ke `https://rpc.testnet.near.org`
supaya tidak kena CORS saat development.

### Contract (Rust → wasm)
```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
# output: target/wasm32-unknown-unknown/release/pasar_pagi.wasm
```

### Deploy + init (contoh dengan near-cli atau near-api-js)
```bash
near deploy pasar-pagi-17536.testnet \
  target/wasm32-unknown-unknown/release/pasar_pagi.wasm

near call pasar-pagi-17536.testnet new '{"owner_id":"pasar-pagi-17536.testnet"}' \
  --accountId pasar-pagi-17536.testnet
```

> Catatan: contract memakai `#[init(ignore_state)]`, jadi `new` bisa dipanggil ulang
> untuk reset state demo. Storage prefix di-scope ke `block_height` deploy supaya
> setiap deploy baru mulai dari hari 1 dengan state bersih.

---

## 10. Verifikasi on-chain (yang sudah terbukti)

| Uji | Hasil |
|---|---|
| Deploy + init | ✅ `pasar-pagi-17536.testnet` hidup, `get_world` balikin state lengkap |
| Register pemain | ✅ 100 koin awal, energi 100 |
| Kerja + beli + jual | ✅ koin bertambah, stok & harga bergerak |
| Fast-forward 40 hari | ✅ hari maju, event berganti |
| Bangkrut | ✅ kas NPC minus → toko tutup (`open: false`) |
| Investasi | ✅ pemain beli saham toko bangkrut → toko buka lagi |
| Bagi hasil 30% | ✅ payout muncul di log, koin pemain bertambah |

Contoh log nyata dari contract (hari 60–62):

```
Hari 60: bupasar tekor, kas minus 22 koin.
Hari 60: bupasar BANGKRUT dan tutup toko. Butuh investor.
Hari 61: Pabrik memproduksi 4 kain, 2 pakaian.
Hari 62: Pabrik memproduksi 4 kain, 2 pakaian.
```

---

## 11. Yang belum dikerjakan / roadmap

- Zero-popup login penuh (session key + relayer gas) — ditulis sebagai roadmap.
- Frontend belum punya halaman investasi khusus; investasi lewat aksi antrian.
- Belum ada leaderboard / pencapaian.
- Multi-pemain simultan belum diuji beban.

---

## 12. Dokumen lain

- `PRICING.md` — aturan harga NPC (wajib dibaca juri/AI).
- `GAME-LOOP.md` — rancangan loop 30 detik / 5 menit / 1 sesi.
- `TECHNICAL-DESIGN.md` — keputusan arsitektur dan trade-off.
- `DEMO.md` — skrip video demo + rencana post X.
