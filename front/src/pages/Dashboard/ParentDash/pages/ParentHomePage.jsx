import { useEffect, useMemo, useState } from "react";
import styles from "./ParentHomePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { formatDateTime, formatTime, toISODate } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const LOCALE_MAP = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };

function toneFor(deadline) {
  if (!deadline) return "focus";
  const diffH = (new Date(deadline).getTime() - Date.now()) / 3_600_000;
  if (diffH <= 24) return "critical";
  if (diffH <= 72) return "warning";
  return "focus";
}

function StatIcon({ name }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "avg":    return <svg {...c}><path d="M12 3l2.6 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.7 20 7.7 13.8 3.3 9.5l6.1-.9L12 3Z"/></svg>;
    case "tasks":  return <svg {...c}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6v3H9zM8 12h8M8 16h5"/></svg>;
    case "clock":  return <svg {...c}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case "alert":  return <svg {...c}><path d="M12 2 2 22h20L12 2Z"/><path d="M12 9v6M12 18v.01"/></svg>;
    default: return null;
  }
}

export default function ParentHomePage() {
  const { t, lang } = useT();
  const today = useMemo(() => toISODate(new Date()), []);

  const childrenQuery = useApi(() => parentApi.children(), []);
  const children = useMemo(() => Array.isArray(childrenQuery.data) ? childrenQuery.data : [], [childrenQuery.data]);

  const [childId, setChildId] = useState(null);
  useEffect(() => {
    if (childId == null && children.length) setChildId(children[0].id);
  }, [children, childId]);

  const selectedChild = useMemo(
    () => children.find((c) => String(c.id) === String(childId)) || null,
    [children, childId],
  );

  const lessonsQuery = useApi(
    () => (selectedChild ? parentApi.childScheduleDay(selectedChild.id, today) : Promise.resolve([])),
    [selectedChild?.id, today],
    { immediate: Boolean(selectedChild) },
  );

  const gradesQuery = useApi(
    () => (selectedChild ? parentApi.childGrades(selectedChild.id, 6) : Promise.resolve([])),
    [selectedChild?.id],
    { immediate: Boolean(selectedChild) },
  );

  const statsQuery = useApi(
    () => (selectedChild ? parentApi.childStats(selectedChild.id) : Promise.resolve({})),
    [selectedChild?.id],
    { immediate: Boolean(selectedChild) },
  );

  const lessons = Array.isArray(lessonsQuery.data) ? lessonsQuery.data : [];
  const grades = Array.isArray(gradesQuery.data) ? gradesQuery.data : [];
  const stats = statsQuery.data || {};

  const longDate = useMemo(
    () => new Intl.DateTimeFormat(LOCALE_MAP[lang] || "ru-RU", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date()),
    [lang],
  );

  const kpis = [
    { key: "avg",     label: t("parent.home.kpiAvg"),     value: stats.avgGrade ?? "—", sub: t("parent.home.kpiAvgSub", { count: stats.totalGrades ?? 0 }), tone: "indigo", icon: "avg" },
    { key: "lessons", label: t("parent.home.kpiLessons"), value: lessons.length,        sub: lessons.length === 1 ? t("parent.home.kpiLessonsOne") : t("parent.home.kpiLessonsMany"), tone: "mint", icon: "clock" },
    { key: "pending", label: t("parent.home.kpiPending"), value: stats.pending ?? 0,    sub: t("parent.home.kpiPendingSub"), tone: "gold", icon: "tasks" },
    { key: "overdue", label: t("parent.home.kpiOverdue"), value: stats.overdue ?? 0,    sub: t("parent.home.kpiOverdueSub"), tone: "rose", icon: "alert" },
  ];

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.loadingChildren")}</div>;
  }
  if (!children.length) {
    return (
      <div className={styles.emptyState} style={{ margin: 24 }}>
        {t("parent.common.noChildren")}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBody}>
          <p className={styles.heroEyebrow}>{t("parent.home.eyebrow")}</p>
          <h2 className={styles.heroTitle}>{t("parent.home.title")}</h2>
          <p className={styles.heroSub}>{t("parent.home.sub")}</p>
        </div>
        <div className={styles.heroDate}>
          <span className={styles.heroDateLabel}>{t("parent.home.todayLabel")}</span>
          <span className={styles.heroDateValue}>{longDate}</span>
        </div>
      </section>

      <section className={styles.studentCard}>
        <div className={styles.studentInfo}>
          <p className={styles.studentName}>{selectedChild?.fio || "—"}</p>
          <p className={styles.studentMeta}>
            {selectedChild?.className || "—"}
            {selectedChild?.schoolName ? ` • ${selectedChild.schoolName}` : ""}
            {selectedChild?.email ? ` • ${selectedChild.email}` : ""}
          </p>
        </div>

        {children.length > 1 ? (
          <select
            className={styles.childSelect}
            value={childId ?? ""}
            onChange={(event) => setChildId(event.target.value)}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.fio} {child.className ? `(${child.className})` : ""}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      <section className={styles.kpiRow}>
        {kpis.map((k) => (
          <article key={k.key} className={`${styles.kpiCard} ${styles[`tone_${k.tone}`]}`}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiLabel}>{k.label}</span>
              <span className={styles.kpiIcon}><StatIcon name={k.icon} /></span>
            </div>
            <p className={styles.kpiValue}>{k.value}</p>
            {k.sub ? <p className={styles.kpiSub}>{k.sub}</p> : null}
          </article>
        ))}
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className={styles.scheduleCard}>
            <div className={styles.cardHead}>
              <h3 className={styles.sectionTitle}>{t("parent.home.todaySchedule")}</h3>
              <span className={styles.lessonCount}>{lessons.length}</span>
            </div>

            {lessonsQuery.loading && !lessons.length ? (
              <p className={styles.emptyState}>{t("common.loading")}</p>
            ) : lessons.length ? (
              <ul className={styles.lessonList}>
                {lessons.map((lesson) => (
                  <li key={lesson.id} className={styles.lessonItem}>
                    <span className={styles.lessonNumber}>
                      <span className={styles.lessonStart}>{formatTime(lesson.startTime)}</span>
                      <span className={styles.lessonEnd}>{formatTime(lesson.endTime)}</span>
                    </span>
                    <div className={styles.lessonInfo}>
                      <p className={styles.lessonTitle}>{lesson.subjectName}</p>
                      <p className={styles.lessonMeta}>
                        {lesson.classroom ? t("parent.common.classroomShort", { room: lesson.classroom }) : ""}
                        {lesson.teacherName ? ` • ${lesson.teacherName}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>{t("parent.home.todayScheduleEmpty")}</p>
            )}
          </article>

          <article className={styles.eventsCard}>
            <div className={styles.cardHead}>
              <h3 className={styles.sectionTitle}>{t("parent.home.latestGrades")}</h3>
              {grades.length ? <span className={styles.lessonCount}>{grades.length}</span> : null}
            </div>

            {gradesQuery.loading && !grades.length ? (
              <p className={styles.emptyState}>{t("common.loading")}</p>
            ) : grades.length ? (
              <ul className={styles.eventList}>
                {grades.map((g, idx) => (
                  <li key={`${g.date}-${idx}`} className={styles.eventItem}>
                    <div>
                      <p className={styles.eventTitle}>{g.subject || "—"}</p>
                      {g.title ? <p className={styles.eventDesc}>{g.title}</p> : null}
                      <p className={styles.eventMeta}>{g.date ? formatDateTime(g.date) : ""}</p>
                    </div>
                    <span className={styles.eventMark}>{g.grade ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>{t("parent.home.latestGradesEmpty")}</p>
            )}
          </article>
        </div>

        <aside className={styles.deadlineCard}>
          <div className={styles.cardHead}>
            <h3 className={styles.sectionTitle}>{t("parent.home.todayLessons")}</h3>
            <span className={styles.lessonCount}>{lessons.length}</span>
          </div>

          {lessons.length ? (
            <ul className={styles.deadlineList}>
              {lessons.slice(0, 5).map((lesson) => (
                <li key={`d-${lesson.id}`} className={`${styles.deadlineItem} ${styles[toneFor(lesson.date)]}`}>
                  <p className={styles.deadlineSubject}>{lesson.subjectName}</p>
                  <p className={styles.deadlineTitle}>
                    {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                  </p>
                  <p className={styles.deadlineMeta}>
                    {lesson.classroom ? t("parent.common.classroomShort", { room: lesson.classroom }) : ""}
                    {lesson.teacherName ? ` • ${lesson.teacherName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("parent.home.todayLessonsEmpty")}</p>
          )}
        </aside>
      </section>
    </div>
  );
}
