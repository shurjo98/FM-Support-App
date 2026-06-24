// src/services/authService.ts
import crypto from "crypto";
import { prisma } from "../db";
import type { InternalAccount } from "../types";

// In-memory token store. Prototype-only: tokens are lost on server restart
// and aren't shared across multiple server instances. Fine for a single
// Render instance with REQUIRE_LOGIN currently disabled; swap for a sessions
// table if the app is ever scaled horizontally.
const activeTokens = new Map<string, InternalAccount>();

export async function login(accountId: string, password: string): Promise<{ token: string; account: InternalAccount } | null> {
  const account = await prisma.internalAccount.findFirst({
    where: { accountId, password },
  });
  if (!account) return null;

  const token = crypto.randomBytes(24).toString("hex");
  activeTokens.set(token, account as InternalAccount);
  return { token, account: account as InternalAccount };
}

export function getAccountForToken(token: string | undefined | null): InternalAccount | null {
  if (!token) return null;
  return activeTokens.get(token) ?? null;
}

export function logout(token: string): void {
  activeTokens.delete(token);
}
