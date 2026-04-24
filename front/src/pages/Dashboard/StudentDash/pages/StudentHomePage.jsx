import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./StudentHomePage.module.css";

const todayLessons = [
  {
    time: "08:30 - 09:15",
    subject: "Алгебра",
    room: "203",
    teacher: "К. Муханова",
  },
  {
    time: "09:30 - 10:15",
    subject: "Информатика",
    room: "210",
    teacher: "А. Жанибек",
  },
  {
    time: "10:30 - 11:15",
    subject: "Английский язык",
    room: "307",
    teacher: "A. White",
  },
  {
    time: "12:00 - 12:45",
    subject: "История Казахстана",
    room: "112",
    teacher: "Д. Турсынбек",
  },
];

const assignedSurvey = {
  title: "Опрос по информатике: цифровая гигиена",
  deadline: "Сегодня до 18:00",
};

const deadlines = [
  {
    subject: "Физика",
    title: "Лабораторная работа №4",
    due: "Сегодня, 18:00",
    tone: "critical",
  },
  {
    subject: "Литература",
    title: "Эссе по роману",
    due: "Завтра, 12:00",
    tone: "warning",
  },
  {
    subject: "Биология",
    title: "Тест из 20 вопросов",
    due: "Пятница, 09:00",
    tone: "focus",
  },
];

export default function StudentHomePage() {
  const { user } = useAuth();

  const studentName = useMemo(() => {
    if (!user?.name) return "ученик";
    return user.name.split(" ")[0];
  }, [user?.name]);

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
              <button type="button" className={styles.navBtn} aria-label="Предыдущий день">
                ←
              </button>
              <span className={styles.navToday}>Сегодня</span>
              <span className={styles.todayBadge}>📅 Сегодня</span>
              <button type="button" className={styles.navBtn} aria-label="Следующий день">
                →
              </button>
            </div>

            <ul className={styles.lessonList}>
              {todayLessons.map((lesson) => (
                <li key={`${lesson.time}-${lesson.subject}`} className={styles.lessonItem}>
                  <p className={styles.lessonTime}>{lesson.time}</p>
                  <div className={styles.lessonInfo}>
                    <p className={styles.lessonTitle}>{lesson.subject}</p>
                    <p className={styles.lessonMeta}>
                      Кабинет {lesson.room} • {lesson.teacher}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.eventsCard}>
            <h3 className={styles.sectionTitle}>Важные события</h3>
            {assignedSurvey ? (
              <div className={styles.surveyNotice}>
                <p className={styles.noticeTitle}>Вам назначен опрос</p>
                <p className={styles.noticeText}>{assignedSurvey.title}</p>
                <p className={styles.noticeMeta}>Срок: {assignedSurvey.deadline}</p>
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

          <ul className={styles.deadlineList}>
            {deadlines.map((item) => (
              <li key={item.title} className={`${styles.deadlineItem} ${styles[item.tone]}`}>
                <p className={styles.deadlineSubject}>{item.subject}</p>
                <p className={styles.deadlineTitle}>{item.title}</p>
                <p className={styles.deadlineMeta}>{item.due}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
