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
| 6 | `cd contract-rushmart && cargo test` | 1 test passes (harvest → sale → round, MT balances, top list) |
| 7 | `node contract-rushmart/scripts/read-state.mjs <path-to-key.json>` | prints live `get_stats`, `get_top`, `get_recent`, and NEP-245 balances read from testnet |

Requires Node 18+ and a browser. No backend, no database, no API keys.
The on-chain half is already deployed and live — see **§12**.

---

## 2. The two places

The game is one screen with two locations you walk between through **doors**: the wooden `FARM` door in the store, and the `Minimart` door on the barn in the farm.

**MINIMART** — the store floor. Four shelves (Corn, Tomato, Carrot, Potato),
a red QUEUE carpet, a cashier counter, and an ENTRY door. Customers spawn at the
door, walk to shelves, pick items, and queue up.

**FARM** — four plots of land (3 × 5 slots each), a dirt road, and a **BUY SEED**
stall on the left edge. You buy seeds, plant them with your bare hand, **water each
plot** with the watering can, wait 15 seconds for the crop to grow, then harvest
with the hoe.

Your money, seeds, and harvested crops are **shared** between the two places —
switching scenes never resets anything, and crops keep growing while you are
inside the minimarket.

---

## 3. Core loop

```
  buy seeds at the stall
          ↓
  plant them with the bare hand (slot 1)
          ↓
  water each plot with the watering can (slot 2)
          ↓
  wait 15 s for growth  (unwatered seeds never grow)
          ↓
  harvest with the hoe (slot 3) → crops go to your inventory
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
| **`1` / `2` / `3`** (or click the tool cells) | pick tool: **1** bare hand, **2** watering can, **3** hoe |
| bare hand + click an empty plot | plants one seed of that plot's crop |
| watering can + click a plot | waters it (works before planting too — plot shows `READY PLANT`) |
| hoe + click a ripe plot | harvests that single crop |
| click the BUY SEED stall (while standing in front of it) | opens the seed store |
| click a shelf | refill that shelf from your inventory of that crop |
| stand on the green cashier mat + click a queued customer | opens the payment panel |
| click (or `SPACE` near) the **FARM** door / the **Minimart** door | switch location |
| HUD `♪ ON` / `♪ OFF` | toggle background music |

---

## 5. Economy

| Crop | Seed cost | Sell price | Profit per item |
|---|---|---|---|
| Corn | 2 | 5 | +3 |
| Tomato | 4 | 6 | +2 |
| Carrot | 3 | 5 | +2 |
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
- **Planting → watering → growth.** A planted seed does **not** grow on its own.
  Pick the **watering can** and click the plot; only then does the 15-second timer
  start. An unwatered seed shows `Need Water`, a pre-watered empty plot shows
  `READY PLANT`, and a ripe crop shows `Harvest`.
- Planting, watering and harvesting are all **one click per slot** — there is no
  bulk button. You plant with the bare hand, water with the can, and harvest ripe
  crops with the hoe.
- Harvested crops go into an **11-cell inventory bar** pinned to the bottom of the
  map: **3 tool cells** (bare hand, watering can, hoe) on the left, then a 5 px gap,
  then four harvested-produce cells and four seed packets, each with a counter.
  Only the three tool cells are clickable.

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
2. picks **1–2 different crops, at most 2 items each** (60% nearest shelf,
   40% random), stopping about **1 second** per shelf,
3. walks into the queue (up to **5 people** deep — the carpet only covers the
   first two, the rest queue on the floor),
4. waits **40 seconds** — but the timer only runs **once they reach the front**
   of the queue. Customers behind the front one are never counted.

Traffic comes in **waves of 2–3 customers**, one or two seconds apart, plus one
extra customer halfway through the gap. Waves are separated by **18–28 seconds**,
and the first wave arrives **1 second** after the round starts. That works out at
about **25 customers** and **~66 requested items** per round, against a maximum
supply of 86 items (43 on the shelves + 43 starting seeds).

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
| Chain | **NEAR testnet** — Rust contract (`near-sdk` 5), NEP-297 events + NEP-245 lite tokens |
| Wallet | **NEAR Wallet Selector** + **Meteor Wallet**, session key via function-call access key |

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
    near/wallet.ts              # NEAR: connect Meteor, session key, tx queue, 7 events
  public/assets/                # generated PNGs + SFX + music
contract-rushmart/              # LIVE contract: activity ledger + NEP-245 harvest tokens
  src/lib.rs                    # record_* methods, get_stats/get_top/get_recent, mt_* 
  scripts/deploy.mjs            # deploy + init to testnet (key read from a file outside the repo)
  scripts/read-state.mjs        # read-only proof script (stats, leaderboard, token balances)
  scripts/smoke-test.mjs        # writes 7 real actions to testnet and prints the result
contract/                       # earlier prototype contract (kept for history, unused by the game)
docs/                           # design notes, backlog, screenshots, ONCHAIN-TX-LOG.md
```

---

## 12. NEAR on-chain (shipped, testnet)

| | |
|---|---|
| Network | **testnet** |
| Contract | **`rushmart722324.testnet`** |
| Standards | **NEP-297** (`EVENT_JSON` logs) + **NEP-245 lite** (multi-token) |
| Wallet | **Meteor Wallet** through NEAR Wallet Selector (testnet) |
| Signing | one **function-call access key** per session, 0.5 NEAR gas allowance, restricted to the 8 game methods |

### What gets written, and when

Every action below is a real transaction signed by the session key — **no wallet
popup after the first approval**:

| In-game action | Contract method | Payload |
|---|---|---|
| `BUY ALL` at the stall | `record_purchase` | crop, qty, coins |
| plant one plot / `PLANT ALL` | `record_plant` | crop, qty |
| water a plot | **not recorded** (water is free and unlimited) | — |
| harvest one plot / `HARVEST` | `record_harvest` | crop, qty → **mints NEP-245 tokens** |
| customer pays correctly | `record_sale` | NPC name, item breakdown, coins, profit → **burns tokens** |
| customer lost / wrong change / empty shelf | `record_fail` | NPC name, reason, loss |
| refill a shelf | `record_refill` | crop, qty |
| clock hits `00:00` | `record_round` | profit, served, failed, 150 s |

Each call also emits a NEP-297 log, so the full history is permanent and
indexable without paying storage for every event:

```json
EVENT_JSON:{"standard":"rushmart","version":"1.0.0","event":"npc_paid",
            "data":{"account":"…","item":"cornx5","coins":20,"npc":"Village Woman","profit":10}}
```

Two storage layers, on purpose: **events** (gas only, full detail, permanent) and
**contract state** (small, fast to read: totals, best profit, leaderboard, token
balances).

### Player flow

1. `⛓ CONNECT` on the PLAY board → wallet list (Meteor) → connect request.
2. Panel: **ENABLE RECORDING** → one `AddKey` approval → chip turns
   `Connected` + `Wallet Connected & Approved`.
3. Play normally — every action above is queued and sent in the background
   (serial queue with retry; the game never waits for the chain).
4. Round end → `record_round`; the HUD chip counts saved actions.

Without a wallet the game is **fully playable** — recording is optional. The HUD
chip stays `on-chain / record off` and clicking it only shows a hint.

### Proof it really works

One real 150-second round produced **65 transactions**: 20 `record_sale`,
14 `record_refill`, 10 `record_harvest`, 8 `record_purchase`, 8 `record_plant`,
2 `record_fail`, 1 `record_round`, 2 `ADD_KEY` — all successful. Every row
(block height, time, hash) is in [`docs/ONCHAIN-TX-LOG.md`](docs/ONCHAIN-TX-LOG.md).

Read the live state yourself:

```bash
node contract-rushmart/scripts/read-state.mjs /path/to/your-key.json
# STATS: {"seeds_bought":135,"harvested":134,"items_sold":96,...}
# TOP:   [["rushmart722324.testnet",175]]
# MT corn: "18"   (47 harvested − 29 sold)
```

Or in a block explorer:
`https://testnet.nearblocks.io/address/rushmart722324.testnet`

### Rebuild / redeploy

```bash
cd contract-rushmart
cargo test --lib                                  # unit test
cargo build --target wasm32-unknown-unknown --release
node scripts/deploy.mjs /path/to/key.json         # deploy + init (uses testnet RPC)
```

The private key is **never** in this repo: it lives in a file outside it, and
`.gitignore` blocks `*.key`, `*-key.json`, `nearops/` and `.env` from ever being
committed.

### Limits (stated plainly)

- **Scores are client-reported.** The contract caps input per call
  (`qty ≤ 15`, `coins ≤ 500`, `profit ≤ 1000`) but cannot prove a score was
  earned honestly. Real anti-cheat would need delegated actions with a signed
  game log — out of scope for a hackathon build.
- **NEP-245 is “lite”**: `mt_balance_of`, `mt_batch_balance_of`, `mt_supply`,
  `mt_metadata`, `mt_transfer` are implemented; approval management and
  `storage_deposit` are not. The contract pays storage for new token balances
  from its own testnet balance, so players never have to deposit.
- **Session key handling**: the key sits in `localStorage` while the page is open
  and is **deleted on every page load**, so a refresh means connect + approve
  again. This is deliberate: it keeps “refresh to stop recording” true.
- **Testnet only.** Storage economics on mainnet would need `storage_deposit`
  (per-player registration) rather than the contract paying.

---

## 13. Roadmap

Done: wallet connect, session keys, per-action on-chain recording, NEP-245
harvest tokens, leaderboard storage (`get_top`).

Next:

1. Leaderboard UI on the result board (the data is already on-chain).
2. NEP-245 “full” — approval management + `storage_deposit` for mainnet.
3. Delegated actions (NEP-366) so scores can be verified instead of trusted.
4. More crops, more customer archetypes, price events.
5. Mobile/touch controls.
6. Localisation (Indonesian + English).

---

## License

MIT.
