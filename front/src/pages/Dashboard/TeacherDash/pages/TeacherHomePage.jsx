import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./TeacherHomePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { assignmentsApi, scheduleApi, statisticsApi } from "../../../../shared/lib/api";
import { formatDateTime, formatTime, toISODate } from "../../../../shared/lib/utils/date";

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

function statusLabel(status) {
  if (status === "now") return "Сейчас";
  if (status === "next") return "Следующий";
  return "Сегодня";
}

export default function TeacherHomePage() {
  const { user } = useAuth();
  const today = useMemo(() => toISODate(new Date()), []);
  const nowMin = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  const lessonsQuery = useApi(() => scheduleApi.teacherDay(today), [today]);
  const summaryQuery = useApi(() => statisticsApi.teacherSummary(), []);
  const assignmentsQuery = useApi(() => assignmentsApi.teacherMy(), []);

  const teacherName = useMemo(() => (user?.firstName || user?.name || "преподаватель").split(" ")[0], [user]);

  const longDate = useMemo(
    () => new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    [],
  );

  const todayLessons = Array.isArray(lessonsQuery.data) ? lessonsQuery.data : [];
  const summary = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];
  const assignments = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];

  const summaryCards = useMemo(() => {
    const studentsTotal = summary.reduce((a, s) => a + (s.totalStudents || 0), 0);
    return [
      { label: "Мои классы", value: summary.length || 0, meta: "по статистике", tone: "blue" },
      { label: "Уроков сегодня", value: todayLessons.length, meta: longDate, tone: "teal" },
      { label: "Учеников всего", value: studentsTotal, meta: "по моим классам", tone: "orange" },
      { label: "Заданий", value: assignments.length, meta: "созданных мной", tone: "violet" },
    ];
  }, [summary, todayLessons, assignments, longDate]);

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
          <p className={styles.heroEyebrow}>Teacher Workspace</p>
          <h2 className={styles.heroTitle}>Добро пожаловать, {teacherName}!</h2>
          <p className={styles.heroSub}>
            Расписание, учебная нагрузка и ближайшие дедлайны заданий — в одном месте.
          </p>
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
              <h3 className={styles.sectionTitle}>Мое расписание на сегодня</h3>
            </div>

            {lessonsQuery.loading && !todayLessons.length ? (
              <p className={styles.emptyState}>Загрузка…</p>
            ) : lessonsQuery.error ? (
              <p className={styles.emptyState}>Не удалось загрузить расписание</p>
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
                          <span className={`${styles.statusChip} ${styles[status]}`}>{statusLabel(status)}</span>
                        </div>
                        <p className={styles.lessonMeta}>
                          {lesson.classroom ? `Каб. ${lesson.classroom}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptyState}>На сегодня уроков нет</p>
            )}
          </article>
        </div>

        <aside className={styles.deadlineCard}>
          <div className={styles.deadlineHead}>
            <h3 className={styles.sectionTitle}>Ближайшие дедлайны заданий</h3>
            <span className={styles.deadlineCount}>{deadlines.length}</span>
          </div>

          {assignmentsQuery.loading && !deadlines.length ? (
            <p className={styles.emptyState}>Загрузка…</p>
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
            <p className={styles.emptyState}>Активных заданий нет.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
