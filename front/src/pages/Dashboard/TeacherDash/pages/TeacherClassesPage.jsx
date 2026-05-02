import { useMemo, useState } from "react";
import styles from "./TeacherClassesPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { statisticsApi, teachingApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

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
      return {
        id: pair.assignmentId ?? `${pair.classId}-${pair.subjectId}-${idx}`,
        className: pair.className || "—",
        subject: pair.subjectName || "—",
        students: stats?.totalStudents ?? 0,
        average: stats?.classAverageGrade ?? 0,
        assignments: stats?.totalAssignments ?? 0,
      };
    });
  }, [pairs, summaryByClass]);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

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
        {filteredRows.length ? filteredRows.map((row) => {
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
                <th>{t("teacher.classes.tableHeaders.avgScore")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={`table-${row.id}`}>
                  <td>{row.className}</td>
                  <td>{row.subject}</td>
                  <td>{row.students}</td>
                  <td>{row.assignments}</td>
                  <td>{row.average ? row.average.toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  );
}
