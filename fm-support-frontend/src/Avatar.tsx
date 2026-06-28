import { useState } from "react";

export function initials(name: string): string {
  const withoutTitle = name.replace(/\(.*?\)/g, "").trim();
  return withoutTitle.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Avatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);

  if (avatarUrl && !broken) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="avatar-img"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="kanban-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} title={name}>
      {initials(name)}
    </span>
  );
}
