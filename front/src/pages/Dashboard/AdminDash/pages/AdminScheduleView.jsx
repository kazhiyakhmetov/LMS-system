import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { adminApi, schoolsApi, scheduleApi } from "../../../../shared/lib/api";
import { formatTime, toISODate } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const INITIAL_FORM = {
  schoolId: "",
  classId: "",
  subjectId: "",
  teacherId: "",
  date: "",
  lessonNumber: "1",
  startTime: "08:30",
  endTime: "09:15",
  classroom: "",
};

export default function AdminScheduleView() {
  const { t } = useT();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("teacher"); // "teacher" | "class"
  const [viewDate, setViewDate] = useState(() => toISODate(new Date()));

  const schoolsQuery = useApi(() => schoolsApi.all(), []);
  const subjectsQuery = useApi(() => schoolsApi.subjects(), []);
  const schools = Array.isArray(schoolsQuery.data) ? schoolsQuery.data : [];
  const subjects = Array.isArray(subjectsQuery.data) ? subjectsQuery.data : [];

  useEffect(() => {
    if (!form.schoolId && schools.length) {
      setForm((prev) => ({ ...prev, schoolId: String(schools[0].id) }));
    }
  }, [schools, form.schoolId]);

  const classesQuery = useApi(
    () => (form.schoolId ? schoolsApi.classes(form.schoolId) : Promise.resolve([])),
    [form.schoolId],
    { immediate: Boolean(form.schoolId) },
  );
  const teachersQuery = useApi(
    () => (form.schoolId ? adminApi.teachingTeachers(form.schoolId) : Promise.resolve([])),
    [form.schoolId],
    { immediate: Boolean(form.schoolId) },
  );

  const classes = Array.isArray(classesQuery.data) ? classesQuery.data : [];
  const teachers = Array.isArray(teachersQuery.data) ? teachersQuery.data : [];

  const todayQuery = useApi(
    () => {
      if (viewMode === "teacher" && form.teacherId) {
        return scheduleApi.adminGetTeacherSchedule(form.teacherId, viewDate).catch(() => []);
      }
      if (viewMode === "class" && form.classId) {
        return scheduleApi.adminGetClassSchedule(form.classId, viewDate).catch(() => []);
      }
      return Promise.resolve([]);
    },
    [viewMode, form.teacherId, form.classId, viewDate],
    { immediate: (viewMode === "teacher" ? Boolean(form.teacherId) : Boolean(form.classId)) },
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!form.classId || !form.subjectId || !form.teacherId || !form.date) {
      setError(t("admin.schedule.validation"));
      return;
    }
    setSubmitting(true);
    try {
      // Шаг 1: получить или создать day_id для (date + classId)
      const dayResp = await scheduleApi.adminEnsureDayId({
        date: form.date,
        classId: Number(form.classId),
      });
      const dayId = dayResp?.dayId;
      if (!dayId) throw new Error("dayId not returned");

      // Шаг 2: создать урок с готовым dayId
      await scheduleApi.adminCreateTeacherLesson({
        teacherId: Number(form.teacherId),
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
        dayId,
        lessonNumber: Number(form.lessonNumber),
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        classroom: form.classroom || null,
      });
      setMessage(t("admin.schedule.saved"));
      await todayQuery.refetch();
    } catch (err) {
      setError(err?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteLesson(lessonId) {
    setError("");
    try {
      await scheduleApi.adminDeleteLesson(lessonId);
      await todayQuery.refetch();
    } catch (err) {
      setError(err?.message || t("common.error"));
    }
  }

  const todayLessons = Array.isArray(todayQuery.data) ? todayQuery.data : [];

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.schedule.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.schedule.sub")}</p>
        </div>
        <span className={`${styles.pill} ${styles.pillDraft}`}>{t("roles.ADMIN")}</span>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.schedule.addLesson")}</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.school")}</span>
                <select className={styles.select} value={form.schoolId} onChange={(e) => update("schoolId", e.target.value)}>
                  <option value="">{t("common.select")}</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.class")}</span>
                <select className={styles.select} value={form.classId} onChange={(e) => update("classId", e.target.value)} required>
                  <option value="">{t("common.select")}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.subject")}</span>
                <select className={styles.select} value={form.subjectId} onChange={(e) => update("subjectId", e.target.value)} required>
                  <option value="">{t("common.select")}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.teacher")}</span>
                <select className={styles.select} value={form.teacherId} onChange={(e) => update("teacherId", e.target.value)} required>
                  <option value="">{t("common.select")}</option>
                  {teachers.map((tt) => (
                    <option key={tt.teacherId ?? tt.userId} value={tt.teacherId ?? tt.userId}>
                      {tt.fullName || `${tt.firstName ?? ""} ${tt.lastName ?? ""}`.trim() || tt.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.fieldGrid3}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.date")}</span>
                <input className={styles.input} type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.lessonNumber")}</span>
                <input className={styles.input} type="number" min="1" max="10" value={form.lessonNumber} onChange={(e) => update("lessonNumber", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.classroom")}</span>
                <input className={styles.input} value={form.classroom} onChange={(e) => update("classroom", e.target.value)} placeholder="203" />
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.startTime")}</span>
                <input className={styles.input} type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{t("admin.schedule.endTime")}</span>
                <input className={styles.input} type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} />
              </label>
            </div>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit" disabled={submitting}>
                {submitting ? t("admin.schedule.saving") : t("admin.schedule.addLesson")}
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => { setMessage(""); setError(""); }}>
                {t("admin.registration.clear")}
              </button>
            </div>

            {message ? <div className={styles.alertOk}>{message}</div> : null}
            {error ? <div className={styles.alertErr}>{error}</div> : null}
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.schedule.todayLessons")}</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className={viewMode === "teacher" ? styles.primaryBtn : styles.ghostBtn}
              style={{ flex: 1, height: 34, padding: "0 14px", fontSize: 12 }}
              onClick={() => setViewMode("teacher")}
            >
              По учителю
            </button>
            <button
              type="button"
              className={viewMode === "class" ? styles.primaryBtn : styles.ghostBtn}
              style={{ flex: 1, height: 34, padding: "0 14px", fontSize: 12 }}
              onClick={() => setViewMode("class")}
            >
              По классу
            </button>
          </div>

          <label className={styles.field} style={{ marginBottom: 10 }}>
            <span className={styles.label}>Дата просмотра</span>
            <input
              className={styles.input}
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
            />
          </label>

          {(viewMode === "teacher" && !form.teacherId) || (viewMode === "class" && !form.classId) ? (
            <p className={styles.emptyState}>
              {viewMode === "teacher" ? "Выберите учителя слева" : "Выберите класс слева"}
            </p>
          ) : todayQuery.loading ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
          ) : todayLessons.length ? (
            <ul className={styles.noteList} style={{ marginTop: 14 }}>
              {todayLessons.map((l) => (
                <li key={l.id} className={styles.noteItem}>
                  <span className={styles.noteAvatar} style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-alt))" }}>
                    {l.lessonNumber}
                  </span>
                  <div className={styles.noteBody}>
                    <p className={styles.noteMain}>{l.subjectName} • {l.className}</p>
                    <p className={styles.noteMeta}>
                      {formatTime(l.startTime)} – {formatTime(l.endTime)} • {l.classroom || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.iconBtnSmall}
                    onClick={() => deleteLesson(l.id)}
                    aria-label={t("admin.schedule.delete")}
                    title={t("admin.schedule.delete")}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("admin.schedule.noLessons")}</p>
          )}
        </article>
      </section>
    </div>
  );
}
