import { useState, type FormEvent } from "react";
import { portalLogin } from "../api";
import type { CustomerUser } from "../types";
import { useLang } from "./i18n";

export default function AccountPickerPage({ onPick }: { onPick: (user: CustomerUser) => void }) {
  const { t, lang, setLang } = useLang();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const user = await portalLogin(userId.trim(), password);
      onPick(user);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
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

      <form className="cust-card cust-form" onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320, textAlign: "left" }}>
        <label>
          User ID
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoComplete="username"
            autoFocus
            disabled={loading}
            placeholder="FM"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
            placeholder="1111"
          />
        </label>

        {loginError && <div className="cust-error">{loginError}</div>}

        <button
          type="submit"
          className="cust-button"
          disabled={loading || !userId.trim() || !password}
          style={{ width: "100%" }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
