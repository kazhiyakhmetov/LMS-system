import { useState } from "react";
import { quizzesApi } from "../../lib/api";
import styles from "./AIQuizGenerator.module.css";

/**
 * Reusable AI quiz/test generator modal.
 *
 * Props:
 *   open               — controls visibility
 *   onClose            — callback to close modal
 *   role               — "student" | "teacher"
 *   onSaved(quiz)      — called after the quiz is created with all questions
 *
 * Behavior:
 *   1. User types title + paragraph + N questions + difficulty
 *   2. "Сгенерировать" → calls /quiz/generate-ai
 *   3. Editable list of questions (text, options, correct option)
 *   4. "Создать с этими вопросами" → calls create + addQuestion bulk
 */
export default function AIQuizGenerator({ open, onClose, role = "student", onSaved }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [n, setN] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("input"); // input | generating | review | saving
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null); // { questions: [...] }

  if (!open) return null;

  const minimal = !title.trim() || text.trim().length < 20;

  function close() {
    if (busy) return;
    setTitle(""); setText(""); setN(5); setDifficulty("medium");
    setPhase("input"); setDraft(null); setError("");
    onClose?.();
  }

  async function generate() {
    setBusy(true); setError(""); setPhase("generating");
    try {
      const fn = role === "teacher" ? quizzesApi.teacherGenerateAi : quizzesApi.studentGenerateAi;
      const res = await fn({ text: text.trim(), nQuestions: n, difficulty });
      const qs = Array.isArray(res?.questions) ? res.questions : [];
      if (!qs.length) {
        setError("ИИ не вернул вопросов — попробуй другой текст.");
        setPhase("input");
        return;
      }
      setDraft(res);
      setPhase("review");
    } catch (e) {
      setError(e?.message || "Ошибка генерации");
      setPhase("input");
    } finally {
      setBusy(false);
    }
  }

  function updateQuestion(qid, patch) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    }));
  }

  function updateOption(qid, idx, value) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => {
        if (q.id !== qid) return q;
        const opts = [...q.options];
        opts[idx] = value;
        return { ...q, options: opts };
      }),
    }));
  }

  function removeQuestion(qid) {
    setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== qid) }));
  }

  async function save() {
    if (!draft || !draft.questions.length) return;
    if (!title.trim()) { setError("Укажи название"); return; }
    setBusy(true); setError(""); setPhase("saving");
    try {
      const created = role === "teacher"
        ? await quizzesApi.teacherCreate({ title: title.trim(), description: `ИИ-сгенерировано из текста (${draft.model})` })
        : await quizzesApi.studentCreate({ title: title.trim(), description: `ИИ-сгенерировано из текста (${draft.model})` });

      const addFn = role === "teacher"
        ? (qid, body) => quizzesApi.teacherAddQuestion(qid, body)
        : (qid, body) => quizzesApi.studentAddQuestion(qid, body);

      let added = 0;
      for (let i = 0; i < draft.questions.length; i++) {
        const q = draft.questions[i];
        const goodOpts = q.options.map((s) => String(s || "").trim()).filter(Boolean);
        if (!q.q?.trim() || goodOpts.length < 2) continue;
        const correctIdx = Math.max(0, Math.min(goodOpts.length - 1, Number(q.correctIdx) || 0));
        const body = {
          questionText: q.q.trim(),
          questionType: "SINGLE_CHOICE",
          points: 1,
          orderIndex: i,
          options: goodOpts.map((o, j) => ({
            optionText: o, isCorrect: j === correctIdx, orderIndex: j,
          })),
        };
        try {
          await addFn(created.id, body);
          added++;
        } catch (err) {
          console.warn("addQuestion failed:", err);
        }
      }

      onSaved?.({ quiz: created, added });
      close();
    } catch (e) {
      setError(e?.message || "Не удалось сохранить");
      setPhase("review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={styles.modal}>
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>
              <span className={styles.aiBadge}>AI</span>
              {role === "teacher" ? "Генератор тестов" : "Генератор квизов"}
            </p>
            <p className={styles.sub}>Локальная модель Qwen 2.5 (3B) — на твоём сервере, без внешних API.</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={close} disabled={busy}>×</button>
        </header>

        {phase === "input" || phase === "generating" ? (
          <div className={styles.body}>
            <label className={styles.label}>Название {role === "teacher" ? "теста" : "квиза"}
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Квадратные уравнения · базовый"
                disabled={busy}
              />
            </label>

            <label className={styles.label}>Текст-источник (параграф / тема для генерации)
              <textarea
                className={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Вставь параграф из учебника или своими словами опиши тему..."
                rows={6}
                disabled={busy}
              />
              <small className={styles.help}>{text.length} символов · минимум 20</small>
            </label>

            <div className={styles.row}>
              <label className={styles.label} style={{ flex: 1 }}>Сколько вопросов
                <input
                  className={styles.input}
                  type="number"
                  min={2}
                  max={10}
                  value={n}
                  onChange={(e) => setN(Math.max(2, Math.min(10, Number(e.target.value) || 5)))}
                  disabled={busy}
                />
              </label>
              <label className={styles.label} style={{ flex: 1 }}>Сложность
                <select className={styles.input} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={busy}>
                  <option value="easy">Лёгкий</option>
                  <option value="medium">Средний</option>
                  <option value="hard">Сложный</option>
                </select>
              </label>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            {phase === "generating" ? (
              <p className={styles.generating}>
                ИИ-модель генерирует вопросы... обычно 30-60 секунд на CPU. Не закрывай окно.
              </p>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={close} disabled={busy}>Отмена</button>
              <button type="button" className={styles.btnPrimary} onClick={generate} disabled={busy || minimal}>
                {phase === "generating" ? "Генерирую..." : "✨ Сгенерировать"}
              </button>
            </div>
          </div>
        ) : null}

        {phase === "review" || phase === "saving" ? (
          <div className={styles.body}>
            <p className={styles.help} style={{ marginBottom: 12 }}>
              ИИ предложил <b>{draft?.questions?.length}</b> {role === "teacher" ? "вопросов" : "вопросов"}.
              Проверь и поправь, если нужно. Правильный вариант обведён зелёным.
            </p>

            <ol className={styles.qList}>
              {draft.questions.map((q, qi) => (
                <li key={q.id} className={styles.qCard}>
                  <header className={styles.qHead}>
                    <span className={styles.qIdx}>{qi + 1}</span>
                    <input
                      className={styles.input}
                      value={q.q}
                      onChange={(e) => updateQuestion(q.id, { q: e.target.value })}
                      disabled={busy}
                    />
                    <button type="button" className={styles.removeBtn} onClick={() => removeQuestion(q.id)} disabled={busy} title="Удалить вопрос">×</button>
                  </header>

                  <ul className={styles.optList}>
                    {q.options.map((opt, oi) => (
                      <li key={oi} className={`${styles.optItem} ${oi === q.correctIdx ? styles.optCorrect : ""}`}>
                        <button
                          type="button"
                          className={`${styles.markBtn} ${oi === q.correctIdx ? styles.markBtnActive : ""}`}
                          onClick={() => updateQuestion(q.id, { correctIdx: oi })}
                          disabled={busy}
                          title="Отметить как правильный"
                        >
                          {oi === q.correctIdx ? "✓" : ""}
                        </button>
                        <input
                          className={styles.optInput}
                          value={opt}
                          onChange={(e) => updateOption(q.id, oi, e.target.value)}
                          disabled={busy}
                        />
                      </li>
                    ))}
                  </ul>

                  {q.explanation ? (
                    <p className={styles.explanation}>💡 {q.explanation}</p>
                  ) : null}
                </li>
              ))}
            </ol>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={() => setPhase("input")} disabled={busy}>← Изменить запрос</button>
              <button type="button" className={styles.btnPrimary} onClick={save} disabled={busy || !draft?.questions?.length}>
                {phase === "saving" ? "Сохранение..." : `Создать ${role === "teacher" ? "тест" : "квиз"}`}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
