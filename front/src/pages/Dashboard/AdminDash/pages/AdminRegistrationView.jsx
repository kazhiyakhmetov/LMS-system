import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { adminApi, schoolsApi, usersApi } from "../../../../shared/lib/api";
import { normalizeRole } from "../../../../shared/lib/auth/roleNormalize";
import { useT } from "../../../../shared/lib/i18n";

const INITIAL_FORM = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  patronymic: "",
  schoolId: "",
  classId: "",
  parentEmail: "",
  parentPassword: "",
  parentFirstName: "",
  parentLastName: "",
  parentPatronymic: "",
};

const ROLE_AVATAR_BG = {
  STUDENT: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
  TEACHER: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
  PARENT:  "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
  ADMIN:   "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
};

function RoleIcon({ role }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (role === "STUDENT") return <svg {...c}><path d="M22 10L12 5L2 10L12 15L22 10Z"/><path d="M6 12V17C6 17 9 19 12 19C15 19 18 17 18 17V12"/></svg>;
  if (role === "TEACHER") return <svg {...c}><circle cx="12" cy="8" r="3"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/></svg>;
  return <svg {...c}><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M21 21v-2a3 3 0 0 0-3-3"/></svg>;
}

function makeInitials(name) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";
}

export default function AdminRegistrationView() {
  const { t } = useT();
  const [role, setRole] = useState("STUDENT");
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pickedStudents, setPickedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  const schoolsQuery = useApi(() => schoolsApi.all(), []);
  const usersQuery = useApi(() => usersApi.all(), []);
  const schools = useMemo(() => Array.isArray(schoolsQuery.data) ? schoolsQuery.data : [], [schoolsQuery.data]);
  const users = useMemo(() => Array.isArray(usersQuery.data) ? usersQuery.data : [], [usersQuery.data]);

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
  const classes = Array.isArray(classesQuery.data) ? classesQuery.data : [];

  const studentsQuery = useApi(
    () => (role === "PARENT" && form.schoolId
      ? adminApi.schoolStudents(form.schoolId)
      : Promise.resolve([])
    ),
    [role, form.schoolId],
    { immediate: role === "PARENT" && Boolean(form.schoolId) },
  );
  const schoolStudents = Array.isArray(studentsQuery.data) ? studentsQuery.data : [];

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return schoolStudents;
    return schoolStudents.filter((s) =>
      `${s.fullName ?? ""} ${s.email ?? ""} ${s.className ?? ""}`.toLowerCase().includes(q),
    );
  }, [schoolStudents, studentSearch]);

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
      .slice(0, 6)
      .map((u) => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
        return {
          id: u.id,
          name: fullName,
          email: u.email,
          role: normalizeRole(u.roles?.[0] ?? u.role),
          initials: makeInitials(fullName),
        };
      });
  }, [users]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function changeRole(next) {
    setRole(next);
    setStatus("");
    setError("");
    setPickedStudents([]);
  }

  function toggleStudent(studentId) {
    setPickedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (role === "PARENT" && pickedStudents.length === 0) {
      setError(t("admin.registration.pickerRequired"));
      return;
    }

    setSubmitting(true);
    try {
      if (role === "STUDENT") {
        if (!form.classId) throw new Error(t("admin.registration.error"));
        const user = {
          email: form.email,
          passwordHash: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          patronymic: form.patronymic || null,
        };
        await adminApi.registerStudent({ classId: Number(form.classId), user });
      } else if (role === "TEACHER") {
        if (!form.schoolId) throw new Error(t("admin.registration.error"));
        const user = {
          email: form.email,
          passwordHash: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          patronymic: form.patronymic || null,
        };
        await adminApi.registerTeacher({ schoolId: Number(form.schoolId), user });
      } else if (role === "PARENT") {
        await adminApi.registerParent({
          email: form.parentEmail,
          passwordHash: form.parentPassword,
          firstName: form.parentFirstName,
          lastName: form.parentLastName,
          patronymic: form.parentPatronymic || null,
          studentIds: pickedStudents,
        });
      }

      setStatus(`${t("admin.registration.success")} (${t(`roles.${role}`)})`);
      setForm({ ...INITIAL_FORM, schoolId: form.schoolId });
      setPickedStudents([]);
      await usersQuery.refetch();
    } catch (err) {
      setError(err?.message || t("admin.registration.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const roleTabs = [
    { code: "STUDENT", label: t("roles.STUDENT") },
    { code: "TEACHER", label: t("roles.TEACHER") },
    { code: "PARENT",  label: t("roles.PARENT") },
  ];

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.registration.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.registration.sub")}</p>
        </div>
        <span className={`${styles.pill} ${styles.pillDraft}`}>{t("roles.ADMIN")}</span>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.registration.newUser")}</h3>

          <div className={styles.roleTabs}>
            {roleTabs.map((tab) => (
              <button
                key={tab.code}
                type="button"
                className={`${styles.roleTab} ${role === tab.code ? styles.roleTabActive : ""}`}
                onClick={() => changeRole(tab.code)}
              >
                <span className={styles.roleTabIcon}><RoleIcon role={tab.code} /></span>
                <span className={styles.roleTabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>{t("admin.registration.school")}</span>
              <select className={styles.select} value={form.schoolId} onChange={(e) => update("schoolId", e.target.value)}>
                <option value="">{t("common.select")}</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>

            {role === "STUDENT" || role === "TEACHER" ? (
              <>
                <div className={styles.fieldGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.firstName")}</span>
                    <input className={styles.input} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.lastName")}</span>
                    <input className={styles.input} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
                  </label>
                </div>

                <div className={styles.fieldGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.patronymic")}</span>
                    <input className={styles.input} value={form.patronymic} onChange={(e) => update("patronymic", e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.email")}</span>
                    <input className={styles.input} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                  </label>
                </div>

                <div className={styles.fieldGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.password")}</span>
                    <input className={styles.input} value={form.password} onChange={(e) => update("password", e.target.value)} required />
                  </label>
                  {role === "STUDENT" ? (
                    <label className={styles.field}>
                      <span className={styles.label}>{t("admin.registration.class")}</span>
                      <select className={styles.select} value={form.classId} onChange={(e) => update("classId", e.target.value)} required>
                        <option value="">{t("common.select")}</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className={styles.fieldGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.parentFirstName")}</span>
                    <input className={styles.input} value={form.parentFirstName} onChange={(e) => update("parentFirstName", e.target.value)} required />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.parentLastName")}</span>
                    <input className={styles.input} value={form.parentLastName} onChange={(e) => update("parentLastName", e.target.value)} required />
                  </label>
                </div>

                <div className={styles.fieldGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.parentEmail")}</span>
                    <input className={styles.input} type="email" value={form.parentEmail} onChange={(e) => update("parentEmail", e.target.value)} required />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("admin.registration.parentPassword")}</span>
                    <input className={styles.input} value={form.parentPassword} onChange={(e) => update("parentPassword", e.target.value)} required />
                  </label>
                </div>

                <div className={styles.studentPicker}>
                  <div className={styles.studentPickerHead}>
                    <span className={styles.label}>{t("admin.registration.pickerTitle")}</span>
                    <span className={styles.studentPickerCount}>
                      {t("admin.registration.pickerSelected", { count: pickedStudents.length })}
                    </span>
                  </div>

                  <input
                    className={styles.input}
                    placeholder={t("admin.registration.pickerSearch")}
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />

                  <div className={styles.studentList}>
                    {studentsQuery.loading && !schoolStudents.length ? (
                      <p className={styles.emptyState}>{t("common.loading")}</p>
                    ) : filteredStudents.length === 0 ? (
                      <p className={styles.emptyState}>{t("admin.registration.pickerNone")}</p>
                    ) : (
                      filteredStudents.map((s) => {
                        const sid = s.studentId ?? s.userId;
                        const active = pickedStudents.includes(sid);
                        return (
                          <label key={sid} className={`${styles.studentRow} ${active ? styles.studentRowActive : ""}`}>
                            <input type="checkbox" checked={active} onChange={() => toggleStudent(sid)} />
                            <span className={styles.studentRowAvatar}>{makeInitials(s.fullName)}</span>
                            <div className={styles.studentRowBody}>
                              <p className={styles.studentRowName}>{s.fullName}</p>
                              <p className={styles.studentRowMeta}>
                                {s.className || "—"} • {s.email}
                              </p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit" disabled={submitting}>
                {submitting ? t("admin.registration.registering") : t("admin.registration.register")}
              </button>
              <button
                className={styles.ghostBtn}
                type="button"
                onClick={() => {
                  setStatus(""); setError("");
                  setForm({ ...INITIAL_FORM, schoolId: form.schoolId });
                  setPickedStudents([]);
                  setStudentSearch("");
                }}
              >
                {t("admin.registration.clear")}
              </button>
            </div>

            {status ? <div className={styles.alertOk}>{status}</div> : null}
            {error ? <div className={styles.alertErr}>{error}</div> : null}
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>{t("admin.registration.recentTitle")}</h3>
          <p className={styles.hint}>{t("admin.registration.recentSub")}</p>
          {recentUsers.length ? (
            <ul className={styles.noteList} style={{ marginTop: 14 }}>
              {recentUsers.map((u) => (
                <li key={u.id} className={styles.noteItem}>
                  <span className={styles.noteAvatar} style={{ background: ROLE_AVATAR_BG[u.role] || ROLE_AVATAR_BG.STUDENT }}>
                    {u.initials}
                  </span>
                  <div className={styles.noteBody}>
                    <p className={styles.noteMain}>{u.name}</p>
                    <p className={styles.noteMeta}>{u.email} • {t(`roles.${u.role || "STUDENT"}`)}</p>
                  </div>
                  <span className={styles.noteEnd}>#{u.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("admin.registration.recentEmpty")}</p>
          )}
        </article>
      </section>
    </div>
  );
}
