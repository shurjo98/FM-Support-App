import { useEffect, useState } from "react";
import { fetchNotificationLog, UnauthorizedError } from "../api";
import type { NotificationLogEntry } from "../types";

const STATUS_COLORS: Record<string, string> = {
  SIMULATED: "#9333ea",
  SENT: "#16a34a",
  FAILED: "#dc2626",
};

export default function NotificationsPage({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [data, setData] = useState<NotificationLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotificationLog(token)
      .then(setData)
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }, [token, onUnauthorized]);

  if (error) return <div className="page-error">Failed to load notifications: {error}</div>;
  if (!data) return <div className="page-loading">Loading notifications...</div>;

  return (
    <div className="assignments">
      <p className="empty" style={{ marginBottom: 16 }}>
        No SMS/WhatsApp provider is connected yet — every entry below is simulated (logged, not
        actually sent). Wire up Twilio (or another provider) in notificationService.ts to start
        sending real messages.
      </p>

      <div className="assignment-card">
        <div className="assignment-header">
          <h2>Notification Log</h2>
          <span>{data.length} total</span>
        </div>
        {data.length === 0 ? (
          <p className="empty">No notifications yet.</p>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Factory</th>
                <th>Channel</th>
                <th>To</th>
                <th>Message</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {data.map((n) => (
                <tr key={n.id}>
                  <td>{n.factoryName}</td>
                  <td>{n.channel}</td>
                  <td>{n.toPhone ?? "—"}</td>
                  <td>{n.message}</td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[n.status] }}>
                      {n.status}
                    </span>
                  </td>
                  <td>{new Date(n.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
