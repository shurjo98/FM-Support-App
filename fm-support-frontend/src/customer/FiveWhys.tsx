import { useState } from "react";
import { ChevronDown } from "lucide-react";

const MAX_WHYS = 5;

// Toyota's root-cause technique, opt-in: collapsed by default so it never
// slows down reporting something urgent, but one tap reveals a "why" chain
// that grows one box at a time as each answer is filled in.
export default function FiveWhys({ value, onChange }: { value: string[]; onChange: (whys: string[]) => void }) {
  const [open, setOpen] = useState(value.some((w) => w.trim().length > 0));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#403D88", fontSize: 12.5, fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 4 }}
      >
        <ChevronDown size={13} /> Add root cause (5 Whys) — optional
      </button>
    );
  }

  const visibleCount = Math.min(MAX_WHYS, value.filter((w) => w.trim()).length + 1);
  const rows = Array.from({ length: visibleCount });

  function setWhy(i: number, text: string) {
    const next = [...value];
    while (next.length <= i) next.push("");
    next[i] = text;
    onChange(next);
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 12, color: "rgba(36,31,66,0.62)", marginBottom: 6, fontWeight: 600 }}>
        Root cause (5 Whys) — optional, but helps prevent it happening again
      </div>
      {rows.map((_, i) => (
        <input
          key={i}
          className="cust-input"
          value={value[i] ?? ""}
          onChange={(e) => setWhy(i, e.target.value)}
          placeholder={i === 0 ? "Why did this happen?" : "Why did that happen?"}
          style={{ width: "100%", marginBottom: 8 }}
        />
      ))}
    </div>
  );
}
