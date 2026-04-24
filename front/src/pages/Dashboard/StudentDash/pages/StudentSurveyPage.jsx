import { useMemo, useState } from "react";
import styles from "./StudentSurveyPage.module.css";

const surveys = [
  {
    id: 1,
    title: "Обратная связь по математике",
    description: "Оцените темп объяснения и полезность домашних заданий по алгебре и геометрии.",
    subject: "Математика",
    questions: 8,
    deadline: "до 15 марта",
    eta: "5 мин",
    status: "new",
    answered: 0,
  },
  {
    id: 2,
    title: "Оценка удобства расписания",
    description: "Короткий опрос о времени уроков, переменах и нагрузке в течение недели.",
    subject: "Школа",
    questions: 5,
    deadline: "до 17 марта",
    eta: "3 мин",
    status: "inProgress",
    answered: 3,
  },
  {
    id: 3,
    title: "Школьные мероприятия",
    description: "Ваше мнение о последних событиях школы и предложения на следующую четверть.",
    subject: "Внеурочная деятельность",
    questions: 10,
    deadline: "закрыт",
    eta: "7 мин",
    status: "done",
    answered: 10,
  },
  {
    id: 4,
    title: "Цифровая безопасность",
    description: "Проверка навыков безопасного поведения в сети и работы с персональными данными.",
    subject: "Информатика",
    questions: 12,
    deadline: "до 20 марта",
    eta: "8 мин",
    status: "new",
    answered: 0,
  },
  {
    id: 5,
    title: "Комфорт в классе",
    description: "Анонимный опрос по атмосфере в классе и взаимодействию с одноклассниками.",
    subject: "Классный час",
    questions: 6,
    deadline: "до 19 марта",
    eta: "4 мин",
    status: "inProgress",
    answered: 2,
  },
];

const filters = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "inProgress", label: "В процессе" },
  { key: "done", label: "Завершенные" },
];

function statusText(status) {
  switch (status) {
    case "new":
      return "Новый";
    case "inProgress":
      return "Начат";
    default:
      return "Завершен";
  }
}

export default function StudentSurveyPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSurveys = useMemo(() => {
    const query = search.trim().toLowerCase();
    return surveys.filter((survey) => {
      const matchesQuery =
        !query ||
        survey.title.toLowerCase().includes(query) ||
        survey.subject.toLowerCase().includes(query) ||
        survey.description.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const active = surveys.filter((item) => item.status !== "done").length;
    const inProgress = surveys.filter((item) => item.status === "inProgress").length;
    const completed = surveys.filter((item) => item.status === "done").length;
    return { active, inProgress, completed };
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Опросы</h2>
        <p className={styles.sub}>Выбирайте активные опросы, проходите их и отслеживайте статус заполнения.</p>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Активные</p>
          <p className={styles.statValue}>{stats.active}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>В процессе</p>
          <p className={styles.statValue}>{stats.inProgress}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Завершенные</p>
          <p className={styles.statValue}>{stats.completed}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Поиск по названию или предмету..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className={styles.filters}>
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`${styles.filterChip} ${statusFilter === filter.key ? styles.filterChipActive : ""}`}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.list}>
        {filteredSurveys.length ? (
          filteredSurveys.map((survey) => {
            const progress = survey.questions ? Math.round((survey.answered / survey.questions) * 100) : 0;
            return (
              <article key={survey.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.subject}>{survey.subject}</span>
                  <span className={`${styles.badge} ${styles[survey.status]}`}>{statusText(survey.status)}</span>
                </div>

                <p className={styles.cardTitle}>{survey.title}</p>
                <p className={styles.cardDesc}>{survey.description}</p>

                <div className={styles.metaRow}>
                  <span>{survey.questions} вопросов</span>
                  <span>{survey.eta}</span>
                  <span>{survey.deadline}</span>
                </div>

                <div className={styles.progress}>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                  <span className={styles.progressText}>{progress}%</span>
                </div>

                <button className={styles.actionBtn} type="button">
                  {survey.status === "done"
                    ? "Результаты"
                    : survey.status === "inProgress"
                      ? "Продолжить"
                      : "Начать"}
                </button>
              </article>
            );
          })
        ) : (
          <div className={styles.emptyState}>По выбранным параметрам опросы не найдены.</div>
        )}
      </section>
    </div>
  );
}
