import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherAssignmentsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { assignmentsApi, submissionsApi, teachingApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";

const PAGE_SIZE = 5;

const ASSIGNMENT_TYPES = [
  { value: "homework", label: "Домашнее" },
  { value: "test", label: "Тест" },
  { value: "sor", label: "СОР" },
  { value: "soch", label: "СОЧ" },
  { value: "quiz", label: "Квиз" },
];

function statusOf(deadline) {
  if (!deadline) return "new";
  const diffHours = (new Date(deadline).getTime() - Date.now()) / 3_600_000;
  if (diffHours < 0) return "done";
  if (diffHours <= 24) return "urgent";
  return "inProgress";
}

function statusLabel(status) {
  switch (status) {
    case "urgent": return "Срочно";
    case "done": return "Завершено";
    case "inProgress": return "В работе";
    default: return "Новое";
  }
}

const filters = [
  { key: "all", label: "Все" },
  { key: "inProgress", label: "В работе" },
  { key: "urgent", label: "Срочные" },
  { key: "done", label: "Завершенные" },
];

export default function TeacherAssignmentsPage() {
  const assignmentsQuery = useApi(() => assignmentsApi.teacherMy(), []);
  const pairsQuery = useApi(() => teachingApi.myPairs(), []);

  const tasks = useMemo(() => {
    const list = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];
    return list.map((a) => ({
      id: a.id,
      title: a.title,
      subject: a.subjectName || "—",
      subjectId: a.subjectId,
      className: a.className || "—",
      classId: a.classId,
      deadline: a.deadline,
      maxGrade: a.maxGrade,
      type: a.type,
      description: a.description,
      status: statusOf(a.deadline),
    }));
  }, [assignmentsQuery.data]);

  const pairs = Array.isArray(pairsQuery.data) ? pairsQuery.data : [];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    type: "homework",
    maxGrade: "5",
    deadline: "",
    pairKey: "",
  });

  const classOptions = useMemo(() => ["all", ...new Set(tasks.map((t) => t.className))], [tasks]);
  const subjectOptions = useMemo(() => ["all", ...new Set(tasks.map((t) => t.subject))], [tasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((item) => {
      const matchesQuery = !q
        || item.title.toLowerCase().includes(q)
        || item.subject.toLowerCase().includes(q)
        || item.className.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesClass = classFilter === "all" || item.className === classFilter;
      const matchesSubject = subjectFilter === "all" || item.subject === subjectFilter;
      return matchesQuery && matchesStatus && matchesClass && matchesSubject;
    });
  }, [tasks, searchQuery, statusFilter, classFilter, subjectFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, classFilter, subjectFilter]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, currentPage]);

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  const submissionsQuery = useApi(
    () => (selectedTask ? submissionsApi.byAssignment(selectedTask.id) : Promise.resolve([])),
    [selectedTask?.id],
    { immediate: Boolean(selectedTask) },
  );

  const [grading, setGrading] = useState({});

  useEffect(() => {
    if (submissionsQuery.data) {
      const init = {};
      (Array.isArray(submissionsQuery.data) ? submissionsQuery.data : []).forEach((s) => {
        init[s.id] = { grade: s.grade ?? "", comment: s.teacherComment ?? "", saving: false, error: "" };
      });
      setGrading(init);
    }
  }, [submissionsQuery.data]);

  const summary = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "done").length;
    const urgent = tasks.filter((t) => t.status === "urgent").length;
    return { active, urgent, total: tasks.length };
  }, [tasks]);

  async function gradeSubmission(submissionId) {
    const entry = grading[submissionId];
    if (!entry || entry.grade === "") return;
    setGrading((prev) => ({ ...prev, [submissionId]: { ...prev[submissionId], saving: true, error: "" } }));
    try {
      await submissionsApi.grade({
        submissionId,
        gradeValue: Number(entry.grade),
        comment: entry.comment || "",
      });
      await submissionsQuery.refetch();
    } catch (err) {
      setGrading((prev) => ({ ...prev, [submissionId]: { ...prev[submissionId], saving: false, error: err?.message || "Ошибка" } }));
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setCreateError("");

    const title = taskForm.title.trim();
    const description = taskForm.description.trim();
    const deadline = taskForm.deadline;
    const pair = pairs.find((p) => `${p.classId}-${p.subjectId}` === taskForm.pairKey);

    if (!title || !description || !deadline || !pair) {
      setCreateError("Заполните все поля");
      return;
    }

    setCreateSubmitting(true);
    try {
      await assignmentsApi.teacherCreate({
        title,
        description,
        type: taskForm.type,
        maxGrade: Number(taskForm.maxGrade) || 5,
        deadline: new Date(deadline).toISOString(),
        subjectId: pair.subjectId,
        classId: pair.classId,
      });
      await assignmentsQuery.refetch();
      setTaskForm({ title: "", description: "", type: "homework", maxGrade: "5", deadline: "", pairKey: "" });
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(err?.message || "Не удалось создать задание");
    } finally {
      setCreateSubmitting(false);
    }
  }

  if (assignmentsQuery.loading && !tasks.length) {
    return <div style={{ padding: 24 }}>Загрузка заданий…</div>;
  }

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
          <p className={styles.statLabel}>Активные</p>
          <p className={styles.statValue}>{summary.active}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Срочные</p>
          <p className={styles.statValue}>{summary.urgent}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Всего</p>
          <p className={styles.statValue}>{summary.total}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Поиск по названию, предмету или классу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className={styles.selectRow}>
          <select className={styles.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            {classOptions.map((v) => <option key={v} value={v}>{v === "all" ? "Все классы" : v}</option>)}
          </select>
          <select className={styles.select} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            {subjectOptions.map((v) => <option key={v} value={v}>{v === "all" ? "Все предметы" : v}</option>)}
          </select>
        </div>

        <div className={styles.filters}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.filterChip} ${statusFilter === f.key ? styles.filterChipActive : ""}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.list}>
        {paginatedTasks.length ? paginatedTasks.map((item) => (
          <article
            key={item.id}
            className={styles.card}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedTaskId(item.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedTaskId(item.id); } }}
          >
            <div className={styles.cardTop}>
              <p className={styles.subject}>{item.className} • {item.subject}</p>
              <span className={`${styles.badge} ${styles[item.status]}`}>{statusLabel(item.status)}</span>
            </div>
            <p className={styles.taskTitle}>{item.title}</p>
            <p className={styles.meta}>Срок: {formatDateTime(item.deadline)}</p>
            <p className={styles.meta}>Тип: {item.type || "—"} • Макс. балл: {item.maxGrade ?? "—"}</p>
          </article>
        )) : (
          <div className={styles.emptyState}>По текущим параметрам задачи не найдены.</div>
        )}
      </section>

      <section className={styles.pagination}>
        <button type="button" className={styles.pageBtn} onClick={() => setCurrentPage((v) => Math.max(1, v - 1))} disabled={currentPage === 1}>
          Назад
        </button>
        <p className={styles.pageInfo}>Страница {currentPage} из {totalPages}</p>
        <button type="button" className={styles.pageBtn} onClick={() => setCurrentPage((v) => Math.min(totalPages, v + 1))} disabled={currentPage === totalPages}>
          Вперед
        </button>
      </section>

      {selectedTask ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTaskId(null); }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{selectedTask.title}</h3>
                <p className={styles.modalSub}>{selectedTask.className} • {selectedTask.subject}</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedTaskId(null)}>×</button>
            </div>

            <div className={styles.modalMeta}>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Дедлайн</p>
                <p className={styles.metaValue}>{formatDateTime(selectedTask.deadline)}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Статус</p>
                <p className={styles.metaValue}>{statusLabel(selectedTask.status)}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Тип</p>
                <p className={styles.metaValue}>{selectedTask.type || "—"}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Макс. балл</p>
                <p className={styles.metaValue}>{selectedTask.maxGrade ?? "—"}</p>
              </div>
            </div>

            <div className={styles.modalSection}>
              <p className={styles.sectionTitle}>Описание задания</p>
              <p className={styles.sectionText}>{selectedTask.description || "—"}</p>
            </div>

            <div className={styles.modalSection}>
              <p className={styles.sectionTitle}>Сданные работы</p>
              {submissionsQuery.loading ? (
                <p>Загрузка работ…</p>
              ) : (Array.isArray(submissionsQuery.data) ? submissionsQuery.data : []).length ? (
                <ul className={styles.submissionList}>
                  {submissionsQuery.data.map((s) => {
                    const g = grading[s.id] || { grade: "", comment: "" };
                    return (
                      <li key={s.id} className={styles.submissionItem}>
                        <div>
                          <p className={styles.studentName}>{s.studentName || `Студент #${s.studentId}`}</p>
                          <p className={styles.studentMeta}>
                            {s.fileName || "—"} • {s.submittedAt ? formatDateTime(s.submittedAt) : ""}
                          </p>
                        </div>
                        <div className={styles.gradeControls}>
                          <select
                            className={styles.gradeSelect}
                            value={g.grade}
                            onChange={(e) => setGrading((prev) => ({ ...prev, [s.id]: { ...prev[s.id], grade: e.target.value } }))}
                          >
                            <option value="">—</option>
                            <option value="5">5</option>
                            <option value="4">4</option>
                            <option value="3">3</option>
                            <option value="2">2</option>
                          </select>
                          <input
                            className={styles.noteInput}
                            placeholder="Комментарий"
                            value={g.comment}
                            onChange={(e) => setGrading((prev) => ({ ...prev, [s.id]: { ...prev[s.id], comment: e.target.value } }))}
                          />
                          <button type="button" onClick={() => gradeSubmission(s.id)} disabled={g.saving || g.grade === ""}>
                            {g.saving ? "…" : "Сохранить"}
                          </button>
                          {g.error ? <span style={{ color: "var(--danger)", fontSize: 12 }}>{g.error}</span> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.sectionText}>Пока нет сданных работ.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>Новое задание</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setIsCreateOpen(false)}>×</button>
            </div>

            <form className={styles.form} onSubmit={handleCreateTask}>
              <input
                className={styles.formInput}
                placeholder="Название задания"
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
              />

              <select
                className={styles.formInput}
                value={taskForm.pairKey}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, pairKey: e.target.value }))}
              >
                <option value="">Класс • Предмет</option>
                {pairs.map((p) => (
                  <option key={`${p.classId}-${p.subjectId}`} value={`${p.classId}-${p.subjectId}`}>
                    {p.className} • {p.subjectName}
                  </option>
                ))}
              </select>

              <div className={styles.formRow}>
                <select
                  className={styles.formInput}
                  value={taskForm.type}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  {ASSIGNMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  className={styles.formInput}
                  type="number"
                  min="1"
                  max="100"
                  value={taskForm.maxGrade}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, maxGrade: e.target.value }))}
                  placeholder="Макс. балл"
                />
              </div>

              <input
                className={styles.formInput}
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, deadline: e.target.value }))}
              />

              <textarea
                className={styles.formTextarea}
                placeholder="Описание задания"
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
              />

              {createError ? <p style={{ color: "var(--danger)" }}>{createError}</p> : null}

              <button className={styles.submitBtn} type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Создание…" : "Создать"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
