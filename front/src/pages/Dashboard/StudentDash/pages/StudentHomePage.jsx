import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { assignmentsApi, scheduleApi, surveysApi } from "../../../../shared/lib/api";
import { formatDateTime, formatTime, toISODate } from "../../../../shared/lib/utils/date";
import styles from "./StudentHomePage.module.css";

function pickUpcomingSurvey(surveys) {
  if (!Array.isArray(surveys) || !surveys.length) return null;
  const withDeadline = surveys
    .map((s) => ({ s, dl: s.deadline ? new Date(s.deadline).getTime() : Infinity }))
    .sort((a, b) => a.dl - b.dl);
  return withDeadline[0]?.s ?? null;
}

function toneFor(deadline) {
  if (!deadline) return "focus";
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const diffHours = (dl - now) / 3_600_000;
  if (diffHours <= 24) return "critical";
  if (diffHours <= 72) return "warning";
  return "focus";
}

export default function StudentHomePage() {
  const { user } = useAuth();
  const today = useMemo(() => toISODate(new Date()), []);

  const todayLessonsQuery = useApi(() => scheduleApi.studentDay(today), [today]);
  const surveysQuery = useApi(() => surveysApi.available(), []);
  const assignmentsQuery = useApi(() => assignmentsApi.studentToSubmit(), []);

  const studentName = useMemo(() => {
    const name = user?.firstName || user?.name || "ученик";
    return name.split(" ")[0];
  }, [user]);

  const longDate = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const todayLessons = Array.isArray(todayLessonsQuery.data) ? todayLessonsQuery.data : [];
  const assignedSurvey = pickUpcomingSurvey(surveysQuery.data);
  const deadlines = Array.isArray(assignmentsQuery.data)
    ? assignmentsQuery.data
        .filter((a) => a?.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3)
    : [];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.heroEyebrow}>Student LMS</p>
          <h2 className={styles.heroTitle}>Добро пожаловать, {studentName}!</h2>
          <p className={styles.heroSub}>
            Проверьте занятия на сегодня, важные события и дедлайны, чтобы ничего не пропустить.
          </p>
        </div>
        <div className={styles.heroDate}>{longDate}</div>
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className={styles.scheduleCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Мое расписание</h3>
            </div>

            <div className={styles.switcher}>
              <button type="button" className={`${styles.switchBtn} ${styles.switchBtnActive}`}>
                День
              </button>
              <button type="button" className={styles.switchBtn}>
                Неделя
              </button>
            </div>

            <div className={styles.dayNavigator}>
              <span className={styles.navToday}>Сегодня</span>
              <span className={styles.todayBadge}>{longDate}</span>
            </div>

            {todayLessonsQuery.loading && !todayLessons.length ? (
              <p className={styles.emptyState}>Загрузка уроков…</p>
            ) : todayLessonsQuery.error ? (
              <p className={styles.emptyState}>Не удалось загрузить расписание</p>
            ) : todayLessons.length ? (
              <ul className={styles.lessonList}>
                {todayLessons.map((lesson) => (
                  <li key={lesson.id} className={styles.lessonItem}>
                    <p className={styles.lessonTime}>
                      {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                    </p>
                    <div className={styles.lessonInfo}>
                      <p className={styles.lessonTitle}>{lesson.subjectName}</p>
                      <p className={styles.lessonMeta}>
                        {lesson.classroom ? `Кабинет ${lesson.classroom}` : ""}
                        {lesson.teacherName ? ` • ${lesson.teacherName}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>На сегодня уроков нет</p>
            )}
          </article>

          <article className={styles.eventsCard}>
            <h3 className={styles.sectionTitle}>Важные события</h3>
            {surveysQuery.loading && !assignedSurvey ? (
              <p className={styles.emptyState}>Загрузка событий…</p>
            ) : assignedSurvey ? (
              <div className={styles.surveyNotice}>
                <p className={styles.noticeTitle}>Вам доступен опрос</p>
                <p className={styles.noticeText}>{assignedSurvey.title}</p>
                {assignedSurvey.deadline ? (
                  <p className={styles.noticeMeta}>Срок: {formatDateTime(assignedSurvey.deadline)}</p>
                ) : null}
              </div>
            ) : (
              <p className={styles.emptyState}>Пока важных событий нет</p>
            )}
          </article>
        </div>

        <aside className={styles.deadlineCard}>
          <div className={styles.deadlineHead}>
            <h3 className={styles.sectionTitle}>Ближайшие дедлайны</h3>
            <span className={styles.deadlineCount}>{deadlines.length}</span>
          </div>

          {assignmentsQuery.loading && !deadlines.length ? (
            <p className={styles.emptyState}>Загрузка заданий…</p>
          ) : deadlines.length ? (
            <ul className={styles.deadlineList}>
              {deadlines.map((item) => (
                <li
                  key={item.id}
                  className={`${styles.deadlineItem} ${styles[toneFor(item.deadline)]}`}
                >
                  <p className={styles.deadlineSubject}>{item.subjectName || item.subject || ""}</p>
                  <p className={styles.deadlineTitle}>{item.title}</p>
                  <p className={styles.deadlineMeta}>{formatDateTime(item.deadline)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>Ближайших дедлайнов нет</p>
          )}
        </aside>
      </section>
    </div>
  );
}
