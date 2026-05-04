import { useState } from "react";
import styles from "./TeacherWikiPage.module.css";
import { wikipediaApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const SUGGESTIONS = [
  "Теорема Пифагора", "Митоз", "Закон Ньютона", "Реформация",
  "Производная", "Атом", "Эпоха Возрождения", "Космонавтика",
];

export default function TeacherWikiPage() {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(null);

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

  async function copyToClipboard(item) {
    const text = `${item.title}\n\n${item.description}\n\nИсточник: ${item.url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(item.url);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBody}>
          <span className={styles.heroBadge}>📚 База знаний для урока</span>
          <h2 className={styles.heroTitle}>Найди материал к уроку</h2>
          <p className={styles.heroSub}>
            Поиск по Википедии — для подготовки к уроку, проверки фактов или быстрого добавления цитаты в задание.
            Можно скопировать выдержку одной кнопкой.
          </p>
        </div>

        <form onSubmit={onSubmit} className={styles.searchForm}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите термин, имя или тему урока…"
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
          <h3 className={styles.suggestionsTitle}>Темы для урока</h3>
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
                <div className={styles.resultActions}>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => copyToClipboard(item)}
                    title="Скопировать с источником"
                  >
                    {copied === item.url ? "✓ Скопировано" : "📋 Скопировать"}
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.resultLink}
                  >
                    Открыть статью →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
