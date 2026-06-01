import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherStatsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { statisticsApi, aiApi } from "../../../../shared/lib/api";
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
  const [progressPage, setProgressPage] = useState(1);
  const [planPage, setPlanPage] = useState(1);

  useEffect(() => {
    setPage(1);
    setProgressPage(1);
    setPlanPage(1);
  }, [classFilter]);

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

  const progressTotalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const progressSafePage = Math.min(progressPage, progressTotalPages);
  const progressSliceStart = (progressSafePage - 1) * PAGE_SIZE;
  const progressRows = useMemo(
    () => filtered.slice(progressSliceStart, progressSliceStart + PAGE_SIZE),
    [filtered, progressSliceStart],
  );
  const progressPageNums = pageNumbers(progressSafePage, progressTotalPages);

  const planTotalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const planSafePage = Math.min(planPage, planTotalPages);
  const planSliceStart = (planSafePage - 1) * PAGE_SIZE;
  const planRows = useMemo(
    () => filtered.slice(planSliceStart, planSliceStart + PAGE_SIZE),
    [filtered, planSliceStart],
  );
  const planPageNums = pageNumbers(planSafePage, planTotalPages);

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

  // === AI Risk panel ===
  const classOptionsAI = useMemo(
    () => Array.from(new Map(filtered.map((s) => [s.classId, s.className])).entries())
      .map(([id, name]) => ({ id, name })),
    [filtered],
  );
  const [aiClassId, setAiClassId] = useState(null);
  useEffect(() => {
    if (aiClassId == null && classOptionsAI.length) setAiClassId(classOptionsAI[0].id);
  }, [classOptionsAI, aiClassId]);

  const aiRiskQuery = useApi(
    () => (aiClassId ? aiApi.riskTeacherClass(aiClassId) : Promise.resolve([])),
    [aiClassId],
    { immediate: Boolean(aiClassId) },
  );
  const aiRiskRows = Array.isArray(aiRiskQuery.data) ? aiRiskQuery.data : [];
  const aiRiskSorted = useMemo(
    () => [...aiRiskRows].sort((a, b) => (b.score || 0) - (a.score || 0)),
    [aiRiskRows],
  );
  const aiHigh = aiRiskRows.filter((r) => r.level === "high").length;
  const aiMid = aiRiskRows.filter((r) => r.level === "mid").length;
  const aiLow = aiRiskRows.filter((r) => r.level === "low").length;

  const [aiPage, setAiPage] = useState(1);
  useEffect(() => { setAiPage(1); }, [aiClassId]);
  const aiTotalPages = Math.max(1, Math.ceil(aiRiskSorted.length / PAGE_SIZE));
  const aiSafePage = Math.min(aiPage, aiTotalPages);
  const aiSliceStart = (aiSafePage - 1) * PAGE_SIZE;
  const aiPageItems = aiRiskSorted.slice(aiSliceStart, aiSliceStart + PAGE_SIZE);
  const aiPageNums = pageNumbers(aiSafePage, aiTotalPages);

  function renderPager(pageTotal, safe, start, totalItems, nums, setter, label) {
    if (pageTotal <= 1) return null;
    return (
      <nav className={styles.pagination} aria-label={label}>
        <span className={styles.pageInfo}>
          {t("parent.assignments.pagination.info", {
            start: start + 1,
            end: Math.min(start + PAGE_SIZE, totalItems),
            total: totalItems,
          })}
        </span>
        <div className={styles.pageBtns}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setter((p) => Math.max(1, p - 1))}
            disabled={safe <= 1}
          >
            {t("parent.assignments.pagination.prev")}
          </button>
          {nums.map((n, i) => (
            n === "вЂ¦" ? (
              <span key={`${label}-dots-${i}`} className={styles.pageDots}>вЂ¦</span>
            ) : (
              <button
                key={n}
                type="button"
                className={`${styles.pageBtn} ${n === safe ? styles.pageBtnActive : ""}`}
                onClick={() => setter(n)}
              >
                {n}
              </button>
            )
          ))}
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setter((p) => Math.min(pageTotal, p + 1))}
            disabled={safe >= pageTotal}
          >
            {t("parent.assignments.pagination.next")}
          </button>
        </div>
      </nav>
    );
  }

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
            {filtered.length ? progressRows.map((s) => {
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
          {renderPager(progressTotalPages, progressSafePage, progressSliceStart, filtered.length, progressPageNums, setProgressPage, "Class progress pagination")}
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("teacher.stats.planTitle")}</h3>
          <ul className={styles.planList}>
            {filtered.length ? planRows.map((s) => (
              <li key={`load-${s.classId}`} className={styles.planItem}>
                <span>{s.className}</span>
                <span>{t("teacher.classes.meta.assignments", { n: s.totalAssignments ?? 0 })} • {t("teacher.classes.meta.students", { n: s.totalStudents ?? 0 })}</span>
              </li>
            )) : (
              <li className={styles.emptyState}>{t("teacher.stats.noPlanData")}</li>
            )}
          </ul>
          {renderPager(planTotalPages, planSafePage, planSliceStart, filtered.length, planPageNums, setPlanPage, "Plan pagination")}
        </article>
      </section>

      <section className={styles.aiPanel}>
        <div className={styles.aiPanelHead}>
          <h3 className={styles.panelTitle}>
            <span className={styles.aiBadge}>AI</span> Зона риска по ученикам
          </h3>
          {classOptionsAI.length > 1 ? (
            <select
              className={styles.aiClassSelect}
              value={aiClassId ?? ""}
              onChange={(e) => setAiClassId(Number(e.target.value))}
            >
              {classOptionsAI.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : null}
        </div>

        <div className={styles.aiSummaryRow}>
          <div className={`${styles.aiSummaryCard} ${styles.aiSumHigh}`}>
            <span className={styles.aiSummaryLabel}>Высокий</span>
            <span className={styles.aiSummaryValue}>{aiHigh}</span>
          </div>
          <div className={`${styles.aiSummaryCard} ${styles.aiSumMid}`}>
            <span className={styles.aiSummaryLabel}>Средний</span>
            <span className={styles.aiSummaryValue}>{aiMid}</span>
          </div>
          <div className={`${styles.aiSummaryCard} ${styles.aiSumLow}`}>
            <span className={styles.aiSummaryLabel}>Низкий</span>
            <span className={styles.aiSummaryValue}>{aiLow}</span>
          </div>
          <div className={styles.aiSummaryHint}>
            Модель XGBoost · v1 · обновлено по запросу
          </div>
        </div>

        {aiRiskQuery.loading && !aiRiskRows.length ? (
          <p className={styles.emptyState}>{t("common.loading")}</p>
        ) : aiRiskSorted.length ? (
          <ul className={styles.aiList}>
            {aiPageItems.map((r) => (
              <li key={r.studentId} className={`${styles.aiItem} ${styles[`aiLevel_${r.level}`]}`}>
                <div className={styles.aiItemMain}>
                  <p className={styles.aiStudentName}>{r.studentName || `Ученик #${r.studentId}`}</p>
                  <p className={styles.aiFactors}>
                    {(r.topFactors || []).map((f) => `${f.label}: ${
                      f.feature === "attendance_rate" || f.feature === "submission_rate"
                        ? `${(Number(f.value) * 100).toFixed(0)}%`
                        : Math.round(Number(f.value))
                    }`).join(" • ") || "—"}
                  </p>
                </div>
                <div className={styles.aiScore}>
                  <span className={styles.aiScoreValue}>{Math.round(r.score)}%</span>
                  <span className={`${styles.aiLevelChip} ${styles[`aiChip_${r.level}`]}`}>
                    {r.level === "high" ? "Высокий" : r.level === "mid" ? "Средний" : "Низкий"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>{t("teacher.stats.noRisk")}</p>
        )}

        {aiTotalPages > 1 ? (
          <nav className={styles.pagination} aria-label="AI risk pagination" style={{ marginTop: 14 }}>
            <span className={styles.pageInfo}>
              {t("parent.assignments.pagination.info", {
                start: aiSliceStart + 1,
                end: Math.min(aiSliceStart + PAGE_SIZE, aiRiskSorted.length),
                total: aiRiskSorted.length,
              })}
            </span>
            <div className={styles.pageBtns}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setAiPage((p) => Math.max(1, p - 1))}
                disabled={aiSafePage <= 1}
              >
                {t("parent.assignments.pagination.prev")}
              </button>
              {aiPageNums.map((n, i) => (
                n === "…" ? (
                  <span key={`aidots-${i}`} className={styles.pageDots}>…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.pageBtn} ${n === aiSafePage ? styles.pageBtnActive : ""}`}
                    onClick={() => setAiPage(n)}
                  >
                    {n}
                  </button>
                )
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setAiPage((p) => Math.min(aiTotalPages, p + 1))}
                disabled={aiSafePage >= aiTotalPages}
              >
                {t("parent.assignments.pagination.next")}
              </button>
            </div>
          </nav>
        ) : null}
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

        <div className={styles.mobileRiskList}>
          {pagedRiskRows.length ? pagedRiskRows.map((row) => (
            <article key={`risk-card-${row.classId}`} className={styles.mobileRiskCard}>
              <header className={styles.mobileRiskHead}>
                <h4 className={styles.mobileRiskTitle}>{row.className}</h4>
                <span
                  className={`${styles.riskBadge} ${
                    row.riskKey === "high" ? styles.riskHigh
                      : row.riskKey === "mid" ? styles.riskMid
                      : styles.riskLow
                  }`}
                >
                  {t(`teacher.stats.riskLevels.${row.riskKey}`)}
                </span>
              </header>
              <div className={styles.mobileRiskMeta}>
                <span>{t("teacher.classes.tableHeaders.students")}: <strong>{row.totalStudents ?? "—"}</strong></span>
                <span>{t("teacher.classes.tableHeaders.assignments")}: <strong>{row.totalAssignments ?? "—"}</strong></span>
                <span>{t("teacher.classes.tableHeaders.avgScore")}: <strong>{row.classAverageGrade != null ? row.classAverageGrade.toFixed(1) : "—"}</strong></span>
              </div>
            </article>
          )) : (
            <p className={styles.emptyState}>{t("teacher.stats.noRisk")}</p>
          )}
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
