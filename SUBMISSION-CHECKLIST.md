# CHECKLIST SUBMISSION — NEAR HACKATHON

> Sumber: `HACKATHON.md` resmi (https://nearhackathon.com/HACKATHON.md), dibaca 7 Nov 2026.
> **Baca ulang versi live sebelum submit** — tanggal dan aturan bisa berubah.
> Checklist ini netral konsep: berlaku untuk game apa pun yang kita bangun.

**Deadline: 2026-11-14 23:59 UTC. Satu submission per project. Tidak ada submit ulang.**

---

## 0. Fakta yang mengikat

| Item | Nilai |
|---|---|
| Window kode | 2026-10-19 → 2026-11-14 (commit lebih awal = baseline, tidak dinilai) |
| Development ends | 2026-11-14T23:59:00Z |
| Judging starts | 2026-11-16T00:00:00Z |
| Hasil diumumkan | paling lambat 2026-11-18T23:59:00Z |
| Submission API | `POST https://nearhackathon.com/api/applications` |
| Request changes | https://nearhackathon.com/request-changes |
| Hadiah | Dibayar NEAR ke alamat **mainnet** yang diisi di submission |

---

## 1. SYARAT SAH (kalau salah satu gagal → gugur)

- [ ] **Contract sendiri di NEAR** yang cocok dengan track (Q-011). Tidak ada integrasi wajib. Testnet diterima (Q-010).
- [ ] **Repo publik** sebelum 14 Nov 23:59 UTC. Private = juri tidak bisa buka = gugur.
- [ ] **File LICENSE** ada di root repo (MIT aman). Repo tetap publik selama judging (Q-014).
- [ ] **README bisa dibaca mesin** — Claude Code & Codex screening otomatis sebelum juri manusia (Q-017).
- [ ] **README punya langkah "do X → see Y"** yang bisa dieksekusi reviewer tanpa penjelasan tambahan.
- [ ] **Post demo publik di X** — ditulis & dipublish manusia. Wajib menyebut "NEAR HACKATHON", tag **@NEARProtocol** + **#NEARHackathon**, dengan video atau screenshot terlampir.
- [ ] **Satu submission per project.** Salah field → `/request-changes`, bukan submit ulang (409).
- [ ] **Satu email maksimal 2 project.** Kalau lebih dari satu project, tiap README wajib menyebut project lainnya (Q-015).

---

## 2. Field submission (semua wajib, jangan dikarang)

| Field | Aturan |
|---|---|
| `requestId` | UUID, dibuat **sekali**, dipakai ulang saat retry |
| `projectName` | 2–80 karakter |
| `leadName` | 2–80 karakter |
| `email` | valid, maks 160 karakter |
| `size` | persis salah satu: `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` |
| `tracks` | array, satu atau lebih dari: `defi`, `thesis`, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`, `memecoins`, `social`, `open` |
| `nearAddress` | **mainnet**, lowercase, 2–64 karakter, cocok regex `^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$` |
| `projectUrl` | URL repo publik, maks 300 karakter, unik (satu repo = satu submission) |
| `demoUrl` | URL post demo publik, maks 300 karakter |
| `idea` | 20–2000 karakter: masalah, produk, peran NEAR |
| `consent` | `true`, hanya setelah manusia setuju notice yang dibacakan verbatim |

**Jebakan:** field `website` adalah spam trap — nilai apa pun selain kosong = submission ditolak. Jangan kirim field tambahan apa pun.

---

## 3. Kualitas yang dinilai (bukan syarat sah, tapi menentukan skor)

- [ ] **Satu momen lengkap di demo** — dari aksi user nyata ke hasil yang kelihatan. Bukan slide arsitektur, bukan intro panjang.
- [ ] **Peran NEAR dijelaskan konkret** — apa yang NEAR memungkinkan di produk ini dan kenapa itu penting. Bukan "powered by NEAR".
- [ ] **Loop game yang jelas** — untuk track `games`: dinilai dari game loop, bukan token. Bonus kalau pemain tidak sadar sedang pakai chain.
- [ ] **Ekonomi berevolusi tanpa dev patch** — NPC berdompet, pasar milik pemain, harga bergerak sendiri.
- [ ] **Bisa didemokan dalam ~60 detik** tanpa dijelaskan panjang.
- [ ] **Satu mekanik pembeda** yang bikin juri bilang "oh, ini beda".
- [ ] **Testnet-only aman** — jangan klaim mainnet kalau belum ada.

---

## 4. README — struktur yang lolos screening mesin

- [ ] Judul + satu kalimat: produk ini apa.
- [ ] Masalah yang diselesaikan (2–3 kalimat, bahasa manusia).
- [ ] Cara mencoba: langkah bernomor `do X → see Y`, bisa dijalankan reviewer.
- [ ] Satu perintah verifikasi read-only yang jalan **tanpa wallet dan tanpa secret key**.
- [ ] Arsitektur singkat: contract apa, di network apa, alamatnya apa.
- [ ] Bagian jujur: apa yang sudah jalan, apa yang belum (mis. approval per hari, bukan zero-popup).
- [ ] Daftar library/template/boilerplate/AI code yang dipakai (Q-005).
- [ ] Kalau ada kode pre-hackathon: tautan diff / branch / tag (Q-003).
- [ ] Kalau produk sudah ada di chain lain: disclose (Q-002).
- [ ] Tanpa marketing language, tanpa klaim yang tidak terbukti di kode.

---

## 5. Repo — kerapian yang dicek reviewer

- [ ] `.gitignore` benar; **tidak ada secret key, seed phrase, atau file `.json` berisi private key** di repo.
- [ ] Build dari nol berhasil di mesin bersih (bukan cuma di laptop kita).
- [ ] Alamat contract yang dipakai di frontend ada di satu tempat (config), bukan tersebar.
- [ ] Screenshot atau GIF di README (bonus, bukan wajib).
- [ ] Repo publik & URL-nya benar sebelum submit.

---

## 6. Demo video — durasi 60–90 detik

- [ ] Mulai dari halaman yang **sudah terbuka** — jangan mulai dari layar login kosong.
- [ ] Tunjukkan kondisi awal yang sehat (bukan state yang sudah bangkrut berantakan).
- [ ] Satu aksi user → hasil yang kelihatan (angka berubah, event muncul).
- [ ] Tunjukkan mekanik pembeda game (satu momen yang bikin "beda").
- [ ] Tidak ada secret key, OTP, atau data pribadi di frame.
- [ ] Video di-upload publik (X native / YouTube unlisted juga OK) dan tautannya masuk post X.

---

## 7. Post X — isi wajib

- [ ] Menyebut project dibuat di **NEAR HACKATHON**.
- [ ] Tag **@NEARProtocol**.
- [ ] Hashtag **#NEARHackathon**.
- [ ] Opsional: @NearLegion, @NearBuilders.
- [ ] Video atau screenshot terlampir.
- [ ] Baris pertama menjelaskan **masalah user**, bisa dipahami orang yang belum tahu project-nya.
- [ ] Menyebut peran NEAR secara konkret.
- [ ] Ada tautan demo + repo, dan ajakan feedback yang genuine.

---

## 8. Urutan eksekusi (biar tidak ada yang kelewat)

1. [ ] Konsep final + satu mekanik pembeda dikunci.
2. [ ] Contract dibangun & dites di testnet.
3. [ ] Frontend jalan, baca data on-chain.
4. [ ] README + LICENSE + skrip verifikasi read-only.
5. [ ] Uji alur penuh manual (login → aksi → hasil).
6. [ ] Repo dibuat publik.
7. [ ] Rekam video demo.
8. [ ] Post di X (oleh manusia) → simpan URL.
9. [ ] Susun payload submission → **print penuh** → manusia konfirmasi.
10. [ ] Submit `POST /api/applications` → simpan `requestId`.
11. [ ] Kalau ada salah field → `/request-changes`, **jangan submit ulang**.

---

## 9. Hal yang TIDAK boleh dilakukan agent tanpa izin eksplisit manusia

- Mengirim submission (payload harus dicetak & dikonfirmasi dulu)
- Posting apa pun di X atau media sosial lain
- Membuat repo publik, push, atau force-push
- Menandatangani transaksi, membelanjakan token, deploy ke mainnet
- Commit secret ke repo
