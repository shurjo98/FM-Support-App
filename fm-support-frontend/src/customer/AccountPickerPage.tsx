import { useEffect, useState } from "react";
import { fetchCustomerUsers } from "../api";
import type { CustomerUser } from "../types";
import { useLang } from "./i18n";

export default function AccountPickerPage({ onPick }: { onPick: (user: CustomerUser) => void }) {
  const { t, lang, setLang } = useLang();
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="cust-picker-page">
      <div className="cust-lang-toggle" style={{ width: 120, marginBottom: 16 }}>
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
          EN
        </button>
        <button className={lang === "bn" ? "active" : ""} onClick={() => setLang("bn")}>
          বাংলা
        </button>
      </div>

      <div className="cust-logo-badge" style={{ width: 64, height: 64 }}>
        <img src="/public/logo/No_BG.png" alt="FM" />
      </div>
      <h1 style={{ margin: "16px 0 4px" }}>FM Factory Support</h1>
      <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>{t("picker.subtitle")}</p>

      {error && <div className="cust-error">{error}</div>}

      <div className="cust-picker-grid">
        {users.map((user) => (
          <div
            key={user.id}
            className="cust-card cust-card-clickable cust-picker-card"
            onClick={() => onPick(user)}
          >
            <div className="cust-picker-card-name">{user.name}</div>
            <div className="cust-picker-card-org">{user.organizationName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
