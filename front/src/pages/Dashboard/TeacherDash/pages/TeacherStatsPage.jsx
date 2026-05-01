import { useMemo, useState } from "react";
import styles from "./TeacherStatsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { statisticsApi } from "../../../../shared/lib/api";

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function riskLabel(item) {
  const grade = item.classAverageGrade ?? 0;
  if (grade < 3.5) return "Высокий";
  if (grade < 4.2) return "Средний";
  return "Низкий";
}

export default function TeacherStatsPage() {
  const summaryQuery = useApi(() => statisticsApi.teacherSummary(), []);
  const summary = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];

  const [classFilter, setClassFilter] = useState("all");

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
    () => filtered.map((s) => ({ ...s, risk: riskLabel(s) }))
      .sort((a, b) => {
        const score = (r) => (r === "Высокий" ? 3 : r === "Средний" ? 2 : 1);
        return score(b.risk) - score(a.risk);
      }),
    [filtered],
  );

  if (summaryQuery.loading && !summary.length) {
    return <div style={{ padding: 24 }}>Загрузка статистики…</div>;
  }
  if (summaryQuery.error) {
    return <div style={{ padding: 24, color: "var(--danger)" }}>Ошибка: {summaryQuery.error.message}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h2 className={styles.title}>Статистика преподавателя</h2>
          <p className={styles.sub}>Метрики по классам, средний балл и нагрузка по заданиям.</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.filterRow}>
            <select className={styles.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Все классы" : option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.metrics}>
        <article className={`${styles.metricCard} ${styles.blue}`}>
          <p className={styles.metricLabel}>Классов в работе</p>
          <p className={styles.metricValue}>{summaryStats.classes}</p>
        </article>
        <article className={`${styles.metricCard} ${styles.green}`}>
          <p className={styles.metricLabel}>Учеников всего</p>
          <p className={styles.metricValue}>{summaryStats.students}</p>
        </article>
        <article className={`${styles.metricCard} ${styles.orange}`}>
          <p className={styles.metricLabel}>Заданий всего</p>
          <p className={styles.metricValue}>{summaryStats.assignments}</p>
        </article>
        <article className={`${styles.metricCard} ${styles.purple}`}>
          <p className={styles.metricLabel}>Средний балл</p>
          <p className={styles.metricValue}>{summaryStats.averageMark}</p>
        </article>
      </section>

      <section className={styles.overview}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Динамика по классам</h3>
          <ul className={styles.progressList}>
            {filtered.length ? filtered.map((s) => {
              const percent = s.classAverageGrade ? Math.round((s.classAverageGrade / 5) * 100) : 0;
              return (
                <li key={s.classId} className={styles.progressItem}>
                  <div className={styles.progressTop}>
                    <p className={styles.progressLabel}>{s.className}</p>
                    <p className={styles.progressMeta}>
                      ср. балл {s.classAverageGrade != null ? s.classAverageGrade.toFixed(1) : "—"}
                    </p>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            }) : (
              <li className={styles.emptyState}>Нет данных для выбранных фильтров.</li>
            )}
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Структура нагрузки</h3>
          <ul className={styles.planList}>
            {filtered.map((s) => (
              <li key={`load-${s.classId}`} className={styles.planItem}>
                <span>{s.className}</span>
                <span>{s.totalAssignments ?? 0} заданий • {s.totalStudents ?? 0} учеников</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.riskPanel}>
        <h3 className={styles.panelTitle}>Риски по классам</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Класс</th>
                <th>Учеников</th>
                <th>Заданий</th>
                <th>Средний балл</th>
                <th>Риск</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.length ? riskRows.map((row) => (
                <tr key={`risk-${row.classId}`}>
                  <td>{row.className}</td>
                  <td>{row.totalStudents ?? "—"}</td>
                  <td>{row.totalAssignments ?? "—"}</td>
                  <td>{row.classAverageGrade != null ? row.classAverageGrade.toFixed(1) : "—"}</td>
                  <td>
                    <span
                      className={`${styles.riskBadge} ${
                        row.risk === "Высокий" ? styles.riskHigh
                          : row.risk === "Средний" ? styles.riskMid
                          : styles.riskLow
                      }`}
                    >
                      {row.risk}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>Нет данных для выбранных параметров.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
