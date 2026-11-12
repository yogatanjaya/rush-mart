// Polyfills MUST be imported first — static imports evaluate in order.
import "./polyfills.ts";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Game from "./Game.tsx";
import App from "./App.tsx";

// Dua wajah aplikasi:
//   /            → game Phaser (yang dimainkan)
//   /#dashboard  → dashboard on-chain lama (alat verifikasi untuk juri)
// Dashboard tidak dibuang karena di situlah integrasi wallet & contract hidup.
const isDashboard = window.location.hash === "#dashboard";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isDashboard ? <App /> : <Game />}</StrictMode>,
);
