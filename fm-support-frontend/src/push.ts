import { fetchVapidPublicKey, subscribePush, unsubscribePush } from "./api";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))) as BufferSource;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// Registers the service worker, asks for notification permission, and tells
// the backend which device to push to. Returns a human-readable result so
// the UI can show what happened (permission denied, unsupported browser,
// VAPID not configured server-side yet, etc.) instead of failing silently.
export async function enablePushNotifications(accountId: string): Promise<{ ok: boolean; message: string }> {
  if (!isPushSupported()) {
    return { ok: false, message: "This browser doesn't support push notifications." };
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { ok: false, message: "Push isn't configured on the server yet." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Notification permission was denied." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } };
  if (!json.keys) return { ok: false, message: "Subscription was missing encryption keys." };

  await subscribePush(accountId, { endpoint: json.endpoint, keys: json.keys });
  return { ok: true, message: "Notifications enabled on this device." };
}

export async function disablePushNotifications(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await unsubscribePush(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  }
}
