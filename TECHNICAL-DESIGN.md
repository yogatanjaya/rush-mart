# PASAR PAGI — Technical Design (v1, 6 Nov 2026)

Status: menunggu approval Sutradara sebelum scaffolding.
Deadline submission: **14 Nov 2026 23:59 UTC** (sisa ~8 hari).

---

## 1. Temuan teknis penting (hasil riset 6 Nov)

### Login email / sosial — ini yang paling krusial
NEAR **tidak punya** "Sign in with Google" native untuk dompet. Yang resmi dan paling dekat:

- **NEAR Connect** (`@hot-labs/near-connect`) — connector resmi, zero-dependency, sandboxed iframe.
- Wallet yang didukung: **Meteor Wallet** (instant link / email), HOT Wallet, Nightly, WalletConnect, dll.
- **Meteor Wallet App** = "instant link wallet" → user masuk lewat email/telegram, tanpa seed phrase.
- Untuk autentikasi bisa pakai **`signMessage`** (NEP-413): user tanda tangan pesan, tanpa transaksi, tanpa gas.

**Kesimpulan jujur:** requirement brief "no wallet popups, no gas prompts in the normal game loop" **tidak bisa 100% hilang** di wallet berbasis browser — setiap transaksi butuh persetujuan. Solusinya: **batching** — pemain menyetujui 1 transaksi per hari in-game (8 aksi sekaligus), bukan per klik. Popup jadi 1x per hari, bukan 8x. Fast-forward = 1 transaksi. Ini cukup untuk demo yang mulus.

Alternatif kalau mau benar-benar tanpa popup: session key / delegate access key (NEP-366 meta transaction) + relayer gas. Ini menambah 2-3 hari kerja. **Rekomendasi: jangan untuk MVP**, tulis sebagai roadmap.

### Toolchain
- Node v24.14.0 ✔, npm 11.9.0 ✔, git 2.54 ✔
- **Rust/cargo belum terpasang** → perlu `rustup` + `cargo-near` (atau build contract di VPS)
- Frontend bisa jalan lokal; contract deploy dari mesin ini atau VPS

---

## 2. Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind | cepat, ringan, gampang bikin kartun cerah |
| Chart harga | Recharts | grafik harga live buat fast-forward |
| Wallet | `@hot-labs/near-connect` + Meteor Wallet | login email, tanpa seed phrase |
| Contract | Rust + `near-sdk` 5.x | standar NEAR, NEP-245 tersedia |
| Toolchain | `cargo-near` | build & deploy gampang |
| Network | NEAR **testnet** | gratis, cukup untuk demo |
| Repo | monorepo: `contract/`, `web/`, `docs/` | satu repo = satu submission |

---

## 3. Desain contract

Satu contract: `pasar-pagi.<account>.testnet`

### State
```
items: { token_id -> ItemMeta {name, category, base_price} }   // NEP-245
balances: { (owner_id, token_id) -> u128 }                      // termasuk token "koin"
npcs: { npc_id -> Npc { account_id, cash, stock{}, params{}, bankrupt_days, open, profit_share{} } }
players: { account_id -> Player { coins?, energy, day_joined, shares{} } }
world: { day, event, price_history[], log[] }
```

Catatan: koin disimpan sebagai `token_id = "koin"` di NEP-245 yang sama → satu contract memegang semua item **dan** uang. Memenuhi requirement "one contract holds every item type" dan bikin settlement internal murah.

### Fungsi utama
- `new(items, npcs)` — init world, daftar NPC + akun NEAR mereka
- `register_player()` — kasih 100 koin + energi 100
- `play_day(actions: Vec<Action>)` — proses maks 8 aksi, majukan hari, jalankan `npc_tick()`
- `npc_tick()` — produksi, konsumsi warga, hitung ulang harga, cek bangkrut
- `invest(npc_id)` — bayar koin, dapat profit share 30%, toko buka lagi
- `fast_forward(days)` — simulasi N hari sekaligus, emit event
- View: `get_world()`, `get_prices()`, `get_npc(id)`, `get_player(id)`, `mt_balance_of`, `mt_metadata`
- NEP-245 core: `mt_transfer`, `mt_batch_transfer`, `mt_balance_of`, `mt_metadata`

### Aturan harga (readable file requirement)
File `contract/pricing.json` + `PRICING.md` di root repo. Contract memuat parameter dari JSON saat init. Tooltip dibangun dari field `reason` yang dikembalikan contract:
```
harga = base × (1 + demand_pressure) × (1 + scarcity) × (1 + season_event)
```
- demand_pressure: penjualan 3 hari terakhir vs rata-rata (0.0–0.8)
- scarcity: stok <20% → +0.6; >120% → −0.4
- season_event: gagal panen −0.5 supply / festival +0.8 demand / paceklik −0.3

### Event on-chain
`EVENT_JSON` untuk `price_changed`, `npc_bankrupt`, `invested`, `day_advanced` → dipakai frontend untuk grafik & log demo.

---

## 4. Auth flow (login email)

1. User klik **Masuk** → NEAR Connect modal
2. Pilih **Meteor Wallet** → masuk pakai email (instant link)
3. Setelah connect, frontend panggil `register_player()` sekali (1 approval)
4. Game jalan: aksi dikumpulkan lokal → **1 approval per hari** saat `play_day`
5. Fast-forward: 1 approval

Fallback kalau Meteor bermasalah saat demo: MyNearWallet / HOT Wallet (masih tanpa seed phrase di sisi user, wallet yang pegang).

---

## 5. NPC autonomy (biar sesuai brief "agent dengan dompet sendiri")

Dua pilihan, urut dari paling murah:

**A. NPC sebagai akun nyata + agent runner (rekomendasi)**
- Buat 4 akun testnet: `paktani`, `bupasar`, `busari`, `wargakota` (sub-account dari akun utama)
- Contract menyimpan saldo NEP-245 atas nama akun-akun itu → benar-benar dompet NPC sendiri
- Script Node kecil (`agents/runner.js`) memegang key NPC, tiap tick memanggil `npc_tick()` sebagai NPC tersebut → NPC benar-benar bertindak sendiri, bukan dev patch
- Biaya: 4 akun + sedikit NEAR testnet (gratis dari faucet)

**B. NPC logic di dalam contract**
- Contract yang menghitung, saldo NPC tetap atas nama akun NPC
- Lebih cepat, tapi "agent"nya kurang terasa nyata
- Fallback kalau waktu mepet

---

## 6. Struktur repo

```
pasar-pagi/
├── HACKATHON.md          # dari panitia (diserahkan ke agent)
├── README.md             # machine-readable: do X, see Y
├── PRICING.md            # aturan harga readable
├── contract/
│   ├── Cargo.toml
│   ├── src/lib.rs
│   └── pricing.json
├── agents/
│   └── runner.js         # NPC agent loop
├── web/
│   ├── src/App.tsx
│   ├── src/game/...
│   └── src/components/...
└── docs/
    ├── GAME-LOOP.md
    └── DEMO.md
```

---

## 7. Rencana 8 hari

| Hari | Target | Output yang bisa dicek |
|---|---|---|
| **6 Nov (hari ini)** | Install Rust + cargo-near, scaffold repo, contract NEP-245 kosong, deploy testnet | contract address hidup |
| **7 Nov** | Game logic: item, NPC state, harga, `play_day`, `npc_tick` | unit test + view method benar |
| **8 Nov** | Aksi pemain lengkap: kerja, beli, jual, invest, bangkrut | skenario 7 hari jalan di test |
| **9 Nov** | Frontend scaffold + login email + halaman pasar | bisa login & lihat harga |
| **10 Nov** | Wire aksi + tooltip alasan harga + grafik | loop main 1 hari selesai |
| **11 Nov** | Fast-forward + event mingguan + polish kartun | demo 60 detik jalan |
| **12 Nov** | README machine-readable + video + X post + deploy final | submission siap |
| **13–14 Nov** | Buffer, bug fix, submit lebih awal | submitted ✔ |

Catatan: submit **12 Nov**, jangan tunggu 14 Nov. Buffer 2 hari buat hal tak terduga.

---

## 8. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Login email Meteor rewel saat demo | Demo gagal | Fallback HOT/MyNearWallet; rekam video demo sebagai bukti |
| NEP-245 + game logic terlalu besar | Contract nggak selesai | Mulai dari satu item; tambah setelah loop jalan |
| Popup wallet tiap aksi | Loop nggak mulus | Batching 1 tx/hari; jelaskan di README |
| Rust belum terpasang | Blokir build | Install rustup sekarang; kalau gagal, build di VPS |
| Waktu habis | Nggak submit | Submit versi sederhana lebih awal (12 Nov), polish setelah |

---

## 9. Blocker yang butuh keputusan Bos Yoga

1. **Akun NEAR untuk prize payout.** Form submission wajib `nearAddress` (2–64 karakter). Hadiah dibayar dalam NEAR → sebaiknya **mainnet**. Belum punya? Bisa dibuat 5 menit via Meteor Wallet pakai email. Ini harus ada sebelum submit.
2. **Rust toolchain** — boleh aku install `rustup` + `cargo-near` di laptop ini? (~10 menit, ~1.5 GB)
3. **Repo publik** — pakai GitHub `Alvinagustus/...`? Submission butuh URL repo publik yang unik.

---

## 10. Yang aku butuh dari Sutradara sekarang

- [ ] Approve desain teknis ini (atau koreksi)
- [ ] Jawab 3 blocker di atas
- [ ] Bilang "gas" → aku mulai scaffolding + install toolchain
