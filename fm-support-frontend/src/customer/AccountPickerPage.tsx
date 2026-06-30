import { useEffect, useRef, useState } from "react";
import { portalLogin, listPortalFactories, type PortalFactory } from "../api";
import type { CustomerUser } from "../types";
import { useLang } from "./i18n";

export default function AccountPickerPage({ onPick }: { onPick: (user: CustomerUser) => void }) {
  const { t, lang, setLang } = useLang();
  const [factories, setFactories] = useState<PortalFactory[]>([]);
  const [selected, setSelected] = useState<PortalFactory | null>(null);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const inputRefs = [ref0, ref1, ref2, ref3];

  useEffect(() => {
    listPortalFactories().then(setFactories).catch(() => null);
  }, []);

  async function handleLogin(factory: PortalFactory, pinValue: string) {
    setLoading(true);
    setError(null);
    try {
      const user = await portalLogin(factory.id, pinValue || undefined);
      onPick(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setPin(["", "", "", ""]);
      setTimeout(() => ref0.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  function selectFactory(f: PortalFactory) {
    setSelected(f);
    setPin(["", "", "", ""]);
    setError(null);
    if (!f.requiresPin) {
      handleLogin(f, "");
    } else {
      setTimeout(() => ref0.current?.focus(), 80);
    }
  }

  function handlePinDigit(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin];
    next[idx] = val;
    setPin(next);
    setError(null);
    if (val && idx < 3) inputRefs[idx + 1]?.current?.focus();
    if (next.every((d) => d !== "")) handleLogin(selected!, next.join(""));
  }

  function handlePinKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      inputRefs[idx - 1]?.current?.focus();
    }
  }

  return (
    <div className="cust-picker-page">
      <div className="cust-lang-toggle" style={{ width: 120, marginBottom: 24 }}>
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
        <button className={lang === "bn" ? "active" : ""} onClick={() => setLang("bn")}>বাংলা</button>
      </div>

      <div className="cust-logo-badge" style={{ width: 64, height: 64, marginBottom: 12 }}>
        <img src="/public/logo/No_BG.png" alt="FM" />
      </div>
      <h1 style={{ margin: "0 0 4px" }}>FM Factory Support</h1>
      <p style={{ opacity: 0.7, fontSize: "0.9rem", marginBottom: 32 }}>{t("picker.subtitle")}</p>

      {!selected ? (
        <>
          <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 20, textAlign: "center" }}>Select your factory to sign in</p>
          <div className="cust-picker-grid">
            {factories.map((f) => (
              <button
                key={f.id}
                className="cust-card cust-card-clickable cust-picker-card"
                onClick={() => selectFactory(f)}
                disabled={loading}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏭</div>
                <div className="cust-picker-card-name">{f.name}</div>
                {f.location && <div className="cust-picker-card-org">{f.location}</div>}
                {f.requiresPin && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#4fb3e8" }}>🔒 PIN required</div>
                )}
              </button>
            ))}
          </div>
          {loading && <p style={{ opacity: 0.6, fontSize: 13, marginTop: 16 }}>Signing in…</p>}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", maxWidth: 320 }}>
          <button
            onClick={() => { setSelected(null); setError(null); setLoading(false); }}
            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}
          >
            ← Back
          </button>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏭</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{selected.name}</div>
            {selected.location && <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{selected.location}</div>}
          </div>

          {selected.requiresPin && (
            <>
              <div style={{ fontSize: 14, opacity: 0.7 }}>Enter your 4-digit PIN</div>
              <div style={{ display: "flex", gap: 12 }}>
                {pin.map((d, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handlePinDigit(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    disabled={loading}
                    style={{
                      width: 52, height: 60, textAlign: "center", fontSize: 26, fontWeight: 700,
                      borderRadius: 10,
                      border: `2px solid ${error ? "#dc2626" : d ? "#4fb3e8" : "rgba(148,163,184,0.3)"}`,
                      background: "rgba(255,255,255,0.07)", color: "white",
                      outline: "none", caretColor: "transparent",
                    }}
                  />
                ))}
              </div>
              {error && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              {loading && <div style={{ color: "#9ca3af", fontSize: 13 }}>Verifying PIN…</div>}
            </>
          )}

          {!selected.requiresPin && loading && (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>Signing in…</div>
          )}
          {!selected.requiresPin && error && (
            <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
