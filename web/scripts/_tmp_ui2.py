import io

# ── CSS ────────────────────────────────────────────────────────────────────
CP = r"C:\Hermes\.worktrees\near-hackathon\web\src\game.css"
c = io.open(CP, encoding="utf-8").read()

anchor = ".start-title {"
chip_css = """/* Papan PLAY sedikit lebih lebar supaya chip wallet muat di pojok kanan,
   tanpa menggeser judul RUSH MART yang tetap di tengah. */
.start-frame--play {
  width: 452px;
}

/* Chip wallet: pojok kanan atas papan PLAY */
.wallet-chip {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 5px 8px;
  font-family: "Press Start 2P", monospace;
  font-size: 8px;
  line-height: 1;
  color: #3a2210;
  background: #dcc59c;
  border: 2px solid #2a1608;
  box-shadow: 0 2px 0 #2a1608;
  cursor: pointer;
}
.wallet-chip.is-on {
  background: #7da88b;
  color: #0d2418;
}
.wallet-chip.is-connecting {
  background: #e0b45f;
}

/* Chip yang sama di HUD (saat bermain) */
.hud-chip {
  font-family: "Press Start 2P", monospace;
  font-size: 8px;
  line-height: 1;
  padding: 6px 8px;
  color: #3a2210;
  background: #dcc59c;
  border: 2px solid #2a1608;
  box-shadow: 0 3px 0 #2a1608;
  cursor: pointer;
}
.hud-chip.is-on {
  background: #7da88b;
  color: #0d2418;
}
.hud-chip.is-connecting {
  background: #e0b45f;
}

.start-title {"""
if anchor not in c:
    raise SystemExit("anchor .start-title tidak ketemu")
c = c.replace(anchor, chip_css, 1)
io.open(CP, "w", encoding="utf-8", newline="").write(c)
print("CSS ok")

# ── HUD chip di Game.tsx ───────────────────────────────────────────────────
GP = r"C:\Hermes\.worktrees\near-hackathon\web\src\Game.tsx"
g = io.open(GP, encoding="utf-8").read()

old_hud = """          <button className="hud-btn hud-music" onClick={toggleMusic}>"""
new_hud = """          <button
            className={`hud-chip is-${wallet.status}`}
            onClick={onWalletClick}
            title={wallet.accountId || "connect wallet to record on-chain"}
          >
            {wallet.status === "on" ? "⛓ REC" : "⛓ OFF"}
          </button>
          <button className="hud-btn hud-music" onClick={toggleMusic}>"""
if old_hud not in g:
    raise SystemExit("tombol musik tidak ketemu")
g = g.replace(old_hud, new_hud, 1)
io.open(GP, "w", encoding="utf-8", newline="").write(g)
print("HUD chip ok")
