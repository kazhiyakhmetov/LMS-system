import { useMemo, useState } from "react";
import styles from "./StudentGradesPage.module.css";
import { quarterOptions } from "../../../../shared/constants/academic";
import { average } from "../../../../shared/lib/utils/math";

const subjects = [
  {
    subject: "Алгебра",
    teacher: "К. Муханова",
    marksByQuarter: {
      q1: [5, 4, 5, 5, 4],
      q2: [5, 5, 4, 5, 5],
      q3: [4, 5, 4, 4, 5],
      q4: [5, 5, 5, 4, 5],
    },
    quarterGrades: { q1: 5, q2: 5, q3: 4, q4: 5 },
    attendanceByQuarter: {
      q1: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 },
      q2: { present: 34, total: 36, N: 1, P: 0, B: 1, O: 0 },
      q3: { present: 33, total: 35, N: 1, P: 0, B: 1, O: 0 },
      q4: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 },
    },
  },
  {
    subject: "Физика",
    teacher: "М. Искаков",
    marksByQuarter: {
      q1: [4, 4, 3, 4, 4],
      q2: [4, 4, 4, 3, 4],
      q3: [3, 4, 4, 4, 3],
      q4: [4, 4, 4, 0, 0],
    },
    quarterGrades: { q1: 4, q2: 4, q3: 4, q4: 0 },
    attendanceByQuarter: {
      q1: { present: 33, total: 36, N: 2, P: 0, B: 1, O: 0 },
      q2: { present: 32, total: 36, N: 2, P: 0, B: 2, O: 0 },
      q3: { present: 31, total: 35, N: 2, P: 1, B: 1, O: 0 },
      q4: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 },
    },
  },
  {
    subject: "История Казахстана",
    teacher: "Д. Турсынбек",
    marksByQuarter: {
      q1: [4, 5, 4, 5, 5],
      q2: [4, 4, 5, 5, 4],
      q3: [5, 4, 4, 5, 5],
      q4: [5, 4, 5, 0, 0],
    },
    quarterGrades: { q1: 5, q2: 4, q3: 5, q4: 0 },
    attendanceByQuarter: {
      q1: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 },
      q2: { present: 34, total: 36, N: 1, P: 0, B: 1, O: 0 },
      q3: { present: 34, total: 35, N: 1, P: 0, B: 0, O: 0 },
      q4: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 },
    },
  },
  {
    subject: "Английский язык",
    teacher: "A. White",
    marksByQuarter: {
      q1: [5, 5, 5, 4, 5],
      q2: [5, 4, 5, 5, 5],
      q3: [5, 5, 4, 5, 5],
      q4: [5, 5, 0, 0, 0],
    },
    quarterGrades: { q1: 5, q2: 5, q3: 5, q4: 0 },
    attendanceByQuarter: {
      q1: { present: 36, total: 36, N: 0, P: 0, B: 0, O: 0 },
      q2: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 },
      q3: { present: 34, total: 35, N: 1, P: 0, B: 0, O: 0 },
      q4: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 },
    },
  },
  {
    subject: "Информатика",
    teacher: "А. Жанибек",
    marksByQuarter: {
      q1: [5, 4, 5, 5, 5],
      q2: [5, 5, 5, 4, 5],
      q3: [5, 4, 5, 4, 5],
      q4: [5, 0, 0, 0, 0],
    },
    quarterGrades: { q1: 5, q2: 5, q3: 5, q4: 0 },
    attendanceByQuarter: {
      q1: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 },
      q2: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 },
      q3: { present: 33, total: 35, N: 1, P: 0, B: 1, O: 0 },
      q4: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 },
    },
  },
];

const recentGrades = [
  { date: "10.03", subject: "Алгебра", mark: 5, type: "ФО", quarter: "q3" },
  { date: "09.03", subject: "Физика", mark: 4, type: "ФО", quarter: "q3" },
  { date: "07.03", subject: "История Казахстана", mark: 5, type: "СОР", quarter: "q3" },
  { date: "06.03", subject: "Английский язык", mark: 5, type: "ФО", quarter: "q3" },
  { date: "05.03", subject: "Информатика", mark: 4, type: "ФО", quarter: "q3" },
  { date: "28.02", subject: "Алгебра", mark: 4, type: "ФО", quarter: "q3" },
];

export default function StudentGradesPage() {
  const [quarter, setQuarter] = useState("q3");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const subjectOptions = useMemo(() => ["all", ...subjects.map((item) => item.subject)], []);

  const rows = useMemo(() => {
    return subjects
      .filter((item) => subjectFilter === "all" || item.subject === subjectFilter)
      .map((item) => {
        const marks = item.marksByQuarter[quarter].filter((mark) => mark > 0);
        const quarterGrade = item.quarterGrades[quarter];
        const attendance = item.attendanceByQuarter[quarter];
        const marksAverage = average(marks);
        const progress = Math.round((marksAverage / 5) * 100);
        const attendancePercent = attendance.total
          ? Math.round((attendance.present / attendance.total) * 100)
          : 0;

        return {
          ...item,
          marks,
          quarterGrade,
          attendance,
          progress,
          attendancePercent,
        };
      });
  }, [quarter, subjectFilter]);

  const summary = useMemo(() => {
    const quarterGrades = rows.map((item) => item.quarterGrade).filter((value) => value > 0);
    const progressValues = rows.map((item) => item.progress).filter((value) => value > 0);
    const attendanceValues = rows.map((item) => item.attendancePercent).filter((value) => value > 0);
    const riskySubjects = rows.filter((item) => item.quarterGrade > 0 && item.quarterGrade <= 3).length;

    return {
      quarterAverage: quarterGrades.length ? average(quarterGrades).toFixed(1) : "—",
      progressAverage: progressValues.length ? `${Math.round(average(progressValues))}%` : "—",
      attendanceAverage: attendanceValues.length ? `${Math.round(average(attendanceValues))}%` : "—",
      riskySubjects,
    };
  }, [rows]);

  const latestRows = useMemo(() => {
    return recentGrades
      .filter((item) => item.quarter === quarter)
      .filter((item) => subjectFilter === "all" || item.subject === subjectFilter)
      .slice(0, 6);
  }, [quarter, subjectFilter]);

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Оценки и успеваемость</h2>
          <p className={styles.sub}>
            Структура как в школьных LMS: четвертные оценки, текущая успеваемость, аттенданс и журнал обычных
            оценок по предметам.
          </p>
        </div>

        <div className={styles.headerControls}>
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

          <div className={styles.actions}>
            <select
              className={styles.subjectSelect}
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject === "all" ? "Все предметы" : subject}
                </option>
              ))}
            </select>

            <button className={styles.exportBtn} type="button">
              Скачать оценки
            </button>
          </div>
        </div>
      </section>

      <section className={styles.cards}>
        <article className={styles.card}>
          <p className={styles.cardLabel}>Средняя за четверть</p>
          <p className={styles.cardValue}>{summary.quarterAverage}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>Успеваемость</p>
          <p className={styles.cardValue}>{summary.progressAverage}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>Аттенданс</p>
          <p className={styles.cardValue}>{summary.attendanceAverage}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>Предметов в риске</p>
          <p className={styles.cardValue}>{summary.riskySubjects}</p>
        </article>
      </section>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Учитель</th>
              <th>Обычные оценки</th>
              <th>За четверть</th>
              <th>Успеваемость</th>
              <th>Аттенданс</th>
              <th>Пропуски</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.subject}>
                <td>{row.subject}</td>
                <td>{row.teacher}</td>
                <td>
                  <div className={styles.markList}>
                    {row.marks.length ? (
                      row.marks.map((mark, index) => (
                        <span key={`${row.subject}-${mark}-${index}`} className={styles.markChip}>
                          {mark}
                        </span>
                      ))
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
                  </div>
                </td>
                <td>{row.quarterGrade || "—"}</td>
                <td>
                  <div className={styles.progressWrap}>
                    <span className={styles.progressValue}>{row.progress ? `${row.progress}%` : "—"}</span>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${row.progress}%` }} />
                    </div>
                  </div>
                </td>
                <td>{row.attendancePercent ? `${row.attendancePercent}%` : "—"}</td>
                <td className={styles.absence}>
                  Н:{row.attendance.N} П:{row.attendance.P} Б:{row.attendance.B} О:{row.attendance.O}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.bottom}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Последние оценки</h3>
          <ul className={styles.eventList}>
            {latestRows.length ? (
              latestRows.map((item) => (
                <li key={`${item.date}-${item.subject}-${item.type}`} className={styles.eventItem}>
                  <span className={styles.eventDate}>{item.date}</span>
                  <span className={styles.eventSubject}>{item.subject}</span>
                  <span className={styles.eventType}>{item.type}</span>
                  <span className={styles.eventMark}>{item.mark}</span>
                </li>
              ))
            ) : (
              <li className={styles.eventEmpty}>Нет оценок за выбранный период.</li>
            )}
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Коды посещаемости</h3>
          <ul className={styles.codes}>
            <li>
              <strong>Н</strong> — уважительная причина
            </li>
            <li>
              <strong>П</strong> — прогул
            </li>
            <li>
              <strong>Б</strong> — болезнь
            </li>
            <li>
              <strong>О</strong> — опоздание
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
