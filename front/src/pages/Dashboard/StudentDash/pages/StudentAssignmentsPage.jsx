import { useEffect, useMemo, useState } from "react";
import styles from "./StudentAssignmentsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { assignmentsApi, filesApi, submissionsApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const PAGE_SIZE = 5;

function deriveStatus(source, assignment) {
  if (source === "active") return "inProgress";
  if (source === "overdue") return "urgent";
  if (!assignment?.deadline) return "new";
  const diffHours = (new Date(assignment.deadline).getTime() - Date.now()) / 3_600_000;
  if (diffHours <= 24) return "urgent";
  return "new";
}

function normalizeAssignment(raw, source) {
  const a = raw?.assignment || raw;
  const submission = raw?.assignment ? raw : null;
  const status = submission?.grade != null ? "completed" : deriveStatus(source, a);
  return {
    id: a?.id,
    subject: a?.subjectName || "—",
    title: a?.title || "Без названия",
    deadline: a?.deadline || null,
    teacher: a?.teacherName || "",
    description: a?.description || "",
    maxGrade: a?.maxGrade,
    status,
    grade: submission?.grade != null ? `${submission.grade}${a?.maxGrade ? `/${a.maxGrade}` : ""}` : null,
    submissionId: submission?.id,
    submittedAt: submission?.submittedAt || null,
    _source: source,
  };
}

function statusLabel(status) {
  switch (status) {
    case "completed": return "Выполнено";
    case "urgent": return "Срочно";
    case "inProgress": return "В процессе";
    default: return "Новое";
  }
}

function matchesStatus(item, statusFilter) {
  if (statusFilter === "all") return true;
  if (statusFilter === "notCompleted") return item.status !== "completed";
  return item.status === statusFilter;
}

export default function StudentAssignmentsPage() {
  const { t } = useT();
  const toSubmitQuery = useApi(() => assignmentsApi.studentToSubmit(), []);
  const activeQuery = useApi(() => assignmentsApi.studentActive(), []);
  const overdueQuery = useApi(() => assignmentsApi.studentOverdue(), []);
  const submissionsQuery = useApi(() => submissionsApi.my(), []);

  const filters = [
    { key: "all", label: t("common.all") },
    { key: "completed", label: t("admin.classes.active") === "Активный" ? "Выполненные" : "Completed" },
    { key: "notCompleted", label: "Невыполненные" },
    { key: "urgent", label: "Срочные" },
    { key: "inProgress", label: "В процессе" },
    { key: "new", label: "Новые" },
  ];

  const loading = toSubmitQuery.loading || activeQuery.loading || overdueQuery.loading;
  const error = toSubmitQuery.error || activeQuery.error || overdueQuery.error;

  const assignments = useMemo(() => {
    const items = [];
    (toSubmitQuery.data || []).forEach((a) => items.push(normalizeAssignment(a, "to-submit")));
    (activeQuery.data || []).forEach((a) => items.push(normalizeAssignment(a, "active")));
    (overdueQuery.data || []).forEach((a) => items.push(normalizeAssignment(a, "overdue")));
    const seen = new Set();
    return items.filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [toSubmitQuery.data, activeQuery.data, overdueQuery.data]);

  const submissions = useMemo(
    () => Array.isArray(submissionsQuery.data) ? submissionsQuery.data : [],
    [submissionsQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({});

  const subjectOptions = useMemo(() => {
    return ["all", ...new Set(assignments.map((item) => item.subject).filter(Boolean))];
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignments.filter((item) => {
      const matchesQuery = !q ||
        item.title.toLowerCase().includes(q) ||
        (item.subject || "").toLowerCase().includes(q);
      const matchesSubject = subjectFilter === "all" || item.subject === subjectFilter;
      return matchesQuery && matchesSubject && matchesStatus(item, statusFilter);
    });
  }, [assignments, searchQuery, subjectFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, subjectFilter]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const startItem = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  async function onFileChange(event) {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    setSubmitError("");
    setSubmittingId(selected.id);
    try {
      const uploaded = await filesApi.uploadSubmission(file);
      await submissionsApi.submit({
        assignmentId: selected.id,
        filePath: uploaded.filePath,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
      });
      setUploadedFiles((prev) => ({ ...prev, [selected.id]: file.name }));
      await Promise.all([
        toSubmitQuery.refetch(),
        activeQuery.refetch(),
        submissionsQuery.refetch(),
      ]);
    } catch (err) {
      setSubmitError(err?.message || "Ошибка отправки файла");
    } finally {
      setSubmittingId(null);
      event.target.value = "";
    }
  }

  if (loading && !assignments.length) {
    return <div className={styles.page}><p>{t("common.loading")}</p></div>;
  }
  if (error && !assignments.length) {
    return <div className={styles.page}><p>{t("common.error")}: {error.message}</p></div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Задания</h2>
        <p className={styles.sub}>Поиск, фильтрация по статусу и предметам, контроль дедлайнов и оценок.</p>
      </section>

      <section className={styles.controls}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="assignment-search">{t("common.search")}</label>
          <input
            id="assignment-search"
            className={styles.input}
            type="text"
            placeholder="Найти задание по названию или предмету..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="subject-filter">Предмет</label>
          <select
            id="subject-filter"
            className={styles.select}
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject === "all" ? "Все предметы" : subject}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.filters}>
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
      </section>

      <p className={styles.resultMeta}>
        Показано {startItem}-{endItem} из {filtered.length}
      </p>

      <section className={styles.list}>
        {paginated.length ? (
          paginated.map((item) => (
            <article
              key={item.id}
              className={styles.card}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(item);
                }
              }}
            >
              <div className={styles.cardTop}>
                <p className={styles.subject}>{item.subject}</p>
                <span className={`${styles.badge} ${styles[item.status]}`}>{statusLabel(item.status)}</span>
              </div>

              <p className={styles.taskTitle}>{item.title}</p>

              <div className={styles.cardMetaRow}>
                <p className={styles.meta}>Срок: {item.deadline ? formatDateTime(item.deadline) : "—"}</p>
                <p className={styles.meta}>Преподаватель: {item.teacher || "—"}</p>
              </div>

              {item.status === "completed" && item.grade ? (
                <p className={styles.grade}>Оценка: {item.grade}</p>
              ) : null}
            </article>
          ))
        ) : (
          <div className={styles.emptyState}>
            По текущим параметрам заданий нет. Попробуйте изменить поиск или фильтры.
          </div>
        )}
      </section>

      <section className={styles.pagination}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
          disabled={currentPage === 1}
        >
          {t("common.back")}
        </button>

        <p className={styles.pageInfo}>
          {currentPage} / {totalPages}
        </p>

        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
          disabled={currentPage === totalPages}
        >
          {t("common.next")}
        </button>
      </section>

      <section className={styles.submissionsSection}>
        <h3 className={styles.submissionsTitle}>{t("student.assignments.submissionsTitle")}</h3>
        {submissionsQuery.loading && !submissions.length ? (
          <p className={styles.emptyState}>{t("common.loading")}</p>
        ) : submissions.length ? (
          <div className={styles.submissionsList}>
            {submissions.map((s) => {
              const isGraded = s.grade != null;
              return (
                <article key={s.id} className={styles.submissionCard}>
                  <div>
                    <p className={styles.submissionTitle}>
                      {s.assignmentTitle || `Задание #${s.assignmentId}`}
                    </p>
                    <p className={styles.submissionMeta}>
                      {s.fileName || "—"}
                      {s.submittedAt ? ` • ${t("student.assignments.submittedAt")}: ${formatDateTime(s.submittedAt)}` : ""}
                    </p>
                    {s.teacherComment ? (
                      <p className={styles.submissionComment}>
                        {t("student.assignments.teacherComment")}: {s.teacherComment}
                      </p>
                    ) : null}
                  </div>
                  <div className={styles.submissionGradeWrap}>
                    {isGraded ? (
                      <>
                        <p className={styles.submissionGrade}>{s.grade}</p>
                        <p className={styles.submissionGradeLabel}>
                          {t("student.assignments.status.graded")}
                        </p>
                      </>
                    ) : (
                      <span className={styles.submissionPending}>
                        {t("student.assignments.status.pending")}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>{t("student.assignments.submissionsEmpty")}</p>
        )}
      </section>

      {selected ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
            <div className={styles.modalHead}>
              <div>
                <h3 id="assignment-modal-title" className={styles.modalTitle}>{selected.title}</h3>
                <p className={styles.modalSub}>Карточка задания</p>
              </div>
              <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>

            <div className={styles.modalInfoGrid}>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Предмет</p>
                <p className={styles.modalValue}>{selected.subject}</p>
              </div>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Статус</p>
                <p className={styles.modalValue}>{statusLabel(selected.status)}</p>
              </div>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Срок</p>
                <p className={styles.modalValue}>{selected.deadline ? formatDateTime(selected.deadline) : "—"}</p>
              </div>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Преподаватель</p>
                <p className={styles.modalValue}>{selected.teacher || "—"}</p>
              </div>
              {selected.grade ? (
                <div className={styles.modalInfoItem}>
                  <p className={styles.modalLabel}>Оценка</p>
                  <p className={styles.modalValue}>{selected.grade}</p>
                </div>
              ) : null}
            </div>

            <div className={styles.modalSection}>
              <p className={styles.modalSectionTitle}>Описание</p>
              <p className={styles.modalText}>{selected.description || "Описание не предоставлено."}</p>
            </div>

            {selected.status !== "completed" ? (
              <div className={styles.modalSection}>
                <p className={styles.modalSectionTitle}>Файл на проверку</p>
                <input
                  id="assignment-upload-input"
                  className={styles.fileInput}
                  type="file"
                  onChange={onFileChange}
                  disabled={submittingId === selected.id}
                />
                <div className={styles.uploadRow}>
                  <label htmlFor="assignment-upload-input" className={styles.uploadBtn}>
                    {submittingId === selected.id ? "Отправка…" : "Сдать файл"}
                  </label>
                  <p className={styles.fileName}>
                    {uploadedFiles[selected.id]
                      ? `Отправлено: ${uploadedFiles[selected.id]}`
                      : "Файл не выбран"}
                  </p>
                </div>
                {submitError ? <p className={styles.fileName} style={{ color: "var(--danger)" }}>{submitError}</p> : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
