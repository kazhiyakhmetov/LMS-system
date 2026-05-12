import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherExamsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { examMaterialsApi, schoolsApi } from "../../../../shared/lib/api";

const LANGUAGES = [
  { value: "RU", label: "Русский" },
  { value: "KZ", label: "Қазақша" },
  { value: "EN", label: "English" },
];

const QUARTERS = [1, 2, 3, 4];

const TYPES = [
  { value: "SOR", label: "СОР" },
  { value: "SOCH", label: "СОЧ" },
];

const TAB_MY = "my";
const TAB_CATALOG = "catalog";

function languageLabel(code) {
  return LANGUAGES.find((l) => l.value === code)?.label || code || "—";
}

function typeLabel(code) {
  return TYPES.find((t) => t.value === code)?.label || code || "—";
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

async function downloadById(id) {
  try {
    const res = await examMaterialsApi.download(id);
    if (!res.ok) {
      throw new Error("Не удалось скачать файл");
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="?([^";]+)"?/i);
    const fileName = match ? decodeURIComponent(match[1]) : `material_${id}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    alert(err?.message || "Ошибка скачивания");
  }
}

export default function TeacherExamsPage() {
  const [tab, setTab] = useState(TAB_MY);
  const [filters, setFilters] = useState({ subjectId: "", language: "", quarter: "", type: "" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "SOR",
    subjectId: "",
    language: "RU",
    quarter: "1",
    description: "",
    isPublic: false,
    file: null,
  });

  const subjectsQuery = useApi(() => schoolsApi.subjects(), []);
  const subjects = useMemo(() => (Array.isArray(subjectsQuery.data) ? subjectsQuery.data : []), [subjectsQuery.data]);

  const myQuery = useApi(() => examMaterialsApi.my(), []);

  const catalogQuery = useApi(
    () => examMaterialsApi.catalog({
      subjectId: filters.subjectId || undefined,
      language: filters.language || undefined,
      quarter: filters.quarter || undefined,
      type: filters.type || undefined,
    }),
    [filters.subjectId, filters.language, filters.quarter, filters.type],
  );

  const myList = useMemo(() => (Array.isArray(myQuery.data) ? myQuery.data : []), [myQuery.data]);
  const catalogList = useMemo(() => (Array.isArray(catalogQuery.data) ? catalogQuery.data : []), [catalogQuery.data]);

  function resetForm() {
    setForm({
      title: "",
      type: "SOR",
      subjectId: subjects[0]?.id ? String(subjects[0].id) : "",
      language: "RU",
      quarter: "1",
      description: "",
      isPublic: false,
      file: null,
    });
    setCreateError("");
  }

  function openCreate() {
    resetForm();
    setIsCreateOpen(true);
  }

  function closeCreate() {
    setIsCreateOpen(false);
    setCreateError("");
  }

  useEffect(() => {
    if (subjects.length && !form.subjectId) {
      setForm((prev) => ({ ...prev, subjectId: String(subjects[0].id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    setCreateError("");

    const title = form.title.trim();
    if (!title) { setCreateError("Введите название"); return; }
    if (!form.subjectId) { setCreateError("Выберите предмет"); return; }
    if (!form.type) { setCreateError("Выберите тип"); return; }
    if (!form.language) { setCreateError("Выберите язык"); return; }
    if (!form.quarter) { setCreateError("Выберите четверть"); return; }

    setCreateSubmitting(true);
    try {
      await examMaterialsApi.create({
        title,
        type: form.type,
        subjectId: Number(form.subjectId),
        language: form.language,
        quarter: Number(form.quarter),
        description: form.description.trim(),
        isPublic: form.isPublic,
        file: form.file,
      });
      closeCreate();
      await myQuery.refetch();
      if (form.isPublic) await catalogQuery.refetch();
    } catch (err) {
      setCreateError(err?.message || "Не удалось создать материал");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleLike(id) {
    try {
      await examMaterialsApi.toggleLike(id);
      if (tab === TAB_MY) await myQuery.refetch();
      else await catalogQuery.refetch();
    } catch (err) {
      alert(err?.message || "Не удалось поставить лайк");
    }
  }

  async function handleShare(id) {
    if (!window.confirm("Опубликовать материал в открытый каталог?")) return;
    try {
      await examMaterialsApi.share(id);
      await myQuery.refetch();
      await catalogQuery.refetch();
    } catch (err) {
      alert(err?.message || "Ошибка публикации");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Удалить материал? Это действие необратимо.")) return;
    try {
      await examMaterialsApi.remove(id);
      await myQuery.refetch();
      await catalogQuery.refetch();
    } catch (err) {
      alert(err?.message || "Ошибка удаления");
    }
  }

  const list = tab === TAB_MY ? myList : catalogList;
  const listLoading = tab === TAB_MY ? myQuery.loading : catalogQuery.loading;

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>СОР и СОЧ</h2>
          <p className={styles.sub}>
            Создавайте контрольные работы и срезы, делитесь ими в открытом каталоге школы.
            СОР — суммативное оценивание раздела, СОЧ — суммативное оценивание четверти.
          </p>
        </div>
        <button type="button" className={styles.createBtn} onClick={openCreate}>
          + Создать
        </button>
      </section>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === TAB_MY ? styles.tabActive : ""}`}
          onClick={() => setTab(TAB_MY)}
        >
          Мои материалы
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === TAB_CATALOG ? styles.tabActive : ""}`}
          onClick={() => setTab(TAB_CATALOG)}
        >
          Каталог школы
        </button>
      </div>

      {tab === TAB_CATALOG ? (
        <section className={styles.filterPanel}>
          <select
            className={styles.select}
            value={filters.subjectId}
            onChange={(e) => setFilters((prev) => ({ ...prev, subjectId: e.target.value }))}
          >
            <option value="">Все предметы</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filters.language}
            onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
          >
            <option value="">Все языки</option>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filters.quarter}
            onChange={(e) => setFilters((prev) => ({ ...prev, quarter: e.target.value }))}
          >
            <option value="">Все четверти</option>
            {QUARTERS.map((q) => (
              <option key={q} value={q}>{q} четверть</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value="">Все типы</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </section>
      ) : null}

      {listLoading && !list.length ? (
        <div className={styles.emptyState}>Загрузка…</div>
      ) : list.length ? (
        <section className={styles.list}>
          {list.map((m) => {
            const isMine = tab === TAB_MY;
            return (
              <article key={m.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={`${styles.typeBadge} ${m.type === "SOCH" ? styles.typeSoch : styles.typeSor}`}>
                    {typeLabel(m.type)}
                  </span>
                  {isMine ? (
                    <span className={m.isPublic ? styles.publicTag : styles.privateTag}>
                      {m.isPublic ? "В каталоге" : "Только мне"}
                    </span>
                  ) : null}
                </div>

                <h3 className={styles.cardTitle}>{m.title}</h3>

                <div className={styles.metaRow}>
                  <span className={styles.metaChip}>{m.subjectName || "—"}</span>
                  <span className={styles.metaChip}>{languageLabel(m.language)}</span>
                  <span className={styles.metaChip}>{m.quarter} четв.</span>
                </div>

                {m.description ? (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                    {m.description.length > 140 ? `${m.description.slice(0, 140)}…` : m.description}
                  </p>
                ) : null}

                <p className={styles.author}>
                  {tab === TAB_CATALOG ? `Автор: ${m.authorName || "—"} • ` : ""}
                  {formatDate(m.createdAt)}
                </p>

                <div className={styles.statsRow}>
                  <span>♥ {m.likeCount ?? 0}</span>
                  <span>⬇ {m.downloadCount ?? 0}</span>
                </div>

                <div className={styles.cardActions}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${m.likedByMe ? styles.iconBtnLiked : ""}`}
                      onClick={() => handleLike(m.id)}
                      title="Лайк"
                    >
                      {m.likedByMe ? "♥" : "♡"} {m.likeCount ?? 0}
                    </button>
                    {m.hasFile ? (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => downloadById(m.id)}
                        title="Скачать"
                      >
                        ⬇ Скачать
                      </button>
                    ) : null}
                  </div>
                  {isMine ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {!m.isPublic ? (
                        <button type="button" className={styles.shareBtn} onClick={() => handleShare(m.id)}>
                          Опубликовать
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => handleDelete(m.id)}
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className={styles.emptyState}>
          {tab === TAB_MY
            ? "У вас пока нет созданных СОР/СОЧ. Нажмите «Создать»."
            : "В каталоге пока ничего нет под выбранные фильтры."}
        </div>
      )}

      {isCreateOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeCreate(); }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>Новый СОР / СОЧ</h3>
              <button type="button" className={styles.closeBtn} onClick={closeCreate}>×</button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <input
                className={styles.formInput}
                placeholder="Название (например: СОР по разделу 1 — «Алгебраические дроби»)"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />

              <div className={styles.formRow}>
                <select
                  className={styles.formInput}
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <select
                  className={styles.formInput}
                  value={form.subjectId}
                  onChange={(e) => setForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                >
                  <option value="">— Выберите предмет —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <select
                  className={styles.formInput}
                  value={form.language}
                  onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <select
                  className={styles.formInput}
                  value={form.quarter}
                  onChange={(e) => setForm((prev) => ({ ...prev, quarter: e.target.value }))}
                >
                  {QUARTERS.map((q) => (
                    <option key={q} value={q}>{q} четверть</option>
                  ))}
                </select>
              </div>

              <textarea
                className={styles.formTextarea}
                placeholder="Описание материала (темы, сложность, рекомендации)"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />

              <label className={styles.fileField}>
                <span className={styles.fileLabel}>Прикрепить файл</span>
                <span className={styles.fileName}>
                  {form.file ? form.file.name : "PDF / DOC / DOCX / JPG / PNG, до 5 МБ"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                />
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                />
                Опубликовать в открытый каталог школы
              </label>

              {createError ? <p className={styles.formError}>{createError}</p> : null}

              <button type="submit" className={styles.submitBtn} disabled={createSubmitting}>
                {createSubmitting ? "Сохранение…" : "Создать"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
