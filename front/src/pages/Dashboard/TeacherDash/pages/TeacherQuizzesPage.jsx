import { useEffect, useMemo, useState } from "react";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { quizzesApi, teachingApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";
import AIQuizGenerator from "../../../../shared/ui/AIQuizGenerator/AIQuizGenerator";
import styles from "./TeacherQuizzesPage.module.css";

const QUESTION_TYPE_KEYS = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT_ANSWER"];
const PAGE_SIZE = 5;

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

export default function TeacherQuizzesPage() {
  const { t } = useT();
  const [tab, setTab] = useState("quizzes");
  const [quizzesPage, setQuizzesPage] = useState(1);
  const [assignmentsPage, setAssignmentsPage] = useState(1);

  const quizzesQuery = useApi(() => quizzesApi.teacherMy(), []);
  const assignmentsQuery = useApi(() => quizzesApi.teacherAssignments(), []);
  const pairsQuery = useApi(() => teachingApi.myPairs(), []);

  const quizzes = useMemo(() => Array.isArray(quizzesQuery.data) ? quizzesQuery.data : [], [quizzesQuery.data]);
  const assignments = useMemo(() => Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [], [assignmentsQuery.data]);
  const pairs = useMemo(() => Array.isArray(pairsQuery.data) ? pairsQuery.data : [], [pairsQuery.data]);

  // Reset both pagers when switching tabs
  useEffect(() => { setQuizzesPage(1); setAssignmentsPage(1); }, [tab]);

  const quizzesTotalPages = Math.max(1, Math.ceil(quizzes.length / PAGE_SIZE));
  const quizzesSafePage = Math.min(quizzesPage, quizzesTotalPages);
  const quizzesSliceStart = (quizzesSafePage - 1) * PAGE_SIZE;
  const pagedQuizzes = useMemo(
    () => quizzes.slice(quizzesSliceStart, quizzesSliceStart + PAGE_SIZE),
    [quizzes, quizzesSliceStart],
  );
  const quizzesPageNums = pageNumbers(quizzesSafePage, quizzesTotalPages);

  const assignmentsTotalPages = Math.max(1, Math.ceil(assignments.length / PAGE_SIZE));
  const assignmentsSafePage = Math.min(assignmentsPage, assignmentsTotalPages);
  const assignmentsSliceStart = (assignmentsSafePage - 1) * PAGE_SIZE;
  const pagedAssignments = useMemo(
    () => assignments.slice(assignmentsSliceStart, assignmentsSliceStart + PAGE_SIZE),
    [assignments, assignmentsSliceStart],
  );
  const assignmentsPageNums = pageNumbers(assignmentsSafePage, assignmentsTotalPages);

  // === Create Quiz modal ===
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", subjectId: "" });
  const [createError, setCreateError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    pairs.forEach((p) => {
      if (p.subjectId && !map.has(p.subjectId)) map.set(p.subjectId, p.subjectName);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [pairs]);

  async function handleCreateQuiz(e) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.title.trim() || !createForm.subjectId) {
      setCreateError(t("teacher.quizzes.createModal.validation"));
      return;
    }
    setCreateSubmitting(true);
    try {
      await quizzesApi.teacherCreate({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        subjectId: Number(createForm.subjectId),
      });
      await quizzesQuery.refetch();
      setCreateOpen(false);
      setCreateForm({ title: "", description: "", subjectId: "" });
    } catch (err) {
      setCreateError(err?.message || t("teacher.quizzes.createModal.createFailed"));
    } finally {
      setCreateSubmitting(false);
    }
  }

  // === Add Question modal ===
  const [questionsForQuiz, setQuestionsForQuiz] = useState(null);
  // Live view of the quiz being edited — отображает свежий список вопросов
  // после refetch, даже если ссылка questionsForQuiz уже устарела.
  const activeQuizForQuestions = useMemo(() => {
    if (!questionsForQuiz) return null;
    return quizzes.find((q) => q.id === questionsForQuiz.id) || questionsForQuiz;
  }, [quizzes, questionsForQuiz]);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  async function deleteQuestion(qId) {
    if (!questionsForQuiz) return;
    setDeletingQuestionId(qId);
    try {
      await quizzesApi.teacherDeleteQuestion(questionsForQuiz.id, qId);
      await quizzesQuery.refetch();
    } catch (err) {
      alert(err?.message || t("common.error"));
    } finally {
      setDeletingQuestionId(null);
    }
  }
  const [qForm, setQForm] = useState({
    questionText: "",
    questionType: "SINGLE_CHOICE",
    points: "1",
    options: [
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
    ],
  });
  const [qError, setQError] = useState("");
  const [qSubmitting, setQSubmitting] = useState(false);

  function resetQForm() {
    setQForm({
      questionText: "",
      questionType: "SINGLE_CHOICE",
      points: "1",
      options: [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ],
    });
    setQError("");
  }

  function setOptionField(idx, field, value) {
    setQForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => i === idx ? { ...opt, [field]: value } : opt),
    }));
  }

  function setOptionCorrect(idx, value) {
    setQForm((prev) => {
      if (prev.questionType === "SINGLE_CHOICE") {
        return { ...prev, options: prev.options.map((opt, i) => ({ ...opt, isCorrect: i === idx ? value : false })) };
      }
      return { ...prev, options: prev.options.map((opt, i) => i === idx ? { ...opt, isCorrect: value } : opt) };
    });
  }

  function addOption() {
    setQForm((prev) => ({ ...prev, options: [...prev.options, { optionText: "", isCorrect: false }] }));
  }

  function removeOption(idx) {
    setQForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  }

  async function handleAddQuestion(e) {
    e.preventDefault();
    if (!questionsForQuiz) return;
    setQError("");
    const text = qForm.questionText.trim();
    if (!text) { setQError(t("teacher.quizzes.questionsModal.validation.empty")); return; }
    const isText = qForm.questionType === "TEXT_ANSWER";
    if (!isText) {
      const filled = qForm.options.filter((o) => o.optionText.trim());
      if (filled.length < 2) { setQError(t("teacher.quizzes.questionsModal.validation.minOptions")); return; }
      const hasCorrect = filled.some((o) => o.isCorrect);
      if (!hasCorrect) { setQError(t("teacher.quizzes.questionsModal.validation.markCorrect")); return; }
    }
    setQSubmitting(true);
    try {
      const payload = {
        questionText: text,
        questionType: qForm.questionType,
        points: Number(qForm.points) || 1,
        orderIndex: 0,
        options: isText ? [] : qForm.options
          .filter((o) => o.optionText.trim())
          .map((o, i) => ({ optionText: o.optionText.trim(), isCorrect: !!o.isCorrect, orderIndex: i })),
      };
      await quizzesApi.teacherAddQuestion(questionsForQuiz.id, payload);
      await quizzesQuery.refetch();
      resetQForm();
    } catch (err) {
      setQError(err?.message || t("teacher.quizzes.questionsModal.addFailed"));
    } finally {
      setQSubmitting(false);
    }
  }

  // === Assign Quiz modal ===
  const [assignQuiz, setAssignQuiz] = useState(null);
  const [assignForm, setAssignForm] = useState({
    classId: "",
    startTime: "",
    endTime: "",
    timeLimitMinutes: "30",
  });
  const [assignError, setAssignError] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const classOptions = useMemo(() => {
    const map = new Map();
    pairs.forEach((p) => {
      if (p.classId && !map.has(p.classId)) map.set(p.classId, p.className);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [pairs]);

  async function handleAssignQuiz(e) {
    e.preventDefault();
    if (!assignQuiz) return;
    setAssignError("");
    if (!assignForm.classId || !assignForm.startTime || !assignForm.endTime) {
      setAssignError(t("teacher.quizzes.assignModal.validation"));
      return;
    }
    setAssignSubmitting(true);
    try {
      await quizzesApi.teacherAssign({
        quizId: assignQuiz.id,
        classId: Number(assignForm.classId),
        studentIds: null,
        startTime: assignForm.startTime,
        endTime: assignForm.endTime,
        timeLimitMinutes: Number(assignForm.timeLimitMinutes) || 30,
      });
      await assignmentsQuery.refetch();
      setAssignQuiz(null);
      setAssignForm({ classId: "", startTime: "", endTime: "", timeLimitMinutes: "30" });
    } catch (err) {
      setAssignError(err?.message || t("teacher.quizzes.assignModal.assignFailed"));
    } finally {
      setAssignSubmitting(false);
    }
  }

  // === Results modal ===
  const [resultsAssignment, setResultsAssignment] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    if (!resultsAssignment) return;
    let cancelled = false;
    setResultsLoading(true);
    setResultsError("");
    quizzesApi.teacherResults(resultsAssignment.id)
      .then((data) => { if (!cancelled) setResults(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setResultsError(err?.message || t("common.error")); })
      .finally(() => { if (!cancelled) setResultsLoading(false); });
    return () => { cancelled = true; };
  }, [resultsAssignment, t]);

  // === Attempt details + grading ===
  const [detailsAttemptId, setDetailsAttemptId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [textGrades, setTextGrades] = useState({});
  const [gradeSubmitting, setGradeSubmitting] = useState(false);

  useEffect(() => {
    if (!detailsAttemptId) return;
    let cancelled = false;
    setDetailsLoading(true);
    setDetails(null);
    setTextGrades({});
    quizzesApi.teacherAttemptDetails(detailsAttemptId)
      .then((data) => {
        if (cancelled) return;
        setDetails(data);
        const init = {};
        (data?.answers || []).forEach((a) => {
          if (a.questionType === "TEXT_ANSWER") {
            init[a.answerId ?? a.questionId] = {
              answerId: a.answerId,
              points: a.pointsEarned ?? 0,
            };
          }
        });
        setTextGrades(init);
      })
      .catch((err) => { if (!cancelled) console.error(err); })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [detailsAttemptId]);

  async function submitTextGrades() {
    if (!details) return;
    setGradeSubmitting(true);
    try {
      const grades = Object.values(textGrades)
        .filter((g) => g.answerId != null)
        .map((g) => ({ answerId: g.answerId, pointsEarned: Number(g.points) || 0 }));
      if (!grades.length) {
        setDetailsAttemptId(null);
        return;
      }
      await quizzesApi.teacherGradeText({ attemptId: detailsAttemptId, grades });
      if (resultsAssignment) {
        const data = await quizzesApi.teacherResults(resultsAssignment.id);
        setResults(Array.isArray(data) ? data : []);
      }
      setDetailsAttemptId(null);
    } catch (err) {
      alert(err?.message || t("teacher.quizzes.attemptModal.saveFailed"));
    } finally {
      setGradeSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("teacher.quizzes.title")}</h2>
          <p className={styles.sub}>{t("teacher.quizzes.sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            style={{
              height: 40, padding: "0 18px", borderRadius: 10, border: "1px solid var(--stroke-accent)",
              background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >✨ Сгенерировать ИИ</button>
          <button className={styles.createBtn} type="button" onClick={() => setCreateOpen(true)}>
            {t("teacher.quizzes.createBtn")}
          </button>
        </div>
      </section>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "quizzes" ? styles.tabActive : ""}`}
          onClick={() => setTab("quizzes")}
        >
          {t("teacher.quizzes.tabs.quizzes")} <span className={styles.tabCount}>{quizzes.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "assignments" ? styles.tabActive : ""}`}
          onClick={() => setTab("assignments")}
        >
          {t("teacher.quizzes.tabs.assignments")} <span className={styles.tabCount}>{assignments.length}</span>
        </button>
      </div>

      {tab === "quizzes" ? (
        quizzesQuery.loading && !quizzes.length ? (
          <p className={styles.emptyState}>{t("teacher.quizzes.loadingQuizzes")}</p>
        ) : quizzes.length ? (
          <>
            <section className={styles.list}>
              {pagedQuizzes.map((q) => (
                <article key={q.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.subject}>{q.subjectName || t("teacher.quizzes.noSubject")}</span>
                    <span className={styles.qCount}>{q.questions?.length ?? q.questionsCount ?? 0} {t("teacher.quizzes.questionsShort")}</span>
                  </div>
                  <p className={styles.cardTitle}>{q.title}</p>
                  {q.description ? <p className={styles.cardDesc}>{q.description}</p> : null}
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => { setQuestionsForQuiz(q); resetQForm(); }}
                    >
                      {t("teacher.quizzes.questionsBtn")}
                    </button>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={() => setAssignQuiz(q)}
                    >
                      {t("teacher.quizzes.assignBtn")}
                    </button>
                  </div>
                </article>
              ))}
            </section>

            {quizzesTotalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Pagination">
                <span className={styles.pageInfo}>
                  {t("parent.assignments.pagination.info", {
                    start: quizzesSliceStart + 1,
                    end: Math.min(quizzesSliceStart + PAGE_SIZE, quizzes.length),
                    total: quizzes.length,
                  })}
                </span>
                <div className={styles.pageBtns}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setQuizzesPage((p) => Math.max(1, p - 1))}
                    disabled={quizzesSafePage <= 1}
                  >
                    {t("parent.assignments.pagination.prev")}
                  </button>
                  {quizzesPageNums.map((n, i) => (
                    n === "…" ? (
                      <span key={`q-dots-${i}`} className={styles.pageDots}>…</span>
                    ) : (
                      <button
                        key={`q-${n}`}
                        type="button"
                        className={`${styles.pageBtn} ${n === quizzesSafePage ? styles.pageBtnActive : ""}`}
                        onClick={() => setQuizzesPage(n)}
                      >
                        {n}
                      </button>
                    )
                  ))}
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setQuizzesPage((p) => Math.min(quizzesTotalPages, p + 1))}
                    disabled={quizzesSafePage >= quizzesTotalPages}
                  >
                    {t("parent.assignments.pagination.next")}
                  </button>
                </div>
              </nav>
            ) : null}
          </>
        ) : (
          <p className={styles.emptyState}>{t("teacher.quizzes.noQuizzes")}</p>
        )
      ) : (
        assignmentsQuery.loading && !assignments.length ? (
          <p className={styles.emptyState}>{t("teacher.quizzes.loadingAssignments")}</p>
        ) : assignments.length ? (
          <>
            <section className={styles.list}>
              {pagedAssignments.map((a) => (
                <article key={a.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.subject}>{a.className || t("teacher.quizzes.classFallback", { id: a.classId })}</span>
                    <span className={`${styles.badge} ${styles.badgeActive}`}>{t("teacher.quizzes.assignedBadge")}</span>
                  </div>
                  <p className={styles.cardTitle}>{a.quizTitle || t("teacher.quizzes.quizFallback", { id: a.quizId })}</p>
                  <p className={styles.cardMeta}>
                    {a.startTime && a.endTime ? t("teacher.quizzes.timeRange", { from: formatDateTime(a.startTime), to: formatDateTime(a.endTime) }) : ""}
                    {a.timeLimitMinutes ? ` • ${t("teacher.quizzes.timeLimit", { min: a.timeLimitMinutes })}` : ""}
                  </p>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={() => setResultsAssignment(a)}
                    >
                      {t("teacher.quizzes.resultsBtn")}
                    </button>
                  </div>
                </article>
              ))}
            </section>

            {assignmentsTotalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Pagination">
                <span className={styles.pageInfo}>
                  {t("parent.assignments.pagination.info", {
                    start: assignmentsSliceStart + 1,
                    end: Math.min(assignmentsSliceStart + PAGE_SIZE, assignments.length),
                    total: assignments.length,
                  })}
                </span>
                <div className={styles.pageBtns}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setAssignmentsPage((p) => Math.max(1, p - 1))}
                    disabled={assignmentsSafePage <= 1}
                  >
                    {t("parent.assignments.pagination.prev")}
                  </button>
                  {assignmentsPageNums.map((n, i) => (
                    n === "…" ? (
                      <span key={`a-dots-${i}`} className={styles.pageDots}>…</span>
                    ) : (
                      <button
                        key={`a-${n}`}
                        type="button"
                        className={`${styles.pageBtn} ${n === assignmentsSafePage ? styles.pageBtnActive : ""}`}
                        onClick={() => setAssignmentsPage(n)}
                      >
                        {n}
                      </button>
                    )
                  ))}
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setAssignmentsPage((p) => Math.min(assignmentsTotalPages, p + 1))}
                    disabled={assignmentsSafePage >= assignmentsTotalPages}
                  >
                    {t("parent.assignments.pagination.next")}
                  </button>
                </div>
              </nav>
            ) : null}
          </>
        ) : (
          <p className={styles.emptyState}>{t("teacher.quizzes.noAssignments")}</p>
        )
      )}

      {/* === Create Quiz === */}
      {createOpen ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <section className={styles.modal}>
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>{t("teacher.quizzes.createModal.title")}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setCreateOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateQuiz} className={styles.form}>
              <input
                className={styles.input}
                placeholder={t("teacher.quizzes.createModal.titlePlaceholder")}
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <select
                className={styles.input}
                value={createForm.subjectId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, subjectId: e.target.value }))}
              >
                <option value="">{t("teacher.quizzes.createModal.chooseSubject")}</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                placeholder={t("teacher.quizzes.createModal.descPlaceholder")}
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              {createError ? <p className={styles.errorBanner}>{createError}</p> : null}
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setCreateOpen(false)}>{t("teacher.quizzes.createModal.cancel")}</button>
                <button type="submit" className={styles.btnPrimary} disabled={createSubmitting}>
                  {createSubmitting ? t("teacher.quizzes.createModal.creating") : t("teacher.quizzes.createModal.create")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* === Add Question === */}
      {questionsForQuiz ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setQuestionsForQuiz(null); }}>
          <section className={`${styles.modal} ${styles.modalLg}`}>
            <div className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{questionsForQuiz.title}</h3>
                <p className={styles.modalSub}>{t("teacher.quizzes.questionsModal.sub")}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setQuestionsForQuiz(null)}>×</button>
            </div>

            {Array.isArray(activeQuizForQuestions?.questions) && activeQuizForQuestions.questions.length ? (
              <div className={styles.questionList}>
                <p className={styles.sectionLabel}>{t("teacher.quizzes.questionsModal.existing")}</p>
                {activeQuizForQuestions.questions.map((q, idx) => (
                  <div key={q.id} className={styles.questionItem}>
                    <span className={styles.questionNum}>{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p className={styles.questionText}>{q.questionText}</p>
                      <p className={styles.questionMeta}>
                        {t(`teacher.quizzes.questionTypes.${q.questionType}`) || q.questionType}
                        {" • "}
                        {q.points} {q.points === 1 ? t("teacher.quizzes.questionsModal.pointsOne") : t("teacher.quizzes.questionsModal.pointsMany")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Удалить вопрос?")) deleteQuestion(q.id);
                      }}
                      disabled={deletingQuestionId === q.id}
                      style={{
                        height: 32, padding: "0 12px", borderRadius: 8,
                        border: "1px solid var(--stroke)", background: "var(--panel)",
                        color: "var(--danger-strong)", fontSize: 12, fontWeight: 700,
                        cursor: deletingQuestionId === q.id ? "not-allowed" : "pointer",
                        fontFamily: "inherit", opacity: deletingQuestionId === q.id ? 0.5 : 1,
                      }}
                      title="Удалить вопрос"
                    >{deletingQuestionId === q.id ? "…" : "✕"}</button>
                  </div>
                ))}
              </div>
            ) : null}

            <form onSubmit={handleAddQuestion} className={styles.form}>
              <p className={styles.sectionLabel}>{t("teacher.quizzes.questionsModal.newQ")}</p>
              <input
                className={styles.input}
                placeholder={t("teacher.quizzes.questionsModal.textPlaceholder")}
                value={qForm.questionText}
                onChange={(e) => setQForm((prev) => ({ ...prev, questionText: e.target.value }))}
              />
              <div className={styles.formRow}>
                <select
                  className={styles.input}
                  value={qForm.questionType}
                  onChange={(e) => setQForm((prev) => ({ ...prev, questionType: e.target.value }))}
                >
                  {QUESTION_TYPE_KEYS.map((tp) => <option key={tp} value={tp}>{t(`teacher.quizzes.questionTypes.${tp}`)}</option>)}
                </select>
                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  placeholder={t("teacher.quizzes.questionsModal.pointsPlaceholder")}
                  value={qForm.points}
                  onChange={(e) => setQForm((prev) => ({ ...prev, points: e.target.value }))}
                />
              </div>

              {qForm.questionType !== "TEXT_ANSWER" ? (
                <>
                  <p className={styles.sectionLabel}>{t("teacher.quizzes.questionsModal.options")}</p>
                  <div className={styles.optionList}>
                    {qForm.options.map((opt, idx) => (
                      <div key={idx} className={styles.optionRow}>
                        <input
                          type={qForm.questionType === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                          name="correct-option"
                          checked={opt.isCorrect}
                          onChange={(e) => setOptionCorrect(idx, e.target.checked)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <input
                          className={styles.input}
                          placeholder={t("teacher.quizzes.questionsModal.optionPlaceholder", { n: idx + 1 })}
                          value={opt.optionText}
                          onChange={(e) => setOptionField(idx, "optionText", e.target.value)}
                        />
                        {qForm.options.length > 2 ? (
                          <button
                            type="button"
                            className={styles.btnGhost}
                            onClick={() => removeOption(idx)}
                            style={{ height: 38, padding: "0 10px" }}
                          >×</button>
                        ) : null}
                      </div>
                    ))}
                    <button type="button" className={styles.btnGhost} onClick={addOption} style={{ alignSelf: "flex-start" }}>
                      {t("teacher.quizzes.questionsModal.addOption")}
                    </button>
                  </div>
                </>
              ) : null}

              {qError ? <p className={styles.errorBanner}>{qError}</p> : null}
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setQuestionsForQuiz(null)}>{t("teacher.quizzes.questionsModal.close")}</button>
                <button type="submit" className={styles.btnPrimary} disabled={qSubmitting}>
                  {qSubmitting ? t("teacher.quizzes.questionsModal.addingBtn") : t("teacher.quizzes.questionsModal.addBtn")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* === Assign Quiz === */}
      {assignQuiz ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setAssignQuiz(null); }}>
          <section className={styles.modal}>
            <div className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{t("teacher.quizzes.assignModal.title")}</h3>
                <p className={styles.modalSub}>{assignQuiz.title}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setAssignQuiz(null)}>×</button>
            </div>
            <form onSubmit={handleAssignQuiz} className={styles.form}>
              <select
                className={styles.input}
                value={assignForm.classId}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, classId: e.target.value }))}
              >
                <option value="">{t("teacher.quizzes.assignModal.chooseClass")}</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className={styles.formRow}>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={assignForm.startTime}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={assignForm.endTime}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
              <input
                className={styles.input}
                type="number"
                min="1"
                placeholder={t("teacher.quizzes.assignModal.timeLimitPlaceholder")}
                value={assignForm.timeLimitMinutes}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, timeLimitMinutes: e.target.value }))}
              />
              {assignError ? <p className={styles.errorBanner}>{assignError}</p> : null}
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setAssignQuiz(null)}>{t("teacher.quizzes.assignModal.cancel")}</button>
                <button type="submit" className={styles.btnPrimary} disabled={assignSubmitting}>
                  {assignSubmitting ? t("teacher.quizzes.assignModal.assigning") : t("teacher.quizzes.assignModal.assign")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* === Results === */}
      {resultsAssignment ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setResultsAssignment(null); }}>
          <section className={`${styles.modal} ${styles.modalLg}`}>
            <div className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{resultsAssignment.quizTitle || t("teacher.quizzes.resultsBtn")}</h3>
                <p className={styles.modalSub}>{resultsAssignment.className}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setResultsAssignment(null)}>×</button>
            </div>
            {resultsLoading ? (
              <p className={styles.emptyState}>{t("teacher.quizzes.resultsModal.loading")}</p>
            ) : resultsError ? (
              <p className={styles.errorBanner}>{resultsError}</p>
            ) : results.length ? (
              <ul className={styles.attemptList}>
                {results.map((r) => (
                  <li key={r.attemptId} className={styles.attemptItem}>
                    <div>
                      <p className={styles.attemptStudent}>{r.studentName}</p>
                      <p className={styles.attemptStatus}>{r.status}</p>
                    </div>
                    <div className={styles.attemptScore}>
                      {r.score != null ? r.score : "—"}
                    </div>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setDetailsAttemptId(r.attemptId)}
                    >
                      {t("teacher.quizzes.resultsModal.openBtn")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>{t("teacher.quizzes.resultsModal.empty")}</p>
            )}
          </section>
        </div>
      ) : null}

      {/* === Attempt details === */}
      {detailsAttemptId ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDetailsAttemptId(null); }}>
          <section className={`${styles.modal} ${styles.modalLg}`}>
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>{t("teacher.quizzes.attemptModal.title", { id: detailsAttemptId })}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setDetailsAttemptId(null)}>×</button>
            </div>
            {detailsLoading ? (
              <p className={styles.emptyState}>{t("teacher.quizzes.attemptModal.loading")}</p>
            ) : details ? (
              <>
                {(details.answers || []).length ? (
                  <ul className={styles.questionList}>
                    {details.answers.map((ans, idx) => {
                      const isText = ans.questionType === "TEXT_ANSWER";
                      const grade = textGrades[ans.answerId ?? ans.questionId] || { points: 0 };
                      return (
                        <li key={ans.answerId ?? idx} className={styles.questionItem} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span className={styles.questionNum}>{idx + 1}</span>
                            <div style={{ flex: 1 }}>
                              <p className={styles.questionText}>{ans.questionText}</p>
                              <p className={styles.questionMeta}>
                                {t("teacher.quizzes.attemptModal.max")}: {ans.maxPoints} • {t("teacher.quizzes.attemptModal.got")}: {ans.pointsEarned ?? 0}
                              </p>
                            </div>
                          </div>
                          <div style={{ paddingLeft: 36, fontSize: 13, color: "var(--text)" }}>
                            <strong>{t("teacher.quizzes.attemptModal.answer")}: </strong>
                            {ans.studentAnswer || (ans.selectedOptions || []).map((o) => o.optionText).join(", ") || "—"}
                          </div>
                          {isText ? (
                            <div style={{ paddingLeft: 36, display: "flex", gap: 8, alignItems: "center" }}>
                              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{t("teacher.quizzes.attemptModal.score")}:</label>
                              <input
                                type="number"
                                min="0"
                                max={ans.maxPoints}
                                value={grade.points}
                                onChange={(e) => setTextGrades((prev) => ({
                                  ...prev,
                                  [ans.answerId ?? ans.questionId]: { answerId: ans.answerId, points: e.target.value },
                                }))}
                                className={styles.input}
                                style={{ width: 90 }}
                              />
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("teacher.quizzes.attemptModal.outOf", { max: ans.maxPoints })}</span>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={styles.emptyState}>{t("teacher.quizzes.attemptModal.noAnswers")}</p>
                )}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnGhost} onClick={() => setDetailsAttemptId(null)}>{t("teacher.quizzes.attemptModal.close")}</button>
                  {Object.keys(textGrades).length > 0 ? (
                    <button type="button" className={styles.btnPrimary} onClick={submitTextGrades} disabled={gradeSubmitting}>
                      {gradeSubmitting ? t("teacher.quizzes.attemptModal.saving") : t("teacher.quizzes.attemptModal.save")}
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>{t("teacher.quizzes.attemptModal.loadFailed")}</p>
            )}
          </section>
        </div>
      ) : null}

      <AIQuizGenerator
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        role="teacher"
        onSaved={() => quizzesQuery.refetch().catch(() => {})}
      />
    </div>
  );
}
