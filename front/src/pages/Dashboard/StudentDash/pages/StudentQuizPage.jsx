import { useEffect, useMemo, useState } from "react";
import styles from "./StudentQuizPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { quizzesApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";
import { formatDateTime } from "../../../../shared/lib/utils/date";
import AIQuizGenerator from "../../../../shared/ui/AIQuizGenerator/AIQuizGenerator";

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

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>;
}
function CheckCircle() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 6-6"/></svg>;
}

function statusFromAttempt(item) {
  const s = item.attempt?.status || item.status;
  if (s === "SUBMITTED") return "submitted";
  if (s === "IN_PROGRESS") return "inProgress";
  if (s === "TIME_EXPIRED") return "expired";
  return "notStarted";
}

export default function StudentQuizPage() {
  const { t } = useT();

  const listQuery = useApi(() => quizzesApi.studentAvailable(), []);
  const list = useMemo(() => Array.isArray(listQuery.data) ? listQuery.data : [], [listQuery.data]);

  const completedQuery = useApi(() => quizzesApi.studentCompleted(), []);
  const completedList = useMemo(
    () => Array.isArray(completedQuery.data) ? completedQuery.data : [],
    [completedQuery.data],
  );

  const [tab, setTab] = useState("available"); // "available" | "completed"
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [reviewError, setReviewError] = useState("");

  async function openReview(attemptId) {
    setReviewLoading(true);
    setReviewError("");
    setReviewData({ attemptId });
    try {
      const data = await quizzesApi.studentResult(attemptId);
      setReviewData(data);
    } catch (e) {
      setReviewError(e?.message || "Не удалось загрузить результаты");
    } finally {
      setReviewLoading(false);
    }
  }
  function closeReview() {
    setReviewData(null);
    setReviewError("");
  }

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedList = list.slice(sliceStart, sliceStart + PAGE_SIZE);
  const pageNums = pageNumbers(safePage, totalPages);

  useEffect(() => { setPage(1); }, [list.length]);

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questionIdx, setQuestionIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finalScore, setFinalScore] = useState(null);

  // === Peer-quiz creation ===
  const myCreatedQuery = useApi(() => quizzesApi.studentMyCreated(), []);
  const myCreated = useMemo(() => Array.isArray(myCreatedQuery.data) ? myCreatedQuery.data : [], [myCreatedQuery.data]);
  const [aiOpen, setAiOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState("info"); // info | questions | share
  const [draftQuiz, setDraftQuiz] = useState(null);
  const [draftMeta, setDraftMeta] = useState({ title: "", description: "" });
  const [draftQuestion, setDraftQuestion] = useState({
    text: "",
    type: "SINGLE_CHOICE",
    options: [{ text: "", correct: false }, { text: "", correct: false }],
  });
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [shareForm, setShareForm] = useState({ startTime: "", endTime: "", timeLimitMinutes: 15 });
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState("");

  function openCreator() {
    setCreateOpen(true);
    setCreatorMode("info");
    setDraftQuiz(null);
    setDraftMeta({ title: "", description: "" });
    setSavedQuestions([]);
    setCreateErr("");
  }

  function closeCreator() {
    setCreateOpen(false);
    setDraftQuestion({ text: "", type: "SINGLE_CHOICE", options: [{ text: "", correct: false }, { text: "", correct: false }] });
    myCreatedQuery.refetch().catch(() => {});
  }

  async function saveQuizMeta() {
    if (!draftMeta.title.trim()) { setCreateErr(t("common.fillAllFields")); return; }
    setCreateBusy(true); setCreateErr("");
    try {
      const q = await quizzesApi.studentCreate({
        title: draftMeta.title.trim(),
        description: draftMeta.description.trim() || null,
      });
      setDraftQuiz(q);
      setCreatorMode("questions");
    } catch (err) { setCreateErr(err?.message || t("common.error")); }
    finally { setCreateBusy(false); }
  }

  async function addDraftQuestion() {
    if (!draftQuiz) return;
    if (!draftQuestion.text.trim()) { setCreateErr(t("common.fillAllFields")); return; }
    if (draftQuestion.type !== "TEXT_ANSWER") {
      const valid = draftQuestion.options.filter((o) => o.text.trim());
      if (valid.length < 2 || !valid.some((o) => o.correct)) {
        setCreateErr("Минимум 2 варианта и хотя бы один правильный");
        return;
      }
    }
    setCreateBusy(true); setCreateErr("");
    try {
      const body = {
        questionText: draftQuestion.text.trim(),
        questionType: draftQuestion.type,
        points: 1,
        orderIndex: savedQuestions.length,
        options: draftQuestion.type === "TEXT_ANSWER"
          ? []
          : draftQuestion.options.filter((o) => o.text.trim()).map((o, i) => ({
              optionText: o.text.trim(), isCorrect: !!o.correct, orderIndex: i,
            })),
      };
      const saved = await quizzesApi.studentAddQuestion(draftQuiz.id, body);
      setSavedQuestions((prev) => [...prev, saved]);
      setDraftQuestion({ text: "", type: "SINGLE_CHOICE", options: [{ text: "", correct: false }, { text: "", correct: false }] });
    } catch (err) { setCreateErr(err?.message || t("common.error")); }
    finally { setCreateBusy(false); }
  }

  async function shareQuiz() {
    if (!draftQuiz) return;
    if (!shareForm.startTime || !shareForm.endTime) { setCreateErr(t("common.fillAllFields")); return; }
    setCreateBusy(true); setCreateErr("");
    try {
      await quizzesApi.studentShare({
        quizId: draftQuiz.id,
        startTime: shareForm.startTime,
        endTime: shareForm.endTime,
        timeLimitMinutes: Number(shareForm.timeLimitMinutes) || 15,
      });
      closeCreator();
      listQuery.refetch().catch(() => {});
    } catch (err) { setCreateErr(err?.message || t("common.error")); }
    finally { setCreateBusy(false); }
  }

  async function startQuiz(item) {
    setError("");
    setBusy(true);
    try {
      const assignmentId = item.id ?? item.assignmentId ?? item.quizAssignmentId;
      const attempt = await quizzesApi.studentStart({ assignmentId });
      const assignment = await quizzesApi.studentAssignment(assignmentId).catch(() => item);
      setActiveAttempt(attempt);
      setActiveAssignment(assignment);
      setAnswers({});
      setQuestionIdx(0);
      setFinalScore(null);
    } catch (err) {
      setError(err?.message || t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function closeQuiz() {
    setActiveAttempt(null);
    setActiveAssignment(null);
    setAnswers({});
    setQuestionIdx(0);
    setFinalScore(null);
    setError("");
    listQuery.refetch().catch(() => {});
  }

  const questions = useMemo(() => {
    if (!activeAssignment) return [];
    const quiz = activeAssignment.quiz || activeAssignment;
    return Array.isArray(quiz.questions) ? quiz.questions : [];
  }, [activeAssignment]);

  const currentQ = questions[questionIdx];

  async function setAnswer(value) {
    if (!currentQ || !activeAttempt) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
    try {
      const body = { attemptId: activeAttempt.id, questionId: currentQ.id };
      if (currentQ.questionType === "TEXT_ANSWER") body.answerText = value;
      else if (Array.isArray(value)) body.selectedOptionIds = value;
      else body.selectedOptionIds = [value];
      await quizzesApi.studentAnswer(body);
    } catch { /* ignore */ }
  }

  async function finish() {
    if (!activeAttempt) return;
    if (!window.confirm(t("student.quizzes.finishConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      const finalAttempt = await quizzesApi.studentFinish({ attemptId: activeAttempt.id });
      setFinalScore(finalAttempt.score ?? 0);
    } catch (err) {
      setError(err?.message || t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (listQuery.loading && !list.length) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("student.quizzes.title")}</h2>
          <p className={styles.sub}>{t("student.quizzes.sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className={styles.statusChip}>{list.length}</span>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            style={{
              height: 40, padding: "0 18px", borderRadius: 10, border: "1px solid var(--stroke-accent)",
              background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >✨ Сгенерировать ИИ</button>
          <button
            type="button"
            onClick={openCreator}
            style={{
              height: 40, padding: "0 18px", border: 0, borderRadius: 10,
              background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >+ Создать тест</button>
        </div>
      </section>

      {myCreated.length > 0 ? (
        <section style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Мои созданные тесты
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {myCreated.map((q) => (
              <article key={q.id} style={{ border: "1px solid var(--stroke)", borderRadius: 14, background: "var(--panel)", padding: 16 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{q.title}</p>
                <p style={{ margin: "4px 0 8px", fontSize: 12, color: "var(--muted)" }}>
                  {Array.isArray(q.questions) ? q.questions.length : 0} вопр.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDraftQuiz(q);
                    setSavedQuestions(Array.isArray(q.questions) ? q.questions : []);
                    setCreateOpen(true);
                    setCreatorMode("share");
                    setCreateErr("");
                  }}
                  style={{ width: "100%", height: 32, border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", color: "var(--text)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >Поделиться</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ display: "flex", gap: 8, padding: "4px", borderRadius: 999, background: "var(--panel-2)", border: "1px solid var(--stroke)", width: "fit-content" }}>
        <button
          type="button"
          onClick={() => setTab("available")}
          style={{
            height: 30, padding: "0 14px", border: 0, borderRadius: 999,
            background: tab === "available" ? "linear-gradient(135deg, var(--accent), var(--accent-alt))" : "transparent",
            color: tab === "available" ? "#fff" : "var(--muted)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: tab === "available" ? "0 4px 12px rgba(99, 102, 241, 0.35)" : "none",
          }}
        >Доступные ({list.length})</button>
        <button
          type="button"
          onClick={() => setTab("completed")}
          style={{
            height: 30, padding: "0 14px", border: 0, borderRadius: 999,
            background: tab === "completed" ? "linear-gradient(135deg, var(--accent), var(--accent-alt))" : "transparent",
            color: tab === "completed" ? "#fff" : "var(--muted)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: tab === "completed" ? "0 4px 12px rgba(99, 102, 241, 0.35)" : "none",
          }}
        >Пройденные ({completedList.length})</button>
      </section>

      {tab === "completed" ? (
        completedList.length === 0 ? (
          <div className={styles.empty}>Вы пока не прошли ни одного квиза.</div>
        ) : (
          <section className={styles.list}>
            {completedList.map((c) => {
              const score = Number(c.score ?? 0);
              const tone = score >= 80 ? "var(--success-strong)" : score >= 50 ? "var(--warning-strong)" : "var(--danger-strong)";
              const bg = score >= 80 ? "rgba(16,185,129,0.10)" : score >= 50 ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)";
              return (
                <article key={c.attemptId} className={styles.card}>
                  <div className={styles.cardHead}>
                    <div>
                      <h3 className={styles.cardTitle}>{c.title || `#${c.quizId}`}</h3>
                      {c.subjectName ? (
                        <p className={styles.cardDesc} style={{ textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--accent-strong)", fontWeight: 700, fontSize: 11, marginTop: 4 }}>
                          {c.subjectName}
                        </p>
                      ) : null}
                      {c.description ? <p className={styles.cardDesc}>{c.description}</p> : null}
                    </div>
                    <span style={{
                      display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      minWidth: 64, padding: "6px 12px", borderRadius: 10,
                      background: bg, color: tone, fontWeight: 800,
                      fontVariantNumeric: "tabular-nums", lineHeight: 1.15,
                    }}>
                      <span style={{ fontSize: 16 }}>{(score / 10).toFixed(1)}</span>
                      <span style={{ fontSize: 10, opacity: 0.75 }}>{score}%</span>
                    </span>
                  </div>

                  <div className={styles.metrics}>
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Правильных</span>
                      <span className={styles.metricValue}>
                        {c.correctCount != null && c.questionsCount != null
                          ? `${c.correctCount} / ${c.questionsCount}`
                          : (c.questionsCount ?? "—")}
                      </span>
                    </div>
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Сдано</span>
                      <span className={styles.metricValue} style={{ fontSize: 12 }}>
                        {c.endTime ? formatDateTime(c.endTime) : "—"}
                      </span>
                    </div>
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Время</span>
                      <span className={styles.metricValue} style={{ fontSize: 13 }}>
                        {c.durationSeconds
                          ? (c.durationSeconds < 60 ? `${c.durationSeconds} c` : `${Math.round(c.durationSeconds / 60)} мин`)
                          : (c.startTime && c.endTime
                              ? (() => {
                                  const diff = Math.max(0, Math.round((new Date(c.endTime) - new Date(c.startTime)) / 1000));
                                  return diff < 60 ? `${diff} c` : `${Math.round(diff / 60)} мин`;
                                })()
                              : "—")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.startBtn}
                    onClick={() => openReview(c.attemptId)}
                  >
                    Посмотреть ответы
                  </button>
                </article>
              );
            })}
          </section>
        )
      ) : list.length === 0 ? (
        <div className={styles.empty}>{t("student.quizzes.empty")}</div>
      ) : (
        <section className={styles.list}>
          {pagedList.map((item) => {
            const quiz = item.quiz || {};
            const status = statusFromAttempt(item);
            const statusClass = {
              notStarted: styles.statusNotStarted,
              inProgress: styles.statusInProgress,
              submitted: styles.statusSubmitted,
              expired: styles.statusExpired,
            }[status];
            const statusLabel = t(`student.quizzes.${status === "notStarted" ? "notStarted" : status === "inProgress" ? "inProgress" : status === "submitted" ? "submitted" : "timeExpired"}`);

            return (
              <article key={item.id ?? item.assignmentId} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <h3 className={styles.cardTitle}>{quiz.title || item.title || `#${item.id}`}</h3>
                    {quiz.description ? <p className={styles.cardDesc}>{quiz.description}</p> : null}
                  </div>
                  <span className={`${styles.cardStatus} ${statusClass}`}>{statusLabel}</span>
                </div>

                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t("admin.surveys.question")}</span>
                    <span className={styles.metricValue}>
                      {Array.isArray(quiz.questions) ? quiz.questions.length : (quiz.questionsCount ?? 0)}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t("admin.schedule.endTime")}</span>
                    <span className={styles.metricValue} style={{ fontSize: 12 }}>
                      {item.endTime ? formatDateTime(item.endTime) : "—"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.startBtn}
                  onClick={() => startQuiz(item)}
                  disabled={busy || status === "submitted" || status === "expired"}
                >
                  {busy ? t("student.quizzes.starting") : t("student.quizzes.start")}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {tab === "available" && list.length > 0 && totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Pagination">
          <span className={styles.pageInfo}>
            {t("student.quizzes.paginationInfo", {
              start: sliceStart + 1,
              end: Math.min(sliceStart + PAGE_SIZE, list.length),
              total: list.length,
            })}
          </span>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              {t("student.quizzes.prev")}
            </button>
            {pageNums.map((n, i) => (
              n === "…" ? (
                <span key={`dots-${i}`} className={styles.pageDots}>…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`${styles.pageBtn} ${n === safePage ? styles.pageBtnActive : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              )
            ))}
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              {t("student.quizzes.next")}
            </button>
          </div>
        </nav>
      ) : null}

      {activeAttempt ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeQuiz(); }}>
          <section className={styles.modal} role="dialog" aria-modal="true">
            <header className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>
                  {(activeAssignment?.quiz || activeAssignment)?.title || t("student.quizzes.title")}
                </h3>
                {finalScore == null ? (
                  <p className={styles.modalSub}>
                    {t("student.quizzes.questionLabel", { n: questionIdx + 1, total: questions.length })}
                  </p>
                ) : null}
              </div>
              <button type="button" className={styles.modalClose} onClick={closeQuiz}><CloseIcon /></button>
            </header>

            {finalScore != null ? (
              <div className={styles.result}>
                <div className={styles.resultIcon}><CheckCircle /></div>
                <div className={styles.resultLabel}>{t("student.quizzes.yourScore")}</div>
                <div className={styles.resultScore}>{finalScore}</div>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={closeQuiz} style={{ justifySelf: "center" }}>
                  {t("student.quizzes.backToList")}
                </button>
              </div>
            ) : !questions.length ? (
              <div className={styles.empty}>{t("common.empty")}</div>
            ) : currentQ ? (
              <>
                <div className={styles.progress}>
                  <div className={styles.progressTop}>
                    <span className={styles.progressLabel}>{t("student.quizzes.questionLabel", { n: questionIdx + 1, total: questions.length })}</span>
                    <span className={styles.progressCount}>{Math.round(((questionIdx + 1) / questions.length) * 100)}%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${((questionIdx + 1) / questions.length) * 100}%` }} />
                  </div>
                </div>

                <article className={styles.question}>
                  <p className={styles.questionText}>{currentQ.questionText || currentQ.text}</p>

                  {currentQ.questionType === "TEXT_ANSWER" ? (
                    <textarea
                      className={styles.textInput}
                      value={answers[currentQ.id] || ""}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={t("student.quizzes.answerPlaceholder")}
                    />
                  ) : (
                    <div className={styles.options}>
                      {(currentQ.options || []).map((opt) => {
                        const optId = opt.id ?? opt.optionId;
                        const selected = answers[currentQ.id];
                        const isMulti = currentQ.questionType === "MULTIPLE_CHOICE";
                        const active = isMulti
                          ? Array.isArray(selected) && selected.includes(optId)
                          : selected === optId;
                        return (
                          <button
                            key={optId}
                            type="button"
                            className={`${styles.option} ${active ? styles.optionActive : ""}`}
                            onClick={() => {
                              if (isMulti) {
                                const arr = Array.isArray(selected) ? selected : [];
                                const next = arr.includes(optId) ? arr.filter((x) => x !== optId) : [...arr, optId];
                                setAnswer(next);
                              } else {
                                setAnswer(optId);
                              }
                            }}
                          >
                            <span className={styles.optionRadio} />
                            <span>{opt.optionText || opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>

                {error ? <div className={styles.alertErr}>{error}</div> : null}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => setQuestionIdx((i) => Math.max(0, i - 1))}
                    disabled={questionIdx === 0}
                  >
                    ← {t("student.quizzes.prev")}
                  </button>
                  {questionIdx < questions.length - 1 ? (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={() => setQuestionIdx((i) => Math.min(questions.length - 1, i + 1))}
                    >
                      {t("student.quizzes.next")} →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSuccess}`}
                      onClick={finish}
                      disabled={busy}
                    >
                      {busy ? t("student.quizzes.finishing") : t("student.quizzes.finish")}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {createOpen ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeCreator(); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" style={{ maxWidth: 540 }}>
            <header className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>
                  {creatorMode === "info" ? "Новый тест" : creatorMode === "questions" ? (draftQuiz?.title || "Тест") : "Поделиться"}
                </h3>
                <p className={styles.modalSub}>
                  {creatorMode === "info" ? "Шаг 1 из 3 — название" : creatorMode === "questions" ? `Шаг 2 из 3 — вопросы (${savedQuestions.length})` : "Шаг 3 из 3 — поделиться с классом"}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeCreator}><CloseIcon /></button>
            </header>

            {creatorMode === "info" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="text"
                  placeholder="Название теста"
                  value={draftMeta.title}
                  onChange={(e) => setDraftMeta((p) => ({ ...p, title: e.target.value }))}
                  style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid var(--stroke)", borderRadius: 10, background: "var(--panel)", fontSize: 14, fontFamily: "inherit", color: "var(--text)" }}
                />
                <textarea
                  rows={3}
                  placeholder="Описание (необязательно)"
                  value={draftMeta.description}
                  onChange={(e) => setDraftMeta((p) => ({ ...p, description: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--stroke)", borderRadius: 10, background: "var(--panel)", fontSize: 14, fontFamily: "inherit", color: "var(--text)", resize: "vertical" }}
                />
                {createErr ? <div className={styles.alertErr}>{createErr}</div> : null}
                <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={closeCreator}>Отмена</button>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveQuizMeta} disabled={createBusy}>
                    {createBusy ? "..." : "Далее →"}
                  </button>
                </div>
              </div>
            ) : creatorMode === "questions" ? (
              <div style={{ display: "grid", gap: 14 }}>
                {savedQuestions.length > 0 ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                    {savedQuestions.map((q, i) => (
                      <li key={q.id} style={{ padding: "10px 14px", border: "1px solid var(--stroke)", borderRadius: 10, background: "var(--bg-soft)", fontSize: 13 }}>
                        <strong>{i + 1}.</strong> {q.questionText}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div style={{ display: "grid", gap: 10, padding: 14, border: "1px dashed var(--stroke-strong)", borderRadius: 12 }}>
                  <input
                    type="text"
                    placeholder="Текст вопроса"
                    value={draftQuestion.text}
                    onChange={(e) => setDraftQuestion((p) => ({ ...p, text: e.target.value }))}
                    style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--text)" }}
                  />
                  <select
                    value={draftQuestion.type}
                    onChange={(e) => setDraftQuestion((p) => ({ ...p, type: e.target.value }))}
                    style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--text)" }}
                  >
                    <option value="SINGLE_CHOICE">Один правильный</option>
                    <option value="MULTIPLE_CHOICE">Несколько правильных</option>
                    <option value="TEXT_ANSWER">Текстовый ответ</option>
                  </select>

                  {draftQuestion.type !== "TEXT_ANSWER" ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {draftQuestion.options.map((o, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type={draftQuestion.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                            name="correct-opt"
                            checked={o.correct}
                            onChange={(e) => setDraftQuestion((p) => ({
                              ...p,
                              options: p.options.map((oo, i) =>
                                draftQuestion.type === "SINGLE_CHOICE"
                                  ? { ...oo, correct: i === idx ? e.target.checked : false }
                                  : i === idx ? { ...oo, correct: e.target.checked } : oo,
                              ),
                            }))}
                            style={{ accentColor: "var(--accent)" }}
                          />
                          <input
                            type="text"
                            placeholder={`Вариант ${idx + 1}`}
                            value={o.text}
                            onChange={(e) => setDraftQuestion((p) => ({
                              ...p,
                              options: p.options.map((oo, i) => i === idx ? { ...oo, text: e.target.value } : oo),
                            }))}
                            style={{ flex: 1, height: 36, padding: "0 12px", border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--text)" }}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDraftQuestion((p) => ({ ...p, options: [...p.options, { text: "", correct: false }] }))}
                        style={{ alignSelf: "start", padding: "6px 12px", border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", color: "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >+ Вариант</button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={addDraftQuestion}
                    disabled={createBusy}
                    style={{ height: 36, padding: "0 14px", border: 0, borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >{createBusy ? "..." : "Добавить вопрос"}</button>
                </div>

                {createErr ? <div className={styles.alertErr}>{createErr}</div> : null}

                <div className={styles.actions} style={{ justifyContent: "space-between" }}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={closeCreator}>Отложить</button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={savedQuestions.length === 0}
                    onClick={() => { setCreatorMode("share"); setCreateErr(""); }}
                  >Поделиться →</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Тест будет доступен одноклассникам в указанные даты.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Старт</label>
                    <input
                      type="datetime-local"
                      value={shareForm.startTime}
                      onChange={(e) => setShareForm((p) => ({ ...p, startTime: e.target.value }))}
                      style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Конец</label>
                    <input
                      type="datetime-local"
                      value={shareForm.endTime}
                      onChange={(e) => setShareForm((p) => ({ ...p, endTime: e.target.value }))}
                      style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--text)" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Лимит времени (мин)</label>
                  <input
                    type="number"
                    min={1}
                    value={shareForm.timeLimitMinutes}
                    onChange={(e) => setShareForm((p) => ({ ...p, timeLimitMinutes: e.target.value }))}
                    style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid var(--stroke)", borderRadius: 8, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--text)" }}
                  />
                </div>

                {createErr ? <div className={styles.alertErr}>{createErr}</div> : null}

                <div className={styles.actions} style={{ justifyContent: "space-between" }}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={closeCreator}>Отмена</button>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={shareQuiz} disabled={createBusy}>
                    {createBusy ? "..." : "Поделиться с классом"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {reviewData ? (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeReview(); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
            display: "grid", placeItems: "center", zIndex: 100, padding: 16,
          }}
        >
          <div style={{
            width: "min(720px, 100%)", maxHeight: "90vh", overflow: "auto",
            background: "var(--panel)", borderRadius: 18, border: "1px solid var(--stroke)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.16)", padding: 24,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                  {reviewData?.quiz?.title || "Результат"}
                </h3>
                {reviewData?.quiz?.subjectName ? (
                  <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-strong)" }}>
                    {reviewData.quiz.subjectName}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeReview}
                style={{ width: 36, height: 36, border: "1px solid var(--stroke)", borderRadius: 10, background: "var(--panel-2)", cursor: "pointer", display: "grid", placeItems: "center" }}
                aria-label="Закрыть"
              ><CloseIcon /></button>
            </div>

            {reviewLoading ? (
              <p style={{ color: "var(--muted)" }}>{t("common.loading")}</p>
            ) : reviewError ? (
              <p style={{ color: "var(--danger-strong)" }}>{reviewError}</p>
            ) : reviewData?.questions ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                  <div style={{ padding: 12, border: "1px solid var(--stroke)", borderRadius: 10, background: "var(--panel-2)" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Балл (из 10)</p>
                    <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                      {(Number(reviewData.score ?? 0) / 10).toFixed(1)}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                      {reviewData.score ?? 0}%
                    </p>
                  </div>
                  <div style={{ padding: 12, border: "1px solid var(--stroke)", borderRadius: 10, background: "var(--panel-2)" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Правильных</p>
                    <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: "var(--success-strong)", fontVariantNumeric: "tabular-nums" }}>
                      {reviewData.correctCount ?? 0} / {reviewData.totalQuestions ?? 0}
                    </p>
                  </div>
                  <div style={{ padding: 12, border: "1px solid var(--stroke)", borderRadius: 10, background: "var(--panel-2)" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Время</p>
                    <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                      {reviewData.durationSeconds ? `${Math.round(reviewData.durationSeconds / 60)} мин` : "—"}
                    </p>
                  </div>
                </div>

                <ol style={{ display: "grid", gap: 12, padding: 0, listStyle: "none", margin: 0 }}>
                  {reviewData.questions.map((q, idx) => (
                    <li key={q.id} style={{
                      border: "1px solid var(--stroke)",
                      borderLeft: `4px solid ${q.isCorrect ? "var(--success)" : "var(--danger)"}`,
                      borderRadius: 12, background: "var(--panel-2)", padding: 14,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, justifyContent: "space-between" }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)", flex: 1 }}>
                          <span style={{ color: "var(--muted)", marginRight: 8, fontVariantNumeric: "tabular-nums" }}>{idx + 1}.</span>
                          {q.text}
                        </p>
                        {q.points != null ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", padding: "2px 10px",
                            borderRadius: 999, background: q.isCorrect ? "rgba(16,185,129,0.12)" : "rgba(0,0,0,0.05)",
                            color: q.isCorrect ? "var(--success-strong)" : "var(--muted)",
                            fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap", flexShrink: 0,
                          }}>
                            {q.pointsEarned ?? 0} / {q.points}
                          </span>
                        ) : null}
                      </div>
                      <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                        {q.options.map((o) => {
                          const isCorrectOpt = o.isCorrect;
                          const isSelected = o.selected;
                          let bg = "var(--panel)";
                          let bd = "var(--stroke)";
                          let icon = null;
                          if (isCorrectOpt) {
                            bg = "rgba(16,185,129,0.08)";
                            bd = "rgba(16,185,129,0.4)";
                            icon = "✓";
                          }
                          if (isSelected && !isCorrectOpt) {
                            bg = "rgba(239,68,68,0.08)";
                            bd = "rgba(239,68,68,0.4)";
                            icon = "✕";
                          }
                          return (
                            <li key={o.id} style={{
                              padding: "8px 12px", border: `1px solid ${bd}`, borderRadius: 8,
                              background: bg, fontSize: 13, color: "var(--text)",
                              display: "flex", alignItems: "center", gap: 10,
                            }}>
                              <span style={{ minWidth: 18, textAlign: "center", color: isCorrectOpt ? "var(--success-strong)" : "var(--danger-strong)" }}>
                                {icon || "·"}
                              </span>
                              <span style={{ flex: 1 }}>{o.text}</span>
                              {isSelected ? (
                                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.06em" }}>
                                  Ваш ответ
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <AIQuizGenerator
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        role="student"
        onSaved={() => myCreatedQuery.refetch().catch(() => {})}
      />
    </div>
  );
}
