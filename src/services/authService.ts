// src/services/authService.ts
import crypto from "crypto";
import { internalAccounts } from "../store";
import type { InternalAccount } from "../types";

// In-memory token store. Prototype-only: tokens never expire and are lost on
// server restart. Good enough to gate the internal dashboard for a demo, not
// for production use.
const activeTokens = new Map<string, InternalAccount>();

export function login(accountId: string, password: string): { token: string; account: InternalAccount } | null {
  const account = internalAccounts.find(
    (a) => a.accountId === accountId && a.password === password
  );
  if (!account) return null;

  const token = crypto.randomBytes(24).toString("hex");
  activeTokens.set(token, account);
  return { token, account };
}

export function getAccountForToken(token: string | undefined | null): InternalAccount | null {
  if (!token) return null;
  return activeTokens.get(token) ?? null;
}

export function logout(token: string): void {
  activeTokens.delete(token);
}
