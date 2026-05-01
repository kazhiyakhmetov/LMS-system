import { useMemo, useState } from "react";
import styles from "./StudentGradesPage.module.css";
import { quarterOptions } from "../../../../shared/constants/academic";
import { average } from "../../../../shared/lib/utils/math";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { journalApi, studentsApi } from "../../../../shared/lib/api";
import { formatDayMonth, quarterKeyToNumber } from "../../../../shared/lib/utils/date";

const ABSENCE_KEYS = ["Н", "П", "Б", "О", "N", "P", "B", "O"];

function normalizeAbsence(code) {
  if (!code) return null;
  const letter = String(code).trim().charAt(0).toUpperCase();
  const map = { Н: "Н", N: "Н", П: "П", P: "П", Б: "Б", B: "Б", О: "О", O: "О" };
  return map[letter] ?? null;
}

function buildRow(subjectDto) {
  const cells = Array.isArray(subjectDto.cells) ? subjectDto.cells : [];
  const marks = [];
  const absence = { Н: 0, П: 0, Б: 0, О: 0 };
  let total = 0;
  let absent = 0;

  cells.forEach((cell) => {
    total += 1;
    const code = normalizeAbsence(cell.attendanceCode);
    if (code && ABSENCE_KEYS.includes(code)) {
      absence[code] = (absence[code] || 0) + 1;
      absent += 1;
    }
    (cell.entries || []).forEach((entry) => {
      if (entry?.numericValue != null) {
        marks.push(Math.round(entry.numericValue));
      }
    });
  });

  const quarterGrade = subjectDto.finalGrade?.quarterGrade
    ?? subjectDto.finalGrade?.calculatedQuarterGrade
    ?? null;
  const marksAverage = marks.length ? average(marks) : 0;
  const progress = marks.length ? Math.round((marksAverage / 5) * 100) : 0;
  const attendancePercent = total > 0 ? Math.round(((total - absent) / total) * 100) : 0;

  return {
    subject: subjectDto.subjectName || "—",
    teacher: subjectDto.teacherName || "",
    marks,
    quarterGrade: quarterGrade != null ? Number(quarterGrade) : 0,
    absence,
    progress,
    attendancePercent,
  };
}

export default function StudentGradesPage() {
  const [quarterKey, setQuarterKey] = useState("q3");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const quarterNum = quarterKeyToNumber(quarterKey);

  const journalQuery = useApi(
    () => journalApi.studentMy(quarterNum),
    [quarterNum],
  );
  const recentQuery = useApi(() => studentsApi.myGrades(), []);

  const subjects = Array.isArray(journalQuery.data) ? journalQuery.data : [];

  const rows = useMemo(() => {
    return subjects
      .map(buildRow)
      .filter((row) => subjectFilter === "all" || row.subject === subjectFilter);
  }, [subjects, subjectFilter]);

  const subjectOptions = useMemo(
    () => ["all", ...new Set(subjects.map((s) => s.subjectName).filter(Boolean))],
    [subjects],
  );

  const summary = useMemo(() => {
    const quarterGrades = rows.map((r) => r.quarterGrade).filter((v) => v > 0);
    const progressValues = rows.map((r) => r.progress).filter((v) => v > 0);
    const attendanceValues = rows.map((r) => r.attendancePercent).filter((v) => v > 0);
    const risky = rows.filter((r) => r.quarterGrade > 0 && r.quarterGrade <= 3).length;
    return {
      quarterAverage: quarterGrades.length ? average(quarterGrades).toFixed(1) : "—",
      progressAverage: progressValues.length ? `${Math.round(average(progressValues))}%` : "—",
      attendanceAverage: attendanceValues.length ? `${Math.round(average(attendanceValues))}%` : "—",
      riskySubjects: risky,
    };
  }, [rows]);

  const recentRows = useMemo(() => {
    const list = Array.isArray(recentQuery.data) ? recentQuery.data : [];
    return list
      .filter((item) => subjectFilter === "all" || item.subjectName === subjectFilter)
      .slice(0, 6)
      .map((item) => ({
        date: item.gradedAt ? formatDayMonth(item.gradedAt) : "—",
        subject: item.subjectName || "—",
        title: item.assignmentTitle || "",
        mark: item.grade,
      }));
  }, [recentQuery.data, subjectFilter]);

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Оценки и успеваемость</h2>
          <p className={styles.sub}>
            Четвертные оценки, текущая успеваемость, аттенданс и журнал обычных оценок по предметам.
          </p>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.quarterTabs}>
            {quarterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`${styles.tabBtn} ${quarterKey === option.key ? styles.tabBtnActive : ""}`}
                onClick={() => setQuarterKey(option.key)}
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

            <button className={styles.exportBtn} type="button">Скачать оценки</button>
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

      {journalQuery.loading && !rows.length ? (
        <p style={{ padding: 16 }}>Загрузка журнала…</p>
      ) : journalQuery.error ? (
        <p style={{ padding: 16, color: "var(--danger)" }}>Ошибка: {journalQuery.error.message}</p>
      ) : (
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
              {rows.length ? rows.map((row) => (
                <tr key={row.subject}>
                  <td>{row.subject}</td>
                  <td>{row.teacher || "—"}</td>
                  <td>
                    <div className={styles.markList}>
                      {row.marks.length ? row.marks.map((mark, index) => (
                        <span key={`${row.subject}-${mark}-${index}`} className={styles.markChip}>
                          {mark}
                        </span>
                      )) : <span className={styles.empty}>—</span>}
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
                    Н:{row.absence.Н} П:{row.absence.П} Б:{row.absence.Б} О:{row.absence.О}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 16 }}>Нет данных за выбранный период</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className={styles.bottom}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Последние оценки</h3>
          {recentQuery.loading && !recentRows.length ? (
            <p>Загрузка…</p>
          ) : (
            <ul className={styles.eventList}>
              {recentRows.length ? recentRows.map((item, idx) => (
                <li key={`${item.date}-${item.subject}-${idx}`} className={styles.eventItem}>
                  <span className={styles.eventDate}>{item.date}</span>
                  <span className={styles.eventSubject}>{item.subject}</span>
                  <span className={styles.eventType}>{item.title}</span>
                  <span className={styles.eventMark}>{item.mark ?? "—"}</span>
                </li>
              )) : (
                <li className={styles.eventEmpty}>Нет оценок за выбранный период.</li>
              )}
            </ul>
          )}
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Коды посещаемости</h3>
          <ul className={styles.codes}>
            <li><strong>Н</strong> — уважительная причина</li>
            <li><strong>П</strong> — прогул</li>
            <li><strong>Б</strong> — болезнь</li>
            <li><strong>О</strong> — опоздание</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
