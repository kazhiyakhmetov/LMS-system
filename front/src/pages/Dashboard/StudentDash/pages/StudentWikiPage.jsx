import { useState } from "react";
import styles from "./StudentWikiPage.module.css";
import { wikipediaApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const SUGGESTIONS = [
  "Пифагор", "ДНК", "Фотосинтез", "Великая Отечественная война",
  "Алгоритм", "Эйнштейн", "Климат", "Казахстан",
];

export default function StudentWikiPage() {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function runSearch(q) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      const data = await wikipediaApi.search(text);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || t("common.error"));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    runSearch();
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBody}>
          <span className={styles.heroBadge}>📚 База знаний</span>
          <h2 className={styles.heroTitle}>Найди ответ за секунду</h2>
          <p className={styles.heroSub}>
            Поиск по Википедии прямо из StudIX — пригодится при подготовке к урокам, рефератам и просто из любопытства.
          </p>
        </div>

        <form onSubmit={onSubmit} className={styles.searchForm}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите термин, имя или тему…"
            className={styles.searchInput}
            autoFocus
          />
          <button type="submit" className={styles.searchBtn} disabled={loading || !query.trim()}>
            {loading ? "..." : "Искать"}
          </button>
        </form>
      </section>

      {!hasSearched ? (
        <section className={styles.suggestions}>
          <h3 className={styles.suggestionsTitle}>Популярные темы</h3>
          <div className={styles.chipsRow}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.chip}
                onClick={() => runSearch(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {error ? (
        <div className={styles.errorState}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Ищу в Википедии…</p>
        </div>
      ) : null}

      {!loading && hasSearched && results.length === 0 && !error ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🤔</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            По запросу «{query}» ничего не найдено
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Попробуй переформулировать или проверь орфографию
          </p>
        </div>
      ) : null}

      {!loading && results.length > 0 ? (
        <section className={styles.results}>
          <p className={styles.resultsMeta}>
            Найдено <strong>{results.length}</strong> {results.length === 1 ? "результат" : "результатов"} по запросу «{query}»
          </p>
          <ul className={styles.resultList}>
            {results.map((item, idx) => (
              <li key={`${item.url}-${idx}`} className={styles.resultItem}>
                <div className={styles.resultBody}>
                  <h3 className={styles.resultTitle}>{item.title}</h3>
                  <p className={styles.resultDesc}>{item.description}</p>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.resultLink}
                >
                  Открыть статью →
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
