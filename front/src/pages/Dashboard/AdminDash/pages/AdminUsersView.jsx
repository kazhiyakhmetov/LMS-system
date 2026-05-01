import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { adminApi, schoolsApi, usersApi } from "../../../../shared/lib/api";
import { normalizeRole } from "../../../../shared/lib/auth/roleNormalize";
import { useT } from "../../../../shared/lib/i18n";

function roleClass(role) {
  switch (role) {
    case "STUDENT": return "roleStudent";
    case "TEACHER": return "roleTeacher";
    case "PARENT": return "roleParent";
    case "ADMIN": return "roleAdmin";
    default: return "";
  }
}

function userRow(dto) {
  const role = normalizeRole(dto.roles?.[0] ?? dto.role);
  const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(" ") || dto.email || "—";
  return {
    id: dto.id,
    name: fullName,
    initials: fullName.split(" ").slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?",
    email: dto.email,
    firstName: dto.firstName ?? "",
    lastName: dto.lastName ?? "",
    patronymic: dto.patronymic ?? "",
    role,
    schoolId: dto.schoolId ?? null,
    schoolName: dto.schoolName || "—",
  };
}

function makeInitials(name) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";
}

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>;
}
function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>;
}

function ClassTransferSection({ studentId, schoolId, onTransferred, t }) {
  const schoolsQuery = useApi(() => schoolsApi.all(), []);
  const schools = Array.isArray(schoolsQuery.data) ? schoolsQuery.data : [];

  const effectiveSchoolId = schoolId ?? schools[0]?.id ?? null;

  const studentsQuery = useApi(
    () => (effectiveSchoolId ? adminApi.schoolStudents(effectiveSchoolId) : Promise.resolve([])),
    [effectiveSchoolId],
    { immediate: Boolean(effectiveSchoolId) },
  );
  const allStudents = Array.isArray(studentsQuery.data) ? studentsQuery.data : [];
  const current = allStudents.find((s) => s.userId === studentId || s.studentId === studentId);

  const classesQuery = useApi(
    () => (effectiveSchoolId ? schoolsApi.classes(effectiveSchoolId) : Promise.resolve([])),
    [effectiveSchoolId],
    { immediate: Boolean(effectiveSchoolId) },
  );
  const classes = Array.isArray(classesQuery.data) ? classesQuery.data : [];

  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function transfer() {
    if (!target) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await adminApi.transferStudent({ studentId, toClassId: Number(target) });
      setMsg(t("admin.users.edit.transferred"));
      await studentsQuery.refetch();
      onTransferred?.();
      setTarget("");
    } catch (e) {
      setErr(e?.message || t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.modalSection}>
      <h4 className={styles.modalSectionTitle}>{t("admin.users.edit.classTransfer")}</h4>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={styles.label} style={{ margin: 0 }}>{t("admin.users.edit.currentClass")}:</span>
        {current?.className ? (
          <span className={styles.currentClassBadge}>{current.className}</span>
        ) : (
          <span className={styles.currentClassEmpty}>{t("admin.users.edit.notInClass")}</span>
        )}
      </div>

      <div className={styles.transferRow}>
        <label className={styles.field}>
          <span className={styles.label}>{t("admin.users.edit.classTransfer")}</span>
          <select className={styles.select} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">{t("admin.users.edit.selectClass")}</option>
            {classes
              .filter((c) => c.id !== current?.classId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.active ? "" : "(архив)"}
                </option>
              ))}
          </select>
        </label>
        <div />
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={transfer}
          disabled={!target || busy}
          style={{ height: 42 }}
        >
          {busy ? t("admin.users.edit.transferring") : t("admin.users.edit.transfer")}
        </button>
      </div>

      {msg ? <div className={styles.alertOk}>{msg}</div> : null}
      {err ? <div className={styles.alertErr}>{err}</div> : null}
    </div>
  );
}

function ParentChildrenSection({ parentId, allStudents, onChange, t }) {
  const childrenQuery = useApi(
    () => adminApi.parentChildren(parentId),
    [parentId],
  );
  const linked = Array.isArray(childrenQuery.data) ? childrenQuery.data : [];

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const linkedIds = useMemo(() => new Set(linked.map((c) => c.studentId ?? c.userId ?? c.id)), [linked]);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (linkedIds.has(s.id)) return false;
      if (!q) return true;
      return `${s.name} ${s.email}`.toLowerCase().includes(q);
    }).slice(0, 30);
  }, [allStudents, linkedIds, search]);

  async function unlink(childId) {
    setBusyId(`u-${childId}`);
    setErr("");
    setMsg("");
    try {
      await adminApi.unlinkParentChild({ parentId, studentId: childId });
      setMsg(t("admin.users.edit.unlinked"));
      await childrenQuery.refetch();
      onChange?.();
    } catch (e) {
      setErr(e?.message || t("common.error"));
    } finally {
      setBusyId(null);
    }
  }

  async function link(childId) {
    setBusyId(`l-${childId}`);
    setErr("");
    setMsg("");
    try {
      await adminApi.linkParentChild({ parentId, studentId: childId });
      setMsg(t("admin.users.edit.linked"));
      setSearch("");
      await childrenQuery.refetch();
      onChange?.();
    } catch (e) {
      setErr(e?.message || t("common.error"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.modalSection}>
      <h4 className={styles.modalSectionTitle}>{t("admin.users.edit.linksTitle")}</h4>
      <p className={styles.modalSectionSub}>{t("admin.users.edit.linksSub")}</p>

      {childrenQuery.loading && !linked.length ? (
        <p className={styles.emptyState}>{t("common.loading")}</p>
      ) : linked.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {linked.map((c) => {
            const cid = c.studentId ?? c.userId ?? c.id;
            const name = c.fullName || c.studentName || c.name || `#${cid}`;
            return (
              <div key={cid} className={styles.linkChip}>
                <span className={styles.studentRowAvatar}>{makeInitials(name)}</span>
                <div className={styles.linkChipBody}>
                  <p className={styles.linkChipName}>{name}</p>
                  <p className={styles.linkChipMeta}>
                    {c.className || c.email || ""}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.linkRemoveBtn}
                  onClick={() => unlink(cid)}
                  disabled={busyId === `u-${cid}`}
                >
                  {busyId === `u-${cid}` ? t("admin.users.edit.unlinking") : t("admin.users.edit.unlink")}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyState} style={{ padding: 12 }}>{t("admin.users.edit.noChildren")}</p>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        <span className={styles.label}>{t("admin.users.edit.addChild")}</span>
        <input
          className={styles.input}
          placeholder={t("admin.users.edit.searchStudent")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {candidates.length ? (
          <div className={styles.studentList} style={{ maxHeight: 220 }}>
            {candidates.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.studentRow}
                style={{ border: 0, background: "transparent", textAlign: "left", width: "100%" }}
                onClick={() => link(s.id)}
                disabled={busyId === `l-${s.id}`}
              >
                <span className={styles.studentRowAvatar}>{s.initials}</span>
                <div className={styles.studentRowBody}>
                  <p className={styles.studentRowName}>{s.name}</p>
                  <p className={styles.studentRowMeta}>{s.email}</p>
                </div>
                <span style={{ fontSize: 11, color: "var(--accent-strong)", fontWeight: 700 }}>
                  {busyId === `l-${s.id}` ? t("admin.users.edit.linking") : "+"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {msg ? <div className={styles.alertOk}>{msg}</div> : null}
      {err ? <div className={styles.alertErr}>{err}</div> : null}
    </div>
  );
}

export default function AdminUsersView() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") ?? "ALL";

  const usersQuery = useApi(() => usersApi.all(), []);
  const users = useMemo(() => {
    const list = Array.isArray(usersQuery.data) ? usersQuery.data : [];
    return list.map(userRow);
  }, [usersQuery.data]);

  const counts = useMemo(() => {
    const c = { ALL: users.length, STUDENT: 0, TEACHER: 0, PARENT: 0, ADMIN: 0 };
    users.forEach((u) => { if (u.role && c[u.role] != null) c[u.role] += 1; });
    return c;
  }, [users]);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [sortBy, setSortBy] = useState("name-asc");

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  useEffect(() => {
    if (editingUser) {
      setEditForm({
        email: editingUser.email || "",
        firstName: editingUser.firstName || "",
        lastName: editingUser.lastName || "",
        patronymic: editingUser.patronymic || "",
        password: "",
        role: (editingUser.role || "STUDENT").toLowerCase(),
      });
      setEditError("");
      setEditSuccess("");
    }
  }, [editingUser]);

  const allStudents = useMemo(() => users.filter((u) => u.role === "STUDENT"), [users]);

  const filteredUsers = useMemo(() => {
    let list = users.filter((item) => {
      const byRole = roleFilter === "ALL" ? true : item.role === roleFilter;
      const search = query.trim().toLowerCase();
      const byQuery = !search
        || `${item.name} ${item.id} ${item.email} ${item.schoolName}`.toLowerCase().includes(search);
      return byRole && byQuery;
    });

    list = [...list];
    switch (sortBy) {
      case "name-desc":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "id-asc":
        list.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        break;
      default:
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return list;
  }, [users, query, roleFilter, sortBy]);

  async function saveEdit(event) {
    event.preventDefault();
    if (!editingUser || !editForm) return;
    setSavingEdit(true);
    setEditError("");
    setEditSuccess("");
    try {
      const body = {
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        patronymic: editForm.patronymic || null,
        role: editForm.role,
      };
      if (editForm.password) body.password = editForm.password;
      await adminApi.updateUser(editingUser.id, body);
      setEditSuccess(t("admin.users.edit.saved"));
      await usersQuery.refetch();
    } catch (err) {
      setEditError(err?.message || t("common.error"));
    } finally {
      setSavingEdit(false);
    }
  }

  if (usersQuery.loading && !users.length) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }
  if (usersQuery.error) {
    return <div style={{ padding: 24, color: "var(--danger-strong)" }}>{t("common.error")}: {usersQuery.error.message}</div>;
  }

  const roleOptions = [
    { key: "ALL", label: t("admin.users.allRoles") },
    { key: "STUDENT", label: t("roles.STUDENT") },
    { key: "TEACHER", label: t("roles.TEACHER") },
    { key: "PARENT", label: t("roles.PARENT") },
    { key: "ADMIN", label: t("roles.ADMIN") },
  ];

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.users.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.users.sub")}</p>
        </div>
        <span className={styles.statusChip}>
          <span className={styles.dot} />
          {users.length}
        </span>
      </section>

      <section className={styles.usersHeader}>
        <div className={styles.searchBar}>
          <svg className={styles.searchBarIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input
            className={styles.searchBarInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.users.searchPlaceholder")}
            aria-label={t("common.search")}
          />
        </div>

        <div className={styles.roleChips}>
          {roleOptions.map((opt) => {
            const active = roleFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`${styles.roleChip} ${active ? styles.roleChipActive : ""}`}
                onClick={() => setRoleFilter(opt.key)}
              >
                {opt.label}
                <span className={styles.roleChipCount}>{counts[opt.key] ?? 0}</span>
              </button>
            );
          })}

          <select
            className={styles.roleChip}
            style={{ marginLeft: "auto" }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label={t("admin.users.sort")}
          >
            <option value="name-asc">{t("admin.users.sortNameAsc")}</option>
            <option value="name-desc">{t("admin.users.sortNameDesc")}</option>
            <option value="id-asc">{t("admin.users.sortById")}</option>
          </select>
        </div>

        <div className={styles.usersStats}>
          <span>{t("admin.users.tableHint", { count: filteredUsers.length, total: users.length })}</span>
        </div>
      </section>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("admin.users.headers.name")}</th>
              <th>{t("admin.users.headers.role")}</th>
              <th>{t("admin.users.headers.email")}</th>
              <th>{t("admin.users.headers.school")}</th>
              <th style={{ textAlign: "right" }}>{t("admin.users.headers.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <p className={styles.emptyState}>{t("admin.users.empty")}</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.userAvatar}>{item.initials}</span>
                      <div className={styles.userCellInfo}>
                        <span className={styles.userCellName}>{item.name}</span>
                        <span className={styles.userCellId}>ID: {item.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.rolePill} ${styles[roleClass(item.role)]}`}>
                      {t(`roles.${item.role || "STUDENT"}`)}
                    </span>
                  </td>
                  <td>{item.email}</td>
                  <td>{item.schoolName}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className={styles.iconBtnSmall}
                      onClick={() => setEditingUser(item)}
                      title={t("common.edit")}
                      aria-label={t("common.edit")}
                      style={{ borderColor: "var(--stroke-accent)", color: "var(--accent-strong)" }}
                    >
                      <EditIcon />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {editingUser && editForm ? (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <section className={`${styles.modal} ${styles.modalLarge}`} role="dialog" aria-modal="true">
            <header className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{t("admin.users.edit.title")}</h3>
                <p className={styles.modalSub}>{editingUser.name} • #{editingUser.id} • {t(`roles.${editingUser.role || "STUDENT"}`)}</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setEditingUser(null)}>
                <CloseIcon />
              </button>
            </header>

            <form className={styles.form} onSubmit={saveEdit} style={{ marginTop: 0 }}>
              <div className={styles.fieldGrid2}>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.registration.firstName")}</span>
                  <input className={styles.input} value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.registration.lastName")}</span>
                  <input className={styles.input} value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} required />
                </label>
              </div>

              <div className={styles.fieldGrid2}>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.registration.patronymic")}</span>
                  <input className={styles.input} value={editForm.patronymic} onChange={(e) => setEditForm({ ...editForm, patronymic: e.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.registration.email")}</span>
                  <input className={styles.input} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                </label>
              </div>

              <div className={styles.fieldGrid2}>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.users.edit.password")}</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder={t("common.optional")}
                  />
                  <span className={styles.labelSub}>{t("admin.users.edit.passwordHint")}</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{t("admin.users.headers.role")}</span>
                  <select
                    className={styles.select}
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    <option value="student">{t("roles.STUDENT")}</option>
                    <option value="teacher">{t("roles.TEACHER")}</option>
                    <option value="parent">{t("roles.PARENT")}</option>
                    <option value="admin">{t("roles.ADMIN")}</option>
                  </select>
                  <span className={styles.labelSub}>{t("admin.users.edit.roleHint")}</span>
                </label>
              </div>

              {editError ? <div className={styles.alertErr}>{editError}</div> : null}
              {editSuccess ? <div className={styles.alertOk}>{editSuccess}</div> : null}

              <div className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={() => setEditingUser(null)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={savingEdit}>
                  {savingEdit ? t("common.saving") : t("admin.users.edit.save")}
                </button>
              </div>
            </form>

            {editingUser.role === "STUDENT" ? (
              <ClassTransferSection
                studentId={editingUser.id}
                schoolId={editingUser.schoolId}
                onTransferred={() => usersQuery.refetch()}
                t={t}
              />
            ) : null}

            {editingUser.role === "PARENT" ? (
              <ParentChildrenSection
                parentId={editingUser.id}
                allStudents={allStudents}
                onChange={() => usersQuery.refetch()}
                t={t}
              />
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
