import { useEffect, useMemo, useState } from "react";
import styles from "./StudentQuizPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { quizzesApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";
import { formatDateTime } from "../../../../shared/lib/utils/date";

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

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questionIdx, setQuestionIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finalScore, setFinalScore] = useState(null);

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
        <span className={styles.statusChip}>{list.length}</span>
      </section>

      {list.length === 0 ? (
        <div className={styles.empty}>{t("student.quizzes.empty")}</div>
      ) : (
        <section className={styles.list}>
          {list.map((item) => {
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
    </div>
  );
}
