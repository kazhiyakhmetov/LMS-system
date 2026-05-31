import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherAssignmentsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { assignmentsApi, filesApi, submissionsApi, teachingApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const PAGE_SIZE = 5;

const ASSIGNMENT_TYPE_KEYS = ["homework", "test", "sor", "soch", "quiz"];

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) result.push("…");
    result.push(n);
    prev = n;
  }
  return result;
}

function statusOf(deadline) {
  if (!deadline) return "new";
  const diffHours = (new Date(deadline).getTime() - Date.now()) / 3_600_000;
  if (diffHours < 0) return "done";
  if (diffHours <= 24) return "urgent";
  return "inProgress";
}

const FILTER_KEYS = ["all", "inProgress", "urgent", "done"];

export default function TeacherAssignmentsPage() {
  const { t } = useT();
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
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

  function statusLabel(status) {
    return t(`teacher.assignments.statusLabels.${status}`);
  }

  function typeLabel(type) {
    if (!type) return "—";
    return t(`teacher.assignments.types.${type}`) || type;
  }

  function toLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEditModal(task) {
    setEditingTaskId(task.id);
    setIsCreateOpen(true);
    setSelectedTaskId(null);
    setCreateError("");
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      type: task.type || "homework",
      maxGrade: String(task.maxGrade ?? "5"),
      deadline: toLocalInput(task.deadline),
      pairKey: task.classId && task.subjectId ? `${task.classId}-${task.subjectId}` : "",
    });
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    setEditingTaskId(null);
    setCreateError("");
    setTaskForm({ title: "", description: "", type: "homework", maxGrade: "5", deadline: "", pairKey: "" });
  }

  async function handleDeleteTask() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await assignmentsApi.teacherDelete(confirmDeleteId);
      await assignmentsQuery.refetch();
      setSelectedTaskId(null);
      setConfirmDeleteId(null);
    } catch (err) {
      alert(err?.message || t("teacher.assignments.form.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const classOptions = useMemo(() => ["all", ...new Set(tasks.map((tk) => tk.className))], [tasks]);
  const subjectOptions = useMemo(() => ["all", ...new Set(tasks.map((tk) => tk.subject))], [tasks]);

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
  const safePage = Math.min(currentPage, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pageNums = pageNumbers(safePage, totalPages);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, classFilter, subjectFilter]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice(sliceStart, sliceStart + PAGE_SIZE);
  }, [filteredTasks, sliceStart]);

  const selectedTask = useMemo(() => tasks.find((tk) => tk.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

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
    const active = tasks.filter((tk) => tk.status !== "done").length;
    const urgent = tasks.filter((tk) => tk.status === "urgent").length;
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
      setGrading((prev) => ({ ...prev, [submissionId]: { ...prev[submissionId], saving: false, error: err?.message || t("common.error") } }));
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
      setCreateError(t("common.fillAllFields"));
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        title,
        description,
        type: taskForm.type,
        maxGrade: Number(taskForm.maxGrade) || 5,
        deadline: new Date(deadline).toISOString(),
        subjectId: pair.subjectId,
        classId: pair.classId,
      };
      if (editingTaskId) {
        await assignmentsApi.teacherUpdate(editingTaskId, payload);
      } else {
        await assignmentsApi.teacherCreate(payload);
      }
      await assignmentsQuery.refetch();
      closeCreateModal();
    } catch (err) {
      setCreateError(err?.message || (editingTaskId ? t("teacher.assignments.form.editFailed") : t("teacher.assignments.form.createFailed")));
    } finally {
      setCreateSubmitting(false);
    }
  }

  if (assignmentsQuery.loading && !tasks.length) {
    return <div style={{ padding: 24 }}>{t("teacher.assignments.loading")}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("teacher.assignments.title")}</h2>
          <p className={styles.sub}>{t("teacher.assignments.sub")}</p>
        </div>
        <button className={styles.createBtn} type="button" onClick={() => setIsCreateOpen(true)}>
          {t("teacher.assignments.newBtn")}
        </button>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>{t("teacher.assignments.kpiActive")}</p>
          <p className={styles.statValue}>{summary.active}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>{t("teacher.assignments.kpiUrgent")}</p>
          <p className={styles.statValue}>{summary.urgent}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>{t("teacher.assignments.kpiTotal")}</p>
          <p className={styles.statValue}>{summary.total}</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder={t("teacher.assignments.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className={styles.selectRow}>
          <select className={styles.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            {classOptions.map((v) => <option key={v} value={v}>{v === "all" ? t("teacher.assignments.allClasses") : v}</option>)}
          </select>
          <select className={styles.select} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            {subjectOptions.map((v) => <option key={v} value={v}>{v === "all" ? t("teacher.assignments.allSubjects") : v}</option>)}
          </select>
        </div>

        <div className={styles.filters}>
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.filterChip} ${statusFilter === key ? styles.filterChipActive : ""}`}
              onClick={() => setStatusFilter(key)}
            >
              {t(`teacher.assignments.filters.${key}`)}
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
            <p className={styles.meta}>{t("teacher.assignments.meta.deadline", { date: formatDateTime(item.deadline) })}</p>
            <p className={styles.meta}>
              {t("teacher.assignments.meta.type", { type: typeLabel(item.type), max: item.maxGrade ?? "—" })}
            </p>
          </article>
        )) : (
          <div className={styles.emptyState}>{t("teacher.assignments.empty")}</div>
        )}
      </section>

      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Pagination">
          <span className={styles.pageInfo}>
            {t("parent.assignments.pagination.info", {
              start: sliceStart + 1,
              end: Math.min(sliceStart + PAGE_SIZE, filteredTasks.length),
              total: filteredTasks.length,
            })}
          </span>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              {t("parent.assignments.pagination.prev")}
            </button>
            {pageNums.map((n, i) => (
              n === "…" ? (
                <span key={`dots-${i}`} className={styles.pageDots}>…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`${styles.pageBtn} ${n === safePage ? styles.pageBtnActive : ""}`}
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </button>
              )
            ))}
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              {t("parent.assignments.pagination.next")}
            </button>
          </div>
        </nav>
      ) : null}

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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedTask)}
                  style={{
                    height: 32, padding: "0 14px", border: "1px solid var(--stroke-accent)", borderRadius: "var(--radius-sm)",
                    background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title={t("teacher.assignments.modal.edit")}
                >{t("teacher.assignments.modal.edit")}</button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedTask.id)}
                  style={{
                    height: 32, padding: "0 14px", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)",
                    background: "var(--danger-soft)", color: "var(--danger-strong)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title={t("teacher.assignments.modal.del")}
                >{t("teacher.assignments.modal.del")}</button>
                <button type="button" className={styles.closeBtn} onClick={() => setSelectedTaskId(null)}>×</button>
              </div>
            </div>

            <div className={styles.modalMeta}>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>{t("teacher.assignments.modal.deadline")}</p>
                <p className={styles.metaValue}>{formatDateTime(selectedTask.deadline)}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>{t("teacher.assignments.modal.statusLabel")}</p>
                <p className={styles.metaValue}>{statusLabel(selectedTask.status)}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>{t("teacher.assignments.modal.type")}</p>
                <p className={styles.metaValue}>{typeLabel(selectedTask.type)}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>{t("teacher.assignments.modal.maxGrade")}</p>
                <p className={styles.metaValue}>{selectedTask.maxGrade ?? "—"}</p>
              </div>
            </div>

            <div className={styles.modalSection}>
              <p className={styles.sectionTitle}>{t("teacher.assignments.modal.descriptionTitle")}</p>
              <p className={styles.sectionText}>{selectedTask.description || "—"}</p>
            </div>

            <div className={styles.modalSection}>
              <p className={styles.sectionTitle}>{t("teacher.assignments.modal.submissionsTitle")}</p>
              {submissionsQuery.loading ? (
                <p>{t("teacher.assignments.modal.loadingSubs")}</p>
              ) : (Array.isArray(submissionsQuery.data) ? submissionsQuery.data : []).length ? (
                <ul className={styles.submissionList}>
                  {submissionsQuery.data.map((s) => {
                    const g = grading[s.id] || { grade: "", comment: "" };
                    return (
                      <li key={s.id} className={styles.submissionItem}>
                        <div>
                          <p className={styles.studentName}>{s.studentName || t("teacher.assignments.modal.studentFallback", { id: s.studentId })}</p>
                          <p className={styles.studentMeta}>
                            {s.fileName ? (
                              <a
                                href={filesApi.downloadSubmissionUrl(s.id)}
                                download={s.fileName}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "var(--accent-strong)", textDecoration: "underline", fontWeight: 600 }}
                              >
                                ⬇ {s.fileName}
                              </a>
                            ) : "—"}
                            {s.submittedAt ? ` • ${formatDateTime(s.submittedAt)}` : ""}
                          </p>
                          {s.comment ? (
                            <p className={styles.studentMeta} style={{ fontStyle: "italic", marginTop: 4 }}>
                              «{s.comment}»
                            </p>
                          ) : null}
                        </div>
                        <div className={styles.gradeControls}>
                          <select
                            className={styles.gradeSelect}
                            value={g.grade}
                            onChange={(e) => setGrading((prev) => ({ ...prev, [s.id]: { ...prev[s.id], grade: e.target.value } }))}
                          >
                            <option value="">—</option>
                            {Array.from({ length: Math.max(1, Number(selectedTask?.maxGrade) || 5) }, (_, i) => {
                              const n = (Number(selectedTask?.maxGrade) || 5) - i;
                              return <option key={n} value={n}>{n}</option>;
                            })}
                          </select>
                          <input
                            className={styles.noteInput}
                            placeholder={t("teacher.assignments.modal.commentPlaceholder")}
                            value={g.comment}
                            onChange={(e) => setGrading((prev) => ({ ...prev, [s.id]: { ...prev[s.id], comment: e.target.value } }))}
                          />
                          <button
                            type="button"
                            className={styles.gradeSaveBtn}
                            onClick={() => gradeSubmission(s.id)}
                            disabled={g.saving || g.grade === ""}
                          >
                            {g.saving ? "…" : t("teacher.assignments.modal.gradeSave")}
                          </button>
                          {g.error ? <p className={styles.gradeError}>{g.error}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.sectionText}>{t("teacher.assignments.modal.submissionsEmpty")}</p>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>{editingTaskId ? t("teacher.assignments.form.editTitle") : t("teacher.assignments.form.newTitle")}</h3>
              <button type="button" className={styles.closeBtn} onClick={closeCreateModal}>×</button>
            </div>

            <form className={styles.form} onSubmit={handleCreateTask}>
              <input
                className={styles.formInput}
                placeholder={t("teacher.assignments.form.title")}
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
              />

              <select
                className={styles.formInput}
                value={taskForm.pairKey}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, pairKey: e.target.value }))}
              >
                <option value="">{t("teacher.assignments.form.pair")}</option>
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
                  {ASSIGNMENT_TYPE_KEYS.map((tp) => <option key={tp} value={tp}>{t(`teacher.assignments.types.${tp}`)}</option>)}
                </select>
                <input
                  className={styles.formInput}
                  type="number"
                  min="1"
                  max="100"
                  value={taskForm.maxGrade}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, maxGrade: e.target.value }))}
                  placeholder={t("teacher.assignments.form.maxGrade")}
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
                placeholder={t("teacher.assignments.form.descPlaceholder")}
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
              />

              {createError ? <p style={{ color: "var(--danger)" }}>{createError}</p> : null}

              <button className={styles.submitBtn} type="submit" disabled={createSubmitting}>
                {createSubmitting ? t("teacher.assignments.form.saving") : (editingTaskId ? t("teacher.assignments.form.save") : t("teacher.assignments.form.create"))}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {confirmDeleteId ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            style={{
              background: "var(--panel)", border: "1px solid var(--stroke)", borderRadius: "var(--radius-xl)",
              padding: 24, width: "100%", maxWidth: 420, boxShadow: "var(--shadow-3)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
              {t("teacher.assignments.modal.confirmDeleteTitle")}
            </h3>
            <p style={{ margin: "10px 0 20px", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              {t("teacher.assignments.modal.confirmDeleteSub")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  height: 38, padding: "0 16px", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)",
                  background: "var(--panel)", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >{t("common.cancel")}</button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={deleting}
                style={{
                  height: 38, padding: "0 18px", border: 0, borderRadius: "var(--radius-sm)",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)", fontFamily: "inherit",
                }}
              >
                {deleting ? t("common.deleting") : t("common.delete")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
