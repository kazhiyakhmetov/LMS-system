import { useState } from "react";
import styles from "./StudentWikiPage.module.css";
import { libraryApi, wikipediaApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const WIKI_SUGGESTIONS = [
  "Пифагор", "ДНК", "Фотосинтез", "Великая Отечественная война",
  "Алгоритм", "Эйнштейн", "Климат", "Казахстан",
];

const BOOK_SUGGESTIONS = [
  "Harry Potter", "War and Peace", "Crime and Punishment",
  "math textbook", "physics school", "Abai",
  "programming beginners", "Kazakhstan history",
];

function formatAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return "Автор не указан";
  if (authors.length <= 2) return authors.join(", ");
  return `${authors.slice(0, 2).join(", ")} и ещё ${authors.length - 2}`;
}

export default function StudentWikiPage() {
  const { t } = useT();
  const [source, setSource] = useState("wiki");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  function switchSource(next) {
    if (next === source) return;
    setSource(next);
    setResults([]);
    setError("");
    setHasSearched(false);
  }

  async function runSearch(q) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      const data = source === "books"
        ? await libraryApi.search(text)
        : await wikipediaApi.search(text);
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

  const isBooks = source === "books";
  const suggestions = isBooks ? BOOK_SUGGESTIONS : WIKI_SUGGESTIONS;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBody}>
          <span className={styles.heroBadge}>📚 База знаний</span>
          <h2 className={styles.heroTitle}>
            {isBooks ? "Книги для чтения" : "Найди ответ за секунду"}
          </h2>
          <p className={styles.heroSub}>
            {isBooks
              ? "Поиск по Open Library — учебники, художественная литература на разных языках."
              : "Поиск по Википедии — пригодится для рефератов, домашек и любопытства."}
          </p>

          <div className={styles.sourceTabs} role="tablist" aria-label="Источник">
            <button
              type="button"
              role="tab"
              aria-selected={!isBooks}
              className={`${styles.sourceTab} ${!isBooks ? styles.sourceTabActive : ""}`}
              onClick={() => switchSource("wiki")}
            >
              📖 Википедия
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isBooks}
              className={`${styles.sourceTab} ${isBooks ? styles.sourceTabActive : ""}`}
              onClick={() => switchSource("books")}
            >
              📚 Книги
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className={styles.searchForm}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isBooks ? "Книга, автор или тема…" : "Термин, имя или тема…"}
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
          <h3 className={styles.suggestionsTitle}>
            {isBooks ? "Что почитать" : "Популярные темы"}
          </h3>
          <div className={styles.chipsRow}>
            {suggestions.map((s) => (
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

      {error ? <div className={styles.errorState}>{error}</div> : null}

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>{isBooks ? "Ищу книги в Open Library…" : "Ищу в Википедии…"}</p>
        </div>
      ) : null}

      {!loading && hasSearched && results.length === 0 && !error ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{isBooks ? "📭" : "🤔"}</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            По запросу «{query}» {isBooks ? "книг" : "статей"} не найдено
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Попробуй переформулировать или поискать по другим ключевым словам
          </p>
        </div>
      ) : null}

      {!loading && results.length > 0 && !isBooks ? (
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

      {!loading && results.length > 0 && isBooks ? (
        <section className={styles.results}>
          <p className={styles.resultsMeta}>
            Найдено <strong>{results.length}</strong> {results.length === 1 ? "книга" : "книг"} по запросу «{query}»
          </p>
          <ul className={styles.bookList}>
            {results.map((item, idx) => {
              const key = item.url || item.title;
              return (
                <li key={`${key}-${idx}`} className={styles.bookItem}>
                  <div className={styles.cover}>
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} loading="lazy" />
                    ) : (
                      <span className={styles.coverPlaceholder} aria-hidden="true">📚</span>
                    )}
                  </div>
                  <div className={styles.bookBody}>
                    <h3 className={styles.bookTitle}>{item.title}</h3>
                    <p className={styles.bookAuthors}>{formatAuthors(item.authors)}</p>
                    <div className={styles.bookMeta}>
                      {item.year ? <span className={styles.metaBadge}>{item.year}</span> : null}
                      {Array.isArray(item.languages) && item.languages.length > 0 ? (
                        <span className={styles.metaBadge}>{item.languages.slice(0, 3).join(", ").toUpperCase()}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.bookActions}>
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
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
