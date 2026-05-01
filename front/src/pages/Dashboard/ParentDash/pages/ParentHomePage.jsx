import { useEffect, useMemo, useState } from "react";
import styles from "./ParentHomePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { formatDateTime, formatTime, toISODate } from "../../../../shared/lib/utils/date";

function toneFor(date) {
  if (!date) return "focus";
  const diffH = (new Date(date).getTime() - Date.now()) / 3_600_000;
  if (diffH <= 24) return "critical";
  if (diffH <= 72) return "warning";
  return "focus";
}

export default function ParentHomePage() {
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
    () => (selectedChild ? parentApi.childGrades(selectedChild.id, 5) : Promise.resolve([])),
    [selectedChild?.id],
    { immediate: Boolean(selectedChild) },
  );

  const lessons = Array.isArray(lessonsQuery.data) ? lessonsQuery.data : [];
  const grades = Array.isArray(gradesQuery.data) ? gradesQuery.data : [];

  const longDate = useMemo(
    () => new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    [],
  );

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24 }}>Загрузка детей…</div>;
  }
  if (!children.length) {
    return <div style={{ padding: 24 }}>К вашему аккаунту не привязаны дети.</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.heroEyebrow}>Parent LMS</p>
          <h2 className={styles.heroTitle}>Главная родителя</h2>
          <p className={styles.heroSub}>
            Контролируйте оценки, расписание и события вашего ребёнка.
          </p>
        </div>
        <div className={styles.heroDate}>{longDate}</div>
      </section>

      <section className={styles.studentCard}>
        <div className={styles.studentInfo}>
          <p className={styles.studentName}>{selectedChild?.fio || "—"}</p>
          <p className={styles.studentMeta}>
            {selectedChild?.className || "—"}
            {selectedChild?.schoolName ? ` • ${selectedChild.schoolName}` : ""}
          </p>
        </div>

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
      </section>

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className={styles.scheduleCard}>
            <h3 className={styles.sectionTitle}>Расписание на сегодня</h3>
            {lessonsQuery.loading && !lessons.length ? (
              <p className={styles.emptyState}>Загрузка…</p>
            ) : lessons.length ? (
              <ul className={styles.lessonList}>
                {lessons.map((lesson) => (
                  <li key={lesson.id} className={styles.lessonItem}>
                    <p className={styles.lessonTime}>
                      {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                    </p>
                    <div className={styles.lessonInfo}>
                      <p className={styles.lessonTitle}>{lesson.subjectName}</p>
                      <p className={styles.lessonMeta}>
                        {lesson.classroom ? `Каб. ${lesson.classroom}` : ""}
                        {lesson.teacherName ? ` • ${lesson.teacherName}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>На сегодня уроков нет.</p>
            )}
          </article>

          <article className={styles.eventsCard}>
            <h3 className={styles.sectionTitle}>Последние оценки</h3>
            {gradesQuery.loading && !grades.length ? (
              <p className={styles.emptyState}>Загрузка…</p>
            ) : grades.length ? (
              <ul className={styles.eventList}>
                {grades.map((g, idx) => (
                  <li key={`${g.date}-${idx}`} className={styles.eventItem}>
                    <p className={styles.eventTitle}>{g.subject || "—"}</p>
                    <p className={styles.eventText}>Оценка: {g.grade ?? "—"}</p>
                    <p className={styles.eventMeta}>{g.date ? formatDateTime(g.date) : ""}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>Пока нет оценок.</p>
            )}
          </article>
        </div>

        <aside className={styles.deadlineCard}>
          <div className={styles.deadlineHead}>
            <h3 className={styles.sectionTitle}>Уроки сегодня</h3>
            <span className={styles.deadlineCount}>{lessons.length}</span>
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
                    {lesson.classroom ? `Каб. ${lesson.classroom}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>Уроков нет.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
