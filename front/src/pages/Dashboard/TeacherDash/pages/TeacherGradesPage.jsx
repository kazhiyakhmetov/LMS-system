import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherGradesPage.module.css";
import { quarterOptions } from "../../../../shared/constants/academic";
import { average } from "../../../../shared/lib/utils/math";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { journalApi } from "../../../../shared/lib/api";
import { quarterKeyToNumber } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const ABSENCE_LETTERS = { Н: 0, П: 0, Б: 0, О: 0 };
const ATTENDANCE_KEYS = ["", "N", "P", "B", "O"];
const ATTENDANCE_VALUES = { N: "Н", P: "П", B: "Б", O: "О" };

function normalizeAbsenceCode(code) {
  if (!code) return null;
  const letter = String(code).trim().charAt(0).toUpperCase();
  const map = { Н: "Н", N: "Н", П: "П", P: "П", Б: "Б", B: "Б", О: "О", O: "О" };
  return map[letter] ?? null;
}

function formatShortDate(iso, lang) {
  if (!iso) return "—";
  const localeMap = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(localeMap[lang] || "ru-RU", { day: "2-digit", month: "2-digit" }).format(d);
  } catch {
    return iso;
  }
}

function buildStudentRow(studentDto, t) {
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
    student: studentDto.studentName || `${t("common.student")} #${studentDto.studentId}`,
    marks,
    quarterGrade: quarterGrade != null ? Number(quarterGrade) : 0,
    progress,
    attendancePercent,
    absence,
    cells,
  };
}

export default function TeacherGradesPage() {
  const { t, lang } = useT();
  const [quarter, setQuarter] = useState("q3");
  const [pairKey, setPairKey] = useState("");
  const [editing, setEditing] = useState(null);
  const [editAttendance, setEditAttendance] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editComment, setEditComment] = useState("");
  const [savingCell, setSavingCell] = useState(false);
  const [cellError, setCellError] = useState("");

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
  const dates = Array.isArray(journal.dates) ? journal.dates : [];
  const students = Array.isArray(journal.students) ? journal.students : [];
  const rows = useMemo(() => students.map((s) => buildStudentRow(s, t)), [students, t]);

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

  function openCellEditor(student, dateIdx) {
    const cell = student.cells?.[dateIdx] || null;
    const lessonDate = dates[dateIdx];
    if (!lessonDate) return;
    const existingEntry = (cell?.entries || []).find((e) => e?.editable && e?.numericValue != null);
    setEditing({
      studentId: student.studentId,
      studentName: student.student,
      lessonDate,
      dateLabel: formatShortDate(lessonDate, lang),
    });
    const code = normalizeAbsenceCode(cell?.attendanceCode);
    const codeKey = code ? Object.entries(ATTENDANCE_VALUES).find(([, v]) => v === code)?.[0] : "";
    setEditAttendance(codeKey || "");
    setEditGrade(existingEntry?.numericValue != null ? String(Math.round(existingEntry.numericValue)) : "");
    setEditComment("");
    setCellError("");
  }

  function closeEditor() {
    setEditing(null);
    setEditAttendance("");
    setEditGrade("");
    setEditComment("");
    setCellError("");
    setSavingCell(false);
  }

  async function saveCell() {
    if (!editing || !selectedPair) return;
    setCellError("");
    setSavingCell(true);
    try {
      const base = {
        classId: selectedPair.classId,
        subjectId: selectedPair.subjectId,
        studentId: editing.studentId,
        quarter: quarterKeyToNumber(quarter),
        lessonDate: editing.lessonDate,
      };
      const tasks = [];
      const statusValue = editAttendance ? ATTENDANCE_VALUES[editAttendance] : null;
      tasks.push(journalApi.upsertAttendance({ ...base, status: statusValue }));
      if (editGrade !== "") {
        tasks.push(journalApi.upsertLessonGrade({
          ...base,
          value: Number(editGrade),
          comment: editComment || null,
        }));
      }
      await Promise.all(tasks);
      await journalQuery.refetch();
      closeEditor();
    } catch (err) {
      setCellError(err?.message || t("teacher.grades.cellEditor.saveError"));
    } finally {
      setSavingCell(false);
    }
  }

  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => { if (e.key === "Escape") closeEditor(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  if (pairsQuery.loading && !pairs.length) {
    return <div style={{ padding: 24 }}>{t("teacher.grades.loading")}</div>;
  }
  if (!pairs.length) {
    return <div style={{ padding: 24 }}>{t("teacher.grades.noPairs")}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("teacher.grades.title")}</h2>
          <p className={styles.sub}>{t("teacher.grades.sub")}</p>
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
          <p className={styles.cardLabel}>{t("teacher.grades.kpiAvg")}</p>
          <p className={styles.cardValue}>{summary.quarterAverage}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>{t("teacher.grades.kpiProgress")}</p>
          <p className={styles.cardValue}>{summary.progressAverage}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>{t("teacher.grades.kpiAttendance")}</p>
          <p className={styles.cardValue}>{summary.attendanceAverage}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>{t("teacher.grades.kpiRisk")}</p>
          <p className={styles.cardValue}>{summary.riskCount}</p>
        </article>
      </section>

      {journalQuery.loading && !rows.length ? (
        <p style={{ padding: 16 }}>{t("teacher.grades.loading")}</p>
      ) : journalQuery.error ? (
        <p style={{ padding: 16, color: "var(--danger)" }}>{t("common.error")}: {journalQuery.error.message}</p>
      ) : (
        <>
          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, zIndex: 2, background: "var(--panel-2)", minWidth: 200 }}>{t("teacher.grades.summaryHeaders.student")}</th>
                  {dates.length ? dates.map((d, idx) => (
                    <th key={`${d}-${idx}`} style={{ textAlign: "center", minWidth: 56, fontVariantNumeric: "tabular-nums" }}>{formatShortDate(d, lang)}</th>
                  )) : (
                    <th style={{ textAlign: "center", color: "var(--muted)" }}>{t("teacher.grades.noLessonsCol")}</th>
                  )}
                  <th style={{ textAlign: "center", minWidth: 70 }}>{t("teacher.grades.quarterCol")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((row) => (
                  <tr key={row.studentId}>
                    <td style={{ position: "sticky", left: 0, background: "var(--panel)", fontWeight: 700 }}>
                      {row.student}
                    </td>
                    {dates.length ? dates.map((d, idx) => {
                      const cell = row.cells?.[idx];
                      const code = normalizeAbsenceCode(cell?.attendanceCode);
                      const entry = (cell?.entries || []).find((e) => e?.numericValue != null);
                      const mark = entry?.numericValue != null ? Math.round(entry.numericValue) : null;
                      return (
                        <td
                          key={`${row.studentId}-${idx}`}
                          style={{ textAlign: "center", padding: 6, cursor: "pointer" }}
                          onClick={() => openCellEditor(row, idx)}
                          title={t("teacher.grades.cellHint")}
                        >
                          {mark != null ? (
                            <span className={`${styles.markChip} ${styles[`markChip_${mark}`] || ""}`}>{mark}</span>
                          ) : code ? (
                            <span className={styles.markChip} style={{ background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", borderColor: "rgba(239, 68, 68, 0.3)" }}>{code}</span>
                          ) : (
                            <span style={{ opacity: 0.25 }}>·</span>
                          )}
                        </td>
                      );
                    }) : (
                      <td style={{ textAlign: "center", color: "var(--muted)" }}>—</td>
                    )}
                    <td style={{ textAlign: "center", padding: 6 }}>
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
                  </tr>
                )) : (
                  <tr><td colSpan={dates.length + 2} style={{ textAlign: "center", padding: 16 }}>{t("teacher.grades.noStudents")}</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className={styles.bottom}>
            <article className={styles.panel}>
              <h3 className={styles.panelTitle}>{t("teacher.grades.summary")}</h3>
              <div style={{ overflowX: "auto" }}>
                <table className={styles.table} style={{ minWidth: "auto" }}>
                  <thead>
                    <tr>
                      <th>{t("teacher.grades.summaryHeaders.student")}</th>
                      <th>{t("teacher.grades.summaryHeaders.marks")}</th>
                      <th>{t("teacher.grades.summaryHeaders.progress")}</th>
                      <th>{t("teacher.grades.summaryHeaders.attendance")}</th>
                      <th>{t("teacher.grades.summaryHeaders.absences")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`sum-${row.studentId}`}>
                        <td style={{ fontWeight: 600 }}>{row.student}</td>
                        <td>
                          <div className={styles.markList}>
                            {row.marks.length ? row.marks.map((mark, idx) => (
                              <span key={idx} className={`${styles.markChip} ${styles[`markChip_${mark}`] || ""}`}>{mark}</span>
                            )) : <span className={styles.empty}>—</span>}
                          </div>
                        </td>
                        <td>{row.progress ? `${row.progress}%` : "—"}</td>
                        <td>{row.attendancePercent ? `${row.attendancePercent}%` : "—"}</td>
                        <td className={styles.absence}>
                          Н:{row.absence.Н} П:{row.absence.П} Б:{row.absence.Б} О:{row.absence.О}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.legend}>
                <span>{t("teacher.grades.legend.n")}</span>
                <span>{t("teacher.grades.legend.p")}</span>
                <span>{t("teacher.grades.legend.b")}</span>
                <span>{t("teacher.grades.legend.o")}</span>
              </div>
            </article>
          </section>
        </>
      )}

      {editing ? (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)",
            display: "grid", placeItems: "center", zIndex: 50, padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}
        >
          <div style={{
            background: "var(--panel)", border: "1px solid var(--stroke)", borderRadius: "var(--radius-xl)",
            padding: 24, width: "100%", maxWidth: 460, boxShadow: "var(--shadow-3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{editing.studentName}</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                  {t("teacher.grades.cellEditor.lessonPrefix")} {editing.dateLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                style={{ width: 32, height: 32, border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)", background: "var(--panel-2)", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}
              >×</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("teacher.grades.cellEditor.attendance")}
                </label>
                <select
                  value={editAttendance}
                  onChange={(e) => setEditAttendance(e.target.value)}
                  style={{
                    height: 38, padding: "0 12px", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)",
                    background: "var(--panel-2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                  }}
                >
                  {ATTENDANCE_KEYS.map((k) => (
                    <option key={k || "none"} value={k}>{t(`teacher.grades.cellEditor.attendanceOptions.${k || "none"}`)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("teacher.grades.cellEditor.grade")}
                </label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  style={{
                    height: 38, padding: "0 12px", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)",
                    background: "var(--panel-2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                  }}
                >
                  <option value="">{t("teacher.grades.cellEditor.gradeOptions.none")}</option>
                  <option value="5">{t("teacher.grades.cellEditor.gradeOptions.five")}</option>
                  <option value="4">{t("teacher.grades.cellEditor.gradeOptions.four")}</option>
                  <option value="3">{t("teacher.grades.cellEditor.gradeOptions.three")}</option>
                  <option value="2">{t("teacher.grades.cellEditor.gradeOptions.two")}</option>
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("teacher.grades.cellEditor.comment")}
                </label>
                <input
                  type="text"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder={t("teacher.grades.cellEditor.commentPlaceholder")}
                  style={{
                    height: 38, padding: "0 12px", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)",
                    background: "var(--panel)", color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                  }}
                />
              </div>

              {cellError ? (
                <p style={{ margin: 0, padding: "8px 12px", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", background: "var(--danger-soft)", color: "var(--danger-strong)", fontSize: 12 }}>
                  {cellError}
                </p>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={closeEditor}
                  style={{
                    height: 38, padding: "0 16px", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)",
                    background: "var(--panel)", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >{t("teacher.grades.cellEditor.cancel")}</button>
                <button
                  type="button"
                  onClick={saveCell}
                  disabled={savingCell}
                  style={{
                    height: 38, padding: "0 18px", border: 0, borderRadius: "var(--radius-sm)",
                    background: "linear-gradient(135deg, var(--accent), var(--accent-alt))",
                    color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                  }}
                >
                  {savingCell ? t("teacher.grades.cellEditor.saving") : t("teacher.grades.cellEditor.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
