// src/services/pushService.ts
import webpush from "web-push";
import { prisma } from "../db";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@fmcorporation.com";

const isConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
} else {
  console.warn("[push] VAPID keys not set — push notifications are disabled until VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are configured.");
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null;
}

// Best-effort: pushes to every device an account has registered, and quietly
// drops subscriptions the browser has revoked (HTTP 410/404 from the push
// service) so they stop being retried forever.
export async function sendPushToAccount(accountId: string, payload: { title: string; body: string; url?: string }) {
  if (!isConfigured) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { accountId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[push] failed to send:", err?.message || err);
        }
      }
    })
  );
}
