import { useState, type FormEvent } from "react";
import { searchPortal } from "../api";
import { useLang } from "./i18n";
import type { CustomerSection } from "./CustomerLayout";
import CallTechnicianButton from "./CallTechnicianButton";

export default function PortalSearchBar({ onNavigate }: { onNavigate: (section: CustomerSection) => void }) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const result = await searchPortal(query.trim(), lang);
      if (result.action === "navigate" && result.section) {
        onNavigate(result.section);
        setAnswer(result.message);
      } else {
        setAnswer(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cust-search-wrap">
      <form className="cust-search-bar" onSubmit={handleSubmit}>
        <span className="cust-search-icon">🔎</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? t("search.thinking") : t("search.button")}
        </button>
      </form>
      {(answer || error) && (
        <div className={`cust-search-result ${error ? "error" : ""}`}>
          <div>{error ?? answer}</div>
          {!error && <CallTechnicianButton />}
        </div>
      )}
    </div>
  );
}
