// src/services/cacheService.ts
import { prisma } from "../db";
import type { CachedAnswer, IssueType } from "../types";
import type { SuggestionLang } from "./aiService";

export function buildCacheKey(issueType: IssueType, description: string, lang: SuggestionLang = "en"): string {
  // super simple key for now: only issueType + lang.
  // later you can make it smarter (normalize text, machine model, etc.)
  return `issue:${issueType}:${lang}`;
}

export async function getCachedAnswer(key: string): Promise<CachedAnswer | null> {
  const row = await prisma.cachedAnswer.findUnique({ where: { key } });
  return row as CachedAnswer | null;
}

export async function setCachedAnswer(key: string, issueType: IssueType, text: string): Promise<CachedAnswer> {
  const row = await prisma.cachedAnswer.upsert({
    where: { key },
    update: { issueType, text },
    create: { key, issueType, text },
  });
  return row as CachedAnswer;
}
