import { useEffect, useMemo, useState } from "react";
import styles from "./ParentGradesPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { average } from "../../../../shared/lib/utils/math";
import { formatDayMonth, formatDateTime } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

export default function ParentGradesPage() {
  const { t } = useT();
  const childrenQuery = useApi(() => parentApi.children(), []);
  const children = useMemo(() => Array.isArray(childrenQuery.data) ? childrenQuery.data : [], [childrenQuery.data]);

  const [childId, setChildId] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("all");

  useEffect(() => {
    if (childId == null && children.length) setChildId(children[0].id);
  }, [children, childId]);

  const gradesQuery = useApi(
    () => (childId ? parentApi.childGrades(childId, 200) : Promise.resolve([])),
    [childId],
    { immediate: Boolean(childId) },
  );

  const grades = Array.isArray(gradesQuery.data) ? gradesQuery.data : [];

  const subjectOptions = useMemo(
    () => ["all", ...new Set(grades.map((g) => g.subject).filter(Boolean))],
    [grades],
  );

  const filteredGrades = useMemo(
    () => grades.filter((g) => subjectFilter === "all" || g.subject === subjectFilter),
    [grades, subjectFilter],
  );

  const subjectStats = useMemo(() => {
    const grouped = {};
    grades.forEach((g) => {
      const key = g.subject || "—";
      if (!grouped[key]) grouped[key] = [];
      if (g.grade != null) grouped[key].push(Number(g.grade));
    });
    return Object.entries(grouped).map(([subject, marks]) => ({
      subject,
      marks,
      average: marks.length ? average(marks).toFixed(1) : "—",
      count: marks.length,
    })).filter((row) => subjectFilter === "all" || row.subject === subjectFilter);
  }, [grades, subjectFilter]);

  const summary = useMemo(() => {
    const allMarks = filteredGrades.map((g) => Number(g.grade)).filter((v) => Number.isFinite(v));
    return {
      avgGrade: allMarks.length ? average(allMarks).toFixed(1) : "—",
      totalGrades: allMarks.length,
      subjectsCount: subjectStats.length,
    };
  }, [filteredGrades, subjectStats]);

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
          <h2 className={styles.title}>{t("parent.grades.title")}</h2>
          <p className={styles.sub}>{t("parent.grades.sub")}</p>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.actions}>
            <select className={styles.select} value={childId ?? ""} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.fio} {c.className ? `(${c.className})` : ""}</option>
              ))}
            </select>

            <select className={styles.select} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>{s === "all" ? t("parent.grades.allSubjects") : s}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.cards}>
        <article className={styles.card}>
          <p className={styles.cardLabel}>{t("parent.grades.kpiAvg")}</p>
          <p className={styles.cardValue}>{summary.avgGrade}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>{t("parent.grades.kpiTotal")}</p>
          <p className={styles.cardValue}>{summary.totalGrades}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.cardLabel}>{t("parent.grades.kpiSubjects")}</p>
          <p className={styles.cardValue}>{summary.subjectsCount}</p>
        </article>
      </section>

      {gradesQuery.loading && !grades.length ? (
        <p style={{ padding: 16, color: "var(--muted)" }}>{t("parent.grades.loadingTable")}</p>
      ) : (
        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("parent.grades.headers.subject")}</th>
                <th>{t("parent.grades.headers.marks")}</th>
                <th>{t("parent.grades.headers.avg")}</th>
                <th>{t("parent.grades.headers.count")}</th>
              </tr>
            </thead>
            <tbody>
              {subjectStats.length ? subjectStats.map((row) => (
                <tr key={row.subject}>
                  <td>{row.subject}</td>
                  <td>
                    <div className={styles.markList}>
                      {row.marks.length ? row.marks.map((m, idx) => (
                        <span key={`${row.subject}-${idx}`} className={styles.markChip}>{m}</span>
                      )) : <span className={styles.empty}>—</span>}
                    </div>
                  </td>
                  <td>{row.average}</td>
                  <td>{row.count}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--muted)" }}>{t("parent.grades.noData")}</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className={styles.bottom}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("parent.grades.latest")}</h3>
          <ul className={styles.eventList}>
            {filteredGrades.length ? filteredGrades.slice(0, 12).map((g, idx) => (
              <li key={`${g.date}-${idx}`} className={styles.eventItem}>
                <span className={styles.eventDate}>{g.date ? formatDayMonth(g.date) : "—"}</span>
                <span className={styles.eventSubject}>{g.subject || "—"}</span>
                <span className={styles.eventType}>
                  {g.title || ""}
                  {g.title && g.date ? " • " : ""}
                  {g.date ? formatDateTime(g.date) : ""}
                </span>
                <span className={styles.eventMark}>{g.grade ?? "—"}</span>
              </li>
            )) : (
              <li className={styles.eventEmpty}>{t("parent.grades.latestEmpty")}</li>
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}
