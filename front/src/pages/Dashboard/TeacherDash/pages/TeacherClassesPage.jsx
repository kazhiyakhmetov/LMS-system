import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherClassesPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { statisticsApi, teachingApi } from "../../../../shared/lib/api";
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

function getRiskTone(row) {
  if (row.average < 3.5) return "risk";
  if (row.average < 4.2) return "watch";
  return "good";
}

function progressKey(row) {
  if (row.average >= 4.5) return "good";
  if (row.average >= 4) return "watch";
  return "risk";
}

export default function TeacherClassesPage() {
  const { t } = useT();
  const pairsQuery = useApi(() => teachingApi.myPairs(), []);
  const summaryQuery = useApi(() => statisticsApi.teacherSummary(), []);

  const pairs = Array.isArray(pairsQuery.data) ? pairsQuery.data : [];
  const summary = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];

  const summaryByClass = useMemo(() => {
    const map = new Map();
    summary.forEach((s) => map.set(String(s.classId), s));
    return map;
  }, [summary]);

  const rows = useMemo(() => {
    return pairs.map((pair, idx) => {
      const stats = summaryByClass.get(String(pair.classId));
      const avg5 = Number(stats?.classAverageGrade ?? 0);
      // Перевод 5-балльной средней в 10-балльную для отображения (avg * 2)
      const avg10 = avg5 > 0 ? Math.min(10, Math.round(avg5 * 2 * 10) / 10) : 0;
      return {
        id: pair.assignmentId ?? `${pair.classId}-${pair.subjectId}-${idx}`,
        className: pair.className || "—",
        subject: pair.subjectName || "—",
        students: stats?.totalStudents ?? 0,
        average: avg5,
        average10: avg10,
        assignments: stats?.totalAssignments ?? 0,
        quizzes: stats?.totalQuizzes ?? 0,
        successRate: Math.min(100, Number(stats?.successRatePercent ?? 0)),
      };
    });
  }, [pairs, summaryByClass]);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, classFilter, subjectFilter]);

  const classOptions = useMemo(() => ["all", ...new Set(rows.map((r) => r.className))], [rows]);
  const subjectOptions = useMemo(() => ["all", ...new Set(rows.map((r) => r.subject))], [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesClass = classFilter === "all" || row.className === classFilter;
      const matchesSubject = subjectFilter === "all" || row.subject === subjectFilter;
      const matchesQuery = !q
        || row.className.toLowerCase().includes(q)
        || row.subject.toLowerCase().includes(q);
      return matchesClass && matchesSubject && matchesQuery;
    });
  }, [rows, search, classFilter, subjectFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedRows = useMemo(
    () => filteredRows.slice(sliceStart, sliceStart + PAGE_SIZE),
    [filteredRows, sliceStart],
  );
  const pageNums = pageNumbers(safePage, totalPages);

  const summaryStats = useMemo(() => {
    const classSet = new Set(filteredRows.map((r) => r.className));
    const studentsTotal = filteredRows.reduce((a, r) => a + (r.students || 0), 0);
    const assignmentsTotal = filteredRows.reduce((a, r) => a + (r.assignments || 0), 0);
    const grades = filteredRows.map((r) => r.average).filter((v) => v > 0);
    const avg = grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : "—";
    return {
      classesCount: classSet.size,
      studentsTotal,
      assignmentsTotal,
      averageGrade: avg,
    };
  }, [filteredRows]);

  if (pairsQuery.loading && !rows.length) {
    return <div style={{ padding: 24 }}>{t("teacher.classes.loading")}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("teacher.classes.title")}</h2>
        <p className={styles.sub}>{t("teacher.classes.sub")}</p>
      </section>

      <section className={styles.summary}>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>{t("teacher.classes.kpiClasses")}</p>
          <p className={styles.summaryValue}>{summaryStats.classesCount}</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>{t("teacher.classes.kpiStudents")}</p>
          <p className={styles.summaryValue}>{summaryStats.studentsTotal}</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>{t("teacher.classes.kpiAssignments")}</p>
          <p className={styles.summaryValue}>{summaryStats.assignmentsTotal}</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>{t("teacher.classes.kpiAvgScore")}</p>
          <p className={styles.summaryValue}>{summaryStats.averageGrade}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder={t("teacher.classes.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className={styles.selectRow}>
          <select className={styles.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            {classOptions.map((opt) => (
              <option key={opt} value={opt}>{opt === "all" ? t("teacher.classes.allClasses") : opt}</option>
            ))}
          </select>
          <select className={styles.select} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            {subjectOptions.map((opt) => (
              <option key={opt} value={opt}>{opt === "all" ? t("teacher.classes.allSubjects") : opt}</option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.classGrid}>
        {pagedRows.length ? pagedRows.map((row) => {
          const tone = getRiskTone(row);
          return (
            <article key={row.id} className={`${styles.classCard} ${styles[tone]}`}>
              <div className={styles.classTop}>
                <p className={styles.classTitle}>{row.className} • {row.subject}</p>
              </div>
              <p className={styles.classMeta}>{t(`teacher.classes.performance.${progressKey(row)}`)}</p>

              <div className={styles.metrics}>
                <span>{t("teacher.classes.meta.students", { n: row.students })}</span>
                <span>{t("teacher.classes.meta.assignments", { n: row.assignments })}</span>
                <span>{t("teacher.classes.meta.avgScore", { n: row.average ? row.average.toFixed(1) : "—" })}</span>
              </div>
            </article>
          );
        }) : (
          <div className={styles.emptyState}>{t("teacher.classes.empty")}</div>
        )}
      </section>

      <section className={styles.bottom}>
        <article className={styles.tableCard}>
          <h3 className={styles.sectionTitle}>{t("teacher.classes.summary")}</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("teacher.classes.tableHeaders.class")}</th>
                <th>{t("teacher.classes.tableHeaders.subject")}</th>
                <th>{t("teacher.classes.tableHeaders.students")}</th>
                <th>{t("teacher.classes.tableHeaders.assignments")}</th>
                <th>Квизов</th>
                <th>Средняя (10)</th>
                <th>Успеваемость</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={`table-${row.id}`}>
                  <td>{row.className}</td>
                  <td>{row.subject}</td>
                  <td>{row.students}</td>
                  <td>{row.assignments}</td>
                  <td>{row.quizzes}</td>
                  <td>{row.average10 ? row.average10.toFixed(1) : "—"}</td>
                  <td>{row.successRate ? `${row.successRate.toFixed(0)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Pagination">
              <span className={styles.pageInfo}>
                {t("parent.assignments.pagination.info", {
                  start: sliceStart + 1,
                  end: Math.min(sliceStart + PAGE_SIZE, filteredRows.length),
                  total: filteredRows.length,
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
        </article>
      </section>
    </div>
  );
}
