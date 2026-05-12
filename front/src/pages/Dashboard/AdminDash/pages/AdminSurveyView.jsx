import { useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

function blankQuestion() {
  return { text: "", type: "MULTIPLE_CHOICE", options: ["", ""] };
}

const defaultDraft = {
  title: "",
  description: "",
  forStudents: true,
  forTeachers: false,
  questions: [blankQuestion()],
};

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>;
}

export default function AdminSurveyView() {
  const { t } = useT();
  const [draft, setDraft] = useState({ ...defaultDraft });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resultsSurvey, setResultsSurvey] = useState(null);

  const listQuery = useApi(() => surveysApi.adminList(), []);
  const surveys = Array.isArray(listQuery.data) ? listQuery.data : [];

  const resultsQuery = useApi(
    () => (resultsSurvey ? surveysApi.adminResults(resultsSurvey.id) : Promise.resolve(null)),
    [resultsSurvey?.id],
    { immediate: Boolean(resultsSurvey) },
  );
  const results = resultsQuery.data;

  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateQuestion(qIdx, patch) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === qIdx ? { ...q, ...patch } : q)),
    }));
  }

  function addQuestion() {
    setDraft((prev) => ({ ...prev, questions: [...prev.questions, blankQuestion()] }));
  }

  function removeQuestion(qIdx) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.length > 1
        ? prev.questions.filter((_, i) => i !== qIdx)
        : prev.questions,
    }));
  }

  function updateOption(qIdx, optIdx, value) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === qIdx
        ? { ...q, options: q.options.map((o, j) => (j === optIdx ? value : o)) }
        : q),
    }));
  }

  function addOption(qIdx) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === qIdx
        ? { ...q, options: [...q.options, ""] }
        : q),
    }));
  }

  function removeOption(qIdx, optIdx) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === qIdx
        ? { ...q, options: q.options.length > 2 ? q.options.filter((_, j) => j !== optIdx) : q.options }
        : q),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!draft.title.trim()) {
      setError(t("admin.surveys.validation"));
      return;
    }
    const cleanedQuestions = draft.questions
      .filter((q) => q.text.trim())
      .map((q) => ({
        text: q.text.trim(),
        type: q.type,
        options: q.type === "TEXT" ? [] : q.options.map((o) => o.trim()).filter(Boolean),
      }));
    if (!cleanedQuestions.length) {
      setError(t("admin.surveys.validation"));
      return;
    }
    setSubmitting(true);
    try {
      await surveysApi.adminCreate({
        title: draft.title,
        description: draft.description || "",
        forStudents: draft.forStudents,
        forTeachers: draft.forTeachers,
        questions: cleanedQuestions,
      });
      setMessage(t("admin.surveys.success"));
      setDraft({ ...defaultDraft, questions: [blankQuestion()] });
      await listQuery.refetch();
    } catch (err) {
      setError(err?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.surveys.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.surveys.sub")}</p>
        </div>
        <span className={`${styles.pill} ${styles.pillLive}`}>{t("roles.ADMIN")}</span>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.surveys.newSurvey")}</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.surveys.name")}</span>
                <input className={styles.input} value={draft.title} onChange={(e) => update("title", e.target.value)} required />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t("admin.surveys.audience")}</span>
                <div style={{ display: "flex", gap: 12, alignItems: "center", height: 42 }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={draft.forStudents} onChange={(e) => update("forStudents", e.target.checked)} />
                    {t("admin.surveys.students")}
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={draft.forTeachers} onChange={(e) => update("forTeachers", e.target.checked)} />
                    {t("admin.surveys.teachers")}
                  </label>
                </div>
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>{t("admin.surveys.description")}</span>
              <input className={styles.input} value={draft.description} onChange={(e) => update("description", e.target.value)} />
            </label>

            <div style={{ display: "grid", gap: 14, marginTop: 6 }}>
              {draft.questions.map((q, qIdx) => (
                <div key={qIdx} style={{ border: "1px solid var(--stroke)", borderRadius: 12, padding: 14, background: "var(--bg-soft)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-strong)" }}>
                      Вопрос #{qIdx + 1}
                    </span>
                    {draft.questions.length > 1 ? (
                      <button type="button" onClick={() => removeQuestion(qIdx)} style={{
                        border: "1px solid var(--stroke)", background: "var(--panel)", borderRadius: 8,
                        padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--danger-strong)",
                      }}>Удалить</button>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
                    <textarea
                      className={styles.textarea}
                      value={q.text}
                      onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                      placeholder="Текст вопроса"
                      style={{ minHeight: 56 }}
                    />
                    <select
                      className={styles.input}
                      value={q.type}
                      onChange={(e) => updateQuestion(qIdx, { type: e.target.value })}
                      style={{ height: 42, alignSelf: "start" }}
                    >
                      <option value="MULTIPLE_CHOICE">С вариантами ответа</option>
                      <option value="TEXT">Открытый ответ</option>
                    </select>
                  </div>

                  {q.type === "MULTIPLE_CHOICE" ? (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                          <input
                            className={styles.input}
                            value={opt}
                            onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Вариант ${optIdx + 1}`}
                          />
                          {q.options.length > 2 ? (
                            <button type="button" onClick={() => removeOption(qIdx, optIdx)} style={{
                              width: 36, height: 42, border: "1px solid var(--stroke)", borderRadius: 8,
                              background: "var(--panel)", cursor: "pointer", color: "var(--muted)", fontSize: 16, fontFamily: "inherit",
                            }}>×</button>
                          ) : null}
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(qIdx)} className={styles.ghostBtn} style={{ height: 36, fontSize: 12 }}>
                        + Добавить вариант
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              <button type="button" onClick={addQuestion} className={styles.ghostBtn} style={{ alignSelf: "start", height: 38, padding: "0 16px" }}>
                + Добавить вопрос
              </button>
            </div>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit" disabled={submitting}>
                {submitting ? t("admin.surveys.publishing") : t("admin.surveys.publish")}
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => { setDraft({ ...defaultDraft }); setMessage(""); setError(""); }}>
                {t("admin.surveys.reset")}
              </button>
            </div>

            {message ? <div className={styles.alertOk}>{message}</div> : null}
            {error ? <div className={styles.alertErr}>{error}</div> : null}
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.surveys.preview")}</h3>
          <div className={styles.pollPreview}>
            <p className={styles.noteMain}>{draft.title || t("admin.surveys.defaultPreviewTitle")}</p>
            {draft.description ? <p className={styles.noteMeta}>{draft.description}</p> : null}
            {draft.questions.map((q, qIdx) => {
              const visible = q.text.trim() || q.options.some((o) => o.trim());
              if (!visible) return null;
              const opts = q.options.filter((o) => o.trim());
              return (
                <div key={qIdx} style={{ marginTop: qIdx === 0 ? 8 : 14, paddingTop: qIdx === 0 ? 0 : 12, borderTop: qIdx === 0 ? "0" : "1px dashed var(--stroke)" }}>
                  <p className={styles.noteMeta} style={{ fontWeight: 700, color: "var(--text)" }}>
                    {qIdx + 1}. {q.text || t("admin.surveys.defaultPreviewQuestion")}
                  </p>
                  {q.type === "TEXT" ? (
                    <div className={styles.pollOption} style={{ fontStyle: "italic", color: "var(--muted)" }}>
                      Открытый ответ
                    </div>
                  ) : opts.length ? (
                    opts.map((item, i) => (
                      <div key={`${qIdx}-${i}-${item}`} className={styles.pollOption}>{item}</div>
                    ))
                  ) : null}
                </div>
              );
            })}
          </div>

          <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>{t("admin.surveys.existing")}</h3>
          {listQuery.loading && !surveys.length ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
          ) : surveys.length ? (
            <ul className={`${styles.noteList} ${styles.scrollList}`}>
              {surveys.map((poll) => (
                <li key={poll.id} className={styles.noteItem}>
                  <span className={styles.noteAvatar} style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-alt))", fontSize: 13 }}>
                    {(poll.questionsCount ?? 0)}
                  </span>
                  <div className={styles.noteBody}>
                    <p className={styles.noteMain}>{poll.title}</p>
                    <p className={styles.noteMeta}>
                      {t("admin.surveys.questionsCount", { count: poll.questionsCount ?? 0 })}
                      {poll.description ? ` • ${poll.description}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                    onClick={() => setResultsSurvey(poll)}
                  >
                    {t("admin.surveys.viewResults")}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("admin.surveys.empty")}</p>
          )}
        </article>
      </section>

      {resultsSurvey ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setResultsSurvey(null); }}>
          <section className={`${styles.modal} ${styles.modalLarge}`} role="dialog" aria-modal="true">
            <header className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{t("admin.surveys.results.title")}</h3>
                <p className={styles.modalSub}>{resultsSurvey.title}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setResultsSurvey(null)}>
                <CloseIcon />
              </button>
            </header>

            {resultsQuery.loading && !results ? (
              <p className={styles.emptyState}>{t("common.loading")}</p>
            ) : resultsQuery.error ? (
              <div className={styles.alertErr}>{resultsQuery.error.message}</div>
            ) : results && Array.isArray(results.questions) && results.questions.length ? (
              <div className={styles.resultsList}>
                {results.questions.map((q) => {
                  const totalCount = (q.options || []).reduce((acc, o) => acc + (o.count || 0), 0)
                    + (Array.isArray(q.textAnswers) ? q.textAnswers.length : 0);
                  const max = Math.max(1, ...(q.options || []).map((o) => o.count || 0));
                  const isText = q.type === "TEXT";
                  return (
                    <article key={q.id} className={styles.resultsQuestion}>
                      <div className={styles.resultsQuestionHead}>
                        <p className={styles.resultsQuestionText}>{q.text}</p>
                        <span className={styles.resultsQuestionMeta}>
                          {t("admin.surveys.results.responses", { count: totalCount })}
                        </span>
                      </div>
                      {isText ? (
                        Array.isArray(q.textAnswers) && q.textAnswers.length ? (
                          <ul className={styles.resultsTextAnswers}>
                            {q.textAnswers.map((a, idx) => (
                              <li key={idx} className={styles.resultsTextItem}>{a}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.emptyState} style={{ padding: 12 }}>{t("admin.surveys.results.noResponses")}</p>
                        )
                      ) : (
                        (q.options || []).map((opt) => {
                          const percent = max > 0 ? Math.round(((opt.count || 0) / max) * 100) : 0;
                          return (
                            <div key={opt.id} className={styles.resultsOption}>
                              <div className={styles.resultsOptionTop}>
                                <span className={styles.resultsOptionLabel}>{opt.text}</span>
                                <span className={styles.resultsOptionCount}>{opt.count || 0}</span>
                              </div>
                              <div className={styles.resultsOptionTrack}>
                                <div className={styles.resultsOptionFill} style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyState}>{t("admin.surveys.results.empty")}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
