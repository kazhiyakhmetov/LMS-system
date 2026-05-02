import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { assignmentsApi, gamificationApi, scheduleApi, surveysApi } from "../../../../shared/lib/api";
import { formatDateTime, formatTime, toISODate } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";
import styles from "./StudentHomePage.module.css";

function toneFor(deadline) {
  if (!deadline) return "focus";
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const diffHours = (dl - now) / 3_600_000;
  if (diffHours <= 24) return "critical";
  if (diffHours <= 72) return "warning";
  return "focus";
}

function StatIcon({ name }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "xp":     return <svg {...c}><path d="M12 3l2.6 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.7 20 7.7 13.8 3.3 9.5l6.1-.9L12 3Z"/></svg>;
    case "rank":   return <svg {...c}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M17 6h3a2 2 0 0 1-2 3h-1M7 6H4a2 2 0 0 0 2 3h1"/></svg>;
    case "tasks":  return <svg {...c}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6v3H9zM8 12h8M8 16h5"/></svg>;
    case "clock":  return <svg {...c}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case "fire":   return <svg {...c}><path d="M12 2c1 5 5 6 5 11a5 5 0 0 1-10 0c0-3 2-3 2-6 0-2 1-4 3-5z"/></svg>;
    default: return null;
  }
}

export default function StudentHomePage() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const today = useMemo(() => toISODate(new Date()), []);

  const todayLessonsQuery = useApi(() => scheduleApi.studentDay(today), [today]);
  const surveysQuery = useApi(() => surveysApi.available(), []);
  const assignmentsQuery = useApi(() => assignmentsApi.studentToSubmit(), []);
  const overdueQuery = useApi(() => assignmentsApi.studentOverdue(), []);
  const statsQuery = useApi(() => gamificationApi.studentStats(), []);

  const studentName = useMemo(() => {
    const name = user?.firstName || user?.name || t("student.home.defaultName");
    return name.split(" ")[0];
  }, [user, t]);

  const localeMap = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
  const longDate = useMemo(
    () => new Intl.DateTimeFormat(localeMap[lang] || "ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    [lang],
  );

  const todayLessons = Array.isArray(todayLessonsQuery.data) ? todayLessonsQuery.data : [];
  const availableSurveys = Array.isArray(surveysQuery.data) ? surveysQuery.data : [];
  const pendingAssignments = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];
  const overdueAssignments = Array.isArray(overdueQuery.data) ? overdueQuery.data : [];
  const stats = statsQuery.data || {};

  const allDeadlines = useMemo(() => {
    const list = [...pendingAssignments, ...overdueAssignments];
    return list
      .filter((a) => a?.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);
  }, [pendingAssignments, overdueAssignments]);

  const tasksCount = pendingAssignments.length + overdueAssignments.length;

  const kpis = [
    { key: "xp", label: t("student.home.kpiXp"), value: stats.totalXp ?? 0, tone: "indigo", icon: "xp" },
    { key: "rank", label: t("student.home.kpiRank"), value: stats.rank != null ? `#${stats.rank}` : "—", tone: "gold", icon: "rank" },
    { key: "lessons", label: t("student.home.kpiLessons"), value: todayLessons.length, sub: t("common.today").toLowerCase(), tone: "mint", icon: "clock" },
    { key: "tasks", label: t("student.home.kpiTasks"), value: tasksCount, sub: tasksCount === 1 ? t("student.home.activeTask") : t("student.home.activeTasks"), tone: "rose", icon: "tasks" },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBody}>
          <p className={styles.heroEyebrow}>{t("student.home.eyebrow")} · {stats.level != null ? t("student.gamification.currentLevel", { level: stats.level }) : ""}</p>
          <h2 className={styles.heroTitle}>{t("student.home.greeting", { name: studentName })} 👋</h2>
          <p className={styles.heroSub}>{t("student.home.sub")}</p>
        </div>
        <div className={styles.heroDate}>
          <span className={styles.heroDateLabel}>{t("student.home.todayLabel")}</span>
          <span className={styles.heroDateValue}>{longDate}</span>
          {stats.currentStreak ? (
            <span className={styles.heroStreak}>
              <StatIcon name="fire" /> {t("student.home.streakDays", { count: stats.currentStreak })}
            </span>
          ) : null}
        </div>
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
              <h3 className={styles.sectionTitle}>{t("student.home.scheduleToday")}</h3>
              <span className={styles.lessonCount}>{todayLessons.length}</span>
            </div>

            {todayLessonsQuery.loading && !todayLessons.length ? (
              <p className={styles.emptyState}>{t("common.loading")}</p>
            ) : todayLessonsQuery.error ? (
              <p className={styles.emptyState}>{t("student.home.scheduleError")}</p>
            ) : todayLessons.length ? (
              <ul className={styles.lessonList}>
                {todayLessons.map((lesson, i) => (
                  <li key={lesson.id} className={styles.lessonItem}>
                    <span className={styles.lessonNumber}>{lesson.lessonNumber ?? i + 1}</span>
                    <div className={styles.lessonTimes}>
                      <span className={styles.lessonStart}>{formatTime(lesson.startTime)}</span>
                      <span className={styles.lessonEnd}>{formatTime(lesson.endTime)}</span>
                    </div>
                    <div className={styles.lessonInfo}>
                      <p className={styles.lessonTitle}>{lesson.subjectName}</p>
                      <p className={styles.lessonMeta}>
                        {lesson.classroom ? t("student.home.classroomShort", { room: lesson.classroom }) : ""}
                        {lesson.teacherName ? ` • ${lesson.teacherName}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>
                <p style={{ margin: 0, fontSize: 15, color: "var(--text-2)" }}>{t("student.home.noLessonsTitle")}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>{t("student.home.noLessonsHint")}</p>
              </div>
            )}
          </article>

          <article className={styles.eventsCard}>
            <div className={styles.cardHead}>
              <h3 className={styles.sectionTitle}>{t("student.home.events")}</h3>
              {availableSurveys.length ? <span className={styles.lessonCount}>{availableSurveys.length}</span> : null}
            </div>

            {surveysQuery.loading && !availableSurveys.length ? (
              <p className={styles.emptyState}>{t("common.loading")}</p>
            ) : availableSurveys.length ? (
              <ul className={styles.eventList}>
                {availableSurveys.slice(0, 3).map((s) => (
                  <li key={s.id} className={styles.eventItem}>
                    <span className={styles.eventBadge}>{t("student.home.surveyBadge")}</span>
                    <div>
                      <p className={styles.eventTitle}>{s.title}</p>
                      {s.description ? <p className={styles.eventDesc}>{s.description}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>{t("student.home.eventsEmpty")}</p>
            )}
          </article>
        </div>

        <aside className={styles.deadlineCard}>
          <div className={styles.cardHead}>
            <h3 className={styles.sectionTitle}>{t("student.home.deadlines")}</h3>
            <span className={styles.lessonCount}>{allDeadlines.length}</span>
          </div>

          {assignmentsQuery.loading && !allDeadlines.length ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
          ) : allDeadlines.length ? (
            <ul className={styles.deadlineList}>
              {allDeadlines.map((item) => {
                const tone = toneFor(item.deadline);
                return (
                  <li key={item.id} className={`${styles.deadlineItem} ${styles[tone]}`}>
                    <p className={styles.deadlineSubject}>{item.subjectName || item.subject || ""}</p>
                    <p className={styles.deadlineTitle}>{item.title}</p>
                    <p className={styles.deadlineMeta}>{formatDateTime(item.deadline)}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("student.home.deadlinesEmpty")}</p>
          )}
        </aside>
      </section>
    </div>
  );
}
