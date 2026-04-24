import { useMemo, useState } from "react";
import { formatShortDayMonth } from "../../../../shared/lib/utils/format";
import styles from "./TeacherSurveyPage.module.css";

const initialSurveys = [
  {
    id: 1,
    title: "Диагностика по алгебре: квадратные уравнения",
    subject: "Алгебра",
    target: "10-А",
    questions: 12,
    deadline: "2026-03-18",
    status: "active",
    responses: 19,
    audience: 24,
    anonymous: false,
  },
  {
    id: 2,
    title: "Обратная связь по темпу урока",
    subject: "Математика",
    target: "9-Б",
    questions: 7,
    deadline: "2026-03-17",
    status: "review",
    responses: 26,
    audience: 26,
    anonymous: true,
  },
  {
    id: 3,
    title: "Готовность к СОР (III четверть)",
    subject: "Геометрия",
    target: "10-А",
    questions: 8,
    deadline: "2026-03-20",
    status: "draft",
    responses: 0,
    audience: 22,
    anonymous: false,
  },
  {
    id: 4,
    title: "Итоговый опрос по учебной нагрузке",
    subject: "Классный час",
    target: "11-А",
    questions: 10,
    deadline: "2026-03-08",
    status: "closed",
    responses: 21,
    audience: 23,
    anonymous: true,
  },
  {
    id: 5,
    title: "Комфорт на онлайн-уроках",
    subject: "Информатика",
    target: "9-Б",
    questions: 6,
    deadline: "2026-03-19",
    status: "active",
    responses: 11,
    audience: 25,
    anonymous: false,
  },
];

const filters = [
  { key: "all", label: "Все" },
  { key: "draft", label: "Черновики" },
  { key: "active", label: "Активные" },
  { key: "review", label: "На анализе" },
  { key: "closed", label: "Закрытые" },
];

function statusLabel(status) {
  switch (status) {
    case "draft":
      return "Черновик";
    case "active":
      return "Активен";
    case "review":
      return "На анализе";
    default:
      return "Закрыт";
  }
}

function actionLabel(status) {
  switch (status) {
    case "draft":
      return "Опубликовать";
    case "active":
      return "Завершить сбор";
    case "review":
      return "Закрыть опрос";
    default:
      return "Результаты";
  }
}

export default function TeacherSurveyPage() {
  const [surveys, setSurveys] = useState(initialSurveys);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    target: "",
    questions: "5",
    audience: "25",
    deadline: "",
    anonymous: false,
  });

  const targetOptions = useMemo(() => ["all", ...new Set(surveys.map((item) => item.target))], [surveys]);

  const filteredSurveys = useMemo(() => {
    const query = search.trim().toLowerCase();

    return surveys.filter((survey) => {
      const matchesQuery =
        !query ||
        survey.title.toLowerCase().includes(query) ||
        survey.subject.toLowerCase().includes(query) ||
        survey.target.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
      const matchesTarget = targetFilter === "all" || survey.target === targetFilter;

      return matchesQuery && matchesStatus && matchesTarget;
    });
  }, [surveys, search, statusFilter, targetFilter]);

  const stats = useMemo(() => {
    const active = surveys.filter((item) => item.status === "active").length;
    const drafts = surveys.filter((item) => item.status === "draft").length;
    const closed = surveys.filter((item) => item.status === "closed").length;
    const progressValues = surveys
      .filter((item) => item.status !== "draft" && item.audience > 0)
      .map((item) => Math.round((item.responses / item.audience) * 100));

    const averageResponse = progressValues.length
      ? `${Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)}%`
      : "0%";

    return {
      active,
      drafts,
      closed,
      averageResponse,
    };
  }, [surveys]);

  const handlePrimaryAction = (surveyId) => {
    // Шаг действия зависит только от текущего статуса, поэтому обновление держим в одном месте.
    setSurveys((prev) =>
      prev.map((item) => {
        if (item.id !== surveyId) return item;
        if (item.status === "draft") return { ...item, status: "active" };
        if (item.status === "active") return { ...item, status: "review" };
        if (item.status === "review") return { ...item, status: "closed" };
        return item;
      }),
    );
  };

  const handleCreateSurvey = (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const subject = form.subject.trim();
    const target = form.target.trim();
    const questions = Number(form.questions);
    const audience = Number(form.audience);
    const deadline = form.deadline;

    if (!title || !subject || !target || !deadline || !Number.isFinite(questions) || !Number.isFinite(audience)) {
      return;
    }

    const createdSurvey = {
      id: Date.now(),
      title,
      subject,
      target,
      questions: Math.max(1, Math.round(questions)),
      audience: Math.max(1, Math.round(audience)),
      deadline,
      status: "draft",
      responses: 0,
      anonymous: form.anonymous,
    };

    setSurveys((prev) => [createdSurvey, ...prev]);
    setForm({
      title: "",
      subject: "",
      target: "",
      questions: "5",
      audience: "25",
      deadline: "",
      anonymous: false,
    });
    setIsCreateOpen(false);
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Опросы</h2>
          <p className={styles.sub}>Создавайте опросы, отслеживайте отклик и закрывайте сбор ответов в одном месте.</p>
        </div>
        <button type="button" className={styles.createBtn} onClick={() => setIsCreateOpen(true)}>
          Новый опрос
        </button>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Активные</p>
          <p className={styles.statValue}>{stats.active}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Черновики</p>
          <p className={styles.statValue}>{stats.drafts}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Закрытые</p>
          <p className={styles.statValue}>{stats.closed}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Средний отклик</p>
          <p className={styles.statValue}>{stats.averageResponse}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Поиск по названию, предмету или классу..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className={styles.selectRow}>
          <select className={styles.select} value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
            {targetOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Все классы" : option}
              </option>
            ))}
          </select>
        </div>

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
            const progress = survey.audience ? Math.min(100, Math.round((survey.responses / survey.audience) * 100)) : 0;

            return (
              <article key={survey.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.subject}>
                    {survey.target} • {survey.subject}
                  </span>
                  <span className={`${styles.badge} ${styles[survey.status]}`}>{statusLabel(survey.status)}</span>
                </div>

                <p className={styles.cardTitle}>{survey.title}</p>

                <div className={styles.metaRow}>
                  <span>{survey.questions} вопросов</span>
                  <span>до {formatShortDayMonth(survey.deadline)}</span>
                  <span>{survey.anonymous ? "Анонимный" : "Именной"}</span>
                </div>

                <div className={styles.progress}>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                  <span className={styles.progressText}>
                    {survey.responses}/{survey.audience}
                  </span>
                </div>

                <div className={styles.cardActions}>
                  <button type="button" className={styles.actionBtn} onClick={() => handlePrimaryAction(survey.id)}>
                    {actionLabel(survey.status)}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className={styles.emptyState}>По заданным фильтрам опросы не найдены.</div>
        )}
      </section>

      {isCreateOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsCreateOpen(false);
          }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>Новый опрос</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setIsCreateOpen(false)}>
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateSurvey}>
              <input
                className={styles.formInput}
                placeholder="Название опроса"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />

              <div className={styles.formRow}>
                <input
                  className={styles.formInput}
                  placeholder="Предмет"
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                />
                <input
                  className={styles.formInput}
                  placeholder="Класс или группа"
                  value={form.target}
                  onChange={(event) => setForm((prev) => ({ ...prev, target: event.target.value }))}
                />
              </div>

              <div className={styles.formRow}>
                <input
                  className={styles.formInput}
                  type="number"
                  min="1"
                  value={form.questions}
                  onChange={(event) => setForm((prev) => ({ ...prev, questions: event.target.value }))}
                />
                <input
                  className={styles.formInput}
                  type="number"
                  min="1"
                  value={form.audience}
                  onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
                />
              </div>

              <input
                className={styles.formInput}
                type="date"
                value={form.deadline}
                onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
              />

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={(event) => setForm((prev) => ({ ...prev, anonymous: event.target.checked }))}
                />
                Анонимный опрос
              </label>

              <button type="submit" className={styles.submitBtn}>
                Создать
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
