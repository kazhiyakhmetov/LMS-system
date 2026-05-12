import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { adminApi, schoolsApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

const INITIAL_CLASS_FORM = {
  name: "",
  academicYear: "2025-2026",
  homeroomTeacherId: "",
  language: "",
  active: true,
};

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function AdminClassesView() {
  const { t } = useT();

  const schoolsQuery = useApi(() => schoolsApi.all(), []);
  const schools = useMemo(() => Array.isArray(schoolsQuery.data) ? schoolsQuery.data : [], [schoolsQuery.data]);

  const [schoolId, setSchoolId] = useState("");
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [studentsClass, setStudentsClass] = useState(null);
  const [form, setForm] = useState(INITIAL_CLASS_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!schoolId && schools.length) setSchoolId(String(schools[0].id));
  }, [schools, schoolId]);

  const classesQuery = useApi(
    () => (schoolId ? adminApi.schoolClasses(schoolId) : Promise.resolve([])),
    [schoolId],
    { immediate: Boolean(schoolId) },
  );
  const classes = Array.isArray(classesQuery.data) ? classesQuery.data : [];

  const teachersQuery = useApi(
    () => (schoolId ? adminApi.teachingTeachers(schoolId) : Promise.resolve([])),
    [schoolId],
    { immediate: Boolean(schoolId) },
  );
  const teachers = Array.isArray(teachersQuery.data) ? teachersQuery.data : [];

  const studentsQuery = useApi(
    () => (studentsClass ? adminApi.classStudents(studentsClass.id) : Promise.resolve([])),
    [studentsClass?.id],
    { immediate: Boolean(studentsClass) },
  );
  const classStudents = Array.isArray(studentsQuery.data) ? studentsQuery.data : [];

  const filtered = useMemo(() => {
    return classes.filter((c) =>
      filter === "all" ? true : filter === "active" ? c.active : !c.active,
    );
  }, [classes, filter]);

  const stats = useMemo(() => {
    const total = classes.length;
    const active = classes.filter((c) => c.active).length;
    const archived = total - active;
    const students = classes.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
    return { total, active, archived, students };
  }, [classes]);

  function openCreate() {
    setForm(INITIAL_CLASS_FORM);
    setEditingClass(null);
    setMessage("");
    setError("");
    setCreateOpen(true);
  }

  function openEdit(cls) {
    setForm({
      name: cls.name || "",
      academicYear: cls.academicYear || "2025-2026",
      homeroomTeacherId: cls.homeroomTeacherId ? String(cls.homeroomTeacherId) : "",
      language: cls.language || "",
      active: cls.active,
    });
    setEditingClass(cls);
    setMessage("");
    setError("");
    setCreateOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);
    try {
      if (editingClass) {
        await adminApi.classUpdate(editingClass.id, {
          name: form.name,
          academicYear: form.academicYear,
          active: form.active,
          homeroomTeacherId: form.homeroomTeacherId ? Number(form.homeroomTeacherId) : null,
          language: form.language || null,
        });
        setMessage(t("admin.classes.updated"));
      } else {
        await adminApi.classCreate({
          schoolId: Number(schoolId),
          name: form.name,
          academicYear: form.academicYear,
          homeroomTeacherId: form.homeroomTeacherId ? Number(form.homeroomTeacherId) : null,
          language: form.language || null,
        });
        setMessage(t("admin.classes.created"));
      }
      await classesQuery.refetch();
      setCreateOpen(false);
    } catch (err) {
      setError(err?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveClass(cls) {
    setError("");
    try {
      await adminApi.classArchive(cls.id);
      await classesQuery.refetch();
      setMessage(cls.active ? t("admin.classes.archivedMsg") : t("admin.classes.restoredMsg"));
    } catch (err) {
      setError(err?.message || t("common.error"));
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.classes.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.classes.sub")}</p>
        </div>
        <span className={`${styles.pill} ${styles.pillDraft}`}>{t("roles.ADMIN")}</span>
      </section>

      <section className={styles.statsGrid}>
        <article className={`${styles.statCard} ${styles.toneSky}`}>
          <p className={styles.statLabel}>{t("admin.classes.stats.total")}</p>
          <p className={styles.statValue}>{stats.total}</p>
        </article>
        <article className={`${styles.statCard} ${styles.toneMint}`}>
          <p className={styles.statLabel}>{t("admin.classes.stats.active")}</p>
          <p className={styles.statValue}>{stats.active}</p>
        </article>
        <article className={`${styles.statCard} ${styles.toneGold}`}>
          <p className={styles.statLabel}>{t("admin.classes.stats.archived")}</p>
          <p className={styles.statValue}>{stats.archived}</p>
        </article>
        <article className={`${styles.statCard} ${styles.toneHot}`}>
          <p className={styles.statLabel}>{t("admin.classes.stats.students")}</p>
          <p className={styles.statValue}>{stats.students}</p>
        </article>
      </section>

      <section className={styles.usersHeader}>
        <div className={styles.filtersBar}>
          <label className={styles.field} style={{ flex: 1, maxWidth: 320 }}>
            <span className={styles.label}>{t("admin.classes.school")}</span>
            <select className={styles.select} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "flex-end" }}>
            <button
              type="button"
              className={`${styles.filterChip} ${filter === "all" ? styles.filterChipActive : ""}`}
              onClick={() => setFilter("all")}
            >
              {t("admin.classes.allFilter")}
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter === "active" ? styles.filterChipActive : ""}`}
              onClick={() => setFilter("active")}
            >
              {t("admin.classes.activeFilter")}
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter === "archived" ? styles.filterChipActive : ""}`}
              onClick={() => setFilter("archived")}
            >
              {t("admin.classes.archivedFilter")}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={openCreate} style={{ height: 36 }}>
              + {t("admin.classes.addNew")}
            </button>
          </div>
        </div>

        {message ? <div className={styles.alertOk}>{message}</div> : null}
        {error ? <div className={styles.alertErr}>{error}</div> : null}
      </section>

      {classesQuery.loading && !classes.length ? (
        <p className={styles.emptyState}>{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <div className={styles.formCard}>
          <p className={styles.emptyState}>{t("admin.classes.empty")}</p>
        </div>
      ) : (
        <section className={styles.classGrid}>
          {filtered.map((cls) => (
            <article
              key={cls.id}
              className={`${styles.classCard} ${!cls.active ? styles.classCardArchived : ""}`}
            >
              <div className={styles.classCardHead}>
                <div>
                  <h3 className={styles.classCardTitle}>
                    {cls.name}
                    {cls.language ? (
                      <span style={{
                        marginLeft: 8, padding: "2px 8px", borderRadius: 999,
                        background: "var(--accent-soft)", color: "var(--accent-strong)",
                        fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
                        verticalAlign: "middle",
                      }}>{cls.language}</span>
                    ) : null}
                  </h3>
                  <p className={styles.classCardYear}>{cls.academicYear}</p>
                </div>
                <span className={`${styles.classCardStatus} ${cls.active ? styles.classCardStatusActive : styles.classCardStatusArchived}`}>
                  {cls.active ? t("admin.classes.active") : t("admin.classes.archived")}
                </span>
              </div>

              <div className={styles.classCardMetrics}>
                <div className={styles.classCardMetric}>
                  <span className={styles.classCardMetricLabel}>{t("admin.classes.students")}</span>
                  <span className={styles.classCardMetricValue}>{cls.studentsCount || 0}</span>
                </div>
                <div className={styles.classCardMetric}>
                  <span className={styles.classCardMetricLabel}>{t("admin.classes.homeroomTeacher")}</span>
                  <span className={styles.classCardMetricValue} style={{ fontSize: 13, fontWeight: 600 }}>
                    {cls.homeroomTeacherFullName || t("admin.classes.noTeacher")}
                  </span>
                </div>
              </div>

              <div className={styles.classCardActions}>
                <button type="button" onClick={() => setStudentsClass(cls)}>{t("admin.classes.classDetails")}</button>
                <button type="button" onClick={() => openEdit(cls)}>{t("common.edit")}</button>
                <button
                  type="button"
                  className={cls.active ? styles.archiveBtn : styles.restoreBtn}
                  onClick={() => archiveClass(cls)}
                >
                  {cls.active ? t("admin.classes.archive") : t("admin.classes.restore")}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {createOpen ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <section className={styles.modal} role="dialog" aria-modal="true">
            <header className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>
                  {editingClass ? t("admin.classes.edit") : t("admin.classes.addNew")}
                </h3>
                <p className={styles.modalSub}>{schools.find((s) => String(s.id) === schoolId)?.name}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setCreateOpen(false)}>
                <CloseIcon />
              </button>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} style={{ marginTop: 0 }}>
              <div className={styles.fieldGrid2}>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.classes.name")}</span>
                  <input className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="10А" />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.classes.academicYear")}</span>
                  <input className={styles.input} value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required placeholder="2025-2026" />
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>{t("admin.classes.homeroomTeacher")}</span>
                <select className={styles.select} value={form.homeroomTeacherId} onChange={(e) => setForm({ ...form, homeroomTeacherId: e.target.value })}>
                  <option value="">{t("admin.classes.noTeacher")}</option>
                  {teachers.map((tt) => (
                    <option key={tt.teacherId ?? tt.userId} value={tt.teacherId ?? tt.userId}>
                      {tt.fullName || tt.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Язык обучения</span>
                <select
                  className={styles.select}
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                >
                  <option value="">Не указан</option>
                  <option value="RU">Русский</option>
                  <option value="KZ">Қазақ</option>
                  <option value="EN">English</option>
                </select>
              </label>

              {editingClass ? (
                <label className={styles.field} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
                  />
                  <span className={styles.label} style={{ margin: 0 }}>{t("admin.classes.active")}</span>
                </label>
              ) : null}

              {error ? <div className={styles.alertErr}>{error}</div> : null}

              <div className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={() => setCreateOpen(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {studentsClass ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setStudentsClass(null); }}>
          <section className={`${styles.modal} ${styles.modalLarge}`} role="dialog" aria-modal="true">
            <header className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{studentsClass.name}</h3>
                <p className={styles.modalSub}>
                  {t("admin.classes.classDetails")} • {studentsClass.studentsCount || 0}
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setStudentsClass(null)}>
                <CloseIcon />
              </button>
            </header>

            {studentsQuery.loading && !classStudents.length ? (
              <p className={styles.emptyState}>{t("common.loading")}</p>
            ) : classStudents.length ? (
              <ul className={styles.noteList}>
                {classStudents.map((s) => {
                  const initials = (s.fullName || "?").split(" ").slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
                  return (
                    <li key={s.studentId ?? s.userId} className={styles.noteItem}>
                      <span className={styles.noteAvatar} style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-alt))" }}>
                        {initials}
                      </span>
                      <div className={styles.noteBody}>
                        <p className={styles.noteMain}>{s.fullName}</p>
                        <p className={styles.noteMeta}>{s.email}</p>
                      </div>
                      <span className={styles.noteEnd}>#{s.studentId ?? s.userId}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptyState}>{t("admin.classes.noStudents")}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
