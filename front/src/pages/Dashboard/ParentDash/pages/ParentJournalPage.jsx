import { useEffect, useMemo, useState } from "react";
import styles from "./ParentJournalPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { formatDayMonth } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const QUARTERS = [1, 2, 3, 4];

function markChipClass(value) {
  if (value === 5) return styles.markChip_5;
  if (value === 4) return styles.markChip_4;
  if (value === 3) return styles.markChip_3;
  if (value === 2) return styles.markChip_2;
  return "";
}

function attendStyle(color) {
  return color
    ? { background: `${color}1A`, color, borderColor: `${color}66` }
    : undefined;
}

export default function ParentJournalPage() {
  const { t } = useT();
  const childrenQuery = useApi(() => parentApi.children(), []);
  const children = useMemo(
    () => Array.isArray(childrenQuery.data) ? childrenQuery.data : [],
    [childrenQuery.data],
  );

  const [childId, setChildId] = useState(null);
  const [quarter, setQuarter] = useState(1);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    if (childId == null && children.length) setChildId(children[0].id);
  }, [children, childId]);

  const journalQuery = useApi(
    () => (childId ? parentApi.childJournal(childId, quarter) : Promise.resolve([])),
    [childId, quarter],
    { immediate: Boolean(childId) },
  );

  const subjects = Array.isArray(journalQuery.data) ? journalQuery.data : [];
  const dates = subjects[0]?.dates || [];

  useEffect(() => { setExpandedSubject(null); }, [childId, quarter]);

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.loading")}</div>;
  }
  if (!children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.noChildren")}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("parent.journal.title")}</h2>
          <p className={styles.sub}>{t("parent.journal.sub")}</p>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.tabs}>
            {QUARTERS.map((q) => (
              <button
                key={q}
                type="button"
                className={`${styles.tabBtn} ${quarter === q ? styles.tabBtnActive : ""}`}
                onClick={() => setQuarter(q)}
              >
                {t("parent.journal.quarter", { n: q })}
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <select className={styles.select} value={childId ?? ""} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.fio} {c.className ? `(${c.className})` : ""}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.legendCard}>
        <span className={styles.legendItem}>
          <span className={`${styles.markChip} ${styles.markChip_5}`}>5</span>{t("parent.journal.legend.five")}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.markChip} ${styles.markChip_4}`}>4</span>{t("parent.journal.legend.four")}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.markChip} ${styles.markChip_3}`}>3</span>{t("parent.journal.legend.three")}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.markChip} ${styles.markChip_2}`}>2</span>{t("parent.journal.legend.two")}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.attendChip} style={attendStyle("#dc2626")}>Н</span>{t("parent.journal.legend.absence")}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.attendChip} style={attendStyle("#d97706")}>Б</span>{t("parent.journal.legend.sick")}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.attendChip} style={attendStyle("#059669")}>У</span>{t("parent.journal.legend.excused")}
        </span>
      </section>

      {journalQuery.loading && !subjects.length ? (
        <p style={{ padding: 16, color: "var(--muted)" }}>{t("parent.journal.loading")}</p>
      ) : subjects.length ? (
        <>
        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.subjectCell}>{t("parent.journal.headers.subject")}</th>
                {dates.map((d) => (
                  <th key={d} className={styles.dateCell}>{formatDayMonth(d)}</th>
                ))}
                <th className={styles.dateCell}>{t("parent.journal.headers.final")}</th>
                <th className={styles.dateCell}>{t("parent.journal.headers.year")}</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.subjectId}>
                  <td className={styles.subjectCell}>{subject.subjectName}</td>
                  {(subject.cells || []).map((cell) => (
                    <td key={cell.date} className={styles.cell}>
                      <div className={styles.dayCell}>
                        {cell.attendanceCode ? (
                          <span className={styles.attendChip} style={attendStyle(cell.attendanceColor)}>
                            {cell.attendanceCode}
                          </span>
                        ) : null}
                        {(cell.entries || []).map((e, idx) => (
                          <span key={idx} className={`${styles.markChip} ${markChipClass(e.numericValue)}`}>
                            {e.displayValue ?? e.numericValue ?? "—"}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                  <td className={`${styles.cell} ${styles.finalCell}`}>
                    {subject.finalGrade?.quarterGrade ?? subject.finalGrade?.calculatedQuarterGrade ?? "—"}
                  </td>
                  <td className={`${styles.cell} ${styles.finalCell}`}>
                    {subject.finalGrade?.yearGrade ?? subject.finalGrade?.calculatedYearGrade ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.mobileSubjects}>
          {subjects.map((subject) => {
            const expanded = expandedSubject === subject.subjectId;
            const quarterGrade = subject.finalGrade?.quarterGrade ?? subject.finalGrade?.calculatedQuarterGrade ?? "вЂ”";
            const yearGrade = subject.finalGrade?.yearGrade ?? subject.finalGrade?.calculatedYearGrade ?? "вЂ”";
            return (
              <article
                key={`mobile-${subject.subjectId}`}
                className={`${styles.subjectCard} ${expanded ? styles.subjectCardOpen : ""}`}
              >
                <button
                  type="button"
                  className={styles.subjectToggle}
                  onClick={() => setExpandedSubject((current) => current === subject.subjectId ? null : subject.subjectId)}
                  aria-expanded={expanded}
                >
                  <span>
                    <span className={styles.mobileSubjectName}>{subject.subjectName}</span>
                    <span className={styles.mobileSubjectMeta}>
                      {t("parent.journal.headers.final")}: {quarterGrade} - {t("parent.journal.headers.year")}: {yearGrade}
                    </span>
                  </span>
                  <span className={styles.subjectSummary}>
                    <span className={styles.finalBadge}>{quarterGrade}</span>
                    <span className={styles.subjectChevron}>{expanded ? "-" : "+"}</span>
                  </span>
                </button>

                {expanded ? (
                  <div className={styles.subjectDetails}>
                    <div className={styles.mobileFinalGrid}>
                      <span>
                        <strong>{quarterGrade}</strong>
                        {t("parent.journal.headers.final")}
                      </span>
                      <span>
                        <strong>{yearGrade}</strong>
                        {t("parent.journal.headers.year")}
                      </span>
                    </div>

                    <div className={styles.mobileDayList}>
                      {(subject.cells || []).map((cell) => (
                        <div key={`${subject.subjectId}-${cell.date}`} className={styles.mobileDayItem}>
                          <span className={styles.mobileDayDate}>{formatDayMonth(cell.date)}</span>
                          <span className={styles.mobileDayMarks}>
                            {cell.attendanceCode ? (
                              <span className={styles.attendChip} style={attendStyle(cell.attendanceColor)}>
                                {cell.attendanceCode}
                              </span>
                            ) : null}
                            {(cell.entries || []).length ? (cell.entries || []).map((e, idx) => (
                              <span key={idx} className={`${styles.markChip} ${markChipClass(e.numericValue)}`}>
                                {e.displayValue ?? e.numericValue ?? "вЂ”"}
                              </span>
                            )) : (
                              <span className={styles.mobileMuted}>вЂ”</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
        </>
      ) : (
        <p className={styles.empty}>{t("parent.journal.empty")}</p>
      )}
    </div>
  );
}
