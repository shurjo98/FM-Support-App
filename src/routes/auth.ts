// src/routes/auth.ts
import { Router } from "express";
import { login, logout } from "../services/authService";

const router = Router();

// POST /auth/login -> { accountId, password } -> { token, name, accountId }
router.post("/login", (req, res) => {
  const { accountId, password } = req.body as { accountId?: string; password?: string };

  if (!accountId || !password) {
    return res.status(400).json({ error: "accountId and password are required" });
  }

  const result = login(accountId, password);
  if (!result) {
    return res.status(401).json({ error: "Invalid account id or password" });
  }

  return res.json({
    token: result.token,
    accountId: result.account.accountId,
    name: result.account.name,
  });
});

router.post("/logout", (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (token) logout(token);
  return res.json({ ok: true });
});

export default router;
