// Pasar Pagi — asset generator.
// Semua gambar dibuat sebagai SVG supaya bisa diedit kapan saja (teks biasa),
// tanpa perlu Photoshop/Figma. Jalankan: node scripts/gen-assets.mjs
//
// Ganti warna/ukuran di sini, jalankan ulang, aset di public/assets/ ter-update.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OUT = join(process.cwd(), "public", "assets");
mkdirSync(OUT, { recursive: true });

const write = (name, svg) => {
  const p = join(OUT, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, svg.trim() + "\n", "utf8");
  console.log("wrote", name);
};

// ─── Palet (satu tempat, gampang diganti) ──────────────────────────────────
const C = {
  soil: "#a9784f",
  soilDark: "#8a5f3c",
  soilLight: "#c2946a",
  grass: "#8fc46a",
  grassDark: "#6da34d",
  wood: "#c08a4e",
  woodDark: "#8d5722",
  leaf: "#4e9a3c",
  leafLight: "#6fbb52",
  corn: "#f6c945",
  tomato: "#e14b3b",
  carrot: "#e88a2c",
  potato: "#c08a4e",
  skin: "#f6c9a0",
  hair: "#6b4226",
  shirt: "#ffffff",
  overall: "#4e9a3c",
  hat: "#f2d78a",
  hatDark: "#d9b862",
  boot: "#6b4226",
  outline: "#2b1d0e",
};

// ─── Tanah / lantai ────────────────────────────────────────────────────────
// Tile tanah 64×64 dengan bintik-bintik kecil biar tidak flat.
write(
  "tile-soil.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${C.soil}"/>
  <circle cx="12" cy="14" r="2.2" fill="${C.soilDark}" opacity=".55"/>
  <circle cx="40" cy="9" r="1.6" fill="${C.soilLight}" opacity=".7"/>
  <circle cx="56" cy="26" r="2.4" fill="${C.soilDark}" opacity=".45"/>
  <circle cx="24" cy="38" r="2" fill="${C.soilLight}" opacity=".6"/>
  <circle cx="48" cy="50" r="2.6" fill="${C.soilDark}" opacity=".5"/>
  <circle cx="9" cy="52" r="1.8" fill="${C.soilLight}" opacity=".55"/>
  <circle cx="32" cy="60" r="1.6" fill="${C.soilDark}" opacity=".4"/>
</svg>`
);

write(
  "tile-grass.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${C.grass}"/>
  <path d="M10 46c2-6 4-6 6 0" stroke="${C.grassDark}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M26 30c2-6 4-6 6 0" stroke="${C.grassDark}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M44 52c2-6 4-6 6 0" stroke="${C.grassDark}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="18" cy="18" r="2" fill="${C.grassDark}" opacity=".35"/>
  <circle cx="52" cy="22" r="2" fill="${C.grassDark}" opacity=".3"/>
</svg>`
);

// ─── Lahan (bedengan) — dasar tempat 9 slot ────────────────────────────────
// 300×240: bingkai kayu + tanah gembur. Slot digambar terpisah oleh Phaser.
write(
  "plot-bed.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="240" viewBox="0 0 300 240">
  <!-- bingkai kayu tebal: papan luar + papan dalam -->
  <rect x="0" y="0" width="300" height="240" rx="12" fill="${C.woodDark}"/>
  <rect x="3" y="3" width="294" height="234" rx="10" fill="${C.wood}"/>
  <rect x="12" y="12" width="276" height="216" rx="7" fill="${C.soilDark}"/>
  <rect x="18" y="18" width="264" height="204" rx="5" fill="${C.soil}"/>
  <!-- garis bedengan: 3 kolom x 3 baris -->
  <g stroke="${C.soilDark}" stroke-width="2.5" opacity=".55" stroke-linecap="round">
    <path d="M106 26v188"/><path d="M194 26v188"/>
    <path d="M26 86h248"/><path d="M26 154h248"/>
  </g>
  <!-- bintik tanah gembur -->
  <g fill="${C.soilLight}" opacity=".45">
    <circle cx="55" cy="52" r="2.4"/><circle cx="150" cy="40" r="2"/>
    <circle cx="240" cy="66" r="2.2"/><circle cx="80" cy="120" r="2"/>
    <circle cx="205" cy="132" r="2.4"/><circle cx="130" cy="196" r="2.2"/>
    <circle cx="260" cy="188" r="2"/>
  </g>
  <!-- paku sudut -->
  <circle cx="10" cy="10" r="3.4" fill="${C.woodDark}"/>
  <circle cx="290" cy="10" r="3.4" fill="${C.woodDark}"/>
  <circle cx="10" cy="230" r="3.4" fill="${C.woodDark}"/>
  <circle cx="290" cy="230" r="3.4" fill="${C.woodDark}"/>
</svg>`
);

// ─── Pagar kayu — potongan horizontal 80×40 ────────────────────────────────
write(
  "fence.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40">
  <rect x="0" y="14" width="80" height="7" fill="${C.wood}"/>
  <rect x="0" y="25" width="80" height="6" fill="${C.wood}"/>
  <rect x="6" y="6" width="9" height="30" rx="2" fill="${C.woodDark}"/>
  <rect x="38" y="4" width="9" height="32" rx="2" fill="${C.woodDark}"/>
  <rect x="68" y="6" width="9" height="30" rx="2" fill="${C.woodDark}"/>
  <rect x="6" y="6" width="9" height="3" fill="${C.wood}"/>
  <rect x="38" y="4" width="9" height="3" fill="${C.wood}"/>
  <rect x="68" y="6" width="9" height="3" fill="${C.wood}"/>
</svg>`
);

// ─── Gudang kecil ──────────────────────────────────────────────────────────
write(
  "shed.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="120" viewBox="0 0 140 120">
  <rect x="14" y="52" width="112" height="62" rx="4" fill="${C.wood}"/>
  <rect x="14" y="52" width="112" height="8" fill="${C.woodDark}"/>
  <path d="M4 56 L70 14 L136 56 Z" fill="${C.woodDark}"/>
  <path d="M14 56 L70 22 L126 56 Z" fill="${C.wood}"/>
  <rect x="56" y="72" width="30" height="42" rx="3" fill="${C.woodDark}"/>
  <circle cx="80" cy="94" r="2.4" fill="${C.hatDark}"/>
  <rect x="22" y="64" width="22" height="18" rx="2" fill="#bfe0f0" opacity=".8"/>
  <rect x="96" y="64" width="22" height="18" rx="2" fill="#bfe0f0" opacity=".8"/>
</svg>`
);

// ─── Tanaman: 4 jenis × 3 tahap ────────────────────────────────────────────
// Ukuran tiap gambar 90×90, titik tumbuh di tengah-bawah (pivot 0.5, 0.95).
const crops = {
  jagung: { buah: C.corn, daun: C.leafLight, daunTua: C.leaf },
  tomat: { buah: C.tomato, daun: C.leafLight, daunTua: C.leaf },
  wortel: { buah: C.carrot, daun: C.leafLight, daunTua: C.leaf },
  kentang: { buah: C.potato, daun: C.leafLight, daunTua: C.leaf },
};

const stageSvg = (type, stage) => {
  const c = crops[type];
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">`;

  if (stage === 1) {
    // tunas kecil: dua daun muda
    return `${head}
  <ellipse cx="45" cy="82" rx="16" ry="4" fill="${C.soilDark}" opacity=".35"/>
  <path d="M45 84 L45 62" stroke="${c.daunTua}" stroke-width="3" stroke-linecap="round"/>
  <path d="M45 68 C36 62 30 64 27 70 C34 73 41 71 45 68 Z" fill="${c.daun}"/>
  <path d="M45 64 C54 58 60 60 63 66 C56 69 49 67 45 64 Z" fill="${c.daunTua}"/>
</svg>`;
  }

  if (stage === 2) {
    // sedang: batang tinggi, daun banyak, belum berbuah
    return `${head}
  <ellipse cx="45" cy="84" rx="20" ry="5" fill="${C.soilDark}" opacity=".35"/>
  <path d="M45 86 L45 40" stroke="${c.daunTua}" stroke-width="4" stroke-linecap="round"/>
  <path d="M45 76 C33 70 25 73 21 80 C30 84 39 81 45 76 Z" fill="${c.daun}"/>
  <path d="M45 76 C57 70 65 73 69 80 C60 84 51 81 45 76 Z" fill="${c.daunTua}"/>
  <path d="M45 62 C34 56 26 59 22 66 C31 70 40 67 45 62 Z" fill="${c.daun}"/>
  <path d="M45 62 C56 56 64 59 68 66 C59 70 50 67 45 62 Z" fill="${c.daunTua}"/>
  <path d="M45 50 C37 45 31 47 28 53 C35 56 42 54 45 50 Z" fill="${c.daun}"/>
  <path d="M45 50 C53 45 59 47 62 53 C55 56 48 54 45 50 Z" fill="${c.daunTua}"/>
</svg>`;
  }

  // stage 3: siap panen
  if (type === "jagung") {
    return `${head}
  <ellipse cx="45" cy="84" rx="20" ry="5" fill="${C.soilDark}" opacity=".35"/>
  <path d="M45 86 L45 34" stroke="${c.daunTua}" stroke-width="4" stroke-linecap="round"/>
  <path d="M45 78 C32 72 24 75 20 82 C29 86 38 83 45 78 Z" fill="${c.daun}"/>
  <path d="M45 78 C58 72 66 75 70 82 C61 86 52 83 45 78 Z" fill="${c.daunTua}"/>
  <path d="M45 58 C34 52 26 55 22 62 C31 66 40 63 45 58 Z" fill="${c.daun}"/>
  <path d="M45 58 C56 52 64 55 68 62 C59 66 50 63 45 58 Z" fill="${c.daunTua}"/>
  <ellipse cx="45" cy="46" rx="9" ry="15" fill="${c.buah}"/>
  <path d="M45 34 q6 4 3 12" stroke="${C.leaf}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="42" cy="42" r="1.4" fill="#ffffff" opacity=".5"/>
  <circle cx="48" cy="50" r="1.2" fill="#ffffff" opacity=".4"/>
</svg>`;
  }

  if (type === "tomat") {
    return `${head}
  <ellipse cx="45" cy="84" rx="20" ry="5" fill="${C.soilDark}" opacity=".35"/>
  <path d="M45 86 L45 42" stroke="${c.daunTua}" stroke-width="4" stroke-linecap="round"/>
  <path d="M45 76 C32 70 24 73 20 80 C29 84 38 81 45 76 Z" fill="${c.daun}"/>
  <path d="M45 76 C58 70 66 73 70 80 C61 84 52 81 45 76 Z" fill="${c.daunTua}"/>
  <path d="M45 56 C34 50 26 53 22 60 C31 64 40 61 45 56 Z" fill="${c.daun}"/>
  <path d="M45 56 C56 50 64 53 68 60 C59 64 50 61 45 56 Z" fill="${c.daunTua}"/>
  <circle cx="34" cy="62" r="7" fill="${c.buah}"/>
  <circle cx="56" cy="64" r="7" fill="${c.buah}"/>
  <circle cx="45" cy="52" r="7" fill="${c.buah}"/>
  <circle cx="32" cy="59" r="2" fill="#ffffff" opacity=".55"/>
  <circle cx="54" cy="61" r="2" fill="#ffffff" opacity=".5"/>
</svg>`;
  }

  if (type === "wortel") {
    return `${head}
  <ellipse cx="45" cy="84" rx="20" ry="5" fill="${C.soilDark}" opacity=".35"/>
  <path d="M45 80 L45 46" stroke="${c.daunTua}" stroke-width="4" stroke-linecap="round"/>
  <path d="M45 72 C33 66 25 69 21 76 C30 80 39 77 45 72 Z" fill="${c.daun}"/>
  <path d="M45 72 C57 66 65 69 69 76 C60 80 51 77 45 72 Z" fill="${c.daunTua}"/>
  <path d="M45 56 C35 50 27 53 23 60 C32 64 41 61 45 56 Z" fill="${c.daun}"/>
  <path d="M45 56 C55 50 63 53 67 60 C58 64 49 61 45 56 Z" fill="${c.daunTua}"/>
  <path d="M45 46 L38 76 Q45 82 52 76 Z" fill="${c.buah}"/>
  <path d="M41 58 h8 M42 66 h6" stroke="${C.soilDark}" stroke-width="1.6" opacity=".5"/>
</svg>`;
  }

  // kentang
  return `${head}
  <ellipse cx="45" cy="84" rx="20" ry="5" fill="${C.soilDark}" opacity=".35"/>
  <path d="M45 78 L45 44" stroke="${c.daunTua}" stroke-width="4" stroke-linecap="round"/>
  <path d="M45 70 C33 64 25 67 21 74 C30 78 39 75 45 70 Z" fill="${c.daun}"/>
  <path d="M45 70 C57 64 65 67 69 74 C60 78 51 75 45 70 Z" fill="${c.daunTua}"/>
  <path d="M45 54 C36 48 28 51 24 58 C33 62 42 59 45 54 Z" fill="${c.daun}"/>
  <path d="M45 54 C54 48 62 51 66 58 C57 62 48 59 45 54 Z" fill="${c.daunTua}"/>
  <ellipse cx="34" cy="74" rx="8" ry="6" fill="${c.buah}"/>
  <ellipse cx="56" cy="76" rx="7" ry="5.5" fill="${c.buah}"/>
  <circle cx="31" cy="72" r="1.3" fill="${C.soilDark}" opacity=".55"/>
  <circle cx="37" cy="77" r="1.2" fill="${C.soilDark}" opacity=".45"/>
  <circle cx="54" cy="74" r="1.2" fill="${C.soilDark}" opacity=".5"/>
</svg>`;
};

for (const type of Object.keys(crops)) {
  for (const stage of [1, 2, 3]) {
    write(`crop-${type}-${stage}.svg`, stageSvg(type, stage));
  }
}

// ─── Karakter pemain — top-down, 4 arah × 2 frame jalan ────────────────────
// Kanvas 64×80. Top-down: yang terlihat dari atas = topi lebar + bahu + lengan.
const playerSvg = (dir, frame) => {
  const bob = frame === 2 ? 1 : 0; // naik-turun halus saat jalan
  const armSwing = frame === 2 ? 3 : -3;
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">`;

  if (dir === "down" || dir === "up") {
    // tampak dari atas-belakang: topi lebar menutupi kepala, dua lengan di samping
    return `${head}
  <ellipse cx="32" cy="74" rx="16" ry="5" fill="#000000" opacity=".18"/>
  <!-- lengan -->
  <rect x="${6 + armSwing}" y="${44 + bob}" width="9" height="20" rx="4.5" fill="${C.shirt}" stroke="${C.outline}" stroke-width="2"/>
  <rect x="${49 - armSwing}" y="${44 + bob}" width="9" height="20" rx="4.5" fill="${C.shirt}" stroke="${C.outline}" stroke-width="2"/>
  <!-- overall / badan -->
  <path d="M20 ${42 + bob} h24 v22 q0 6 -6 6 h-12 q-6 0 -6 -6 Z" fill="${C.overall}" stroke="${C.outline}" stroke-width="2"/>
  <path d="M28 ${42 + bob} h8 v10 h-8 Z" fill="${C.shirt}" stroke="${C.outline}" stroke-width="1.6"/>
  <!-- topi jerami lebar (paling atas) -->
  <ellipse cx="32" cy="${30 + bob}" rx="22" ry="14" fill="${C.hat}" stroke="${C.outline}" stroke-width="2"/>
  <ellipse cx="32" cy="${27 + bob}" rx="12" ry="8" fill="${C.hatDark}" stroke="${C.outline}" stroke-width="2"/>
  <!-- poni / rambut keluar dari bawah topi -->
  <path d="M18 ${32 + bob} q4 8 6 10" stroke="${C.hair}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M46 ${32 + bob} q-4 8 -6 10" stroke="${C.hair}" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;
  }

  if (dir === "right") {
    return `${head}
  <ellipse cx="32" cy="74" rx="15" ry="5" fill="#000000" opacity=".18"/>
  <!-- lengan belakang -->
  <rect x="${22 - armSwing}" y="${46 + bob}" width="8" height="18" rx="4" fill="${C.shirt}" stroke="${C.outline}" stroke-width="2"/>
  <!-- badan -->
  <path d="M22 ${42 + bob} h20 v22 q0 6 -5 6 h-10 q-5 0 -5 -6 Z" fill="${C.overall}" stroke="${C.outline}" stroke-width="2"/>
  <!-- lengan depan -->
  <rect x="${34 + armSwing}" y="${46 + bob}" width="9" height="19" rx="4.5" fill="${C.shirt}" stroke="${C.outline}" stroke-width="2"/>
  <!-- topi miring (profil) -->
  <ellipse cx="32" cy="${30 + bob}" rx="21" ry="12" fill="${C.hat}" stroke="${C.outline}" stroke-width="2"/>
  <ellipse cx="32" cy="${27 + bob}" rx="11" ry="7" fill="${C.hatDark}" stroke="${C.outline}" stroke-width="2"/>
  <!-- ponytail di belakang -->
  <path d="M13 ${34 + bob} q-7 6 -4 13 q4 3 7 -2" fill="${C.hair}" stroke="${C.outline}" stroke-width="2"/>
</svg>`;
  }

  // left = cermin dari right
  return `${head}
  <ellipse cx="32" cy="74" rx="15" ry="5" fill="#000000" opacity=".18"/>
  <rect x="${48 - armSwing}" y="${46 + bob}" width="8" height="18" rx="4" fill="${C.shirt}" stroke="${C.outline}" stroke-width="2"/>
  <path d="M22 ${42 + bob} h20 v22 q0 6 -5 6 h-10 q-5 0 -5 -6 Z" fill="${C.overall}" stroke="${C.outline}" stroke-width="2"/>
  <rect x="${21 + armSwing}" y="${46 + bob}" width="9" height="19" rx="4.5" fill="${C.shirt}" stroke="${C.outline}" stroke-width="2"/>
  <ellipse cx="32" cy="${30 + bob}" rx="21" ry="12" fill="${C.hat}" stroke="${C.outline}" stroke-width="2"/>
  <ellipse cx="32" cy="${27 + bob}" rx="11" ry="7" fill="${C.hatDark}" stroke="${C.outline}" stroke-width="2"/>
  <path d="M51 ${34 + bob} q7 6 4 13 q-4 3 -7 -2" fill="${C.hair}" stroke="${C.outline}" stroke-width="2"/>
</svg>`;
};

for (const dir of ["down", "up", "left", "right"]) {
  for (const frame of [1, 2]) {
    write(`player-${dir}-${frame}.svg`, playerSvg(dir, frame));
  }
}

// ─── Ikon kecil untuk HUD / item ───────────────────────────────────────────
const icons = {
  corn: `<path d="M12 4 q7 4 4 12 q-2 6 -4 6 q-2 0 -4 -6 q-3 -8 4 -12 Z" fill="${C.corn}" stroke="${C.outline}" stroke-width="1.4"/><path d="M12 4 v16" stroke="#c9a227" stroke-width="1.2"/>`,
  tomato: `<circle cx="12" cy="14" r="7" fill="${C.tomato}" stroke="${C.outline}" stroke-width="1.4"/><path d="M12 7 q3 -3 5 -1 M12 7 q-3 -3 -5 -1" stroke="${C.leaf}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  carrot: `<path d="M12 5 L7 19 q5 4 10 0 Z" fill="${C.carrot}" stroke="${C.outline}" stroke-width="1.4"/><path d="M12 5 q4 -4 6 -1 M12 5 q-4 -4 -6 -1" stroke="${C.leaf}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  potato: `<ellipse cx="12" cy="14" rx="8" ry="6" fill="${C.potato}" stroke="${C.outline}" stroke-width="1.4"/><circle cx="9" cy="12" r="1.2" fill="${C.soilDark}"/><circle cx="14" cy="16" r="1.1" fill="${C.soilDark}"/>`,
  seed: `<path d="M12 4 C17 8 18 14 12 20 C6 14 7 8 12 4 Z" fill="${C.leaf}" stroke="${C.outline}" stroke-width="1.4"/><path d="M12 8 v9" stroke="${C.leafLight}" stroke-width="1.4"/>`,
  coin: `<circle cx="12" cy="12" r="9" fill="#f6c945" stroke="${C.outline}" stroke-width="1.6"/><circle cx="12" cy="12" r="6" fill="#f2d78a"/><text x="12" y="16" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="#8a5f3c">$</text>`,
};

for (const [k, body] of Object.entries(icons)) {
  write(
    `icon-${k}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body}</svg>`
  );
}


// ─── Lantai minimarket — keramik krem 64×64 ────────────────────────────────
write(
  "tile-floor.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#f6e3c8"/>
  <path d="M0 32 H64" stroke="#e8d2b0" stroke-width="2"/>
  <path d="M32 0 V64" stroke="#e8d2b0" stroke-width="2"/>
  <path d="M0 1 H64" stroke="#fff6e6" stroke-width="1" opacity=".7"/>
  <path d="M1 0 V64" stroke="#fff6e6" stroke-width="1" opacity=".7"/>
  <circle cx="12" cy="12" r="1.4" fill="#e0c9a6" opacity=".45"/>
  <circle cx="50" cy="46" r="1.2" fill="#e0c9a6" opacity=".4"/>
</svg>`
);

// ─── Rak kayu kosong — 3×3 slot, 220×130 ───────────────────────────────────
// Sembilan kotak kosong; Phaser menaruh gambar sayur di atasnya nanti.
write(
  "shelf.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="130" viewBox="0 0 220 130">
  <rect x="0" y="0" width="220" height="130" rx="9" fill="${C.woodDark}"/>
  <rect x="3" y="3" width="214" height="124" rx="7" fill="${C.wood}"/>
  <rect x="12" y="12" width="196" height="106" rx="4" fill="#fff6e6" stroke="#b98a52" stroke-width="2"/>
  <g stroke="#b98a52" stroke-width="2" opacity=".75">
    <path d="M12 47.3 H208"/>
    <path d="M12 82.6 H208"/>
    <path d="M77.3 12 V118"/>
    <path d="M142.6 12 V118"/>
  </g>
  <g fill="${C.woodDark}" opacity=".55">
    <circle cx="8" cy="8" r="2.2"/><circle cx="212" cy="8" r="2.2"/>
    <circle cx="8" cy="122" r="2.2"/><circle cx="212" cy="122" r="2.2"/>
  </g>
</svg>`
);

// ─── Meja kasir — 280×90, mesin kasir di kiri ──────────────────────────────
write(
  "counter.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="90" viewBox="0 0 280 90">
  <rect x="0" y="0" width="280" height="90" rx="10" fill="${C.woodDark}"/>
  <rect x="3" y="3" width="274" height="84" rx="8" fill="${C.wood}"/>
  <rect x="12" y="12" width="256" height="26" rx="6" fill="#e3b183"/>
  <!-- mesin kasir -->
  <rect x="26" y="42" width="62" height="34" rx="4" fill="#fff6e6" stroke="#b98a52" stroke-width="2"/>
  <rect x="34" y="20" width="52" height="28" rx="3" fill="#e9eef7" stroke="#7a8798" stroke-width="2"/>
  <rect x="38" y="24" width="44" height="16" rx="2" fill="#8fb6e8"/>
  <rect x="48" y="48" width="8" height="4" fill="#7a8798"/>
  <rect x="36" y="54" width="42" height="4" rx="2" fill="#7a8798"/>
  <!-- area kantong belanja -->
  <rect x="196" y="44" width="56" height="30" rx="4" fill="#dfe9f7" stroke="#8fb6e8" stroke-width="2"/>
  <path d="M210 50 h28 M210 58 h22 M210 66 h26" stroke="#8fb6e8" stroke-width="2" opacity=".7"/>
</svg>`
);

// ─── Pintu — 150×48 ────────────────────────────────────────────────────────
write(
  "door.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="48" viewBox="0 0 150 48">
  <rect x="0" y="0" width="150" height="48" rx="8" fill="#bfe3c6" stroke="#4f9d4a" stroke-width="3"/>
  <rect x="10" y="9" width="130" height="30" rx="4" fill="#d9f0dd" stroke="#7fc48c" stroke-width="2"/>
  <path d="M75 9 V39" stroke="#4f9d4a" stroke-width="2" opacity=".6"/>
  <circle cx="62" cy="24" r="2" fill="#4f9d4a"/>
  <circle cx="88" cy="24" r="2" fill="#4f9d4a"/>
</svg>`
);

console.log("\nSelesai. Semua aset ada di web/public/assets/");
