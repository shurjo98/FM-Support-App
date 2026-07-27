import { useEffect, useState, type FormEvent } from "react";
import { searchPortal } from "../api";
import { useLang, type Lang } from "./i18n";
import type { CustomerSection } from "./CustomerLayout";
import type { PortalSearchResult } from "../types";
import CallTechnicianButton from "./CallTechnicianButton";

const EXAMPLE_CHIPS: { en: string; bn: string }[] = [
  { en: "Err-01", bn: "Err-01" },
  { en: "thread keeps breaking", bn: "থ্রেড বারবার ছিঁড়ে যাচ্ছে" },
  { en: "needle keeps bending", bn: "সুঁই বারবার বেঁকে যাচ্ছে" },
];

export default function PortalSearchBar({
  onNavigate,
  compact = false,
}: {
  onNavigate: (section: CustomerSection) => void;
  // Pages other than Overview already have their own task-specific content
  // below — showing the full "how to ask" example panel there just pushes
  // that content further down the screen, so it starts collapsed there.
  compact?: boolean;
}) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PortalSearchResult | null>(null);
  const [resultLang, setResultLang] = useState<Lang>(lang);
  const [error, setError] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(!compact);

  // PortalSearchBar is mounted once in CustomerLayout and persists across
  // page navigation — `compact` changes on every page switch, but a
  // useState initializer only runs on first mount, so without this the
  // hint would stay stuck open (or closed) from whichever page loaded first.
  useEffect(() => {
    setHintOpen(!compact);
  }, [compact]);

  async function runSearch(q: string, searchLang: Lang) {
    if (!q.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await searchPortal(q.trim(), searchLang);
      setResult(res);
      setResultLang(searchLang);
      setLastQuery(q.trim());
      if (res.action === "navigate" && res.section) onNavigate(res.section);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch(query, lang);
  }

  function toggleResultLang() {
    const next: Lang = resultLang === "bn" ? "en" : "bn";
    void runSearch(lastQuery, next);
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

      {!result && !error && !hintOpen && (
        <button type="button" className="cust-search-hint-toggle" onClick={() => setHintOpen(true)}>
          {t("search.helperTitle")}?
        </button>
      )}

      {!result && !error && hintOpen && (
        <div className="cust-search-hint">
          <span className="cust-search-hint-title">{t("search.helperTitle")}:</span>
          <div className="cust-search-chips">
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip.en}
                type="button"
                className="cust-search-chip"
                onClick={() => setQuery(lang === "bn" ? chip.bn : chip.en)}
              >
                {lang === "bn" ? chip.bn : chip.en}
              </button>
            ))}
          </div>
          <div className="cust-search-hint-note">{t("search.helperModel")}</div>
        </div>
      )}

      {error && (
        <div className="cust-search-result error">
          <div>{error}</div>
        </div>
      )}

      {result && !error && result.kb && (
        <div className="cust-search-result cust-kb-card">
          <div className="cust-kb-badges">
            <span className="cust-kb-badge cust-kb-badge-model">{result.kb.model}</span>
            {result.kb.code && <span className="cust-kb-badge cust-kb-badge-code">{result.kb.code}</span>}
          </div>
          <div className="cust-kb-title">{result.kb.title}</div>
          {result.kb.ambiguous && <div className="cust-kb-ambiguous">⚠️ {t("search.ambiguousNote")}</div>}
          <div className="cust-kb-solution-label">{t("search.solution")}</div>
          <ol className="cust-kb-steps">
            {result.kb.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="cust-kb-footer">
            <span className="cust-kb-source">📖 {t("search.source")}: {result.kb.model}</span>
            <button type="button" className="cust-kb-lang-toggle" onClick={toggleResultLang} disabled={loading}>
              {loading ? t("search.translating") : resultLang === "bn" ? "View in English" : "বাংলায় দেখুন"}
            </button>
          </div>
          {result.kb.translated && <div className="cust-kb-translated-note">🌐 {t("search.machineTranslated")}</div>}
          <CallTechnicianButton />
        </div>
      )}

      {result && !error && !result.kb && (
        <div className="cust-search-result">
          <div>{result.message}</div>
          {result.action === "answer" && <CallTechnicianButton />}
        </div>
      )}
    </div>
  );
}
