import { useMemo, useRef, useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { newsApi } from "../../../../shared/lib/api";
import { getAvatarUrl } from "../../../../shared/lib/utils/avatar";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function inOneWeek() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const defaultDraft = () => ({
  title: "",
  description: "",
  type: "LOCAL",
  startDate: today(),
  endDate: inOneWeek(),
  file: null,
});

function formatDate(value) {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(value);
  }
}

function isExpired(endDate) {
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return end.getTime() < today.getTime();
}

export default function AdminNewsView() {
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState(defaultDraft);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const listQuery = useApi(() => newsApi.adminList(), []);
  const items = useMemo(() => (Array.isArray(listQuery.data) ? listQuery.data : []), [listQuery.data]);

  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setDraft(defaultDraft());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!draft.title.trim()) {
      setError("Введите заголовок новости");
      return;
    }
    if (!draft.startDate || !draft.endDate) {
      setError("Укажите даты начала и окончания");
      return;
    }
    if (new Date(draft.endDate) < new Date(draft.startDate)) {
      setError("Дата окончания не может быть раньше даты начала");
      return;
    }

    setSubmitting(true);
    try {
      await newsApi.adminCreate({
        title: draft.title.trim(),
        description: draft.description.trim(),
        type: draft.type,
        startDate: draft.startDate,
        endDate: draft.endDate,
        file: draft.file || null,
      });
      setMessage("Новость опубликована");
      resetForm();
      await listQuery.refetch();
    } catch (err) {
      setError(err?.message || "Не удалось создать новость");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm("Удалить эту новость?")) return;
    try {
      await newsApi.adminDelete(id);
      await listQuery.refetch();
    } catch (err) {
      setError(err?.message || "Не удалось удалить новость");
    }
  }

  const previewPhoto = draft.file ? URL.createObjectURL(draft.file) : null;

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Новости</h2>
          <p className={styles.sectionSub}>
            Создавайте объявления для учеников, учителей и родителей. Новости автоматически исчезают из ленты,
            когда заканчивается их срок отображения.
          </p>
        </div>
        <span className={`${styles.pill} ${styles.pillLive}`}>АДМИН</span>
      </section>

      <section className={styles.layout}>
        {/* === Форма создания === */}
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Новая новость</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Заголовок</span>
              <input
                className={styles.input}
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Например: День открытых дверей"
                maxLength={255}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Описание</span>
              <textarea
                className={styles.textarea}
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Расскажите подробности — место, время, кого ждём, что взять с собой…"
              />
            </label>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Тип</span>
                <select
                  className={styles.input}
                  value={draft.type}
                  onChange={(e) => update("type", e.target.value)}
                >
                  <option value="LOCAL">LOCAL — только моя школа</option>
                  <option value="GENERAL">GENERAL — общая новость</option>
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Фото обложки (необязательно)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.input}
                  onChange={(e) => update("file", e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Дата начала</span>
                <input
                  type="date"
                  className={styles.input}
                  value={draft.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Дата окончания</span>
                <input
                  type="date"
                  className={styles.input}
                  value={draft.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                  required
                />
              </label>
            </div>

            {previewPhoto ? (
              <div
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  overflow: "hidden",
                  maxHeight: 200,
                }}
              >
                <img
                  src={previewPhoto}
                  alt="Предпросмотр"
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
                />
              </div>
            ) : null}

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit" disabled={submitting}>
                {submitting ? "Публикуем…" : "Опубликовать"}
              </button>
              <button className={styles.ghostBtn} type="button" onClick={resetForm}>
                Сбросить
              </button>
            </div>

            {message ? <div className={styles.alertOk}>{message}</div> : null}
            {error ? <div className={styles.alertErr}>{error}</div> : null}
          </form>
        </article>

        {/* === Список существующих === */}
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Опубликованные новости</h3>

          {listQuery.loading && !items.length ? (
            <p className={styles.emptyState}>Загрузка…</p>
          ) : items.length === 0 ? (
            <p className={styles.emptyState}>
              Пока новостей нет.
              <br />
              <span className={styles.emptyStateHint}>Создайте первую в форме слева.</span>
            </p>
          ) : (
            <ul className={`${styles.noteList} ${styles.scrollList}`}>
              {items.map((post) => {
                const expired = isExpired(post.endDate);
                const photoUrl = post.photoPath ? getAvatarUrl(post.photoPath) : null;
                return (
                  <li key={post.id} className={styles.noteItem}>
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={post.title}
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: "cover",
                          borderRadius: 10,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span
                        className={styles.noteAvatar}
                        style={{ background: "var(--accent)", fontSize: 18 }}
                        aria-hidden="true"
                      >
                        📰
                      </span>
                    )}
                    <div className={styles.noteBody}>
                      <p className={styles.noteMain}>
                        {post.title}
                        <span
                          className={`${styles.pill} ${expired ? styles.pillDraft : styles.pillLive}`}
                          style={{ marginLeft: 8 }}
                        >
                          {expired ? "Истекла" : post.type === "LOCAL" ? "Школьная" : "Общая"}
                        </span>
                      </p>
                      <p className={styles.noteMeta}>
                        {formatDate(post.startDate)} — {formatDate(post.endDate)}
                        {post.description ? ` • ${post.description.slice(0, 80)}${post.description.length > 80 ? "…" : ""}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.iconBtnSmall}
                      onClick={() => handleDelete(post.id)}
                      title="Удалить новость"
                      aria-label="Удалить новость"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
