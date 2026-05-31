import { useEffect, useMemo, useState } from "react";
import styles from "./StudentSurveyPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const FILTER_KEYS = ["all", "active", "done"];
const PAGE_SIZE = 5;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) result.push("…");
    result.push(n);
    prev = n;
  }
  return result;
}

export default function StudentSurveyPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
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
    title: s.title || t("common.untitled"),
    description: s.description || "",
    questionsCount: s.questionsCount ?? s.questions?.length ?? 0,
    done: Boolean(s.done) || answeredIds.has(s.id),
  })), [surveys, answeredIds, t]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedSurveys = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);
  const pageNums = pageNumbers(safePage, totalPages);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

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
      .catch((err) => { if (!cancelled) setSubmitError(err?.message || t("common.error")); })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSurvey, t]);

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
      setSubmitError(err?.message || t("student.surveys.modal.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("student.surveys.title")}</h2>
        <p className={styles.sub}>{t("student.surveys.sub")}</p>
      </section>

      <section className={styles.stats}>
        <article className={`${styles.statCard} ${styles.tone_indigo}`}>
          <p className={styles.statLabel}>{t("student.surveys.kpiActive")}</p>
          <p className={styles.statValue}>{stats.active}</p>
        </article>
        <article className={`${styles.statCard} ${styles.tone_mint}`}>
          <p className={styles.statLabel}>{t("student.surveys.kpiCompleted")}</p>
          <p className={styles.statValue}>{stats.completed}</p>
        </article>
        <article className={`${styles.statCard} ${styles.tone_gold}`}>
          <p className={styles.statLabel}>{t("student.surveys.kpiTotal")}</p>
          <p className={styles.statValue}>{stats.total}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder={t("student.surveys.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className={styles.filters}>
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.filterChip} ${statusFilter === key ? styles.filterChipActive : ""}`}
              onClick={() => setStatusFilter(key)}
            >
              {t(`student.surveys.filters.${key}`)}
            </button>
          ))}
        </div>
      </section>

      {listQuery.loading && !normalized.length ? (
        <p className={styles.emptyState}>{t("common.loading")}</p>
      ) : listQuery.error ? (
        <p className={styles.emptyState} style={{ color: "var(--danger-strong)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          {t("common.error")}: {listQuery.error.message}
        </p>
      ) : (
        <section className={styles.list}>
          {filtered.length ? pagedSurveys.map((survey) => (
            <article key={survey.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.subject}>{t("student.surveys.surveyBadge")}</span>
                <span className={`${styles.badge} ${survey.done ? styles.done : styles.new}`}>
                  {survey.done ? t("student.surveys.statusDone") : t("student.surveys.statusActive")}
                </span>
              </div>

              <p className={styles.cardTitle}>{survey.title}</p>
              {survey.description ? <p className={styles.cardDesc}>{survey.description}</p> : null}

              <div className={styles.metaRow}>
                <span>
                  {survey.questionsCount === 1
                    ? t("student.surveys.questionCountOne", { count: survey.questionsCount })
                    : t("student.surveys.questionsCount", { count: survey.questionsCount })}
                </span>
              </div>

              <button
                className={styles.actionBtn}
                type="button"
                onClick={() => setSelectedSurvey(survey)}
                disabled={survey.done}
              >
                {survey.done ? t("student.surveys.passed") : t("student.surveys.pass")}
              </button>
            </article>
          )) : (
            <div className={styles.emptyState}>{t("student.surveys.empty")}</div>
          )}
        </section>
      )}

      {filtered.length > 0 && totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Pagination">
          <span className={styles.pageInfo}>
            {t("student.surveys.paginationInfo", {
              start: sliceStart + 1,
              end: Math.min(sliceStart + PAGE_SIZE, filtered.length),
              total: filtered.length,
            })}
          </span>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              {t("common.back")}
            </button>
            {pageNums.map((n, i) => (
              n === "…" ? (
                <span key={`dots-${i}`} className={styles.pageDots}>…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`${styles.pageBtn} ${n === safePage ? styles.pageBtnActive : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              )
            ))}
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              {t("common.next")}
            </button>
          </div>
        </nav>
      ) : null}

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
                aria-label={t("common.close")}
              >
                ×
              </button>
            </header>

            {detailsLoading ? (
              <p className={styles.modalDesc}>{t("student.surveys.modal.loading")}</p>
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
                        placeholder={t("student.surveys.modal.answerPlaceholder")}
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
                    {t("student.surveys.modal.cancel")}
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                    {submitting ? t("student.surveys.modal.submitting") : t("student.surveys.modal.submit")}
                  </button>
                </div>
              </form>
            ) : (
              <p className={styles.errorBanner}>{submitError || t("student.surveys.modal.loadError")}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
