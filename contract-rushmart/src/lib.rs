//! Rush Mart — kontrak pencatatan aktivitas + token hasil panen (NEP-245 lite).
//!
//! Dua lapis penyimpanan:
//!   1. EVENT (NEP-297) -> rincian tiap aksi, murah (hanya gas), permanen.
//!   2. STATE           -> ringkasan per pemain + papan skor, bisa dibaca cepat.
//!
//! Token (NEP-245 lite): panen mencetak token hasil panen (corn/tomato/carrot/potato);
//! penjualan ke pelanggan membakar token sejumlah barang yang terjual.
//!
//! Catatan jujur: kontrak menerima laporan dari klien game (bukan bukti kriptografis).
//! Batas kewajaran dipasang di tiap fungsi (MAX_*), dan keterbatasan ini ditulis di README.

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::store::{LookupMap, UnorderedMap};
use near_sdk::{env, near, AccountId, PanicOnDefault};
use serde::{Deserialize, Serialize};

// Batas per satu panggilan (pagar anti-laporan ngawur).
const MAX_QTY: u32 = 15;
const MAX_COINS: u64 = 500;
const MAX_PROFIT: i64 = 1000;
// Catatan terakhir yang disimpan per pemain (hemat storage).
const MAX_RECENT: usize = 12;

// ── Tipe data ───────────────────────────────────────────────────────────────

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Default)]
pub struct PlayerStats {
    pub seeds_bought: u32,
    pub harvested: u32,
    pub items_sold: u32,
    pub refilled: u32,
    pub spent: u64,
    pub revenue: u64,
    pub loss: u64,
    pub rounds: u32,
    pub best_profit: i64,
    pub corn: u32,
    pub tomato: u32,
    pub carrot: u32,
    pub potato: u32,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct EventRecord {
    pub kind: String,
    pub item: String,
    pub qty: u32,
    pub coins: u64,
    pub npc: String,
    pub profit: i64,
    pub block: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct BalanceKey {
    pub account: AccountId,
    pub token: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TokenMetadata {
    pub token_id: String,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
}

// ── Kontrak ─────────────────────────────────────────────────────────────────

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    pub owner: AccountId,
    stats: LookupMap<AccountId, PlayerStats>,
    best: UnorderedMap<AccountId, i64>,
    recent: LookupMap<AccountId, Vec<EventRecord>>,
    balances: LookupMap<BalanceKey, u128>,
    supply: LookupMap<String, u128>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            stats: LookupMap::new(b"s"),
            best: UnorderedMap::new(b"b"),
            recent: LookupMap::new(b"r"),
            balances: LookupMap::new(b"l"),
            supply: LookupMap::new(b"u"),
        }
    }

    // ── Pencatatan aksi (dipanggil kunci sesi pemain) ───────────────────────

    /// Beli bibit di tenda BUY SEED.
    pub fn record_purchase(&mut self, crop: String, qty: u32, coins: u64) {
        assert!(qty > 0 && qty <= MAX_QTY, "qty di luar batas");
        assert!(coins <= MAX_COINS, "coins di luar batas");
        let who = env::predecessor_account_id();
        let mut s = self.stats.get(&who).cloned().unwrap_or_default();
        s.seeds_bought += qty;
        s.spent += coins;
        self.stats.insert(who.clone(), s.clone());
        self.log_event("buy_seeds", &crop, qty, coins, "", 0);
        self.push_recent(&who, "buy_seeds", &crop, qty, coins, "", 0);
    }

    /// Tanam bibit di petak lahan.
    pub fn record_plant(&mut self, crop: String, qty: u32) {
        assert!(qty > 0 && qty <= MAX_QTY, "qty di luar batas");
        let who = env::predecessor_account_id();
        self.log_event("plant", &crop, qty, 0, "", 0);
        self.push_recent(&who, "plant", &crop, qty, 0, "", 0);
    }

    /// Panen: tambah ringkasan + cetak token NEP-245.
    pub fn record_harvest(&mut self, crop: String, qty: u32) {
        assert!(qty > 0 && qty <= MAX_QTY, "qty di luar batas");
        let who = env::predecessor_account_id();
        let mut s = self.stats.get(&who).cloned().unwrap_or_default();
        s.harvested += qty;
        match crop.as_str() {
            "corn" => s.corn += qty,
            "tomato" => s.tomato += qty,
            "carrot" => s.carrot += qty,
            "potato" => s.potato += qty,
            _ => env::panic_str("tanaman tidak dikenal"),
        }
        self.stats.insert(who.clone(), s);

        self.mint(&who, &crop, qty as u128);
        self.log_event("harvest", &crop, qty, 0, "", 0);
        self.push_recent(&who, "harvest", &crop, qty, 0, "", 0);
    }

    /// Pelanggan membayar: token sejumlah barang terjual dibakar.
    pub fn record_sale(&mut self, npc: String, items: Vec<(String, u32)>, coins: u64, profit: i64) {
        assert!(coins <= MAX_COINS, "coins di luar batas");
        let who = env::predecessor_account_id();

        let mut sold = 0u32;
        for (crop, qty) in items.iter() {
            assert!(*qty <= MAX_QTY, "qty di luar batas");
            sold += *qty;
            self.burn(&who, crop, *qty as u128);
        }

        let mut s = self.stats.get(&who).cloned().unwrap_or_default();
        s.items_sold += sold;
        s.revenue += coins;
        self.stats.insert(who.clone(), s);

        let summary = items
            .iter()
            .map(|(c, q)| format!("{}x{}", c, q))
            .collect::<Vec<_>>()
            .join(",");
        self.log_event("npc_paid", &summary, sold, coins, &npc, profit);
        self.push_recent(&who, "npc_paid", &summary, sold, coins, &npc, profit);
    }

    /// Pelanggan gagal dilayani (kabur / salah kembalian).
    pub fn record_fail(&mut self, npc: String, reason: String, loss: u64) {
        assert!(loss <= MAX_COINS, "loss di luar batas");
        let who = env::predecessor_account_id();
        let mut s = self.stats.get(&who).cloned().unwrap_or_default();
        s.loss += loss;
        self.stats.insert(who.clone(), s);
        self.log_event("npc_failed", &reason, 0, loss, &npc, 0);
        self.push_recent(&who, "npc_failed", &reason, 0, loss, &npc, 0);
    }

    /// Barang dimasukkan ke rak display.
    pub fn record_refill(&mut self, crop: String, qty: u32) {
        assert!(qty > 0 && qty <= MAX_QTY, "qty di luar batas");
        let who = env::predecessor_account_id();
        let mut s = self.stats.get(&who).cloned().unwrap_or_default();
        s.refilled += qty;
        self.stats.insert(who.clone(), s);
        self.log_event("refill", &crop, qty, 0, "", 0);
        self.push_recent(&who, "refill", &crop, qty, 0, "", 0);
    }

    /// Ronde selesai: simpan laba, perbarui rekor + papan skor.
    pub fn record_round(&mut self, profit: i64, served: u32, failed: u32, secs: u32) {
        assert!(profit.abs() <= MAX_PROFIT, "profit di luar batas");
        assert!(secs <= 600, "durasi tidak wajar");
        let who = env::predecessor_account_id();

        let mut s = self.stats.get(&who).cloned().unwrap_or_default();
        s.rounds += 1;
        if profit > s.best_profit {
            s.best_profit = profit;
            self.best.insert(who.clone(), profit);
        }
        self.stats.insert(who.clone(), s);

        let note = format!("served:{} failed:{} secs:{}", served, failed, secs);
        self.log_event("round_end", &note, served, profit.max(0) as u64, "", profit);
        self.push_recent(&who, "round_end", &note, 0, 0, "", profit);
    }

    // ── Pembacaan ───────────────────────────────────────────────────────────

    pub fn get_stats(&self, account_id: AccountId) -> PlayerStats {
        self.stats.get(&account_id).cloned().unwrap_or_default()
    }

    pub fn get_top(&self, n: u32) -> Vec<(AccountId, i64)> {
        let mut rows: Vec<(AccountId, i64)> =
            self.best.iter().map(|(a, v)| (a.clone(), *v)).collect();
        rows.sort_by(|a, b| b.1.cmp(&a.1));
        rows.truncate(n as usize);
        rows
    }

    pub fn get_recent(&self, account_id: AccountId) -> Vec<EventRecord> {
        self.recent.get(&account_id).cloned().unwrap_or_default()
    }

    // ── NEP-245 lite ────────────────────────────────────────────────────────

    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 {
        U128(self.balance(&account_id, &token_id))
    }

    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<U128> {
        token_ids
            .iter()
            .map(|t| U128(self.balance(&account_id, t)))
            .collect()
    }

    pub fn mt_supply(&self, token_id: String) -> U128 {
        U128(self.supply.get(&token_id).cloned().unwrap_or(0))
    }

    pub fn mt_metadata(&self, token_ids: Vec<String>) -> Vec<TokenMetadata> {
        token_ids.iter().map(|t| self.meta_for(t)).collect()
    }

    /// Kirim hasil panen ke pemain lain (lite: tanpa sistem approval).
    pub fn mt_transfer(&mut self, receiver_id: AccountId, token_id: String, amount: U128) {
        let sender = env::predecessor_account_id();
        assert!(sender != receiver_id, "tidak bisa kirim ke diri sendiri");
        assert!(amount.0 > 0, "jumlah harus lebih dari nol");
        self.burn(&sender, &token_id, amount.0);
        self.mint(&receiver_id, &token_id, amount.0);
        self.log_event(
            "mt_transfer",
            &token_id,
            amount.0 as u32,
            0,
            &receiver_id.to_string(),
            0,
        );
    }

    // ── Internal ────────────────────────────────────────────────────────────

    fn balance(&self, account: &AccountId, token: &str) -> u128 {
        self.balances
            .get(&BalanceKey {
                account: account.clone(),
                token: token.to_string(),
            })
            .cloned()
            .unwrap_or(0)
    }

    fn mint(&mut self, account: &AccountId, token: &str, amount: u128) {
        if amount == 0 {
            return;
        }
        let key = BalanceKey {
            account: account.clone(),
            token: token.to_string(),
        };
        let now = self.balances.get(&key).cloned().unwrap_or(0);
        self.balances.insert(key, now + amount);
        let t = token.to_string();
        let sup = self.supply.get(&t).cloned().unwrap_or(0);
        self.supply.insert(t, sup + amount);
    }

    fn burn(&mut self, account: &AccountId, token: &str, amount: u128) {
        if amount == 0 {
            return;
        }
        let key = BalanceKey {
            account: account.clone(),
            token: token.to_string(),
        };
        let now = self.balances.get(&key).cloned().unwrap_or(0);
        let left = now.saturating_sub(amount);
        self.balances.insert(key, left);
        let t = token.to_string();
        let sup = self.supply.get(&t).cloned().unwrap_or(0);
        self.supply.insert(t, sup.saturating_sub(amount));
    }

    fn meta_for(&self, token_id: &str) -> TokenMetadata {
        let (name, symbol) = match token_id {
            "corn" => ("Rush Mart Corn", "CORN"),
            "tomato" => ("Rush Mart Tomato", "TOMATO"),
            "carrot" => ("Rush Mart Carrot", "CARROT"),
            "potato" => ("Rush Mart Potato", "POTATO"),
            _ => ("Rush Mart Item", "ITEM"),
        };
        TokenMetadata {
            token_id: token_id.to_string(),
            name: name.to_string(),
            symbol: symbol.to_string(),
            decimals: 0,
        }
    }

    fn push_recent(
        &mut self,
        who: &AccountId,
        kind: &str,
        item: &str,
        qty: u32,
        coins: u64,
        npc: &str,
        profit: i64,
    ) {
        let mut list = self.recent.get(who).cloned().unwrap_or_default();
        list.push(EventRecord {
            kind: kind.to_string(),
            item: item.to_string(),
            qty,
            coins,
            npc: npc.to_string(),
            profit,
            block: env::block_height(),
        });
        if list.len() > MAX_RECENT {
            let skip = list.len() - MAX_RECENT;
            list.drain(0..skip);
        }
        self.recent.insert(who.clone(), list);
    }

    /// Event NEP-297 dengan standar "rushmart".
    fn log_event(&self, kind: &str, item: &str, qty: u32, coins: u64, npc: &str, profit: i64) {
        let payload = format!(
            "EVENT_JSON:{{\"standard\":\"rushmart\",\"version\":\"1.0.0\",\"event\":\"{}\",\"data\":{{\"account\":\"{}\",\"item\":\"{}\",\"qty\":{},\"coins\":{},\"npc\":\"{}\",\"profit\":{}}}}}",
            kind,
            env::predecessor_account_id(),
            item,
            qty,
            coins,
            npc,
            profit
        );
        env::log_str(&payload);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn ctx(who: &str) {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(who.parse().unwrap());
        b.block_height(1_000);
        testing_env!(b.build());
    }

    #[test]
    fn harvest_sale_round_flow() {
        ctx("alice.testnet");
        let mut c = Contract::new("owner.testnet".parse().unwrap());

        c.record_purchase("corn".to_string(), 15, 30);
        c.record_plant("corn".to_string(), 15);
        c.record_harvest("corn".to_string(), 12);

        let a: AccountId = "alice.testnet".parse().unwrap();
        assert_eq!(c.mt_balance_of(a.clone(), "corn".to_string()).0, 12);

        c.record_sale(
            "Village Woman".to_string(),
            vec![("corn".to_string(), 5)],
            20,
            10,
        );
        assert_eq!(c.mt_balance_of(a.clone(), "corn".to_string()).0, 7);

        c.record_round(118, 12, 3, 150);
        let s = c.get_stats(a.clone());
        assert_eq!(s.harvested, 12);
        assert_eq!(s.items_sold, 5);
        assert_eq!(s.seeds_bought, 15);
        assert_eq!(s.best_profit, 118);
        assert_eq!(c.get_top(5).len(), 1);
        assert_eq!(c.get_recent(a).len(), 5);
    }
}
