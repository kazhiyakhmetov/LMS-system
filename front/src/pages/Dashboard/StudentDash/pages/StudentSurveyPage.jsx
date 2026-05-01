import { useEffect, useMemo, useState } from "react";
import styles from "./StudentSurveyPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";

const filters = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "done", label: "Завершенные" },
];

export default function StudentSurveyPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [answeredIds, setAnsweredIds] = useState(() => new Set());
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const listQuery = useApi(() => surveysApi.available(), []);
  const surveys = useMemo(() => Array.isArray(listQuery.data) ? listQuery.data : [], [listQuery.data]);

  const normalized = useMemo(() => surveys.map((s) => ({
    id: s.id,
    title: s.title || "Без названия",
    description: s.description || "",
    questionsCount: s.questionsCount ?? s.questions?.length ?? 0,
    done: answeredIds.has(s.id),
  })), [surveys, answeredIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalized.filter((survey) => {
      const matchesQuery = !q ||
        survey.title.toLowerCase().includes(q) ||
        survey.description.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "done" && survey.done) ||
        (statusFilter === "active" && !survey.done);
      return matchesQuery && matchesStatus;
    });
  }, [normalized, search, statusFilter]);

  const stats = useMemo(() => ({
    active: normalized.filter((s) => !s.done).length,
    completed: normalized.filter((s) => s.done).length,
    total: normalized.length,
  }), [normalized]);

  useEffect(() => {
    if (!selectedSurvey) return;
    let cancelled = false;
    setDetailsLoading(true);
    setSubmitError("");
    setAnswers({});
    setDetails(null);
    surveysApi
      .byId(selectedSurvey.id)
      .then((data) => { if (!cancelled) setDetails(data); })
      .catch((err) => { if (!cancelled) setSubmitError(err?.message || "Ошибка загрузки"); })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSurvey]);

  useEffect(() => {
    if (!selectedSurvey) return undefined;
    const onKeyDown = (e) => { if (e.key === "Escape") setSelectedSurvey(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSurvey]);

  async function onSubmit(event) {
    event.preventDefault();
    if (!details) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const payload = {
        surveyId: details.id,
        answers: (details.questions || []).map((q) => {
          const value = answers[q.id];
          if (q.type === "TEXT") return { questionId: q.id, textAnswer: value || "" };
          return { questionId: q.id, optionId: value ?? null };
        }),
      };
      await surveysApi.answer(payload);
      setAnsweredIds((prev) => {
        const next = new Set(prev);
        next.add(details.id);
        return next;
      });
      setSelectedSurvey(null);
    } catch (err) {
      setSubmitError(err?.message || "Не удалось сохранить ответы");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Опросы</h2>
        <p className={styles.sub}>Доступные опросы, проходите их и отслеживайте статус заполнения.</p>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Активные</p>
          <p className={styles.statValue}>{stats.active}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Завершенные</p>
          <p className={styles.statValue}>{stats.completed}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Всего</p>
          <p className={styles.statValue}>{stats.total}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Поиск по названию или описанию..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className={styles.filters}>
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`${styles.filterChip} ${statusFilter === filter.key ? styles.filterChipActive : ""}`}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {listQuery.loading && !normalized.length ? (
        <p style={{ padding: 16 }}>Загрузка опросов…</p>
      ) : listQuery.error ? (
        <p style={{ padding: 16, color: "var(--danger)" }}>Ошибка: {listQuery.error.message}</p>
      ) : (
        <section className={styles.list}>
          {filtered.length ? filtered.map((survey) => (
            <article key={survey.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.subject}>Опрос</span>
                <span className={`${styles.badge} ${survey.done ? styles.done : styles.new}`}>
                  {survey.done ? "Завершен" : "Доступен"}
                </span>
              </div>

              <p className={styles.cardTitle}>{survey.title}</p>
              <p className={styles.cardDesc}>{survey.description}</p>

              <div className={styles.metaRow}>
                <span>{survey.questionsCount} вопросов</span>
              </div>

              <button
                className={styles.actionBtn}
                type="button"
                onClick={() => setSelectedSurvey(survey)}
                disabled={survey.done}
              >
                {survey.done ? "Пройден" : "Пройти"}
              </button>
            </article>
          )) : (
            <div className={styles.emptyState}>По выбранным параметрам опросы не найдены.</div>
          )}
        </section>
      )}

      {selectedSurvey ? (
        <div
          className={styles.modalOverlay ?? styles.overlay}
          role="presentation"
          style={{ position: "fixed", inset: 0, background: "rgba(21, 36, 58, 0.4)", display: "grid", placeItems: "center", zIndex: 20 }}
          onClick={(event) => { if (event.target === event.currentTarget) setSelectedSurvey(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            style={{ background: "var(--panel)", borderRadius: "var(--radius-lg)", padding: 24, maxWidth: 560, width: "92%", maxHeight: "80vh", overflow: "auto", boxShadow: "var(--shadow)" }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{selectedSurvey.title}</h3>
              <button type="button" onClick={() => setSelectedSurvey(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
            </header>

            {detailsLoading ? (
              <p>Загрузка опроса…</p>
            ) : details ? (
              <form onSubmit={onSubmit}>
                <p style={{ color: "var(--muted)", marginBottom: 16 }}>{details.description}</p>
                {(details.questions || []).map((q, index) => (
                  <div key={q.id} style={{ marginBottom: 14 }}>
                    <p style={{ fontWeight: 600, margin: "0 0 6px" }}>{index + 1}. {q.text}</p>
                    {q.type === "TEXT" ? (
                      <textarea
                        rows={3}
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        style={{ width: "100%", padding: 8, border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)", resize: "vertical" }}
                      />
                    ) : (
                      (q.options || []).map((opt) => (
                        <label key={opt.id} style={{ display: "flex", gap: 8, marginBottom: 4, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt.id}
                            checked={answers[q.id] === opt.id}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                          />
                          {opt.text}
                        </label>
                      ))
                    )}
                  </div>
                ))}

                {submitError ? <p style={{ color: "var(--danger)" }}>{submitError}</p> : null}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                  <button type="button" onClick={() => setSelectedSurvey(null)}>Отмена</button>
                  <button type="submit" disabled={submitting}>
                    {submitting ? "Отправка…" : "Отправить"}
                  </button>
                </div>
              </form>
            ) : (
              <p style={{ color: "var(--danger)" }}>{submitError || "Не удалось загрузить вопросы"}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
