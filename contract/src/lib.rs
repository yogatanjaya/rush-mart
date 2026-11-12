//! Pasar Pagi — a living market economy on NEAR.
//!
//! One contract holds every item type (NEP-245 multi-token), the NPC
//! merchants' cash + stock, the player ledger and the day clock. The
//! economy is the gameplay: player actions move prices, merchants can go
//! bankrupt and a player can invest to reopen them.

use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{env, near, AccountId, PanicOnDefault};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const KOIN: &str = "koin";
pub const BERAS: &str = "beras";
pub const SAYUR: &str = "sayur";
pub const MAKANAN: &str = "makanan";
pub const KAIN: &str = "kain";
pub const PAKAIAN: &str = "pakaian";

pub const START_COINS: u128 = 100;
pub const WORK_PAY: u128 = 20;
pub const WORK_ENERGY: u8 = 20;
pub const REST_ENERGY: u8 = 40;
pub const REST_COST: u128 = 10;
pub const MAX_ENERGY: u8 = 100;
pub const MAX_ACTIONS_PER_DAY: usize = 8;
pub const INVEST_AMOUNT: u128 = 100;
pub // Raised 7 Nov: with 40/warga (120/day total) citizens spent ~160/day and went
// broke around day 8, which collapsed demand and bankrupted the whole market.
// 70/warga (210/day) keeps demand alive while leaving a small daily surplus.
const WAGE_PER_WARGA: u128 = 70;
pub const WARGA_COUNT: u128 = 3;
pub const BANKRUPT_LIMIT: u8 = 3;

/// One row per merchant. Money lives in `cash` (signed so debt is visible),
/// stock lives in the NEP-245 balance table under the merchant's account.
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct Npc {
    pub account_id: AccountId,
    pub kind: String,
    pub cash: i128,
    pub target_stock: u128,
    pub open: bool,
    pub bankrupt_days: u8,
    pub revenue_today: u128,
    pub investor: Option<AccountId>,
    pub invested: u128,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct Player {
    pub energy: u8,
    pub joined_day: u32,
    pub shares: HashMap<String, u128>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct ItemMeta {
    pub name: String,
    pub category: String,
    pub base_price: u128,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct PricePoint {
    pub day: u32,
    pub beras: u128,
    pub sayur: u128,
    pub makanan: u128,
    pub pakaian: u128,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    Work,
    Rest,
    Buy { item_id: String, qty: u32 },
    Sell { item_id: String, qty: u32 },
    Invest { npc_id: String },
}

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    pub owner_id: AccountId,
    pub items: LookupMap<String, ItemMeta>,
    pub balances: LookupMap<String, u128>,
    pub supplies: LookupMap<String, u128>,
    pub npcs: LookupMap<String, Npc>,
    pub players: LookupMap<AccountId, Player>,
    pub prices: LookupMap<String, u128>,
    pub day: u32,
    pub event: String,
    pub event_days_left: u32,
    pub price_history: Vec<PricePoint>,
    pub log: Vec<String>,
}

#[near]
impl Contract {
    // ignore_state lets us redeploy and re-init on the same account to reset the
    // world for a clean demo (and to recover from a dead-market simulation).
    #[init(ignore_state)]
    pub fn new(owner_id: AccountId) -> Self {
        let mut items = LookupMap::new(b"i");
        items.insert(
            BERAS.to_string(),
            ItemMeta {
                name: "Beras".to_string(),
                category: "bahan".to_string(),
                base_price: 10,
            },
        );
        items.insert(
            SAYUR.to_string(),
            ItemMeta {
                name: "Sayur".to_string(),
                category: "bahan".to_string(),
                base_price: 6,
            },
        );
        items.insert(
            MAKANAN.to_string(),
            ItemMeta {
                name: "Makanan Jadi".to_string(),
                category: "konsumsi".to_string(),
                base_price: 25,
            },
        );
        items.insert(
            KAIN.to_string(),
            ItemMeta {
                name: "Kain".to_string(),
                category: "bahan".to_string(),
                base_price: 12,
            },
        );
        items.insert(
            PAKAIAN.to_string(),
            ItemMeta {
                name: "Pakaian".to_string(),
                category: "konsumsi".to_string(),
                base_price: 40,
            },
        );

        let mut npcs = LookupMap::new(b"n");
        let npc_specs: [(&str, &str, i128, u128); 5] = [
            ("paktani", "petani", 300, 20),
            ("bupasar", "pedagang", 600, 20),
            ("busari", "rumah_makan", 400, 10),
            ("pabrik", "pabrik", 500, 10),
            ("warga", "warga", 300, 0),
        ];
        for (name, kind, cash, target_stock) in npc_specs {
            let account_id: AccountId = format!("{}.{}", name, owner_id).parse().unwrap();
            npcs.insert(
                name.to_string(),
                Npc {
                    account_id,
                    kind: kind.to_string(),
                    cash,
                    target_stock,
                    open: true,
                    bankrupt_days: 0,
                    revenue_today: 0,
                    investor: None,
                    invested: 0,
                },
            );
        }

        let mut prices = LookupMap::new(b"p");
        for (id, meta) in [
            (BERAS, 10u128),
            (SAYUR, 6),
            (MAKANAN, 25),
            (KAIN, 12),
            (PAKAIAN, 40),
        ] {
            prices.insert(id.to_string(), meta);
        }

        // Unique per-deployment storage tag. LookupMap prefixes are baked into
        // storage keys, so a fixed prefix makes token balances and player records
        // survive a redeploy+re-init (old players kept their koin and shares).
        // Scoping the prefix to the deploy block gives every demo run clean state.
        let tag = format!("v{}:", env::block_height());
        let mut contract = Self {
            owner_id,
            items,
            balances: LookupMap::new(format!("{}b", tag).into_bytes()),
            supplies: LookupMap::new(format!("{}s", tag).into_bytes()),
            npcs,
            players: LookupMap::new(format!("{}u", tag).into_bytes()),
            prices,
            day: 1,
            event: "normal".to_string(),
            event_days_left: 0,
            price_history: Vec::new(),
            log: Vec::new(),
        };
        contract.log.push("Hari 1: Pasar Pagi dibuka.".to_string());
        contract
    }

    // ---------------------------------------------------------------- NEP-245

    /// NEP-245 core: balance of one token for one account.
    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 {
        U128(self.balance_of(&account_id, &token_id))
    }

    /// NEP-245 core: balances for a list of token ids.
    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<U128> {
        token_ids
            .iter()
            .map(|t| U128(self.balance_of(&account_id, t)))
            .collect()
    }

    /// NEP-245 core: total supply of a token id.
    pub fn mt_supply(&self, token_id: String) -> U128 {
        U128(self.supplies.get(&token_id).copied().unwrap_or(0))
    }

    /// NEP-245 core: transfer tokens. `approval` is accepted for interface
    /// compatibility; this game does not use approvals.
    pub fn mt_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
    ) {
        let _ = (approval, memo);
        self.transfer_internal(
            &env::predecessor_account_id(),
            &receiver_id,
            &token_id,
            amount.0,
        );
    }

    /// NEP-245 core: batch transfer.
    pub fn mt_batch_transfer(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        approvals: Option<Vec<Option<(AccountId, u64)>>>,
        memo: Option<String>,
    ) {
        assert_eq!(token_ids.len(), amounts.len(), "length mismatch");
        let _ = (approvals, memo);
        let sender = env::predecessor_account_id();
        for (token_id, amount) in token_ids.iter().zip(amounts.iter()) {
            self.transfer_internal(&sender, &receiver_id, token_id, amount.0);
        }
    }

    /// Item catalogue (name, category, base price).
    pub fn get_items(&self) -> Vec<(String, ItemMeta)> {
        [BERAS, SAYUR, MAKANAN, KAIN, PAKAIAN]
            .iter()
            .filter_map(|id| self.items.get(&id.to_string()).map(|m| (id.to_string(), m.clone())))
            .collect()
    }

    // ------------------------------------------------------------- game loop

    /// New player: 100 koin, full energy. One call, one wallet approval.
    pub fn register_player(&mut self) {
        let account = env::predecessor_account_id();
        if self.players.contains_key(&account) {
            return;
        }
        self.mint(&account, KOIN, START_COINS);
        self.players.insert(
            account.clone(),
            Player {
                energy: MAX_ENERGY,
                joined_day: self.day,
                shares: HashMap::new(),
            },
        );
        self.log.push(format!("{} masuk pasar dengan 100 koin.", account));
    }

    /// Play one in-game day: up to 8 queued actions, then the market ticks.
    /// Batching all actions into one call keeps the loop to one approval/day.
    pub fn play_day(&mut self, actions: Vec<Action>) -> WorldView {
        let account = env::predecessor_account_id();
        let mut player = self.players.get(&account).expect("register first").clone();
        assert!(
            actions.len() <= MAX_ACTIONS_PER_DAY,
            "max 8 actions per day"
        );

        for action in actions {
            match action {
                Action::Work => {
                    assert!(player.energy >= WORK_ENERGY, "not enough energy");
                    player.energy -= WORK_ENERGY;
                    self.mint(&account, KOIN, WORK_PAY);
                }
                Action::Rest => {
                    assert!(player.energy < MAX_ENERGY, "already full");
                    let coins = self.balance_of(&account, KOIN);
                    assert!(coins >= REST_COST, "not enough koin to rest");
                    self.sub_balance(&account, KOIN, REST_COST);
                    player.energy = (player.energy + REST_ENERGY).min(MAX_ENERGY);
                }
                Action::Buy { item_id, qty } => {
                    self.player_buy(&account, &mut player, &item_id, qty as u128);
                }
                Action::Sell { item_id, qty } => {
                    self.player_sell(&account, &item_id, qty as u128);
                }
                Action::Invest { npc_id } => {
                    self.player_invest(&account, &mut player, &npc_id);
                }
            }
        }

        self.players.insert(account.clone(), player);
        self.advance_day();
        self.world_view()
    }

    /// Simulate N days without player actions — the judge's fast-forward.
    pub fn fast_forward(&mut self, days: u32) -> WorldView {
        // Allow up to 365 days; callers should keep batches moderate for gas.
        assert!(days >= 1 && days <= 365, "1-365 days");
        for _ in 0..days {
            self.advance_day();
        }
        self.world_view()
    }

    // ------------------------------------------------------------- views

    pub fn get_world(&self) -> WorldView {
        self.world_view()
    }

    pub fn get_player(&self, account_id: AccountId) -> PlayerView {
        let p = self.players.get(&account_id).expect("unknown player");
        let koin = U128(self.balance_of(&account_id, KOIN));
        PlayerView {
            account_id,
            koin,
            energy: p.energy,
            shares: p.shares.clone(),
        }
    }

    // ------------------------------------------------------------- internal

    fn bal_key(account: &AccountId, token: &str) -> String {
        format!("{}|{}", account, token)
    }

    fn balance_of(&self, account: &AccountId, token: &str) -> u128 {
        self.balances
            .get(&Self::bal_key(account, token))
            .copied()
            .unwrap_or(0)
    }

    fn set_balance(&mut self, account: &AccountId, token: &str, value: u128) {
        self.balances
            .insert(Self::bal_key(account, token), value);
    }

    fn mint(&mut self, account: &AccountId, token: &str, amount: u128) {
        let next = self.balance_of(account, token) + amount;
        self.set_balance(account, token, next);
        let supply = self.supplies.get(&token.to_string()).copied().unwrap_or(0) + amount;
        self.supplies.insert(token.to_string(), supply);
    }

    fn burn(&mut self, account: &AccountId, token: &str, amount: u128) {
        let current = self.balance_of(account, token);
        assert!(current >= amount, "not enough tokens");
        self.set_balance(account, token, current - amount);
        let supply = self.supplies.get(&token.to_string()).copied().unwrap_or(0);
        self.supplies
            .insert(token.to_string(), supply.saturating_sub(amount));
    }

    fn sub_balance(&mut self, account: &AccountId, token: &str, amount: u128) {
        let current = self.balance_of(account, token);
        assert!(current >= amount, "not enough tokens");
        self.set_balance(account, token, current - amount);
    }

    fn transfer_internal(&mut self, from: &AccountId, to: &AccountId, token: &str, amount: u128) {
        self.sub_balance(from, token, amount);
        let next = self.balance_of(to, token) + amount;
        self.set_balance(to, token, next);
    }

    fn price_of(&self, token: &str) -> u128 {
        self.prices.get(&token.to_string()).copied().unwrap_or(10)
    }

    fn npc_account(&self, npc_id: &str) -> AccountId {
        self.npcs.get(&npc_id.to_string()).expect("unknown npc").account_id.clone()
    }

    fn player_buy(&mut self, account: &AccountId, _player: &mut Player, item_id: &str, qty: u128) {
        assert!(qty > 0 && qty <= 20, "qty 1-20");
        let seller_id = match item_id {
            MAKANAN => "busari",
            _ => "bupasar",
        };
        let mut seller = self.npcs.get(&seller_id.to_string()).expect("seller").clone();
        assert!(seller.open, "shop is closed");
        let stock = self.balance_of(&seller.account_id, item_id);
        assert!(stock >= qty, "out of stock");

        let unit = self.price_of(item_id);
        let total = unit * qty;
        let coins = self.balance_of(account, KOIN);
        assert!(coins >= total, "not enough koin");

        self.sub_balance(account, KOIN, total);
        self.transfer_internal(&seller.account_id, account, item_id, qty);
        seller.cash += total as i128;
        seller.revenue_today += total;
        self.npcs.insert(seller_id.to_string(), seller);
        self.log.push(format!(
            "{} beli {} {} seharga {} koin.",
            account, qty, item_id, total
        ));
    }

    fn player_sell(&mut self, account: &AccountId, item_id: &str, qty: u128) {
        assert!(qty > 0 && qty <= 20, "qty 1-20");
        let buyer_id = "bupasar";
        let mut buyer = self.npcs.get(&buyer_id.to_string()).expect("buyer").clone();
        assert!(buyer.open, "market is closed");

        let owned = self.balance_of(account, item_id);
        assert!(owned >= qty, "not enough items");

        // merchants buy at 90% of the current retail price.
        let unit = self.price_of(item_id) * 9 / 10;
        let total = unit * qty;
        assert!(buyer.cash >= total as i128, "merchant cannot afford it");

        self.transfer_internal(account, &buyer.account_id, item_id, qty);
        buyer.cash -= total as i128;
        self.npcs.insert(buyer_id.to_string(), buyer);
        self.mint(account, KOIN, total);
        self.log.push(format!(
            "{} jual {} {} seharga {} koin.",
            account, qty, item_id, total
        ));
    }

    fn player_invest(&mut self, account: &AccountId, player: &mut Player, npc_id: &str) {
        let mut npc = self.npcs.get(&npc_id.to_string()).expect("unknown npc").clone();
        assert!(!npc.open, "shop is still open");
        let coins = self.balance_of(account, KOIN);
        assert!(coins >= INVEST_AMOUNT, "need 100 koin to invest");

        self.sub_balance(account, KOIN, INVEST_AMOUNT);
        npc.cash += INVEST_AMOUNT as i128;
        npc.open = true;
        npc.bankrupt_days = 0;
        npc.investor = Some(account.clone());
        npc.invested += INVEST_AMOUNT;
        let prev = player.shares.get(npc_id).copied().unwrap_or(0);
        player.shares.insert(npc_id.to_string(), prev + INVEST_AMOUNT);
        self.npcs.insert(npc_id.to_string(), npc);
        self.log.push(format!(
            "{} investasi 100 koin ke {} — toko buka lagi, bagi hasil 30%.",
            account, npc_id
        ));
    }

    fn advance_day(&mut self) {
        self.day += 1;
        let day = self.day;

        // 1. seasonal event every 7 days
        if day % 7 == 1 && day > 1 {
            let idx = ((day / 7) as usize) % 3;
            self.event = ["gagal_panen", "festival", "paceklik"][idx].to_string();
            self.event_days_left = 3;
            self.log.push(format!("Hari {}: event {} dimulai!", day, self.event));
        }
        if self.event_days_left > 0 {
            self.event_days_left -= 1;
            if self.event_days_left == 0 {
                self.event = "normal".to_string();
            }
        }

        // 2. farmer produces
        let harvest_mult: u128 = if self.event == "gagal_panen" { 50 } else { 100 };
        let mut farmer = self.npcs.get(&"paktani".to_string()).unwrap().clone();
        if farmer.open {
            let beras_in = 10 * harvest_mult / 100;
            let sayur_in = 8 * harvest_mult / 100;
            self.mint(&farmer.account_id, BERAS, beras_in);
            self.mint(&farmer.account_id, SAYUR, sayur_in);
            self.log.push(format!(
                "Hari {}: Pak Tani panen {} beras, {} sayur.",
                day, beras_in, sayur_in
            ));
        }
        self.npcs.insert("paktani".to_string(), farmer.clone());

        // 2b. factory produces cloth and clothes
        let mut pabrik = self.npcs.get(&"pabrik".to_string()).unwrap().clone();
        if pabrik.open {
            self.mint(&pabrik.account_id, KAIN, 4);
            self.mint(&pabrik.account_id, PAKAIAN, 2);
            self.log.push(format!(
                "Hari {}: Pabrik memproduksi 4 kain, 2 pakaian.",
                day
            ));
        }
        self.npcs.insert("pabrik".to_string(), pabrik.clone());

        // 3. market buys from farmer (wholesale 70% of retail)
        // The supplier must be OPEN: a bankrupt shop must stop trading entirely,
        // otherwise it quietly sells leftover stock and "un-bankrupts" itself.
        let mut market = self.npcs.get(&"bupasar".to_string()).unwrap().clone();
        if market.open && farmer.open {
            for token in [BERAS, SAYUR] {
                let stock = self.balance_of(&farmer.account_id, token);
                let want = 4u128.min(stock);
                let cost = self.price_of(token) * 7 / 10 * want;
                if want > 0 && market.cash >= cost as i128 {
                    self.transfer_internal(&farmer.account_id, &market.account_id, token, want);
                    market.cash -= cost as i128;
                    self.mint(&farmer.account_id, KOIN, cost);
                    // Record the sale in the farmer's own books so the investor
                    // profit-share (30% of revenue_today) actually has something
                    // to pay out, and so cash reflects real trading.
                    farmer.cash += cost as i128;
                    farmer.revenue_today += cost;
                }
            }
        }
        self.npcs.insert("paktani".to_string(), farmer.clone());

        // 3b. market buys clothes from the factory.
        // It deliberately does NOT buy raw cloth (KAIN): nothing consumes it, so
        // every unit bought was dead inventory that bled the market dry.
        if market.open && pabrik.open {
            for token in [PAKAIAN] {
                let stock = self.balance_of(&pabrik.account_id, token);
                let want = 1u128.min(stock);
                let cost = self.price_of(token) * 7 / 10 * want;
                if want > 0 && market.cash >= cost as i128 {
                    self.transfer_internal(&pabrik.account_id, &market.account_id, token, want);
                    market.cash -= cost as i128;
                    self.mint(&pabrik.account_id, KOIN, cost);
                    // Same bookkeeping fix as the farmer: the factory's sales
                    // must land in its cash ledger and revenue_today.
                    pabrik.cash += cost as i128;
                    pabrik.revenue_today += cost;
                }
            }
        }
        self.npcs.insert("pabrik".to_string(), pabrik.clone());

        // 4. citizens earn wages and buy food
        let wage_mult: u128 = if self.event == "paceklik" { 70 } else { 100 };
        let mut warga = self.npcs.get(&"warga".to_string()).unwrap().clone();
        let wages = WAGE_PER_WARGA * WARGA_COUNT * wage_mult / 100;
        warga.cash += wages as i128;

        let demand_mult: u128 = if self.event == "festival" { 180 } else { 100 };
        // 1 meal per citizen (3/day) instead of 2: at 2 the citizens spent more
        // than their wage and went broke around day 20, collapsing demand.
        let food_wanted = (1 * WARGA_COUNT * demand_mult / 100).min(20);
        let rice_wanted = (2 * WARGA_COUNT * demand_mult / 100).min(20);

        // buy rice from market
        if market.open {
            let stock = self.balance_of(&market.account_id, BERAS);
            let qty = rice_wanted.min(stock);
            let cost = self.price_of(BERAS) * qty;
            if qty > 0 && warga.cash >= cost as i128 {
                self.transfer_internal(&market.account_id, &warga.account_id, BERAS, qty);
                warga.cash -= cost as i128;
                market.cash += cost as i128;
                market.revenue_today += cost;
            }
        }
        self.npcs.insert("warga".to_string(), warga.clone());
        self.npcs.insert("bupasar".to_string(), market.clone());

        // 5. restaurant cooks
        let mut resto = self.npcs.get(&"busari".to_string()).unwrap().clone();
        if resto.open {
            let rice = self.balance_of(&market.account_id, BERAS).min(2);
            let veg = self.balance_of(&market.account_id, SAYUR).min(2);
            let cost = self.price_of(BERAS) * rice + self.price_of(SAYUR) * veg;
            if rice > 0 && veg > 0 && market.cash >= 0 && resto.cash >= cost as i128 {
                self.transfer_internal(&market.account_id, &resto.account_id, BERAS, rice);
                self.transfer_internal(&market.account_id, &resto.account_id, SAYUR, veg);
                resto.cash -= cost as i128;
                market.cash += cost as i128;
                market.revenue_today += cost;
                self.mint(&resto.account_id, MAKANAN, 4);
            }
        }

        // citizens buy cooked food
        let food_stock = self.balance_of(&resto.account_id, MAKANAN);
        let food_qty = food_wanted.min(food_stock);
        let food_cost = self.price_of(MAKANAN) * food_qty;
        if food_qty > 0 && warga.cash >= food_cost as i128 {
            self.transfer_internal(&resto.account_id, &warga.account_id, MAKANAN, food_qty);
            warga.cash -= food_cost as i128;
            resto.cash += food_cost as i128;
            resto.revenue_today += food_cost;
            // food is consumed: burn it
            self.burn(&warga.account_id, MAKANAN, food_qty);
        }
        self.npcs.insert("busari".to_string(), resto.clone());
        self.npcs.insert("warga".to_string(), warga.clone());
        self.npcs.insert("bupasar".to_string(), market.clone());

        // 6. clothing demand every 7 days
        if day % 7 == 0 {
            let qty = 1u128;
            let cost = self.price_of(PAKAIAN) * qty;
            let mut w = self.npcs.get(&"warga".to_string()).unwrap().clone();
            let mut m = self.npcs.get(&"bupasar".to_string()).unwrap().clone();
            if w.cash >= cost as i128 && self.balance_of(&m.account_id, PAKAIAN) >= qty {
                self.transfer_internal(&m.account_id, &w.account_id, PAKAIAN, qty);
                w.cash -= cost as i128;
                m.cash += cost as i128;
                m.revenue_today += cost;
                self.burn(&w.account_id, PAKAIAN, qty);
            }
            self.npcs.insert("warga".to_string(), w.clone());
            self.npcs.insert("bupasar".to_string(), m.clone());
        }

        // 7. investor profit share (30% of today's revenue)
        for npc_id in ["paktani", "bupasar", "busari", "pabrik"] {
            let mut n = self.npcs.get(&npc_id.to_string()).unwrap().clone();
            if let Some(investor) = n.investor.clone() {
                let payout = n.revenue_today * 30 / 100;
                if payout > 0 && n.cash >= payout as i128 {
                    n.cash -= payout as i128;
                    self.mint(&investor, KOIN, payout);
                    self.log.push(format!(
                        "Hari {}: bagi hasil {} koin ke {} dari {}.",
                        day, payout, investor, npc_id
                    ));
                }
            }
            n.revenue_today = 0;
            self.npcs.insert(npc_id.to_string(), n);
        }

        // 7b. daily operating costs — this is what makes bankruptcy reachable.
        // Without this every purchase is guarded by "can I afford it?", so cash
        // could never go negative and the invest mechanic would be dead code.
        for npc_id in ["paktani", "bupasar", "busari", "pabrik"] {
            let mut n = self.npcs.get(&npc_id.to_string()).unwrap().clone();
            if n.open {
                // Tuned 6 Nov: original values (18/30/28/24) bankrupted every NPC
                // within 85 days, which made the demo open on a dead market.
                let upkeep: i128 = match n.kind.as_str() {
                    // Rebalanced 7 Nov (final): only the farmer runs at a loss, so
                    // the investor has exactly one clear rescue target. Everyone
                    // else is modestly profitable, keeping the market alive for the
                    // whole demo instead of collapsing by day 26.
                    "petani" => 60,
                    "pedagang" => 10,
                    "rumah_makan" => 10,
                    "pabrik" => 10,
                    _ => 0,
                };
                n.cash -= upkeep;
                if n.cash < 0 {
                    self.log.push(format!(
                        "Hari {}: {} tekor, kas minus {} koin.",
                        day, npc_id, -n.cash
                    ));
                }
            }
            self.npcs.insert(npc_id.to_string(), n);
        }

        // 8. bankruptcy check
        for npc_id in ["paktani", "bupasar", "busari", "pabrik"] {
            let mut n = self.npcs.get(&npc_id.to_string()).unwrap().clone();
            if n.cash < 0 {
                n.bankrupt_days += 1;
            } else {
                n.bankrupt_days = 0;
            }
            if n.bankrupt_days >= BANKRUPT_LIMIT && n.open {
                n.open = false;
                self.log.push(format!(
                    "Hari {}: {} BANGKRUT dan tutup toko. Butuh investor.",
                    day, npc_id
                ));
            }
            self.npcs.insert(npc_id.to_string(), n);
        }

        // 9. recompute prices from stock vs target
        for (token, base) in [(BERAS, 10u128), (SAYUR, 6), (MAKANAN, 25), (KAIN, 12), (PAKAIAN, 40)] {
            let holder = if token == MAKANAN { "busari" } else { "bupasar" };
            let npc = self.npcs.get(&holder.to_string()).unwrap().clone();
            let stock = self.balance_of(&npc.account_id, token);
            let target = npc.target_stock.max(1);
            let scarcity_pct: i128 = if stock * 5 < target {
                60
            } else if stock * 5 > target * 6 {
                -40
            } else {
                0
            };
            let event_pct: i128 = match (self.event.as_str(), token) {
                ("gagal_panen", BERAS) | ("gagal_panen", SAYUR) => 40,
                ("festival", MAKANAN) | ("festival", PAKAIAN) => 50,
                ("paceklik", _) => -20,
                _ => 0,
            };
            let price = (base as i128 * (100 + scarcity_pct) / 100)
                * (100 + event_pct)
                / 100;
            self.prices.insert(token.to_string(), price.max(1) as u128);
        }

        // 10. snapshot + trim history
        let snapshot = PricePoint {
            day,
            beras: self.price_of(BERAS),
            sayur: self.price_of(SAYUR),
            makanan: self.price_of(MAKANAN),
            pakaian: self.price_of(PAKAIAN),
        };
        self.price_history.push(snapshot);
        if self.price_history.len() > 60 {
            self.price_history.remove(0);
        }
        if self.log.len() > 40 {
            self.log.remove(0);
        }
    }

    fn world_view(&self) -> WorldView {
        let mut npcs = Vec::new();
        for npc_id in ["paktani", "bupasar", "busari", "pabrik", "warga"] {
            if let Some(n) = self.npcs.get(&npc_id.to_string()) {
                npcs.push(NpcView {
                    npc_id: npc_id.to_string(),
                    account_id: n.account_id.clone(),
                    kind: n.kind.clone(),
                    cash: n.cash,
                    open: n.open,
                    bankrupt_days: n.bankrupt_days,
                    stock: vec![
                        (BERAS.to_string(), U128(self.balance_of(&n.account_id, BERAS))),
                        (SAYUR.to_string(), U128(self.balance_of(&n.account_id, SAYUR))),
                        (MAKANAN.to_string(), U128(self.balance_of(&n.account_id, MAKANAN))),
                        (KAIN.to_string(), U128(self.balance_of(&n.account_id, KAIN))),
                        (PAKAIAN.to_string(), U128(self.balance_of(&n.account_id, PAKAIAN))),
                    ],
                });
            }
        }
        WorldView {
            day: self.day,
            event: self.event.clone(),
            event_days_left: self.event_days_left,
            prices: vec![
                (BERAS.to_string(), U128(self.price_of(BERAS))),
                (SAYUR.to_string(), U128(self.price_of(SAYUR))),
                (MAKANAN.to_string(), U128(self.price_of(MAKANAN))),
                (KAIN.to_string(), U128(self.price_of(KAIN))),
                (PAKAIAN.to_string(), U128(self.price_of(PAKAIAN))),
            ],
            npcs,
            history: self.price_history.clone(),
            log: self.log.clone(),
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct NpcView {
    pub npc_id: String,
    pub account_id: AccountId,
    pub kind: String,
    pub cash: i128,
    pub open: bool,
    pub bankrupt_days: u8,
    pub stock: Vec<(String, U128)>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct WorldView {
    pub day: u32,
    pub event: String,
    pub event_days_left: u32,
    pub prices: Vec<(String, U128)>,
    pub npcs: Vec<NpcView>,
    pub history: Vec<PricePoint>,
    pub log: Vec<String>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct PlayerView {
    pub account_id: AccountId,
    pub koin: U128,
    pub energy: u8,
    pub shares: HashMap<String, u128>,
}
