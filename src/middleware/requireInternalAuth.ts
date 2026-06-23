// src/middleware/requireInternalAuth.ts
import type { Request, Response, NextFunction } from "express";
import { getAccountForToken } from "../services/authService";

export function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const account = getAccountForToken(token);

  if (!account) {
    return res.status(401).json({ error: "Not authenticated. Please log in." });
  }

  (req as any).internalAccount = account;
  next();
}
