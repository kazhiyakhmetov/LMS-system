import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherSurveyPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

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

export default function TeacherSurveyPage() {
  const { t } = useT();
  const listQuery = useApi(() => surveysApi.available(), []);
  const surveys = useMemo(() => (Array.isArray(listQuery.data) ? listQuery.data : []), [listQuery.data]);

  const [page, setPage] = useState(1);
  const [answeredIds, setAnsweredIds] = useState(() => new Set());
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const normalized = useMemo(() => surveys.map((s) => ({
    id: s.id,
    title: s.title || t("common.untitled"),
    description: s.description || "",
    questionsCount: s.questionsCount ?? s.questions?.length ?? 0,
    done: Boolean(s.done) || answeredIds.has(s.id),
  })), [surveys, answeredIds, t]);

  const totalPages = Math.max(1, Math.ceil(normalized.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedSurveys = useMemo(
    () => normalized.slice(sliceStart, sliceStart + PAGE_SIZE),
    [normalized, sliceStart],
  );
  const pageNums = pageNumbers(safePage, totalPages);

  useEffect(() => {
    if (!selectedSurvey) return undefined;
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
        <div>
          <h2 className={styles.title}>{t("teacher.surveys.title")}</h2>
          <p className={styles.sub}>{t("teacher.surveys.sub")}</p>
        </div>
      </section>

      {listQuery.loading && !surveys.length ? (
        <p style={{ padding: 16 }}>{t("common.loading")}</p>
      ) : listQuery.error ? (
        <p style={{ padding: 16, color: "var(--danger)" }}>{t("common.error")}: {listQuery.error.message}</p>
      ) : surveys.length ? (
        <>
          <section className={styles.list}>
            {pagedSurveys.map((survey) => (
              <article key={survey.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.subject}>{t("student.surveys.surveyBadge")}</span>
                  <span className={`${styles.badge} ${survey.done ? styles.doneBadge : styles.active}`}>
                    {survey.done ? t("student.surveys.statusDone") : t("student.surveys.statusActive")}
                  </span>
                </div>
                <p className={styles.cardTitle}>{survey.title}</p>
                <p className={styles.cardDesc ?? ""}>{survey.description || ""}</p>
                <div className={styles.metaRow}>
                  <span>{t("student.surveys.questionsCount", { count: survey.questionsCount })}</span>
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
            ))}
          </section>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Pagination">
              <span className={styles.pageInfo}>
                {t("parent.assignments.pagination.info", {
                  start: sliceStart + 1,
                  end: Math.min(sliceStart + PAGE_SIZE, normalized.length),
                  total: normalized.length,
                })}
              </span>
              <div className={styles.pageBtns}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  {t("parent.assignments.pagination.prev")}
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
                  {t("parent.assignments.pagination.next")}
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : (
        <div className={styles.emptyState}>{t("teacher.surveys.empty")}</div>
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
