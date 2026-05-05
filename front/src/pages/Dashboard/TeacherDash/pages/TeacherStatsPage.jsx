import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherStatsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { statisticsApi } from "../../../../shared/lib/api";
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

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function riskKey(item) {
  const grade = item.classAverageGrade ?? 0;
  if (grade < 3.5) return "high";
  if (grade < 4.2) return "mid";
  return "low";
}

export default function TeacherStatsPage() {
  const { t } = useT();
  const summaryQuery = useApi(() => statisticsApi.teacherSummary(), []);
  const summary = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];

  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [classFilter]);

  const classOptions = useMemo(
    () => ["all", ...new Set(summary.map((s) => s.className).filter(Boolean))],
    [summary],
  );

  const filtered = useMemo(
    () => summary.filter((s) => classFilter === "all" || s.className === classFilter),
    [summary, classFilter],
  );

  const summaryStats = useMemo(() => {
    const avgGrades = filtered.map((s) => s.classAverageGrade).filter((v) => v != null);
    const totalStudents = filtered.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
    const totalAssignments = filtered.reduce((acc, s) => acc + (s.totalAssignments || 0), 0);
    return {
      classes: filtered.length,
      students: totalStudents,
      assignments: totalAssignments,
      averageMark: avgGrades.length ? avg(avgGrades).toFixed(1) : "—",
    };
  }, [filtered]);

  const riskRows = useMemo(
    () => filtered.map((s) => ({ ...s, riskKey: riskKey(s) }))
      .sort((a, b) => {
        const score = (k) => (k === "high" ? 3 : k === "mid" ? 2 : 1);
        return score(b.riskKey) - score(a.riskKey);
      }),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(riskRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedRiskRows = useMemo(
    () => riskRows.slice(sliceStart, sliceStart + PAGE_SIZE),
    [riskRows, sliceStart],
  );
  const pageNums = pageNumbers(safePage, totalPages);

  if (summaryQuery.loading && !summary.length) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }
  if (summaryQuery.error) {
    return <div style={{ padding: 24, color: "var(--danger)" }}>{t("common.error")}: {summaryQuery.error.message}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h2 className={styles.title}>{t("teacher.stats.title")}</h2>
          <p className={styles.sub}>{t("teacher.stats.sub")}</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.filterRow}>
            <select className={styles.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? t("teacher.classes.allClasses") : option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.metrics}>
        <article className={`${styles.metricCard} ${styles.blue}`}>
          <p className={styles.metricLabel}>{t("teacher.classes.kpiClasses")}</p>
          <p className={styles.metricValue}>{summaryStats.classes}</p>
        </article>
        <article className={`${styles.metricCard} ${styles.green}`}>
          <p className={styles.metricLabel}>{t("teacher.classes.kpiStudents")}</p>
          <p className={styles.metricValue}>{summaryStats.students}</p>
        </article>
        <article className={`${styles.metricCard} ${styles.orange}`}>
          <p className={styles.metricLabel}>{t("teacher.classes.kpiAssignments")}</p>
          <p className={styles.metricValue}>{summaryStats.assignments}</p>
        </article>
        <article className={`${styles.metricCard} ${styles.purple}`}>
          <p className={styles.metricLabel}>{t("teacher.stats.kpiAvgGrade")}</p>
          <p className={styles.metricValue}>{summaryStats.averageMark}</p>
        </article>
      </section>

      <section className={styles.overview}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("teacher.stats.classProgress")}</h3>
          <ul className={styles.progressList}>
            {filtered.length ? filtered.map((s) => {
              const percent = s.classAverageGrade ? Math.round((s.classAverageGrade / 5) * 100) : 0;
              return (
                <li key={s.classId} className={styles.progressItem}>
                  <div className={styles.progressTop}>
                    <p className={styles.progressLabel}>{s.className}</p>
                    <p className={styles.progressMeta}>
                      {s.classAverageGrade != null ? s.classAverageGrade.toFixed(1) : "—"}
                    </p>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            }) : (
              <li className={styles.emptyState}>{t("teacher.stats.empty")}</li>
            )}
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("teacher.stats.planTitle")}</h3>
          <ul className={styles.planList}>
            {filtered.length ? filtered.map((s) => (
              <li key={`load-${s.classId}`} className={styles.planItem}>
                <span>{s.className}</span>
                <span>{t("teacher.classes.meta.assignments", { n: s.totalAssignments ?? 0 })} • {t("teacher.classes.meta.students", { n: s.totalStudents ?? 0 })}</span>
              </li>
            )) : (
              <li className={styles.emptyState}>{t("teacher.stats.noPlanData")}</li>
            )}
          </ul>
        </article>
      </section>

      <section className={styles.riskPanel}>
        <h3 className={styles.panelTitle}>{t("teacher.stats.riskTitle")}</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("teacher.classes.tableHeaders.class")}</th>
                <th>{t("teacher.classes.tableHeaders.students")}</th>
                <th>{t("teacher.classes.tableHeaders.assignments")}</th>
                <th>{t("teacher.classes.tableHeaders.avgScore")}</th>
                <th>{t("teacher.stats.tableHeaders.risk")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedRiskRows.length ? pagedRiskRows.map((row) => (
                <tr key={`risk-${row.classId}`}>
                  <td>{row.className}</td>
                  <td>{row.totalStudents ?? "—"}</td>
                  <td>{row.totalAssignments ?? "—"}</td>
                  <td>{row.classAverageGrade != null ? row.classAverageGrade.toFixed(1) : "—"}</td>
                  <td>
                    <span
                      className={`${styles.riskBadge} ${
                        row.riskKey === "high" ? styles.riskHigh
                          : row.riskKey === "mid" ? styles.riskMid
                          : styles.riskLow
                      }`}
                    >
                      {t(`teacher.stats.riskLevels.${row.riskKey}`)}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>{t("teacher.stats.noRisk")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Pagination">
            <span className={styles.pageInfo}>
              {t("parent.assignments.pagination.info", {
                start: sliceStart + 1,
                end: Math.min(sliceStart + PAGE_SIZE, riskRows.length),
                total: riskRows.length,
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
      </section>
    </div>
  );
}
