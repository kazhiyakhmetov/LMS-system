import { useMemo, useState } from "react";
import styles from "./ParentHomePage.module.css";

const children = [
  {
    id: "aliya",
    name: "Алия Есенова",
    className: "10-А",
    curator: "Динара Турсынова",
    average: "4.6",
    attendance: "96%",
    unreadMessages: 2,
  },
  {
    id: "timur",
    name: "Тимур Есенов",
    className: "6-Б",
    curator: "Айгуль Смагулова",
    average: "4.3",
    attendance: "94%",
    unreadMessages: 1,
  },
];

const childData = {
  aliya: {
    lessons: [
      { time: "08:30 - 09:15", subject: "Алгебра", room: "203", teacher: "К. Муханова" },
      { time: "09:30 - 10:15", subject: "Информатика", room: "210", teacher: "А. Жанибек" },
      { time: "12:00 - 12:45", subject: "История", room: "112", teacher: "Д. Турсынбек" },
    ],
    events: [
      {
        title: "Назначен опрос по математике",
        text: "Нужно пройти до 18:00 и подтвердить ознакомление.",
        meta: "Сегодня • LMS-опрос",
      },
      {
        title: "Запланирована встреча с куратором",
        text: "Обсуждение динамики за четверть и подготовки к СОР.",
        meta: "Пятница • 17:30",
      },
    ],
    deadlines: [
      { subject: "Физика", title: "Лабораторная работа №4", due: "Сегодня, 18:00", tone: "critical" },
      { subject: "Литература", title: "Эссе по произведению", due: "Завтра, 12:00", tone: "warning" },
      { subject: "Информатика", title: "Практика SQL", due: "Пятница, 09:00", tone: "focus" },
    ],
  },
  timur: {
    lessons: [
      { time: "08:00 - 08:45", subject: "Математика", room: "104", teacher: "С. Ермекова" },
      { time: "09:00 - 09:45", subject: "Казахский язык", room: "107", teacher: "Ж. Аблай" },
      { time: "11:00 - 11:45", subject: "География", room: "115", teacher: "Г. Абдулла" },
    ],
    events: [
      {
        title: "Собрание родителей 6-Б",
        text: "Обсуждение результатов контрольных работ за март.",
        meta: "Четверг • 18:30",
      },
    ],
    deadlines: [
      { subject: "Математика", title: "Домашняя работа №10", due: "Сегодня, 19:00", tone: "critical" },
      { subject: "Биология", title: "Мини-тест", due: "Завтра, 10:00", tone: "focus" },
    ],
  },
};

export default function ParentHomePage() {
  const [childId, setChildId] = useState(children[0].id);

  const selectedChild = useMemo(() => children.find((item) => item.id === childId) ?? children[0], [childId]);
  const selectedData = childData[selectedChild.id];

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
          <p className={styles.heroEyebrow}>Parent LMS</p>
          <h2 className={styles.heroTitle}>Главная родителя</h2>
          <p className={styles.heroSub}>
            Контролируйте оценки, расписание и дедлайны ребенка, чтобы вовремя видеть изменения и поддерживать прогресс.
          </p>
        </div>
        <div className={styles.heroDate}>{longDate}</div>
      </section>

      <section className={styles.studentCard}>
        <div className={styles.studentInfo}>
          <p className={styles.studentName}>{selectedChild.name}</p>
          <p className={styles.studentMeta}>
            {selectedChild.className} • Куратор: {selectedChild.curator}
          </p>
        </div>

        <div className={styles.studentStats}>
          <span>Средний балл: {selectedChild.average}</span>
          <span>Посещаемость: {selectedChild.attendance}</span>
          <span>Новые сообщения: {selectedChild.unreadMessages}</span>
        </div>

        <select className={styles.childSelect} value={childId} onChange={(event) => setChildId(event.target.value)}>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name} ({child.className})
            </option>
          ))}
        </select>
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className={styles.scheduleCard}>
            <h3 className={styles.sectionTitle}>Расписание на сегодня</h3>
            <ul className={styles.lessonList}>
              {selectedData.lessons.map((lesson) => (
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
            {selectedData.events.length ? (
              <ul className={styles.eventList}>
                {selectedData.events.map((eventItem) => (
                  <li key={eventItem.title} className={styles.eventItem}>
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
            <span className={styles.deadlineCount}>{selectedData.deadlines.length}</span>
          </div>

          <ul className={styles.deadlineList}>
            {selectedData.deadlines.map((item) => (
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
