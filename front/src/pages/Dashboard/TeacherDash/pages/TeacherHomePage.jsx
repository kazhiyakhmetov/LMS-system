import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./TeacherHomePage.module.css";

const summaryCards = [
  { label: "Мои классы", value: "6", meta: "активно в четверти", tone: "blue" },
  { label: "Уроков сегодня", value: "5", meta: "до 16:40", tone: "teal" },
  { label: "Работ на проверку", value: "28", meta: "из них 9 срочных", tone: "orange" },
  { label: "Новые сообщения", value: "11", meta: "ученики и родители", tone: "violet" },
];

const todayLessons = [
  {
    time: "08:30 - 09:15",
    subject: "Алгебра",
    className: "10-А",
    room: "Каб. 203",
    note: "Подготовка к СОР",
    status: "now",
  },
  {
    time: "09:30 - 10:15",
    subject: "Геометрия",
    className: "9-Б",
    room: "Каб. 205",
    note: "Практика по теоремам",
    status: "next",
  },
  {
    time: "11:30 - 12:15",
    subject: "Алгебра",
    className: "10-А",
    room: "Каб. 203",
    note: "Разбор домашней работы",
    status: "today",
  },
  {
    time: "14:20 - 15:05",
    subject: "Математика",
    className: "11-А",
    room: "Каб. 301",
    note: "Подготовка к ЕНТ",
    status: "today",
  },
];

const importantEvents = [
  {
    title: "Назначен новый опрос для 10-А",
    text: "Обратная связь по темпу объяснения темы 'Функции'.",
    meta: "Нужно открыть доступ до 18:00",
    tone: "info",
  },
    {
      title: "Запланирована встреча с родителями 9-Б",
      text: "Обсуждение промежуточных результатов по алгебре.",
      meta: "Сегодня в 17:30 • Онлайн",
      tone: "eventFocus",
    },
];

const deadlines = [
  {
    title: "Проверить контрольную 9-Б",
    subject: "Геометрия",
    due: "Сегодня, 20:00",
    tone: "critical",
  },
  {
    title: "Опубликовать домашнее задание",
    subject: "Алгебра • 10-А",
    due: "Сегодня, 18:00",
    tone: "warning",
  },
  {
    title: "Заполнить посещаемость в журнале",
    subject: "Все классы",
    due: "До 21:00",
    tone: "deadlineFocus",
  },
];

function lessonStatus(status) {
  switch (status) {
    case "now":
      return "Сейчас";
    case "next":
      return "Следующий";
    default:
      return "Сегодня";
  }
}

export default function TeacherHomePage() {
  const { user } = useAuth();

  const teacherName = useMemo(() => {
    if (!user?.name) return "преподаватель";
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
          <p className={styles.heroEyebrow}>Teacher Workspace</p>
          <h2 className={styles.heroTitle}>Добро пожаловать, {teacherName}!</h2>
          <p className={styles.heroSub}>
            Держите под контролем расписание, проверку работ, важные события и дедлайны по классам.
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
              <h3 className={styles.sectionTitle}>Мое расписание</h3>
            </div>

            <ul className={styles.lessonList}>
              {todayLessons.map((lesson) => (
                <li key={`${lesson.time}-${lesson.className}-${lesson.subject}`} className={styles.lessonItem}>
                  <p className={styles.lessonTime}>{lesson.time}</p>
                  <div className={styles.lessonInfo}>
                    <div className={styles.lessonTop}>
                      <p className={styles.lessonTitle}>
                        {lesson.subject} • {lesson.className}
                      </p>
                      <span className={`${styles.statusChip} ${styles[lesson.status]}`}>{lessonStatus(lesson.status)}</span>
                    </div>
                    <p className={styles.lessonMeta}>
                      {lesson.room} • {lesson.note}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.eventsCard}>
            <h3 className={styles.sectionTitle}>Важные события</h3>
            {importantEvents.length ? (
              <ul className={styles.eventList}>
                {importantEvents.map((eventItem) => (
                  <li key={eventItem.title} className={`${styles.eventItem} ${styles[eventItem.tone]}`}>
                    <p className={styles.eventTitle}>{eventItem.title}</p>
                    <p className={styles.eventText}>{eventItem.text}</p>
                    <p className={styles.eventMeta}>{eventItem.meta}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>Пока важных событий нет.</p>
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
