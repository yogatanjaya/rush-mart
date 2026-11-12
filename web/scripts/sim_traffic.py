"""
Simulasi traffic NPC Pasar Pagi — ALAT BANTU DESAIN, bukan bagian game.

Menjawab pertanyaan: dengan GOALS 50 laba dalam 150 detik (02:30), berapa
pelanggan yang harus datang dan tipe apa saja, supaya target masuk akal?

Jalankan: python web/scripts/sim_traffic.py

Angka profil & harga di bawah disalin dari:
  web/src/game/scenes/MinimarketScene.ts   (NPC_PROFILES, START_STOCK)
  web/src/game/types.ts                    (CROPS: harga jual & harga bibit)

Kalau salah satu berubah di game, samakan juga di sini.
"""

import random
import statistics

GOAL = 50           # target laba level 1
BUDGET = 150.0      # detik (02:30)

CROPS = {"jagung": (4, 2), "tomat": (6, 4), "wortel": (4, 3), "kentang": (6, 3)}  # (jual, bibit)
MARGIN = {c: p - s for c, (p, s) in CROPS.items()}
PRICE = {c: p for c, (p, s) in CROPS.items()}
START_STOCK = {"jagung": 11, "tomat": 10, "wortel": 12, "kentang": 10}

PROFILES = {
    "Ibu desa":        dict(k=(2, 3), q=(2, 3), prefer=["kentang", "tomat", "jagung", "wortel"]),
    "Petani tua":      dict(k=(1, 2), q=(1, 2), prefer=["jagung", "kentang", "wortel", "tomat"]),
    "Gadis desa":      dict(k=(2, 2), q=(1, 2), prefer=["tomat", "wortel", "jagung", "kentang"]),
    "Pemuda":          dict(k=(2, 3), q=(1, 3), prefer=["jagung", "tomat", "kentang", "wortel"]),
    "Pemuda desa":     dict(k=(2, 2), q=(3, 4), prefer=["kentang", "tomat", "jagung", "wortel"]),
    "Nenek desa":      dict(k=(1, 2), q=(1, 1), prefer=["wortel", "jagung", "tomat", "kentang"]),
    "Anak kecil desa": dict(k=(1, 1), q=(1, 1), prefer=["jagung", "tomat", "wortel", "kentang"]),
}


def make_basket(prof, stock):
    """Tiru buildBasket() di MinimarketScene: pilih jenis berbobot, lalu jumlah acak."""
    pool = [c for c in prof["prefer"] if stock[c] > 0]
    if not pool:
        return []
    kinds = min(random.randint(*prof["k"]), len(pool))
    picked = []
    while len(picked) < kinds and pool:
        w = [max(1, len(pool) - i) for i in range(len(pool))]
        r = random.random() * sum(w)
        idx = len(pool) - 1
        for i, ww in enumerate(w):
            r -= ww
            if r <= 0:
                idx = i
                break
        picked.append(pool.pop(idx))
    out = []
    for c in picked:
        take = min(random.randint(*prof["q"]), stock[c])
        if take > 0:
            out.append((c, take))
    return out


def per_type_stats(trials=40000):
    rows = {}
    unlimited = {c: 10 ** 6 for c in CROPS}
    for name, prof in PROFILES.items():
        ps, its, pays = [], [], []
        for _ in range(trials):
            b = make_basket(prof, unlimited)
            ps.append(sum(MARGIN[c] * q for c, q in b))
            its.append(sum(q for _, q in b))
            pays.append(sum(PRICE[c] * q for c, q in b))
        rows[name] = dict(profit=statistics.mean(ps), items=statistics.mean(its),
                          bill=statistics.mean(pays), lo=min(ps), hi=max(ps))
    return rows


def run_round(interval, trials=6000, goal=GOAL, budget=BUDGET,
              shop=(6, 10), serve_base=3.0, serve_per_item=1.2, cap=40):
    """Satu ronde penuh: pelanggan datang tiap `interval` detik, pemain melayani satu per satu."""
    times, counts, wins, losts, profits = [], [], 0, [], []
    for _ in range(trials):
        stock = dict(START_STOCK)
        arrivals, t = [], 1.2
        while t < budget and len(arrivals) < cap:
            arrivals.append(t)
            t += interval

        busy_until, profit, served, lost, t_done = 0.0, 0, 0, 0, None
        for a in arrivals:
            t_join = a + random.uniform(*shop)
            prof = random.choice(list(PROFILES.values()))
            b = make_basket(prof, stock)
            if not b:
                lost += 1
                continue
            for c, q in b:
                stock[c] -= q
            start = max(t_join, busy_until)
            if start > t_join + random.uniform(20, 40):   # kesabaran habis
                lost += 1
                continue
            busy_until = start + serve_base + serve_per_item * sum(q for _, q in b)
            if busy_until > budget:
                lost += 1
                continue
            profit += sum(MARGIN[c] * q for c, q in b)
            served += 1
            if t_done is None and profit >= goal:
                t_done = busy_until

        wins += profit >= goal
        profits.append(profit)
        losts.append(lost)
        if profit >= goal:
            times.append(t_done)
            counts.append(served)
    return dict(interval=interval, win=wins / trials,
                t=statistics.mean(times) if times else None,
                n=statistics.mean(counts) if counts else None,
                lost=statistics.mean(losts), profit=statistics.mean(profits))


def example_lineups(rows, goal=GOAL):
    """Contoh komposisi 7 pelanggan yang jumlahnya mendekati target."""
    names = list(PROFILES)
    samples = []
    for _ in range(60000):
        pick = [random.choice(names) for _ in range(7)]
        total = sum(rows[n]["profit"] for n in pick)
        samples.append((abs(total - goal), total, pick))
    samples.sort(key=lambda x: x[0])
    seen, out = set(), []
    for _, total, pick in samples:
        key = tuple(sorted(pick))
        if key in seen:
            continue
        seen.add(key)
        out.append((total, pick))
        if len(out) == 3:
            break
    return out


if __name__ == "__main__":
    random.seed(2026)
    rows = per_type_stats()

    print("=== 1. Laba per pelanggan ===")
    print(f"{'NPC':17s} {'laba':>6s} {'item':>5s} {'bayar':>6s}   rentang")
    for name, r in rows.items():
        print(f"{name:17s} {r['profit']:6.2f} {r['items']:5.2f} {r['bill']:6.1f}   {r['lo']:.0f}-{r['hi']:.0f}")

    avg = statistics.mean(r["profit"] for r in rows.values())
    print(f"\nrata-rata: {avg:.2f} laba/pelanggan -> target {GOAL} butuh {GOAL/avg:.1f} pelanggan")

    print("\n=== 2. Pelanggan yang dibutuhkan (tanpa batas waktu) ===")
    for name, r in rows.items():
        need = -(-GOAL // max(1, int(round(r["profit"]))))
        print(f"{name:17s} rata-rata {r['profit']:5.2f} -> {need:2d} pelanggan (kalau semuanya tipe ini)")

    print("\n=== 3. Simulasi ronde 150 detik ===")
    print("jeda | sukses | rata2 waktu capai 50 | dilayani | kabur | rata2 laba akhir")
    for iv in [20, 18, 15, 12, 10, 8, 6]:
        r = run_round(iv)
        t = f"{r['t']:.0f}s" if r["t"] else "-"
        n = f"{r['n']:.1f}" if r["n"] else "-"
        print(f"{iv:4d}s| {r['win']*100:5.0f}% | {t:>21s} | {n:>8s} | {r['lost']:5.1f} | {r['profit']:6.1f}")

    print("\n=== 4. Contoh 7 pelanggan yang jumlahnya mendekati target ===")
    for total, pick in example_lineups(rows):
        print(f"total ~{total}: " + ", ".join(pick))
