import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./TeacherHomePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { assignmentsApi, scheduleApi, statisticsApi } from "../../../../shared/lib/api";
import { formatDateTime, formatTime, toISODate } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

function lessonStatus(lesson, nowMin) {
  if (!lesson?.startTime || !lesson?.endTime) return "today";
  const [sh, sm] = String(lesson.startTime).split(":").map(Number);
  const [eh, em] = String(lesson.endTime).split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (nowMin >= start && nowMin <= end) return "now";
  if (start - nowMin > 0 && start - nowMin <= 60) return "next";
  return "today";
}

export default function TeacherHomePage() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const today = useMemo(() => toISODate(new Date()), []);
  const nowMin = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  const lessonsQuery = useApi(() => scheduleApi.teacherDay(today), [today]);
  const summaryQuery = useApi(() => statisticsApi.teacherSummary(), []);
  const assignmentsQuery = useApi(() => assignmentsApi.teacherMy(), []);

  const teacherName = useMemo(
    () => (user?.firstName || user?.name || t("teacher.home.defaultName")).split(" ")[0],
    [user, t],
  );

  const localeMap = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
  const longDate = useMemo(
    () => new Intl.DateTimeFormat(localeMap[lang] || "ru-RU", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date()),
    [lang],
  );

  const todayLessons = Array.isArray(lessonsQuery.data) ? lessonsQuery.data : [];
  const summary = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];
  const assignments = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];

  const summaryCards = useMemo(() => {
    const studentsTotal = summary.reduce((a, s) => a + (s.totalStudents || 0), 0);
    return [
      { label: t("teacher.home.kpiClasses"), value: summary.length || 0, meta: t("teacher.home.kpiClassesHint"), tone: "blue" },
      { label: t("teacher.home.kpiLessons"), value: todayLessons.length, meta: longDate, tone: "teal" },
      { label: t("teacher.home.kpiStudents"), value: studentsTotal, meta: t("teacher.home.kpiStudentsHint"), tone: "orange" },
      { label: t("teacher.home.kpiAssignments"), value: assignments.length, meta: t("teacher.home.kpiAssignmentsHint"), tone: "violet" },
    ];
  }, [summary, todayLessons, assignments, longDate, t]);

  const deadlines = useMemo(
    () => assignments
      .filter((a) => a?.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 3),
    [assignments],
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.heroEyebrow}>{t("teacher.home.eyebrow")}</p>
          <h2 className={styles.heroTitle}>{t("teacher.home.welcome", { name: teacherName })}</h2>
          <p className={styles.heroSub}>{t("teacher.home.sub")}</p>
        </div>
        <div className={styles.heroDate}>{longDate}</div>
      </section>

      <section className={styles.stats}>
        {summaryCards.map((card) => (
          <article key={card.label} className={`${styles.statCard} ${styles[card.tone]}`}>
            <p className={styles.statLabel}>{card.label}</p>
            <p className={styles.statValue}>{card.value}</p>
            <p className={styles.statMeta}>{card.meta}</p>
          </article>
        ))}
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className={styles.scheduleCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{t("teacher.home.todaySchedule")}</h3>
            </div>

            {lessonsQuery.loading && !todayLessons.length ? (
              <p className={styles.emptyState}>{t("common.loading")}</p>
            ) : lessonsQuery.error ? (
              <p className={styles.emptyState}>{t("teacher.home.scheduleError")}</p>
            ) : todayLessons.length ? (
              <ul className={styles.lessonList}>
                {todayLessons.map((lesson) => {
                  const status = lessonStatus(lesson, nowMin);
                  return (
                    <li key={lesson.id} className={styles.lessonItem}>
                      <p className={styles.lessonTime}>
                        {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                      </p>
                      <div className={styles.lessonInfo}>
                        <div className={styles.lessonTop}>
                          <p className={styles.lessonTitle}>
                            {lesson.subjectName} {lesson.className ? `• ${lesson.className}` : ""}
                          </p>
                          <span className={`${styles.statusChip} ${styles[status]}`}>
                            {t(`teacher.home.lessonStatus.${status}`)}
                          </span>
                        </div>
                        <p className={styles.lessonMeta}>
                          {lesson.classroom ? t("student.home.classroomShort", { room: lesson.classroom }) : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptyState}>{t("teacher.home.scheduleEmpty")}</p>
            )}
          </article>
        </div>

        <aside className={styles.deadlineCard}>
          <div className={styles.deadlineHead}>
            <h3 className={styles.sectionTitle}>{t("teacher.home.deadlines")}</h3>
            <span className={styles.deadlineCount}>{deadlines.length}</span>
          </div>

          {assignmentsQuery.loading && !deadlines.length ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
          ) : deadlines.length ? (
            <ul className={styles.deadlineList}>
              {deadlines.map((item) => (
                <li key={item.id} className={`${styles.deadlineItem} ${styles.deadlineFocus}`}>
                  <p className={styles.deadlineSubject}>{item.subjectName} • {item.className}</p>
                  <p className={styles.deadlineTitle}>{item.title}</p>
                  <p className={styles.deadlineMeta}>{formatDateTime(item.deadline)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("teacher.home.deadlinesEmpty")}</p>
          )}
        </aside>
      </section>
    </div>
  );
}
