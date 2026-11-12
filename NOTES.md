# NEAR Hackathon — Catatan Riset (5 Nov 2026)

## Status
- Bos Yoga tertarik ikut NEAR Hackathon, track: **Games With Real Economies** (`games`)
- Belum daftar/submit. Lanjut besok setelah riset sosmed.

## Fakta resmi (sumber: nearhackathon.com + HACKATHON.md + near-hackathon-prompt-examples)
- Hackathon mulai: **1 Nov 2026 00:00 UTC**
- Development selesai + submission tutup: **14 Nov 2026 23:59 UTC**
- Judging: **16–18 Nov 2026**, hasil diumumkan **≤18 Nov 2026 23:59 UTC**
- Prize per track: **$10K / $3K / $2K**; grand prize **$55K**, dibayar dalam NEAR
- Submission: web form di nearhackathon.com, **nggak perlu connect wallet**
- Boleh testnet-only; boleh di-publish ke mainnet; integrasi protokol lain **nggak wajib**
- Juri termasuk AI judges (Claude Code & Codex) → README harus "do X, see Y" machine-readable
- Ada `HACKATHON.md` resmi yang bisa diserahkan ke coding agent

## Track "games" — "the economy is the gameplay"
Bukan game+token reward. Ekonominya sendiri yang jadi gameplay:
- NPC = agent dengan dompet + inventory sendiri, harga dari stok & demand
- Aksi pemain menggerakkan harga (banjiri pasar besi → besi murah)
- Pedagang bisa bangkrut → tutup toko sampai ada yang invest
- Bonus kalau pemain nggak sadar ada chain

### Requirement teknis resmi (4 poin, jangan skip)
1. Item = **NEP-245 multi token** (satu contract semua jenis item)
2. **Social/email login** — no seed phrase, no wallet popup, no gas prompt di loop normal
3. **Aturan harga NPC di satu file readable** + tooltip alasan harga
4. **Fast-forward mode**: simulasikan seminggu trading dalam 1 menit

### Checkpoint resmi
Rancang game loop di kertas dulu: apa yang pemain lakukan tiap **30 detik / 5 menit / 1 sesi**. Baru koding.

## Komponen NEAR yang dipakai
- Smart contract Rust di NEAR (NEP-245) → item, stok NPC, saldo pemain
- Akun NEAR sungguhan untuk dompet NPC (bukan akun dev)
- Social login / account abstraction NEAR (cek: Fast Auth / Keypools / wallet selector — verifikasi docs terbaru)
- NEAR Intents (opsional, nilai plus)
- Testnet NEAR (gratis) untuk deploy + demo

## Pesaing di track games
- TreasureHunt
- Nims
- (cuma 2, ada 3 slot hadiah → peluang besar kalau demo meyakinkan)

## Strategi
Track terberat dari 13. Kunci: ekonomi yang **bisa didemokan dalam 60 detik**, bukan game seru berjam-jam.

### Scope MVP usulan
- 1 halaman web game sederhana (bukan 3D)
- 2–3 NPC pedagang
- 4–6 jenis item sebagai NEP-245
- Loop: kumpulkan → jual → harga bergerak
- 1 NPC bisa bangkrut + mekanisme investasi
- Tombol fast-forward seminggu
- Login email (chain invisible)
- Contract di testnet

## Link penting
- https://nearhackathon.com/
- https://nearhackathon.com/HACKATHON.md
- https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/09-games.md
- https://github.com/nearai/near-hackathon-prompt-examples/blob/main/00-setup.md
- https://github.com/near/NEPs/blob/master/neps/nep-0245.md
- https://github.com/near/agent-skills/tree/main/skills/near-dapp
- https://docs.near-intents.org/getting-started/what-are-intents
- NEAR Discord: https://discord.gg/nearprotocol
