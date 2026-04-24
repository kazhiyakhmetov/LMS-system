import { useMemo, useState } from "react";
import styles from "./TeacherStatsPage.module.css";
import { quarterOptions } from "../../../../shared/constants/academic";
import { average } from "../../../../shared/lib/utils/math";

const statsRows = [
  {
    className: "10-А",
    subject: "Алгебра",
    quarterData: {
      q1: { attendance: 94, progress: 87, onTime: 90, activity: 82, average: 4.3, growth: 0.2, pending: 7 },
      q2: { attendance: 93, progress: 85, onTime: 88, activity: 80, average: 4.2, growth: 0.1, pending: 8 },
      q3: { attendance: 92, progress: 84, onTime: 86, activity: 78, average: 4.1, growth: -0.1, pending: 9 },
      q4: { attendance: 0, progress: 0, onTime: 0, activity: 0, average: 0, growth: 0, pending: 0 },
    },
  },
  {
    className: "9-Б",
    subject: "Алгебра",
    quarterData: {
      q1: { attendance: 90, progress: 79, onTime: 83, activity: 74, average: 3.9, growth: -0.1, pending: 11 },
      q2: { attendance: 89, progress: 78, onTime: 81, activity: 72, average: 3.8, growth: -0.1, pending: 12 },
      q3: { attendance: 88, progress: 76, onTime: 79, activity: 70, average: 3.7, growth: -0.2, pending: 12 },
      q4: { attendance: 0, progress: 0, onTime: 0, activity: 0, average: 0, growth: 0, pending: 0 },
    },
  },
  {
    className: "11-А",
    subject: "Математика",
    quarterData: {
      q1: { attendance: 96, progress: 92, onTime: 95, activity: 88, average: 4.7, growth: 0.3, pending: 4 },
      q2: { attendance: 96, progress: 91, onTime: 94, activity: 87, average: 4.6, growth: 0.2, pending: 4 },
      q3: { attendance: 95, progress: 90, onTime: 93, activity: 86, average: 4.6, growth: 0.1, pending: 5 },
      q4: { attendance: 0, progress: 0, onTime: 0, activity: 0, average: 0, growth: 0, pending: 0 },
    },
  },
  {
    className: "8-В",
    subject: "Математика",
    quarterData: {
      q1: { attendance: 92, progress: 82, onTime: 84, activity: 79, average: 4.1, growth: 0.1, pending: 8 },
      q2: { attendance: 91, progress: 81, onTime: 83, activity: 78, average: 4, growth: 0, pending: 8 },
      q3: { attendance: 91, progress: 80, onTime: 82, activity: 77, average: 4, growth: 0, pending: 8 },
      q4: { attendance: 0, progress: 0, onTime: 0, activity: 0, average: 0, growth: 0, pending: 0 },
    },
  },
];

const workloadPlan = [
  { label: "Проверка домашних", done: 78, total: 100 },
  { label: "Проверка СОР", done: 61, total: 100 },
  { label: "Заполнение журнала", done: 92, total: 100 },
];

function trendLabel(value) {
  if (value > 0) return `+${value.toFixed(1)}`;
  return value.toFixed(1);
}

function riskLabel(row) {
  if (row.average < 4 || row.attendance < 90) return "Высокий";
  if (row.average < 4.2 || row.onTime < 85) return "Средний";
  return "Низкий";
}

export default function TeacherStatsPage() {
  const [quarter, setQuarter] = useState("q3");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const classOptions = useMemo(() => ["all", ...new Set(statsRows.map((row) => row.className))], []);
  const subjectOptions = useMemo(() => ["all", ...new Set(statsRows.map((row) => row.subject))], []);

  const rows = useMemo(() => {
    return statsRows
      .filter((row) => classFilter === "all" || row.className === classFilter)
      .filter((row) => subjectFilter === "all" || row.subject === subjectFilter)
      .map((row) => ({
        className: row.className,
        subject: row.subject,
        ...row.quarterData[quarter],
      }));
  }, [quarter, classFilter, subjectFilter]);

  const summary = useMemo(() => {
    const attendance = rows.map((row) => row.attendance).filter((value) => value > 0);
    const progress = rows.map((row) => row.progress).filter((value) => value > 0);
    const onTime = rows.map((row) => row.onTime).filter((value) => value > 0);
    const activity = rows.map((row) => row.activity).filter((value) => value > 0);
    const averageMark = rows.map((row) => row.average).filter((value) => value > 0);
    const pending = rows.reduce((sum, row) => sum + row.pending, 0);

    return {
      attendance: attendance.length ? Math.round(average(attendance)) : 0,
      progress: progress.length ? Math.round(average(progress)) : 0,
      onTime: onTime.length ? Math.round(average(onTime)) : 0,
      activity: activity.length ? Math.round(average(activity)) : 0,
      averageMark: averageMark.length ? average(averageMark).toFixed(1) : "—",
      pending,
    };
  }, [rows]);

  const riskRows = useMemo(() => {
    return rows
      .filter((row) => row.average > 0)
      .map((row) => ({
        ...row,
        risk: riskLabel(row),
      }))
      .sort((a, b) => {
        const scoreA = a.risk === "Высокий" ? 3 : a.risk === "Средний" ? 2 : 1;
        const scoreB = b.risk === "Высокий" ? 3 : b.risk === "Средний" ? 2 : 1;
        return scoreB - scoreA;
      });
  }, [rows]);

  const planProgress = useMemo(() => {
    if (!workloadPlan.length) return 0;
    return Math.round(average(workloadPlan.map((item) => (item.done / item.total) * 100)));
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h2 className={styles.title}>Статистика преподавателя</h2>
          <p className={styles.sub}>Ключевые метрики по классам, динамика успеваемости и контроль учебной нагрузки.</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.quarterTabs}>
            {quarterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`${styles.tabBtn} ${quarter === option.key ? styles.tabBtnActive : ""}`}
                onClick={() => setQuarter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={styles.filterRow}>
            <select className={styles.select} value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Все классы" : option}
                </option>
              ))}
            </select>
            <select className={styles.select} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
              {subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Все предметы" : option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.metrics}>
        <article className={`${styles.metricCard} ${styles.blue}`}>
          <p className={styles.metricLabel}>Посещаемость</p>
          <p className={styles.metricValue}>{summary.attendance}%</p>
        </article>
        <article className={`${styles.metricCard} ${styles.green}`}>
          <p className={styles.metricLabel}>Успеваемость</p>
          <p className={styles.metricValue}>{summary.progress}%</p>
        </article>
        <article className={`${styles.metricCard} ${styles.orange}`}>
          <p className={styles.metricLabel}>Сдача в срок</p>
          <p className={styles.metricValue}>{summary.onTime}%</p>
        </article>
        <article className={`${styles.metricCard} ${styles.purple}`}>
          <p className={styles.metricLabel}>Активность LMS</p>
          <p className={styles.metricValue}>{summary.activity}%</p>
        </article>
      </section>

      <section className={styles.overview}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Динамика по классам</h3>
          <ul className={styles.progressList}>
            {rows.length ? (
              rows.map((row) => (
                <li key={`${row.className}-${row.subject}`} className={styles.progressItem}>
                  <div className={styles.progressTop}>
                    <p className={styles.progressLabel}>
                      {row.className} • {row.subject}
                    </p>
                    <p className={styles.progressMeta}>
                      ср. балл {row.average} • {trendLabel(row.growth)}
                    </p>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${row.progress}%` }} />
                  </div>
                </li>
              ))
            ) : (
              <li className={styles.emptyState}>Нет данных для выбранных фильтров.</li>
            )}
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Нагрузка и план</h3>
          <div className={styles.planHead}>
            <span>Выполнение задач четверти</span>
            <strong>{planProgress}%</strong>
          </div>
          <div className={styles.planTrack}>
            <div className={styles.planFill} style={{ width: `${planProgress}%` }} />
          </div>
          <ul className={styles.planList}>
            {workloadPlan.map((item) => (
              <li key={item.label} className={styles.planItem}>
                <span>{item.label}</span>
                <span>{item.done}%</span>
              </li>
            ))}
          </ul>
          <p className={styles.planMeta}>
            Средний балл: <strong>{summary.averageMark}</strong> • На проверке: <strong>{summary.pending}</strong>
          </p>
        </article>
      </section>

      <section className={styles.riskPanel}>
        <h3 className={styles.panelTitle}>Риски по классам</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Класс</th>
                <th>Предмет</th>
                <th>Средний балл</th>
                <th>Посещаемость</th>
                <th>Сдача в срок</th>
                <th>На проверке</th>
                <th>Риск</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.length ? (
                riskRows.map((row) => (
                  <tr key={`risk-${row.className}-${row.subject}`}>
                    <td>{row.className}</td>
                    <td>{row.subject}</td>
                    <td>{row.average}</td>
                    <td>{row.attendance}%</td>
                    <td>{row.onTime}%</td>
                    <td>{row.pending}</td>
                    <td>
                      <span
                        className={`${styles.riskBadge} ${
                          row.risk === "Высокий"
                            ? styles.riskHigh
                            : row.risk === "Средний"
                              ? styles.riskMid
                              : styles.riskLow
                        }`}
                      >
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    Нет данных для выбранных параметров.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
