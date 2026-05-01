import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { adminApi, schoolsApi } from "../../../../shared/lib/api";
import { formatDayMonth } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const INITIAL = { teacherId: "", classId: "", subjectId: "" };

export default function AdminTeachingView() {
  const { t } = useT();

  const schoolsQuery = useApi(() => schoolsApi.all(), []);
  const subjectsQuery = useApi(() => schoolsApi.subjects(), []);

  const schools = useMemo(() => Array.isArray(schoolsQuery.data) ? schoolsQuery.data : [], [schoolsQuery.data]);
  const subjects = Array.isArray(subjectsQuery.data) ? subjectsQuery.data : [];

  const [schoolId, setSchoolId] = useState("");
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!schoolId && schools.length) setSchoolId(String(schools[0].id));
  }, [schools, schoolId]);

  const teachersQuery = useApi(
    () => (schoolId ? adminApi.teachingTeachers(schoolId) : Promise.resolve([])),
    [schoolId],
    { immediate: Boolean(schoolId) },
  );
  const classesQuery = useApi(
    () => (schoolId ? schoolsApi.classes(schoolId) : Promise.resolve([])),
    [schoolId],
    { immediate: Boolean(schoolId) },
  );
  const assignmentsQuery = useApi(
    () => (schoolId ? adminApi.teachingAssignments(schoolId) : Promise.resolve([])),
    [schoolId],
    { immediate: Boolean(schoolId) },
  );

  const teachers = Array.isArray(teachersQuery.data) ? teachersQuery.data : [];
  const classes = Array.isArray(classesQuery.data) ? classesQuery.data : [];
  const assignments = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];

  const stats = useMemo(() => {
    const teacherIds = new Set();
    const subjectIds = new Set();
    let active = 0;
    assignments.forEach((a) => {
      teacherIds.add(a.teacherId);
      subjectIds.add(a.subjectId);
      if (a.active) active += 1;
    });
    return {
      total: assignments.length,
      active,
      teachers: teacherIds.size,
      subjects: subjectIds.size,
    };
  }, [assignments]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!form.teacherId || !form.classId || !form.subjectId) {
      setError(t("admin.teaching.validation"));
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createTeachingAssignment({
        teacherId: Number(form.teacherId),
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
      });
      setMessage(t("admin.teaching.created"));
      setForm(INITIAL);
      await assignmentsQuery.refetch();
    } catch (err) {
      setError(err?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAssignment(id) {
    setError("");
    try {
      await adminApi.deleteTeachingAssignment(id);
      setMessage(t("admin.teaching.removed"));
      await assignmentsQuery.refetch();
    } catch (err) {
      setError(err?.message || t("common.error"));
    }
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.teaching.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.teaching.sub")}</p>
        </div>
        <span className={`${styles.pill} ${styles.pillDraft}`}>{t("roles.ADMIN")}</span>
      </section>

      <section className={styles.statsGrid}>
        <article className={`${styles.statCard} ${styles.toneSky}`}>
          <p className={styles.statLabel}>{t("admin.teaching.stats.total")}</p>
          <p className={styles.statValue}>{stats.total}</p>
        </article>
        <article className={`${styles.statCard} ${styles.toneMint}`}>
          <p className={styles.statLabel}>{t("admin.teaching.stats.active")}</p>
          <p className={styles.statValue}>{stats.active}</p>
        </article>
        <article className={`${styles.statCard} ${styles.toneGold}`}>
          <p className={styles.statLabel}>{t("admin.teaching.stats.teachers")}</p>
          <p className={styles.statValue}>{stats.teachers}</p>
        </article>
        <article className={`${styles.statCard} ${styles.toneHot}`}>
          <p className={styles.statLabel}>{t("admin.teaching.stats.subjects")}</p>
          <p className={styles.statValue}>{stats.subjects}</p>
        </article>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.teaching.assignNew")}</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>{t("admin.teaching.school")}</span>
              <select className={styles.select} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{t("admin.teaching.teacher")}</span>
              <select className={styles.select} value={form.teacherId} onChange={(e) => update("teacherId", e.target.value)} required>
                <option value="">{t("common.select")}</option>
                {teachers.map((tt) => (
                  <option key={tt.teacherId ?? tt.userId} value={tt.teacherId ?? tt.userId}>
                    {tt.fullName || tt.email}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.teaching.class")}</span>
                <select className={styles.select} value={form.classId} onChange={(e) => update("classId", e.target.value)} required>
                  <option value="">{t("common.select")}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.teaching.subject")}</span>
                <select className={styles.select} value={form.subjectId} onChange={(e) => update("subjectId", e.target.value)} required>
                  <option value="">{t("common.select")}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                {submitting ? t("common.saving") : t("admin.teaching.assign")}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={() => { setForm(INITIAL); setMessage(""); setError(""); }}>
                {t("common.cancel")}
              </button>
            </div>

            {message ? <div className={styles.alertOk}>{message}</div> : null}
            {error ? <div className={styles.alertErr}>{error}</div> : null}
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.teaching.title")}</h3>
          {assignmentsQuery.loading && !assignments.length ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
          ) : assignments.length ? (
            <div className={styles.tableWrap} style={{ borderRadius: "var(--radius-sm)" }}>
              <table className={styles.teachingTable}>
                <thead>
                  <tr>
                    <th>{t("admin.teaching.teacher")}</th>
                    <th>{t("admin.teaching.class")}</th>
                    <th>{t("admin.teaching.subject")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.teacherFullName || a.teacherEmail}</td>
                      <td>
                        <span className={styles.classCardStatus} style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
                          {a.className}
                        </span>
                      </td>
                      <td>{a.subjectName}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={styles.iconBtnSmall}
                          onClick={() => removeAssignment(a.id)}
                          title={t("admin.teaching.remove")}
                          aria-label={t("admin.teaching.remove")}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.emptyState}>{t("admin.teaching.empty")}</p>
          )}
        </article>
      </section>
    </div>
  );
}
