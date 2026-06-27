// src/routes/push.ts
import { Router } from "express";
import { prisma } from "../db";
import { getVapidPublicKey } from "../services/pushService";

const router = Router();

// GET /push/vapid-public-key -> the public key the frontend needs to
// register a push subscription. Null if VAPID keys aren't configured yet.
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// POST /push/subscribe -> register a browser/device for push, for one account
router.post("/subscribe", async (req, res) => {
  const { accountId, subscription } = req.body as {
    accountId: string;
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  };

  if (!accountId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: "accountId and a valid subscription are required" });
  }

  const account = await prisma.internalAccount.findUnique({ where: { id: accountId } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { accountId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      accountId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  res.status(201).json({ ok: true });
});

// POST /push/unsubscribe -> remove a device's subscription
router.post("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) return res.status(400).json({ error: "endpoint is required" });

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  res.json({ ok: true });
});

export default router;
