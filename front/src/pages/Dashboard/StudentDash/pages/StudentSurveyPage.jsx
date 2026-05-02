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
        <p className={styles.sub}>
          Доступные опросы. Проходите их и отслеживайте статус заполнения.
        </p>
      </section>

      <section className={styles.stats}>
        <article className={`${styles.statCard} ${styles.tone_indigo}`}>
          <p className={styles.statLabel}>Активные</p>
          <p className={styles.statValue}>{stats.active}</p>
        </article>
        <article className={`${styles.statCard} ${styles.tone_mint}`}>
          <p className={styles.statLabel}>Завершенные</p>
          <p className={styles.statValue}>{stats.completed}</p>
        </article>
        <article className={`${styles.statCard} ${styles.tone_gold}`}>
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
        <p className={styles.emptyState}>Загрузка опросов…</p>
      ) : listQuery.error ? (
        <p className={styles.emptyState} style={{ color: "var(--danger-strong)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          Ошибка: {listQuery.error.message}
        </p>
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
              {survey.description ? <p className={styles.cardDesc}>{survey.description}</p> : null}

              <div className={styles.metaRow}>
                <span>{survey.questionsCount} {survey.questionsCount === 1 ? "вопрос" : "вопросов"}</span>
              </div>

              <button
                className={styles.actionBtn}
                type="button"
                onClick={() => setSelectedSurvey(survey)}
                disabled={survey.done}
              >
                {survey.done ? "Пройден ✓" : "Пройти опрос"}
              </button>
            </article>
          )) : (
            <div className={styles.emptyState}>По выбранным параметрам опросы не найдены.</div>
          )}
        </section>
      )}

      {selectedSurvey ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) setSelectedSurvey(null); }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <header className={styles.modalHead}>
              <h3 className={styles.modalTitle}>{selectedSurvey.title}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedSurvey(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </header>

            {detailsLoading ? (
              <p className={styles.modalDesc}>Загрузка опроса…</p>
            ) : details ? (
              <form onSubmit={onSubmit}>
                {details.description ? (
                  <p className={styles.modalDesc}>{details.description}</p>
                ) : null}
                {(details.questions || []).map((q, index) => (
                  <div key={q.id} className={styles.question}>
                    <p className={styles.questionText}>{index + 1}. {q.text}</p>
                    {q.type === "TEXT" ? (
                      <textarea
                        className={styles.questionTextarea}
                        rows={3}
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Ваш ответ..."
                      />
                    ) : (
                      (q.options || []).map((opt) => (
                        <label key={opt.id} className={styles.optionLabel}>
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

                {submitError ? <p className={styles.errorBanner}>{submitError}</p> : null}

                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setSelectedSurvey(null)}>
                    Отмена
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                    {submitting ? "Отправка…" : "Отправить"}
                  </button>
                </div>
              </form>
            ) : (
              <p className={styles.errorBanner}>{submitError || "Не удалось загрузить вопросы"}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
