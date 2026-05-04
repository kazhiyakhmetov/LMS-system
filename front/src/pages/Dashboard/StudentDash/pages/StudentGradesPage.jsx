import { useMemo, useState } from "react";
import styles from "./StudentGradesPage.module.css";
import { quarterOptions } from "../../../../shared/constants/academic";
import { average } from "../../../../shared/lib/utils/math";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { journalApi, studentsApi } from "../../../../shared/lib/api";
import { formatDayMonth, quarterKeyToNumber } from "../../../../shared/lib/utils/date";
import { DonutChart, BarList, ChartLegend } from "../../../../shared/ui/Chart/Chart";
import { useT } from "../../../../shared/lib/i18n";

const ABSENCE_KEYS = ["Н", "П", "Б", "О", "N", "P", "B", "O"];

const MARK_COLORS = {
  5: "#10b981",
  4: "#4f46e5",
  3: "#f59e0b",
  2: "#ef4444",
};

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
        marks.push({
          value: Math.round(entry.numericValue),
          date: cell.date || null,
          type: entry.type || null,
        });
      }
    });
  });

  const quarterGrade = subjectDto.finalGrade?.quarterGrade
    ?? subjectDto.finalGrade?.calculatedQuarterGrade
    ?? null;
  const marksValues = marks.map((m) => m.value);
  const marksAverage = marksValues.length ? average(marksValues) : 0;
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
  const { t } = useT();
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

  const distribution = useMemo(() => {
    const buckets = { 5: 0, 4: 0, 3: 0, 2: 0 };
    rows.forEach((r) => {
      r.marks.forEach((m) => {
        const v = typeof m === "object" ? m.value : m;
        if (buckets[v] != null) buckets[v] += 1;
      });
    });
    return [
      { label: t("student.grades.marks.excellent"), value: buckets[5], color: MARK_COLORS[5] },
      { label: t("student.grades.marks.good"), value: buckets[4], color: MARK_COLORS[4] },
      { label: t("student.grades.marks.ok"), value: buckets[3], color: MARK_COLORS[3] },
      { label: t("student.grades.marks.bad"), value: buckets[2], color: MARK_COLORS[2] },
    ];
  }, [rows, t]);

  const totalMarks = distribution.reduce((sum, d) => sum + d.value, 0);

  const subjectPerformance = useMemo(() => {
    return rows
      .filter((r) => r.progress > 0)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 6)
      .map((r) => ({
        label: r.subject,
        value: r.progress,
        color: r.progress >= 80
          ? "linear-gradient(90deg, #10b981, #34d399)"
          : r.progress >= 60
            ? "linear-gradient(90deg, var(--accent), var(--accent-alt))"
            : "linear-gradient(90deg, #f59e0b, #fbbf24)",
      }));
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
        <div className={styles.headerTop}>
          <div>
            <h2 className={styles.title}>{t("student.grades.title")}</h2>
            <p className={styles.sub}>{t("student.grades.sub")}</p>
          </div>
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
                  {subject === "all" ? t("student.grades.allSubjects") : subject}
                </option>
              ))}
            </select>

            <button className={styles.exportBtn} type="button">{t("student.grades.exportBtn")}</button>
          </div>
        </div>
      </section>

      <section className={styles.cards}>
        <article className={`${styles.card} ${styles.tone_indigo}`}>
          <p className={styles.cardLabel}>{t("student.grades.kpiQuarterAvg")}</p>
          <p className={styles.cardValue}>{summary.quarterAverage}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_mint}`}>
          <p className={styles.cardLabel}>{t("student.grades.kpiProgress")}</p>
          <p className={styles.cardValue}>{summary.progressAverage}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_gold}`}>
          <p className={styles.cardLabel}>{t("student.grades.kpiAttendance")}</p>
          <p className={styles.cardValue}>{summary.attendanceAverage}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_rose}`}>
          <p className={styles.cardLabel}>{t("student.grades.kpiRisky")}</p>
          <p className={styles.cardValue}>{summary.riskySubjects}</p>
        </article>
      </section>

      <section className={styles.chartRow}>
        <article className={styles.chartCard}>
          <div className={styles.chartHead}>
            <h3 className={styles.sectionTitle}>{t("student.grades.distribution")}</h3>
          </div>
          {totalMarks > 0 ? (
            <div className={styles.donutLayout}>
              <DonutChart
                data={distribution}
                size={180}
                strokeWidth={24}
                centerLabel={t("student.grades.gradesUnit")}
                centerValue={totalMarks}
              />
              <ChartLegend data={distribution} />
            </div>
          ) : (
            <p className={styles.emptyState}>{t("student.grades.gradesEmpty")}</p>
          )}
        </article>

        <article className={styles.chartCard}>
          <div className={styles.chartHead}>
            <h3 className={styles.sectionTitle}>{t("student.grades.topSubjects")}</h3>
          </div>
          {subjectPerformance.length ? (
            <BarList
              data={subjectPerformance}
              max={100}
              valueFormatter={(v) => `${v}%`}
            />
          ) : (
            <p className={styles.emptyState}>{t("student.grades.noPeriodData")}</p>
          )}
        </article>
      </section>

      {journalQuery.loading && !rows.length ? (
        <p className={styles.emptyState}>{t("student.grades.loading")}</p>
      ) : journalQuery.error ? (
        <p className={styles.errorState}>{t("common.error")}: {journalQuery.error.message}</p>
      ) : (
        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("student.grades.tableHeaders.subject")}</th>
                <th>{t("student.grades.tableHeaders.teacher")}</th>
                <th>{t("student.grades.tableHeaders.marks")}</th>
                <th>{t("student.grades.tableHeaders.quarter")}</th>
                <th>{t("student.grades.tableHeaders.progress")}</th>
                <th>{t("student.grades.tableHeaders.attendance")}</th>
                <th>{t("student.grades.tableHeaders.absences")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.subject}>
                  <td className={styles.subjectCell}>{row.subject}</td>
                  <td className={styles.teacherCell}>{row.teacher || "—"}</td>
                  <td>
                    <div className={styles.markList}>
                      {row.marks.length ? row.marks.map((mark, index) => {
                        const value = typeof mark === "object" ? mark.value : mark;
                        const date = typeof mark === "object" ? mark.date : null;
                        return (
                          <div
                            key={`${row.subject}-${index}`}
                            className={styles.markCell}
                            title={date || ""}
                          >
                            <span className={`${styles.markChip} ${styles[`markChip_${value}`] || ""}`}>
                              {value}
                            </span>
                            {date ? (
                              <span className={styles.markDate}>
                                {new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                              </span>
                            ) : null}
                          </div>
                        );
                      }) : <span className={styles.empty}>—</span>}
                    </div>
                  </td>
                  <td>
                    {row.quarterGrade ? (
                      <span className={`${styles.quarterMark} ${styles[`quarterMark_${row.quarterGrade}`] || ""}`}>
                        {row.quarterGrade}
                      </span>
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
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
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>{t("student.grades.noPeriodData")}</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className={styles.bottom}>
        <article className={styles.panel}>
          <div className={styles.chartHead}>
            <h3 className={styles.sectionTitle}>{t("student.grades.recentGrades")}</h3>
          </div>
          {recentQuery.loading && !recentRows.length ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
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
                <li className={styles.eventEmpty}>{t("student.grades.recentEmpty")}</li>
              )}
            </ul>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.chartHead}>
            <h3 className={styles.sectionTitle}>{t("student.grades.attendanceCodes")}</h3>
          </div>
          <ul className={styles.codes}>
            <li className={styles.codeItem}>
              <span className={`${styles.codeBadge} ${styles.codeBadge_n}`}>Н</span>
              <span className={styles.codeLabel}>{t("student.grades.absence.N")}</span>
            </li>
            <li className={styles.codeItem}>
              <span className={`${styles.codeBadge} ${styles.codeBadge_p}`}>П</span>
              <span className={styles.codeLabel}>{t("student.grades.absence.P")}</span>
            </li>
            <li className={styles.codeItem}>
              <span className={`${styles.codeBadge} ${styles.codeBadge_b}`}>Б</span>
              <span className={styles.codeLabel}>{t("student.grades.absence.B")}</span>
            </li>
            <li className={styles.codeItem}>
              <span className={`${styles.codeBadge} ${styles.codeBadge_o}`}>О</span>
              <span className={styles.codeLabel}>{t("student.grades.absence.O")}</span>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
