import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherAssignmentsPage.module.css";

const PAGE_SIZE = 5;

const initialTasks = [
  {
    id: 1,
    title: "Домашняя работа №12",
    subject: "Алгебра",
    className: "10-А",
    deadline: "2026-03-14",
    status: "review",
    description: "Решить задачи 1-12 из листа и загрузить решение в формате PDF.",
    materials: ["Лист заданий №12", "Примеры решения темы 7"],
    submissions: [
      { id: 11, student: "Айгерим К.", file: "hw12_aigerim.pdf", submittedAt: "12.03 17:10", grade: "", note: "" },
      { id: 12, student: "Дамир А.", file: "hw12_damir.pdf", submittedAt: "12.03 18:42", grade: "4", note: "Нужно оформить аккуратнее" },
      { id: 13, student: "Султан А.", file: "hw12_sultan.pdf", submittedAt: "13.03 09:05", grade: "", note: "" },
    ],
  },
  {
    id: 2,
    title: "Практика по геометрии",
    subject: "Геометрия",
    className: "9-Б",
    deadline: "2026-03-16",
    status: "inProgress",
    description: "Подготовить карточки и задания на доказательство теорем.",
    materials: ["Карточки задач", "Критерии проверки"],
    submissions: [{ id: 21, student: "Нурай Т.", file: "geometry_nuray.docx", submittedAt: "13.03 10:25", grade: "", note: "" }],
  },
  {
    id: 3,
    title: "Тренировочный тест ЕНТ",
    subject: "Математика",
    className: "11-А",
    deadline: "2026-03-18",
    status: "new",
    description: "Провести тест по 20 вопросам, загрузить ответы в систему.",
    materials: ["Бланк ответов", "Инструкция к тесту"],
    submissions: [],
  },
  {
    id: 4,
    title: "Итоговая проверка темы 'Функции'",
    subject: "Алгебра",
    className: "10-А",
    deadline: "2026-03-10",
    status: "urgent",
    description: "Срочная проверка знаний перед контрольной работой.",
    materials: ["Контрольный лист"],
    submissions: [
      { id: 41, student: "Алия Е.", file: "functions_aliya.pdf", submittedAt: "10.03 13:00", grade: "5", note: "Отлично" },
      { id: 42, student: "Артур Н.", file: "functions_artur.pdf", submittedAt: "10.03 13:11", grade: "", note: "" },
    ],
  },
  {
    id: 5,
    title: "Консультация по олимпиаде",
    subject: "Алгебра",
    className: "10-А",
    deadline: "2026-03-20",
    status: "done",
    description: "Подготовить и выдать индивидуальные рекомендации ученикам.",
    materials: ["Список тем"],
    submissions: [
      { id: 51, student: "Айгерим К.", file: "olymp_aigerim.pdf", submittedAt: "09.03 19:34", grade: "5", note: "Готова к следующему этапу" },
      { id: 52, student: "Ерасыл Д.", file: "olymp_erasyl.pdf", submittedAt: "09.03 20:02", grade: "4", note: "Поработать над задачами на логику" },
    ],
  },
  {
    id: 6,
    title: "Домашняя работа №13",
    subject: "Алгебра",
    className: "9-Б",
    deadline: "2026-03-19",
    status: "new",
    description: "Решить задачи повышенной сложности и загрузить файл в LMS.",
    materials: ["Лист №13"],
    submissions: [],
  },
];

const filters = [
  { key: "all", label: "Все" },
  { key: "review", label: "На проверке" },
  { key: "inProgress", label: "В работе" },
  { key: "new", label: "Новые" },
  { key: "urgent", label: "Срочные" },
  { key: "done", label: "Завершенные" },
];

function statusLabel(status) {
  switch (status) {
    case "review":
      return "На проверке";
    case "inProgress":
      return "В работе";
    case "urgent":
      return "Срочно";
    case "done":
      return "Завершено";
    default:
      return "Новое";
  }
}

export default function TeacherAssignmentsPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    subject: "",
    className: "",
    deadline: "",
    description: "",
    materials: "",
  });

  const classOptions = useMemo(() => ["all", ...new Set(tasks.map((item) => item.className))], [tasks]);
  const subjectOptions = useMemo(() => ["all", ...new Set(tasks.map((item) => item.subject))], [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((item) => {
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.className.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesClass = classFilter === "all" || item.className === classFilter;
      const matchesSubject = subjectFilter === "all" || item.subject === subjectFilter;

      return matchesQuery && matchesStatus && matchesClass && matchesSubject;
    });
  }, [tasks, searchQuery, statusFilter, classFilter, subjectFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, classFilter, subjectFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, currentPage]);

  const selectedTask = useMemo(() => tasks.find((item) => item.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  const summary = useMemo(() => {
    const review = tasks.filter((item) => item.status === "review").length;
    const urgent = tasks.filter((item) => item.status === "urgent").length;
    const active = tasks.filter((item) => item.status !== "done").length;
    const checked = tasks
      .flatMap((item) => item.submissions)
      .filter((submission) => Boolean(submission.grade)).length;

    return { review, urgent, active, checked };
  }, [tasks]);

  const updateSubmission = (taskId, submissionId, field, value) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              submissions: task.submissions.map((submission) =>
                submission.id === submissionId ? { ...submission, [field]: value } : submission,
              ),
            }
          : task,
      ),
    );
  };

  const handleCreateTask = (event) => {
    event.preventDefault();

    const title = taskForm.title.trim();
    const subject = taskForm.subject.trim();
    const className = taskForm.className.trim();
    const deadline = taskForm.deadline.trim();
    const description = taskForm.description.trim();
    if (!title || !subject || !className || !deadline || !description) return;

    const materials = taskForm.materials
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const created = {
      id: Date.now(),
      title,
      subject,
      className,
      deadline,
      status: "new",
      description,
      materials,
      submissions: [],
    };

    setTasks((prev) => [created, ...prev]);
    setTaskForm({
      title: "",
      subject: "",
      className: "",
      deadline: "",
      description: "",
      materials: "",
    });
    setIsCreateOpen(false);
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Задачи</h2>
          <p className={styles.sub}>Создание заданий, проверка сданных работ и выставление оценок.</p>
        </div>
        <button className={styles.createBtn} type="button" onClick={() => setIsCreateOpen(true)}>
          Новое задание
        </button>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Активные задачи</p>
          <p className={styles.statValue}>{summary.active}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>На проверке</p>
          <p className={styles.statValue}>{summary.review}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Срочные</p>
          <p className={styles.statValue}>{summary.urgent}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Оценок выставлено</p>
          <p className={styles.statValue}>{summary.checked}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Поиск по названию, предмету или классу..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        <div className={styles.selectRow}>
          <select className={styles.select} value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            {classOptions.map((value) => (
              <option key={value} value={value}>
                {value === "all" ? "Все классы" : value}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            {subjectOptions.map((value) => (
              <option key={value} value={value}>
                {value === "all" ? "Все предметы" : value}
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
        {paginatedTasks.length ? (
          paginatedTasks.map((item) => {
            const graded = item.submissions.filter((submission) => Boolean(submission.grade)).length;
            return (
              <article
                key={item.id}
                className={styles.card}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTaskId(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedTaskId(item.id);
                  }
                }}
              >
                <div className={styles.cardTop}>
                  <p className={styles.subject}>
                    {item.className} • {item.subject}
                  </p>
                  <span className={`${styles.badge} ${styles[item.status]}`}>{statusLabel(item.status)}</span>
                </div>
                <p className={styles.taskTitle}>{item.title}</p>
                <p className={styles.meta}>Срок: {item.deadline}</p>
                <p className={styles.meta}>
                  Сдано: {item.submissions.length} • Оценено: {graded}
                </p>
              </article>
            );
          })
        ) : (
          <div className={styles.emptyState}>По текущим параметрам задачи не найдены.</div>
        )}
      </section>

      <section className={styles.pagination}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
          disabled={currentPage === 1}
        >
          Назад
        </button>
        <p className={styles.pageInfo}>
          Страница {currentPage} из {totalPages}
        </p>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
          disabled={currentPage === totalPages}
        >
          Вперед
        </button>
      </section>

      {selectedTask ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedTaskId(null);
          }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{selectedTask.title}</h3>
                <p className={styles.modalSub}>
                  {selectedTask.className} • {selectedTask.subject}
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedTaskId(null)}>
                ×
              </button>
            </div>

            <div className={styles.modalMeta}>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Дедлайн</p>
                <p className={styles.metaValue}>{selectedTask.deadline}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Статус</p>
                <p className={styles.metaValue}>{statusLabel(selectedTask.status)}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Материалы</p>
                <p className={styles.metaValue}>{selectedTask.materials.length || "0"}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Сдачи</p>
                <p className={styles.metaValue}>{selectedTask.submissions.length}</p>
              </div>
            </div>

            <div className={styles.modalSection}>
              <p className={styles.sectionTitle}>Описание задания</p>
              <p className={styles.sectionText}>{selectedTask.description}</p>
              {selectedTask.materials.length ? (
                <div className={styles.materials}>
                  {selectedTask.materials.map((item) => (
                    <span key={item} className={styles.materialChip}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.sectionText}>Материалы не прикреплены.</p>
              )}
            </div>

            <div className={styles.modalSection}>
              <p className={styles.sectionTitle}>Проверка и оценивание</p>
              {selectedTask.submissions.length ? (
                <ul className={styles.submissionList}>
                  {selectedTask.submissions.map((submission) => (
                    <li key={submission.id} className={styles.submissionItem}>
                      <div>
                        <p className={styles.studentName}>{submission.student}</p>
                        <p className={styles.studentMeta}>
                          {submission.file} • {submission.submittedAt}
                        </p>
                      </div>

                      <div className={styles.gradeControls}>
                        <select
                          className={styles.gradeSelect}
                          value={submission.grade}
                          onChange={(event) =>
                            updateSubmission(selectedTask.id, submission.id, "grade", event.target.value)
                          }
                        >
                          <option value="">Без оценки</option>
                          <option value="5">5</option>
                          <option value="4">4</option>
                          <option value="3">3</option>
                          <option value="2">2</option>
                          <option value="Зачет">Зачет</option>
                        </select>

                        <input
                          className={styles.noteInput}
                          placeholder="Комментарий"
                          value={submission.note}
                          onChange={(event) =>
                            updateSubmission(selectedTask.id, submission.id, "note", event.target.value)
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.sectionText}>Пока нет сданных работ по этому заданию.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}

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
              <h3 className={styles.modalTitle}>Новое задание</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setIsCreateOpen(false)}>
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateTask}>
              <input
                className={styles.formInput}
                placeholder="Название задания"
                value={taskForm.title}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <div className={styles.formRow}>
                <input
                  className={styles.formInput}
                  placeholder="Предмет"
                  value={taskForm.subject}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, subject: event.target.value }))}
                />
                <input
                  className={styles.formInput}
                  placeholder="Класс (например 10-А)"
                  value={taskForm.className}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, className: event.target.value }))}
                />
              </div>
              <input
                className={styles.formInput}
                type="date"
                value={taskForm.deadline}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, deadline: event.target.value }))}
              />
              <input
                className={styles.formInput}
                placeholder="Материалы через запятую"
                value={taskForm.materials}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, materials: event.target.value }))}
              />
              <textarea
                className={styles.formTextarea}
                placeholder="Описание задания"
                value={taskForm.description}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <button className={styles.submitBtn} type="submit">
                Создать
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
