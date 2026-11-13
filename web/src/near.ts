// NEAR client for Rush Mart.
// Reads use raw JSON-RPC (robust in the browser); writes go through the wallet selector.

import { actionCreators } from "@near-js/transactions";
import type { Wallet } from "@near-wallet-selector/core";
import { CONTRACT_ID, NODE_URL } from "./config";
import type { Action, PlayerView, WorldView } from "./types";

/** Read-only view call — no wallet needed. */
export async function view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(NODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "optimistic",
        account_id: CONTRACT_ID,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });

  const json = (await res.json()) as {
    result?: { result?: number[] };
    error?: { message?: string; data?: string };
  };

  if (json.error) throw new Error(json.error.data ?? json.error.message ?? "RPC error");
  const bytes = json.result?.result ?? [];
  const text = new TextDecoder().decode(new Uint8Array(bytes));
  return JSON.parse(text) as T;
}

export const getWorld = () => view<WorldView>("get_world");
export const getPlayer = (accountId: string) => view<PlayerView>("get_player", { account_id: accountId });

/** The contract's Action enum serializes as { type: "work" } etc. */
function toContractAction(a: Action): Record<string, unknown> {
  switch (a.type) {
    case "work":
      return { type: "work" };
    case "rest":
      return { type: "rest" };
    case "buy":
      return { type: "buy", item_id: a.item_id, qty: a.qty };
    case "sell":
      return { type: "sell", item_id: a.item_id, qty: a.qty };
    case "invest":
      return { type: "invest", npc_id: a.npc_id };
  }
}

const GAS = 300000000000000n;

export async function playDay(wallet: Wallet, signerId: string, actions: Action[]) {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [actionCreators.functionCall("play_day", { actions: actions.map(toContractAction) }, GAS, 0n)],
  });
}

export async function fastForward(wallet: Wallet, signerId: string, days: number) {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [actionCreators.functionCall("fast_forward", { days }, GAS, 0n)],
  });
}

export async function registerPlayer(wallet: Wallet, signerId: string) {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [actionCreators.functionCall("register_player", {}, 100000000000000n, 0n)],
  });
}
