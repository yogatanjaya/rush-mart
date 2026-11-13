# Rush Mart

> A 2.5-minute pixel-art shop sim for NEAR Hackathon 2026 (track: `games`).
> **Grow it, stock it, sell it — before the clock runs out.**

Rush Mart is a single-player, browser-based management game. You run a tiny
neighborhood minimarket **and** the farm that feeds it. Customers walk in, take
items off your shelves, and queue at the register. Every item they take is money
you only get if you serve them correctly — and every shelf you empty has to be
refilled with crops you planted yourself.

One round lasts **150 seconds**. You win by reaching a **net profit goal of 100
coins** before the timer hits zero.

---

## 1. Machine-readable TL;DR (do X, see Y)

| # | Command | Expected result |
|---|---|---|
| 1 | `cd web && npm install` | dependencies installed |
| 2 | `cd web && npm run dev` | dev server on `http://127.0.0.1:5173`, PLAY screen appears |
| 3 | `cd web && npx tsc --noEmit` | no output (types clean) |
| 4 | `cd web && npm run build` | `dist/` produced, build succeeds |
| 5 | open the page, press **PLAY** | round starts, timer at `02:30` |

Requires Node 18+ and a browser. No backend, no database, no API keys.

---

## 2. The two places

The game is one screen with two locations you switch between with a HUD button.

**MINIMART** — the store floor. Four shelves (Corn, Tomato, Carrot, Potato),
a red QUEUE carpet, a cashier counter, and an ENTRY door. Customers spawn at the
door, walk to shelves, pick items, and queue up.

**FARM** — four plots of land (3 × 5 slots each), a dirt road, and a **BUY SEED**
stall on the left edge. You buy seeds, plant them, wait for them to grow, and
harvest them into your inventory.

Your money, seeds, and harvested crops are **shared** between the two places —
switching scenes never resets anything, and crops keep growing while you are
inside the minimarket.

---

## 3. Core loop

```
  buy seeds at the stall
          ↓
  plant them  (15 s to grow)
          ↓
  harvest → crops go to your inventory
          ↓
  carry them into the minimarket and refill the shelves
          ↓
  customers take items and queue at the register
          ↓
  you stand on the green mat, click the customer,
  type the correct change, press DONE
          ↓
  profit counts toward GOALS 100/100
```

The tension is that all five jobs — buying, planting, harvesting, restocking,
and running the register — happen inside the same 150 seconds.

---

## 4. Controls

| Input | Action |
|---|---|
| `W A S D` / arrow keys | walk (both locations) |
| click a farm plot | plant one seed, or harvest a ripe crop |
| `PLANT ALL` (per plot) | plants seeds into every empty slot, one by one |
| `HARVEST` (per plot, vertical button) | harvests every ripe slot, one by one |
| click the BUY SEED stall (while standing in front of it) | opens the seed store |
| click a shelf | refill that shelf from your inventory of that crop |
| stand on the green cashier mat + click a queued customer | opens the payment panel |
| HUD `FARM` / `MINIMART` | switch location |
| HUD `♪ ON` / `♪ OFF` | toggle background music |

---

## 5. Economy

| Crop | Seed cost | Sell price | Profit per item |
|---|---|---|---|
| Corn | 2 | 4 | +2 |
| Tomato | 4 | 6 | +2 |
| Carrot | 3 | 4 | +1 |
| Potato | 3 | 6 | +3 |

- **Starting cash:** 200 coins.
- **Goal:** net profit of **100 coins**.
- Net profit = (sell price − seed cost) for every item successfully sold,
  minus penalties. Buying seeds does **not** reduce GOALS — it only moves coins;
  the seed cost is subtracted when the item is sold.

---

## 6. Round rules

| Rule | Value |
|---|---|
| Round length | **150 s** (clock counts down from `02:30`) |
| Win condition | GOALS ≥ 100 when the clock hits `00:00` |
| Coins floor | coins can never go below **0** |
| GOALS floor | GOALS **can go negative** (shown as e.g. `-12/100`) |

**Penalties.** If a customer leaves without paying — either because their
patience ran out, or because you typed the wrong change — their whole basket is
lost and you are charged **the full seed cost** of every item they were carrying.
That loss hits both your coins and your GOALS.

**Result screen.** At `00:00` a board appears with three numbers:
`Customers Served`, `Customers Missed`, and the final `GOALS`, plus
`PLAY AGAIN` (win) or `TRY AGAIN` (loss). Either button fully resets the run,
including shelves back to their starting stock.

---

## 7. Farm details

- **4 plots**, one per crop, **15 slots each** (3 rows × 5 columns).
- **Growth time: 15 seconds** (two visible growth stages of 7.5 s).
- Seeds are **only** bought at the BUY SEED stall inside the farm map — walk up
  to it and click it; the store panel opens. (There is no floating button; the
  stall is a building in the world.)
- The seed store defaults to **15 of each crop** and has one `BUY ALL` button.
  `GRAND TOTAL` and `BALANCE` are shown at the bottom.
- `PLANT ALL` plants one seed every **110 ms** until the plot is full, so you can
  watch it fill up. `HARVEST` does the same in reverse.
- Harvested crops go into an **8-slot inventory bar** pinned to the bottom of the
  map: the first four slots are harvested produce, the last four are seed packets,
  each with a quantity counter.

---

## 8. Store details

- **4 shelves × 15 slots** (3 rows × 5 columns).
- **Opening stock:** Corn 11, Tomato 10, Carrot 12, Potato 10 (43 items total).
- Clicking a shelf moves as much of that crop as possible from your inventory into
  the shelf, up to 15.
- When a shelf drops to **8 items or fewer**, a blinking `FILL YOUR DISPLAY` hint
  appears at the bottom inside the shelf.
- Each shelf shows a price board and a `n/15` badge.

**Customers.** Each customer:
1. spawns at the ENTRY door (aligned with the QUEUE carpet),
2. picks **1–3 different crops** (60% nearest shelf, 40% random), stopping about
   **1 second** per shelf,
3. walks into the queue (up to **5 people** deep — the carpet only covers the
   first two, the rest queue on the floor),
4. waits with **20–40 seconds of patience**.

Traffic comes in **waves of 2–3 customers**, one or two seconds apart, plus one
extra customer halfway through the gap. Waves are separated by **15–25 seconds**,
and the first wave arrives **1 second** after the round starts.

**Cashier.** Stand on the green mat and click the customer at the front of the
queue. The panel shows:
- `GRAND TOTAL` — computed automatically from the basket (read-only),
- `CUSTOMER PAID` — what they hand you (fixed),
- `CHANGE` — you type it, then press `DONE`.
Correct change = full sale. Wrong change = the customer leaves and you take the
seed-cost penalty.

---

## 9. Feedback (juice)

- Floating **`+N`** in green above the counter on a successful sale, **`−N`** in
  red on a penalty — both drift upward and fade out.
- Sound effects (all short, all mixed at low volume):
  door whoosh on location switch, bell for every customer entering, wooden knock
  when you tap the seed stall, register sound on `BUY ALL`, a soft wood tap when
  restocking a shelf, a deep "pop" when planting/harvesting a single slot, a
  4-beat sequence for `PLANT ALL` / `HARVEST`, coin chime on profit, buzz on loss.
- A looping background track starts on the first click (browser autoplay rules)
  and can be muted with the HUD music button.
- The notice bar is a pixel-art wooden signboard; it reports growth timers,
  restocks, arrivals, and every penalty.

---

## 10. Tech stack

| Layer | Choice |
|---|---|
| Rendering | **Phaser 3** — two scenes (`FarmScene`, `MinimarketScene`) kept alive side by side, one is brought to front |
| UI / HUD | **React + TypeScript**, overlaid on the canvas |
| Build | **Vite** |
| Art | 100 % procedurally generated pixel art (`web/scripts/gen_pixel_assets.py`, `gen_market_assets.py`) — no third-party sprites |
| Audio | Mix of self-synthesised SFX (Python) and royalty-free files; played through `HTMLAudioElement` |
| Fonts | Press Start 2P + VT323 |

**Why the UI is separate from the canvas.** Phaser draws the world; React draws
the HUD, popups, and the inventory bar. They talk through two small bridges:
`web/src/game/ui.ts` (scene → React, e.g. "open the seed store") and scene
methods called from React (`buySeed`, `startSession`, …).

**Responsive scaling.** Everything is authored in a fixed 1280 × 720 space. The
canvas is `Phaser.Scale.FIT`, and the HUD, the popups, and the inventory bar live
in absolutely-positioned layers of exactly 1280 × 720 that are `transform:
scale()`d by `stageWidth / 1280`. The result: HUD, modals, and world always share
one scale, at any window size.

**Audio gotcha.** Phaser's sound manager stays locked until the *canvas* is
clicked, and this game is driven by React buttons — so every sound is played
through `HTMLAudioElement` instead, with a single-player + minimum-gap policy on
long sounds so spamming a button cannot stack into distortion.

---

## 11. Project structure

```
web/
  src/
    Game.tsx                    # React shell: canvas mount, HUD, popups, audio
    game.css                    # all UI styling (pixel-art frames, HUD layers)
    game/
      types.ts                  # crops, prices, shared constants
      economy.ts                # single source of truth for coins/seeds/crops
      flow.ts                   # round state (playing / stopped)
      ui.ts                     # scene → React bridge
      scenes/FarmScene.ts       # farm: plots, growth, stall, inventory
      scenes/MinimarketScene.ts # store: shelves, NPCs, queue, cashier
  scripts/
    gen_pixel_assets.py         # farm background, crops, icons
    gen_market_assets.py        # store background, shelves, counter
  public/assets/                # generated PNGs + SFX + music
contract/                       # NEAR smart contract (Rust, NEP-245 style)
docs/                           # design notes, backlog, screenshots
```

---

## 12. NEAR status (honest)

The Rust contract in `contract/` is **deployed to NEAR testnet** at
`pasar-pagi-17536.testnet` and responds to `get_world`. The account name is a
leftover from the project's first title and is kept because the account already
exists on-chain.

**The contract is not yet wired into gameplay.** Rush Mart currently runs fully
client-side; wallet connection and on-chain state (recording finished runs) are
the next milestone, not a shipped feature. Nothing in this README claims
otherwise.

---

## 13. Roadmap

1. Wallet connect (NEAR) + record each finished run on-chain.
2. Save/restore run summary as a permanent leaderboard entry.
3. More crops, more customer archetypes, price events.
4. Mobile/touch controls.
5. Localisation (Indonesian + English).

---

## License

MIT.
