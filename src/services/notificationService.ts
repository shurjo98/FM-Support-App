// src/services/notificationService.ts
import { prisma } from "../db";
import type { NotificationChannel, NotificationLogEntry } from "../types";

// No SMS/WhatsApp provider is configured yet (no TWILIO_* env vars), so
// every notification is simulated: logged here and recorded in
// notificationLog for the internal team to review. Swap in a real provider
// call where the console.log is, once credentials are available.
export async function notify(params: {
  organizationId: string;
  phone?: string | undefined;
  message: string;
  channel?: NotificationChannel | undefined;
}): Promise<NotificationLogEntry> {
  const { organizationId, phone, message, channel = "SMS" } = params;

  console.log(`[notify:SIMULATED] ${channel} to ${phone ?? "unknown number"}: ${message}`);

  const entry = await prisma.notificationLogEntry.create({
    data: {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      organizationId,
      toPhone: phone ?? null,
      channel,
      message,
      status: "SIMULATED",
    },
  });

  return { ...entry, createdAt: entry.createdAt.toISOString() } as NotificationLogEntry;
}
