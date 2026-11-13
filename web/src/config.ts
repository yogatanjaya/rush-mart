// Rush Mart — frontend configuration.
// The contract address is printed by the deploy script (see nearops/v3.json).
// For the hackathon demo we point at the latest v3 testnet deployment.

export const NETWORK_ID = "testnet";
export const NODE_URL = import.meta.env.DEV ? "/near-rpc" : "https://rpc.testnet.near.org";
export const CONTRACT_ID = "pasar-pagi-17536.testnet";
export const WALLET_URL = "https://testnet.mynearwallet.com";

export const ITEMS: { id: string; label: string; icon: string; category: string }[] = [
  { id: "beras", label: "Beras", icon: "🌾", category: "bahan" },
  { id: "sayur", label: "Sayur", icon: "🥬", category: "bahan" },
  { id: "makanan", label: "Makanan Jadi", icon: "🍛", category: "konsumsi" },
  { id: "kain", label: "Kain", icon: "🧵", category: "bahan" },
  { id: "pakaian", label: "Pakaian", icon: "👕", category: "konsumsi" },
];

export const NPC_LABEL: Record<string, string> = {
  paktani: "Pak Tani",
  bupasar: "Bu Pasar",
  busari: "Bu Sari",
  pabrik: "Pabrik",
  warga: "Warga",
};

export const NPC_ICON: Record<string, string> = {
  paktani: "👨‍🌾",
  bupasar: "🏪",
  busari: "🍲",
  pabrik: "🏭",
  warga: "🧑‍🌾",
};

export const EVENT_LABEL: Record<string, string> = {
  normal: "Hari biasa",
  gagal_panen: "Gagal panen",
  festival: "Festival pasar",
  paceklik: "Paceklik",
};

export const EVENT_ICON: Record<string, string> = {
  normal: "☀️",
  gagal_panen: "🌧️",
  festival: "🎉",
  paceklik: "🥀",
};
