import { useMemo, useState } from "react";
import styles from "./TeacherSurveyPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const PAGE_SIZE = 10;

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
  const surveys = Array.isArray(listQuery.data) ? listQuery.data : [];

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(surveys.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedSurveys = useMemo(
    () => surveys.slice(sliceStart, sliceStart + PAGE_SIZE),
    [surveys, sliceStart],
  );
  const pageNums = pageNumbers(safePage, totalPages);

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
                  <span className={`${styles.badge} ${styles.active}`}>{t("student.surveys.statusActive")}</span>
                </div>
                <p className={styles.cardTitle}>{survey.title}</p>
                <p className={styles.cardDesc ?? ""}>{survey.description || ""}</p>
                <div className={styles.metaRow}>
                  <span>{t("student.surveys.questionsCount", { count: survey.questionsCount ?? survey.questions?.length ?? 0 })}</span>
                </div>
              </article>
            ))}
          </section>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Pagination">
              <span className={styles.pageInfo}>
                {t("parent.assignments.pagination.info", {
                  start: sliceStart + 1,
                  end: Math.min(sliceStart + PAGE_SIZE, surveys.length),
                  total: surveys.length,
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
    </div>
  );
}
