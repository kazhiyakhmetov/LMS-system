import { useMemo, useState } from "react";
import styles from "./AdminPages.module.css";

const activePolls = [
  { title: "Оценка качества уроков", audience: "Ученики", responses: 412, status: "live" },
  { title: "Удобство нового расписания", audience: "Родители", responses: 156, status: "live" },
  { title: "Нагрузка по домашним заданиям", audience: "Учителя", responses: 39, status: "draft" },
];

const defaultDraft = {
  title: "",
  audience: "STUDENTS",
  question: "",
  option1: "Полностью согласен",
  option2: "Скорее согласен",
  option3: "Скорее не согласен",
  option4: "Не согласен",
};

export default function AdminSurveyView() {
  const [draft, setDraft] = useState({ ...defaultDraft });
  const [message, setMessage] = useState("");

  const previewOptions = useMemo(() => {
    return [draft.option1, draft.option2, draft.option3, draft.option4].filter(Boolean);
  }, [draft.option1, draft.option2, draft.option3, draft.option4]);

  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("Опрос сохранен. Можно подключать POST /surveys/create.");
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Создание опросов</h2>
          <p className={styles.sectionSub}>
            Публикация опросов для учеников, родителей и учителей с быстрым предпросмотром.
          </p>
        </div>
        <span className={`${styles.pill} ${styles.pillLive}`}>ENGAGEMENT</span>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Новый опрос</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Название</span>
                <input
                  className={styles.input}
                  value={draft.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Например, Опрос по новой системе оценивания"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Целевая аудитория</span>
                <select
                  className={styles.select}
                  value={draft.audience}
                  onChange={(event) => update("audience", event.target.value)}
                >
                  <option value="STUDENTS">Ученики</option>
                  <option value="PARENTS">Родители</option>
                  <option value="TEACHERS">Учителя</option>
                </select>
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Вопрос</span>
              <textarea
                className={styles.textarea}
                value={draft.question}
                onChange={(event) => update("question", event.target.value)}
                placeholder="Сформулируйте основной вопрос опроса"
                required
              />
            </label>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Вариант 1</span>
                <input
                  className={styles.input}
                  value={draft.option1}
                  onChange={(event) => update("option1", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Вариант 2</span>
                <input
                  className={styles.input}
                  value={draft.option2}
                  onChange={(event) => update("option2", event.target.value)}
                />
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Вариант 3</span>
                <input
                  className={styles.input}
                  value={draft.option3}
                  onChange={(event) => update("option3", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Вариант 4</span>
                <input
                  className={styles.input}
                  value={draft.option4}
                  onChange={(event) => update("option4", event.target.value)}
                />
              </label>
            </div>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit">
                Сохранить опрос
              </button>
              <button
                className={styles.ghostBtn}
                type="button"
                onClick={() => {
                  setDraft({ ...defaultDraft });
                  setMessage("");
                }}
              >
                Сбросить форму
              </button>
            </div>

            <p className={styles.hint}>{message || "Предпросмотр справа обновляется в реальном времени."}</p>
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Предпросмотр</h3>
          <div className={styles.pollPreview}>
            <p className={styles.noteMain}>{draft.title || "Новый опрос без названия"}</p>
            <p className={styles.noteMeta}>{draft.question || "Здесь появится формулировка вопроса."}</p>
            {previewOptions.map((item) => (
              <div key={item} className={styles.pollOption}>
                {item}
              </div>
            ))}
          </div>

          <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>
            Активные опросы
          </h3>
          <ul className={styles.noteList}>
            {activePolls.map((poll) => (
              <li key={poll.title} className={styles.noteItem}>
                <p className={styles.noteMain}>
                  {poll.title}{" "}
                  <span className={`${styles.pill} ${poll.status === "live" ? styles.pillLive : styles.pillDraft}`}>
                    {poll.status.toUpperCase()}
                  </span>
                </p>
                <p className={styles.noteMeta}>
                  {poll.audience} • ответов: {poll.responses}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
