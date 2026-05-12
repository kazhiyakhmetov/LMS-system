import { useState } from "react";
import styles from "./StudentLibraryPage.module.css";
import { libraryApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const SUGGESTIONS = [
  "математика", "физика", "литература", "история",
  "биология", "химия", "программирование", "Пушкин",
];

function formatAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return "Автор не указан";
  if (authors.length <= 2) return authors.join(", ");
  return `${authors.slice(0, 2).join(", ")} и ещё ${authors.length - 2}`;
}

export default function StudentLibraryPage() {
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
      const data = await libraryApi.search(text);
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
          <span className={styles.heroBadge}>📖 Библиотека</span>
          <h2 className={styles.heroTitle}>Найди книгу для учёбы</h2>
          <p className={styles.heroSub}>
            Поиск по миллионам книг на Open Library — пригодится для рефератов, проектов и чтения для души.
          </p>
        </div>

        <form onSubmit={onSubmit} className={styles.searchForm}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите название книги, автора или тему…"
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
          <p>Ищу книги в Open Library…</p>
        </div>
      ) : null}

      {!loading && hasSearched && results.length === 0 && !error ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            По запросу «{query}» книг не найдено
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Попробуй другие слова — например, имя автора или жанр
          </p>
        </div>
      ) : null}

      {!loading && results.length > 0 ? (
        <section className={styles.results}>
          <p className={styles.resultsMeta}>
            Найдено <strong>{results.length}</strong> {results.length === 1 ? "книга" : "книг"} по запросу «{query}»
          </p>
          <ul className={styles.resultList}>
            {results.map((item, idx) => (
              <li key={`${item.url || item.title}-${idx}`} className={styles.resultItem}>
                <div className={styles.cover}>
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <span className={styles.coverPlaceholder} aria-hidden="true">📚</span>
                  )}
                </div>
                <div className={styles.resultBody}>
                  <h3 className={styles.resultTitle}>{item.title}</h3>
                  <p className={styles.resultAuthors}>{formatAuthors(item.authors)}</p>
                  <div className={styles.resultMeta}>
                    {item.year ? <span className={styles.metaBadge}>{item.year}</span> : null}
                    {item.editionCount ? (
                      <span className={styles.metaBadge}>
                        {item.editionCount} {item.editionCount === 1 ? "издание" : "изданий"}
                      </span>
                    ) : null}
                    {Array.isArray(item.languages) && item.languages.length > 0 ? (
                      <span className={styles.metaBadge}>{item.languages.slice(0, 3).join(", ")}</span>
                    ) : null}
                  </div>
                </div>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.resultLink}
                  >
                    Открыть на Open Library →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
