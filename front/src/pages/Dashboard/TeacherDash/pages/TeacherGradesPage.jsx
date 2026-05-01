import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherGradesPage.module.css";
import { quarterOptions } from "../../../../shared/constants/academic";
import { average } from "../../../../shared/lib/utils/math";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { journalApi } from "../../../../shared/lib/api";
import { quarterKeyToNumber } from "../../../../shared/lib/utils/date";

const ABSENCE_LETTERS = { Н: 0, П: 0, Б: 0, О: 0 };

function normalizeAbsenceCode(code) {
  if (!code) return null;
  const letter = String(code).trim().charAt(0).toUpperCase();
  const map = { Н: "Н", N: "Н", П: "П", P: "П", Б: "Б", B: "Б", О: "О", O: "О" };
  return map[letter] ?? null;
}

function buildStudentRow(studentDto) {
  const cells = Array.isArray(studentDto.cells) ? studentDto.cells : [];
  const marks = [];
  const absence = { ...ABSENCE_LETTERS };
  let total = 0;
  let absent = 0;

  cells.forEach((cell) => {
    total += 1;
    const code = normalizeAbsenceCode(cell.attendanceCode);
    if (code) {
      absence[code] += 1;
      absent += 1;
    }
    (cell.entries || []).forEach((entry) => {
      if (entry?.numericValue != null) {
        marks.push(Math.round(entry.numericValue));
      }
    });
  });

  const quarterGrade = studentDto.finalGrade?.quarterGrade
    ?? studentDto.finalGrade?.calculatedQuarterGrade
    ?? null;
  const marksAverage = marks.length ? average(marks) : 0;
  const progress = marks.length ? Math.round((marksAverage / 5) * 100) : 0;
  const attendancePercent = total > 0 ? Math.round(((total - absent) / total) * 100) : 0;

  return {
    studentId: studentDto.studentId,
    student: studentDto.studentName || `Студент #${studentDto.studentId}`,
    marks,
    quarterGrade: quarterGrade != null ? Number(quarterGrade) : 0,
    progress,
    attendancePercent,
    absence,
  };
}

export default function TeacherGradesPage() {
  const [quarter, setQuarter] = useState("q3");
  const [pairKey, setPairKey] = useState("");

  const pairsQuery = useApi(() => journalApi.teacherPairs(), []);
  const pairs = useMemo(() => Array.isArray(pairsQuery.data) ? pairsQuery.data : [], [pairsQuery.data]);

  useEffect(() => {
    if (!pairKey && pairs.length) {
      const first = pairs[0];
      setPairKey(`${first.classId}-${first.subjectId}`);
    }
  }, [pairs, pairKey]);

  const selectedPair = useMemo(() => {
    if (!pairKey) return null;
    const [classId, subjectId] = pairKey.split("-").map(Number);
    return pairs.find((p) => p.classId === classId && p.subjectId === subjectId) || null;
  }, [pairKey, pairs]);

  const journalQuery = useApi(
    () => (selectedPair
      ? journalApi.teacherJournal({
          classId: selectedPair.classId,
          subjectId: selectedPair.subjectId,
          quarter: quarterKeyToNumber(quarter),
        })
      : Promise.resolve(null)
    ),
    [selectedPair?.classId, selectedPair?.subjectId, quarter],
    { immediate: Boolean(selectedPair) },
  );

  const journal = journalQuery.data || {};
  const students = Array.isArray(journal.students) ? journal.students : [];
  const rows = useMemo(() => students.map(buildStudentRow), [students]);

  const summary = useMemo(() => {
    const grades = rows.map((r) => r.quarterGrade).filter((v) => v > 0);
    const progressVals = rows.map((r) => r.progress).filter((v) => v > 0);
    const attendVals = rows.map((r) => r.attendancePercent).filter((v) => v > 0);
    const risk = rows.filter((r) => r.quarterGrade > 0 && r.quarterGrade <= 3).length;
    return {
      quarterAverage: grades.length ? average(grades).toFixed(1) : "—",
      progressAverage: progressVals.length ? `${Math.round(average(progressVals))}%` : "—",
      attendanceAverage: attendVals.length ? `${Math.round(average(attendVals))}%` : "—",
      riskCount: risk,
    };
  }, [rows]);

  const [savingFinal, setSavingFinal] = useState({});
  async function setQuarterFinal(studentId, value) {
    if (!selectedPair) return;
    setSavingFinal((prev) => ({ ...prev, [studentId]: true }));
    try {
      await journalApi.upsertQuarterFinal({
        classId: selectedPair.classId,
        subjectId: selectedPair.subjectId,
        studentId,
        quarter: quarterKeyToNumber(quarter),
        quarterGrade: value === "" ? null : Number(value),
      });
      await journalQuery.refetch();
    } finally {
      setSavingFinal((prev) => ({ ...prev, [studentId]: false }));
    }
  }

  if (pairsQuery.loading && !pairs.length) {
    return <div style={{ padding: 24 }}>Загрузка журналов…</div>;
  }
  if (!pairs.length) {
    return <div style={{ padding: 24 }}>Нет назначенных классов и предметов.</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Оценки и журнал</h2>
          <p className={styles.sub}>Журнал по выбранному классу-предмету и четверти.</p>
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
            <select className={styles.select} value={pairKey} onChange={(e) => setPairKey(e.target.value)}>
              {pairs.map((p) => (
                <option key={`${p.classId}-${p.subjectId}`} value={`${p.classId}-${p.subjectId}`}>
                  {p.className} • {p.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.cards}>
        <article className={styles.card}>
          <p className={styles.cardLabel}>Средняя по классу</p>
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
          <p className={styles.cardLabel}>В риске</p>
          <p className={styles.cardValue}>{summary.riskCount}</p>
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
                <th>Ученик</th>
                <th>Оценки</th>
                <th>За четверть</th>
                <th>Успеваемость</th>
                <th>Аттенданс</th>
                <th>Пропуски</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.studentId}>
                  <td>{row.student}</td>
                  <td>
                    <div className={styles.markList}>
                      {row.marks.length ? row.marks.map((mark, idx) => (
                        <span key={`${row.studentId}-${idx}`} className={styles.markChip}>{mark}</span>
                      )) : <span className={styles.empty}>—</span>}
                    </div>
                  </td>
                  <td>
                    <select
                      className={styles.markSelect}
                      value={row.quarterGrade || ""}
                      onChange={(e) => setQuarterFinal(row.studentId, e.target.value)}
                      disabled={!!savingFinal[row.studentId]}
                    >
                      <option value="">—</option>
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                    </select>
                  </td>
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
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 16 }}>Нет данных за выбранный период</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className={styles.bottom}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Подсказка</h3>
          <p style={{ color: "var(--muted)" }}>
            Изменение оценки за четверть в селекте сразу отправляется на сервер
            (PUT /api/journal/teacher/quarter-final). Для проставления текущих оценок (ФО) — используйте отдельный
            endpoint upsertLessonGrade — UI для дат-журнала добавим на следующем шаге.
          </p>
          <div className={styles.legend}>
            <span>Н — уважительная</span>
            <span>П — прогул</span>
            <span>Б — болезнь</span>
            <span>О — опоздание</span>
          </div>
        </article>
      </section>
    </div>
  );
}
