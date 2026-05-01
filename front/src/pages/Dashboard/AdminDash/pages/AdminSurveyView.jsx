import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const defaultDraft = {
  title: "",
  description: "",
  forStudents: true,
  forTeachers: false,
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
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

  const previewOptions = useMemo(
    () => [draft.option1, draft.option2, draft.option3, draft.option4].filter((s) => s && s.trim()),
    [draft.option1, draft.option2, draft.option3, draft.option4],
  );

  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!draft.title.trim() || !draft.question.trim()) {
      setError(t("admin.surveys.validation"));
      return;
    }
    setSubmitting(true);
    try {
      await surveysApi.adminCreate({
        title: draft.title,
        description: draft.description || draft.question,
        forStudents: draft.forStudents,
        forTeachers: draft.forTeachers,
        questions: [
          {
            text: draft.question,
            type: "MULTIPLE_CHOICE",
            options: previewOptions,
          },
        ],
      });
      setMessage(t("admin.surveys.success"));
      setDraft({ ...defaultDraft });
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

            <label className={styles.field}>
              <span className={styles.label}>{t("admin.surveys.question")}</span>
              <textarea className={styles.textarea} value={draft.question} onChange={(e) => update("question", e.target.value)} required />
            </label>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.surveys.option")} 1</span>
                <input className={styles.input} value={draft.option1} onChange={(e) => update("option1", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.surveys.option")} 2</span>
                <input className={styles.input} value={draft.option2} onChange={(e) => update("option2", e.target.value)} />
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.surveys.option")} 3</span>
                <input className={styles.input} value={draft.option3} onChange={(e) => update("option3", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.surveys.option")} 4</span>
                <input className={styles.input} value={draft.option4} onChange={(e) => update("option4", e.target.value)} />
              </label>
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
            <p className={styles.noteMeta}>{draft.question || t("admin.surveys.defaultPreviewQuestion")}</p>
            {previewOptions.map((item, i) => (
              <div key={`${i}-${item}`} className={styles.pollOption}>{item}</div>
            ))}
          </div>

          <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>{t("admin.surveys.existing")}</h3>
          {listQuery.loading && !surveys.length ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
          ) : surveys.length ? (
            <ul className={styles.noteList}>
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
