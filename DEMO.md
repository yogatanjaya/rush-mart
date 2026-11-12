# DEMO.md — Skrip Video Demo + Rencana Post X

Dokumen ini berisi (1) skrip video demo 90 detik, (2) checklist rekaman,
(3) konten post X (Twitter), dan (4) hal-hal yang **tidak** boleh muncul di video.

Deadline submission: **14 Nov 2026 23:59 UTC**.

---

## 1. Skrip video demo (target 90 detik, tanpa suara wajib — pakai teks overlay)

Format: screen recording 1080p, browser full screen, zoom 110% biar teks kebaca.
Kalimat di bawah = teks overlay / narasi. Durasi kira-kira.

### 0:00–0:08 — Hook (tanpa klik apa pun)

> **Teks:** "Game ekonomi biasanya cuma tempel token di atas game biasa."
> **Teks:** "Di Pasar Pagi, ekonominya sendiri yang jadi gameplay."
> **Teks:** "Semua angka di layar ini live dari NEAR testnet."

Tampilkan halaman utama. Sorot angka Hari, harga, dan daftar NPC.
**Jangan** mulai dari halaman login — mulai dari bukti bahwa ini hidup.

### 0:08–0:20 — Bukti on-chain (hover harga)

> **Teks:** "Harga bukan angka hardcoded. Ini alasan kenapa harga berubah."

Hover ke harga **Beras** → tooltip muncul: "Harga dasar 10 koin. Stok tipis … +60%. Harga sekarang 16 koin."
Klik pelan-pelan biar tooltip sempat kebaca. Pindah hover ke **Makanan Jadi** → tooltip lain.
> **Teks:** "Aturan lengkapnya ada di satu file: PRICING.md."

### 0:20–0:32 — Login email (chain invisible)

> **Teks:** "Pemain masuk pakai email. Tanpa seed phrase."

Klik **Masuk** → panel login → **Lanjut dengan Meteor Wallet** → tampilkan layar email/OTP
(blur atau potong bagian kode verifikasi — jangan tampilkan kode asli).
Setelah masuk: nama akun muncul di kanan atas.
> **Teks:** "Wallet NEAR aktif, tapi pemain tidak perlu tahu itu."

### 0:32–0:45 — Daftar + antri aksi (satu approval)

> **Teks:** "Daftar gratis: 100 koin, energi 100."

Klik **Daftar jadi warga**. Lalu antrikan 3 aksi tanpa menyetujui apa pun:
1. **Kerja** (dapat upah)
2. **Beli Beras ×2**
3. **Jual Beras ×1**

> **Teks:** "Semua aksi dikirim dalam SATU persetujuan — bukan satu popup per klik."

Klik **Jalankan hari** → satu approval wallet → hari maju, koin dan stok berubah.
Tunjukkan angka sebelum/sesudah (misal 100 → 109 koin).

### 0:45–1:05 — Bangkrut (bagian yang bikin juri ingat)

> **Teks:** "Sekarang bagian yang biasanya tidak ada di game crypto."

Klik **Fast-forward 7 hari** (atau lebih) → satu approval.
Tunggu state update. Sorot NPC yang **tutup** dan kas minus:
> **Teks:** "Bu Pasar bangkrut. Kas minus. Toko tutup."

Buka log pasar → tunjukkan baris:
`Hari 60: bupasar BANGKRUT dan tutup toko. Butuh investor.`
> **Teks:** "Toko bangkrut bukan game over — ini peluang."

### 1:05–1:20 — Investasi + bagi hasil

> **Teks:** "Suntik modal, toko buka lagi, pemain dapat 30% bagi hasil."

Antrikan aksi **Invest** ke `bupasar` → Jalankan hari → toko `open: true` lagi, saham pemain muncul.
Fast-forward beberapa hari → tunjukkan **payout masuk ke koin pemain** dan entri log
"bagi hasil … koin ke … dari bupasar".

### 1:20–1:30 — Penutup

> **Teks:** "Kerja → belanja → pedagang untung → restock → kerja lagi."
> **Teks:** "Roda kehidupan. Di NEAR. Semua on-chain."
> **Teks:** "Pasar Pagi — NEAR Hackathon 2026."

Tampilkan grafik harga 7 hari terakhir sebagai bukti ekonomi bergerak sendiri.

---

## 2. Checklist rekaman

- [ ] Rekam 1080p (bukan 720p), browser zoom ~110%.
- [ ] State kontrak bersih / hari rendah supaya harga belum ekstrem. Kalau perlu, deploy ulang
      dulu (lihat README bagian 9) lalu jalankan video.
- [ ] Pastikan **tidak ada secret key, recovery phrase, atau kode OTP** yang terlihat.
      Tutup tab terminal yang menampilkan key.
- [ ] Satu take penuh lebih baik daripada potongan — juri menghargai demo yang jujur.
      Kalau ada bagian lambat (transaksi), potong dengan timelapse atau voiceover.
- [ ] Video ≤ 3 menit. Target 90 detik.
- [ ] Upload ke YouTube (unlisted) atau X langsung. Simpan URL-nya untuk form submission.
- [ ] Sertakan video/GIF pendek (≤ 15 detik) untuk post X — potongan bagian bangkrut/investasi.

---

## 3. Konten post X (Twitter)

Wajib: tag **@NEARProtocol** dan pakai **#NEARHackathon**. Tambahkan link repo + video.

### Post utama (≤ 280 karakter)

```
Kami bikin Pasar Pagi untuk #NEARHackathon.

Bukan game yang ditempeli token — ekonominya sendiri yang jadi gameplay.

Kerja → belanja → pedagang untung → restock → kerja lagi.
Toko bisa BANGKRUT, dan kamu bisa invest buat buka lagi.

Semua on-chain di @NEARProtocol. 🧵👇
```

### Thread (4 post)

**1/4**
```
Roda kehidupan sehari-hari: petani, pedagang, rumah makan, pabrik, warga pekerja.

Semua NPC punya dompet + stok sendiri di NEAR testnet.
Harga naik kalau stok tipis. Turun kalau menumpuk.
```

**2/4**
```
Aksi pemain benar-benar menggeser harga.
Banjiri pasar dengan beras → beras jadi murah.
Ini yang kami maksud "the economy is the gameplay".
```

**3/4**
```
Salah kelola = bangkrut. Bu Pasar kas minus, toko tutup.

Tapi bangkrut bukan game over: suntik modal, toko buka lagi, dapat 30% bagi hasil.
```

**4/4**
```
Item pakai NEP-245 (satu contract, semua jenis barang).
Login pakai email lewat Meteor Wallet — tanpa seed phrase.
Semua aksi satu hari = satu approval.

Demo 90 detik + repo: [LINK]
@NEARProtocol #NEARHackathon
```

### Alternatif post pendek (kalau thread terlalu panjang)

```
Pasar Pagi: game di mana uang benar-benar berputar.

Pekerja dapat upah → belanja → pedagang untung → restock.
Toko bangkrut? Kamu bisa jadi investor dan dapat bagi hasil.

Semua on-chain di NEAR testnet. #NEARHackathon @NEARProtocol
[LINK VIDEO]
```

---

## 4. Jangan tampilkan di video/post

- Secret key, recovery phrase, atau isi file `v3.json` / `v5.json`.
- Alamat email lengkap pemain (blur/sensor).
- Kode OTP dari inbox.
- Klaim "zero popup" — yang benar: **satu approval per hari in-game**.
- Klaim "mainnet" — contract demo ada di **testnet**.
- Angka hasil yang tidak ada di layar (jangan baca angka karangan).

---

## 5. Urutan eksekusi sebelum deadline

1. Rekam video (90 detik) → upload → simpan URL.
2. Post X + thread → simpan URL post.
3. Isi form submission di nearhackathon.com (ingat: **jangan isi field `website`** kalau
   form-nya tidak mewajibkan; ikuti aturan di `HACKATHON.md`).
4. Tempel URL repo GitHub + URL video + URL post X.
5. Screenshot konfirmasi submission sebagai bukti.
