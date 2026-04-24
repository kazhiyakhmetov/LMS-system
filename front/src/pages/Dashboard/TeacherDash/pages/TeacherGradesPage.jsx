import { useMemo, useState } from "react";
import styles from "./TeacherGradesPage.module.css";
import { quarterOptions } from "../../../../shared/constants/academic";
import { average } from "../../../../shared/lib/utils/math";

const initialGradebook = [
  {
    id: 1,
    student: "Айгерим Каримова",
    className: "10-А",
    subject: "Алгебра",
    quarterData: {
      q1: { fo: [5, 5, 4, 5], sor: 5, soch: 5, quarter: 5, checked: 14, pending: 0, attendance: { present: 34, total: 36, N: 1, P: 0, B: 1, O: 0 } },
      q2: { fo: [5, 4, 5, 5], sor: 5, soch: 4, quarter: 5, checked: 15, pending: 1, attendance: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 } },
      q3: { fo: [5, 4, 5, 4], sor: 5, soch: 4, quarter: 5, checked: 13, pending: 1, attendance: { present: 29, total: 30, N: 1, P: 0, B: 0, O: 0 } },
      q4: { fo: [], sor: 0, soch: 0, quarter: 0, checked: 0, pending: 0, attendance: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 } },
    },
  },
  {
    id: 2,
    student: "Дамир Ахметов",
    className: "10-А",
    subject: "Алгебра",
    quarterData: {
      q1: { fo: [4, 4, 5, 3], sor: 4, soch: 4, quarter: 4, checked: 13, pending: 1, attendance: { present: 33, total: 36, N: 2, P: 0, B: 1, O: 0 } },
      q2: { fo: [4, 4, 4, 4], sor: 4, soch: 4, quarter: 4, checked: 14, pending: 2, attendance: { present: 32, total: 36, N: 2, P: 1, B: 1, O: 0 } },
      q3: { fo: [3, 4, 4, 3], sor: 3, soch: 4, quarter: 3, checked: 12, pending: 3, attendance: { present: 25, total: 30, N: 2, P: 2, B: 1, O: 0 } },
      q4: { fo: [], sor: 0, soch: 0, quarter: 0, checked: 0, pending: 0, attendance: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 } },
    },
  },
  {
    id: 3,
    student: "Султан Алиев",
    className: "10-А",
    subject: "Геометрия",
    quarterData: {
      q1: { fo: [4, 5, 4, 4], sor: 4, soch: 5, quarter: 4, checked: 12, pending: 1, attendance: { present: 34, total: 36, N: 1, P: 0, B: 1, O: 0 } },
      q2: { fo: [4, 4, 5, 4], sor: 4, soch: 4, quarter: 4, checked: 13, pending: 1, attendance: { present: 34, total: 36, N: 1, P: 0, B: 1, O: 0 } },
      q3: { fo: [5, 4, 5, 4], sor: 5, soch: 4, quarter: 5, checked: 12, pending: 1, attendance: { present: 28, total: 30, N: 1, P: 1, B: 0, O: 0 } },
      q4: { fo: [], sor: 0, soch: 0, quarter: 0, checked: 0, pending: 0, attendance: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 } },
    },
  },
  {
    id: 4,
    student: "Нурай Талгат",
    className: "9-Б",
    subject: "Геометрия",
    quarterData: {
      q1: { fo: [3, 4, 4, 3], sor: 3, soch: 4, quarter: 3, checked: 11, pending: 2, attendance: { present: 30, total: 36, N: 3, P: 1, B: 2, O: 0 } },
      q2: { fo: [4, 3, 4, 3], sor: 4, soch: 3, quarter: 3, checked: 12, pending: 2, attendance: { present: 29, total: 36, N: 3, P: 2, B: 2, O: 0 } },
      q3: { fo: [3, 3, 4, 3], sor: 3, soch: 3, quarter: 3, checked: 10, pending: 3, attendance: { present: 23, total: 30, N: 3, P: 3, B: 1, O: 0 } },
      q4: { fo: [], sor: 0, soch: 0, quarter: 0, checked: 0, pending: 0, attendance: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 } },
    },
  },
  {
    id: 5,
    student: "Артур Нуров",
    className: "9-Б",
    subject: "Алгебра",
    quarterData: {
      q1: { fo: [5, 5, 4, 5], sor: 5, soch: 4, quarter: 5, checked: 13, pending: 0, attendance: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 } },
      q2: { fo: [4, 5, 5, 4], sor: 4, soch: 5, quarter: 5, checked: 14, pending: 1, attendance: { present: 34, total: 36, N: 1, P: 0, B: 1, O: 0 } },
      q3: { fo: [4, 4, 5, 4], sor: 4, soch: 4, quarter: 4, checked: 11, pending: 1, attendance: { present: 28, total: 30, N: 1, P: 1, B: 0, O: 0 } },
      q4: { fo: [], sor: 0, soch: 0, quarter: 0, checked: 0, pending: 0, attendance: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 } },
    },
  },
  {
    id: 6,
    student: "Ерасыл Данияр",
    className: "11-А",
    subject: "Математика",
    quarterData: {
      q1: { fo: [4, 5, 4, 4], sor: 4, soch: 4, quarter: 4, checked: 15, pending: 1, attendance: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 } },
      q2: { fo: [5, 4, 4, 5], sor: 5, soch: 4, quarter: 5, checked: 16, pending: 1, attendance: { present: 35, total: 36, N: 1, P: 0, B: 0, O: 0 } },
      q3: { fo: [4, 5, 5, 4], sor: 5, soch: 5, quarter: 5, checked: 14, pending: 0, attendance: { present: 29, total: 30, N: 1, P: 0, B: 0, O: 0 } },
      q4: { fo: [], sor: 0, soch: 0, quarter: 0, checked: 0, pending: 0, attendance: { present: 0, total: 0, N: 0, P: 0, B: 0, O: 0 } },
    },
  },
];

const recentEvents = [
  { date: "10.03", quarter: "q3", className: "10-А", subject: "Алгебра", student: "Айгерим К.", type: "СОР", mark: 5 },
  { date: "10.03", quarter: "q3", className: "10-А", subject: "Алгебра", student: "Дамир А.", type: "ФО", mark: 3 },
  { date: "09.03", quarter: "q3", className: "9-Б", subject: "Геометрия", student: "Нурай Т.", type: "ФО", mark: 3 },
  { date: "09.03", quarter: "q3", className: "9-Б", subject: "Алгебра", student: "Артур Н.", type: "СОР", mark: 4 },
  { date: "08.03", quarter: "q3", className: "11-А", subject: "Математика", student: "Ерасыл Д.", type: "СОЧ", mark: 5 },
];

function getAttendancePercent(attendance) {
  if (!attendance?.total) return 0;
  return Math.round((attendance.present / attendance.total) * 100);
}

function parseMark(value) {
  if (value === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function TeacherGradesPage() {
  const [gradebook, setGradebook] = useState(initialGradebook);
  const [quarter, setQuarter] = useState("q3");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const classOptions = useMemo(() => ["all", ...new Set(gradebook.map((row) => row.className))], [gradebook]);

  const subjectOptions = useMemo(() => {
    const rows = classFilter === "all" ? gradebook : gradebook.filter((row) => row.className === classFilter);
    return ["all", ...new Set(rows.map((row) => row.subject))];
  }, [gradebook, classFilter]);

  const filteredRows = useMemo(() => {
    return gradebook
      .filter((row) => classFilter === "all" || row.className === classFilter)
      .filter((row) => subjectFilter === "all" || row.subject === subjectFilter)
      .map((row) => {
        const quarterInfo = row.quarterData[quarter];
        const foMarks = quarterInfo.fo.filter((mark) => mark > 0);
        const foAverage = average(foMarks);
        const progress = Math.round((foAverage / 5) * 100);
        const attendancePercent = getAttendancePercent(quarterInfo.attendance);

        return {
          ...row,
          quarterInfo,
          foMarks,
          progress,
          attendancePercent,
        };
      });
  }, [gradebook, classFilter, subjectFilter, quarter]);

  const summary = useMemo(() => {
    const quarterMarks = filteredRows.map((row) => row.quarterInfo.quarter).filter((value) => value > 0);
    const progressValues = filteredRows.map((row) => row.progress).filter((value) => value > 0);
    const attendanceValues = filteredRows.map((row) => row.attendancePercent).filter((value) => value > 0);
    const pendingTotal = filteredRows.reduce((sum, row) => sum + row.quarterInfo.pending, 0);
    const riskCount = filteredRows.filter((row) => row.quarterInfo.quarter > 0 && row.quarterInfo.quarter <= 3).length;

    return {
      quarterAverage: quarterMarks.length ? average(quarterMarks).toFixed(1) : "—",
      progressAverage: progressValues.length ? `${Math.round(average(progressValues))}%` : "—",
      attendanceAverage: attendanceValues.length ? `${Math.round(average(attendanceValues))}%` : "—",
      pendingTotal,
      riskCount,
    };
  }, [filteredRows]);

  const events = useMemo(() => {
    return recentEvents
      .filter((item) => item.quarter === quarter)
      .filter((item) => classFilter === "all" || item.className === classFilter)
      .filter((item) => subjectFilter === "all" || item.subject === subjectFilter)
      .slice(0, 6);
  }, [quarter, classFilter, subjectFilter]);

  const risks = useMemo(() => {
    return filteredRows
      .filter((row) => row.quarterInfo.quarter > 0 && (row.quarterInfo.quarter <= 3 || row.attendancePercent < 80))
      .map((row) => ({
        id: row.id,
        student: row.student,
        className: row.className,
        subject: row.subject,
        quarter: row.quarterInfo.quarter,
        attendancePercent: row.attendancePercent,
        pending: row.quarterInfo.pending,
      }));
  }, [filteredRows]);

  const updateMark = (recordId, field, rawValue) => {
    const value = parseMark(rawValue);
    setGradebook((prev) =>
      prev.map((row) =>
        row.id === recordId
          ? {
              ...row,
              quarterData: {
                ...row.quarterData,
                [quarter]: {
                  ...row.quarterData[quarter],
                  [field]: value,
                },
              },
            }
          : row,
      ),
    );
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Оценки и журнал</h2>
          <p className={styles.sub}>Управление оценками по четвертям, аттендансом и текущей нагрузкой на проверку.</p>
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
            <select className={styles.select} value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              {classOptions.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "Все классы" : value}
                </option>
              ))}
            </select>

            <select className={styles.select} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
              {subjectOptions.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "Все предметы" : value}
                </option>
              ))}
            </select>

            <button className={styles.exportBtn} type="button">
              Скачать журнал
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
          <p className={styles.cardLabel}>На проверке</p>
          <p className={styles.cardValue}>{summary.pendingTotal}</p>
        </article>
      </section>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ученик</th>
              <th>Класс</th>
              <th>Предмет</th>
              <th>ФО</th>
              <th>СОР</th>
              <th>СОЧ</th>
              <th>За четверть</th>
              <th>Проверено</th>
              <th>Аттенданс</th>
              <th>Пропуски</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td>{row.student}</td>
                <td>{row.className}</td>
                <td>{row.subject}</td>
                <td>
                  <div className={styles.markList}>
                    {row.foMarks.length ? (
                      row.foMarks.map((mark, index) => (
                        <span key={`${row.id}-fo-${index}`} className={styles.markChip}>
                          {mark}
                        </span>
                      ))
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
                  </div>
                </td>
                <td>
                  <select
                    className={styles.markSelect}
                    value={row.quarterInfo.sor || ""}
                    onChange={(event) => updateMark(row.id, "sor", event.target.value)}
                  >
                    <option value="">—</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                  </select>
                </td>
                <td>
                  <select
                    className={styles.markSelect}
                    value={row.quarterInfo.soch || ""}
                    onChange={(event) => updateMark(row.id, "soch", event.target.value)}
                  >
                    <option value="">—</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                  </select>
                </td>
                <td>
                  <select
                    className={styles.markSelect}
                    value={row.quarterInfo.quarter || ""}
                    onChange={(event) => updateMark(row.id, "quarter", event.target.value)}
                  >
                    <option value="">—</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                  </select>
                </td>
                <td className={styles.checked}>
                  {row.quarterInfo.checked} / {row.quarterInfo.pending}
                </td>
                <td>{row.attendancePercent ? `${row.attendancePercent}%` : "—"}</td>
                <td className={styles.absence}>
                  Н:{row.quarterInfo.attendance.N} П:{row.quarterInfo.attendance.P} Б:{row.quarterInfo.attendance.B} О:
                  {row.quarterInfo.attendance.O}
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
            {events.length ? (
              events.map((eventItem) => (
                <li key={`${eventItem.date}-${eventItem.student}-${eventItem.type}`} className={styles.eventItem}>
                  <span className={styles.eventDate}>{eventItem.date}</span>
                  <span className={styles.eventSubject}>
                    {eventItem.student} • {eventItem.subject}
                  </span>
                  <span className={styles.eventType}>{eventItem.type}</span>
                  <span className={styles.eventMark}>{eventItem.mark}</span>
                </li>
              ))
            ) : (
              <li className={styles.eventEmpty}>Нет оценок за выбранные параметры.</li>
            )}
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Зона внимания</h3>
          {risks.length ? (
            <ul className={styles.riskList}>
              {risks.map((risk) => (
                <li key={risk.id} className={styles.riskItem}>
                  <p className={styles.riskName}>
                    {risk.student} ({risk.className})
                  </p>
                  <p className={styles.riskMeta}>
                    {risk.subject} • четверть: {risk.quarter || "—"} • посещаемость: {risk.attendancePercent || "—"}% • на
                    проверке: {risk.pending}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noRisk}>По текущим фильтрам учеников в риске нет.</p>
          )}

          <div className={styles.legend}>
            <span>Н — уважительная</span>
            <span>П — прогул</span>
            <span>Б — болезнь</span>
            <span>О — опоздание</span>
            <span>Всего в риске: {summary.riskCount}</span>
          </div>
        </article>
      </section>
    </div>
  );
}
