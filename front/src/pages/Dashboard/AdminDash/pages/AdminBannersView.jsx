import { useMemo, useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { bannersApi } from "../../../../shared/lib/api";

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
  message: "",
  linkUrl: "",
  linkLabel: "",
  forStudents: true,
  forTeachers: false,
  forParents: false,
  startDate: today(),
  endDate: inOneWeek(),
  severity: "INFO",
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
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return end.getTime() < t.getTime();
}

function audienceLabel(b) {
  const parts = [];
  if (b.forStudents) parts.push("Студенты");
  if (b.forTeachers) parts.push("Учителя");
  if (b.forParents) parts.push("Родители");
  return parts.length ? parts.join(" • ") : "—";
}

function severityLabel(s) {
  switch ((s || "INFO").toUpperCase()) {
    case "WARNING": return "Предупреждение";
    case "SUCCESS": return "Успех";
    case "INFO":
    default: return "Информация";
  }
}

export default function AdminBannersView() {
  const [draft, setDraft] = useState(defaultDraft);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const listQuery = useApi(() => bannersApi.adminList(), []);
  const items = useMemo(() => (Array.isArray(listQuery.data) ? listQuery.data : []), [listQuery.data]);

  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setDraft(defaultDraft());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!draft.title.trim()) {
      setError("Введите заголовок уведомления");
      return;
    }
    if (!draft.message.trim()) {
      setError("Введите текст уведомления");
      return;
    }
    if (!draft.forStudents && !draft.forTeachers && !draft.forParents) {
      setError("Выберите хотя бы одну аудиторию");
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
      await bannersApi.adminCreate({
        title: draft.title.trim(),
        message: draft.message.trim(),
        linkUrl: draft.linkUrl.trim() || null,
        linkLabel: draft.linkLabel.trim() || null,
        forStudents: !!draft.forStudents,
        forTeachers: !!draft.forTeachers,
        forParents: !!draft.forParents,
        startDate: draft.startDate,
        endDate: draft.endDate,
        severity: draft.severity || "INFO",
      });
      setMessage("Уведомление опубликовано");
      resetForm();
      await listQuery.refetch();
    } catch (err) {
      setError(err?.message || "Не удалось создать уведомление");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm("Удалить это уведомление?")) return;
    try {
      await bannersApi.adminDelete(id);
      await listQuery.refetch();
    } catch (err) {
      setError(err?.message || "Не удалось удалить уведомление");
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Уведомления</h2>
          <p className={styles.sectionSub}>
            Создавайте баннеры-уведомления, которые показываются сверху страницы выбранной аудитории.
            После даты окончания баннер автоматически исчезнет из ленты, но останется в архиве.
          </p>
        </div>
        <span className={`${styles.pill} ${styles.pillLive}`}>АДМИН</span>
      </section>

      <section className={styles.layout}>
        {/* === Форма создания === */}
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Новое уведомление</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Заголовок</span>
              <input
                className={styles.input}
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Например: Профилактические работы в системе"
                maxLength={255}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Текст</span>
              <textarea
                className={styles.textarea}
                value={draft.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Кратко опишите суть: что, где, когда…"
                required
              />
            </label>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Ссылка (необязательно)</span>
                <input
                  type="url"
                  className={styles.input}
                  value={draft.linkUrl}
                  onChange={(e) => update("linkUrl", e.target.value)}
                  placeholder="https://…"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Текст ссылки</span>
                <input
                  type="text"
                  className={styles.input}
                  value={draft.linkLabel}
                  onChange={(e) => update("linkLabel", e.target.value)}
                  placeholder="Подробнее"
                  maxLength={255}
                />
              </label>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Аудитория</span>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={draft.forStudents}
                    onChange={(e) => update("forStudents", e.target.checked)}
                  />
                  Студенты
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={draft.forTeachers}
                    onChange={(e) => update("forTeachers", e.target.checked)}
                  />
                  Учителя
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={draft.forParents}
                    onChange={(e) => update("forParents", e.target.checked)}
                  />
                  Родители
                </label>
              </div>
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

            <label className={styles.field}>
              <span className={styles.label}>Тип (цвет баннера)</span>
              <select
                className={styles.input}
                value={draft.severity}
                onChange={(e) => update("severity", e.target.value)}
              >
                <option value="INFO">INFO — информация (emerald)</option>
                <option value="WARNING">WARNING — предупреждение (amber)</option>
                <option value="SUCCESS">SUCCESS — успех (mint)</option>
              </select>
            </label>

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

        {/* === Список баннеров === */}
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Все уведомления</h3>

          {listQuery.loading && !items.length ? (
            <p className={styles.emptyState}>Загрузка…</p>
          ) : items.length === 0 ? (
            <p className={styles.emptyState}>
              Пока уведомлений нет.
              <br />
              <span className={styles.emptyStateHint}>Создайте первое в форме слева.</span>
            </p>
          ) : (
            <ul className={`${styles.noteList} ${styles.scrollList}`}>
              {items.map((b) => {
                const expired = isExpired(b.endDate);
                return (
                  <li key={b.id} className={styles.noteItem}>
                    <span
                      className={styles.noteAvatar}
                      style={{ background: "var(--accent)", fontSize: 18 }}
                      aria-hidden="true"
                    >
                      🔔
                    </span>
                    <div className={styles.noteBody}>
                      <p className={styles.noteMain}>
                        {b.title}
                        <span
                          className={`${styles.pill} ${expired ? styles.pillDraft : styles.pillLive}`}
                          style={{ marginLeft: 8 }}
                        >
                          {expired ? "Истекло" : severityLabel(b.severity)}
                        </span>
                      </p>
                      <p className={styles.noteMeta}>
                        {formatDate(b.startDate)} — {formatDate(b.endDate)} • {audienceLabel(b)}
                      </p>
                      {b.message ? (
                        <p className={styles.noteMeta} style={{ marginTop: 2 }}>
                          {b.message.slice(0, 140)}{b.message.length > 140 ? "…" : ""}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={styles.iconBtnSmall}
                      onClick={() => handleDelete(b.id)}
                      title="Удалить уведомление"
                      aria-label="Удалить уведомление"
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
