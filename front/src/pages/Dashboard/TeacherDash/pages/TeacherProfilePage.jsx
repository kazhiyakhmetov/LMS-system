import { useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./TeacherProfilePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { profileApi, statisticsApi, teachingApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

export default function TeacherProfilePage() {
  const { t } = useT();
  const { user } = useAuth();
  const fileRef = useRef(null);

  const profileQuery = useApi(() => profileApi.me(), []);
  const pairsQuery = useApi(() => teachingApi.myPairs(), []);
  const summaryQuery = useApi(() => statisticsApi.teacherSummary(), []);

  const [bioDraft, setBioDraft] = useState(null);
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const profile = profileQuery.data ?? {};
  const bio = bioDraft ?? profile.bio ?? "";
  const pairs = Array.isArray(pairsQuery.data) ? pairsQuery.data : [];
  const summary = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];

  const fullName = useMemo(() => {
    if (profile.firstName || profile.lastName) {
      return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    }
    return user?.name || t("teacher.profile.defaultName");
  }, [profile.firstName, profile.lastName, user?.name, t]);

  const initials = useMemo(
    () => fullName.split(" ").slice(0, 2).map((p) => p[0] || "").join("").toUpperCase(),
    [fullName],
  );

  const studentsTotal = summary.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
  const assignmentsTotal = summary.reduce((acc, s) => acc + (s.totalAssignments || 0), 0);
  const avgGrade = useMemo(() => {
    const vals = summary.map((s) => s.classAverageGrade).filter((v) => v != null);
    if (!vals.length) return "—";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [summary]);

  async function saveBio() {
    setSavingBio(true);
    setBioError("");
    try {
      await profileApi.updateBio(bio || "");
      await profileQuery.refetch();
      setBioDraft(null);
    } catch (err) {
      setBioError(err?.message || t("common.error"));
    } finally {
      setSavingBio(false);
    }
  }

  async function onAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    try {
      await profileApi.uploadAvatar(file);
      await profileQuery.refetch();
    } catch (err) {
      setAvatarError(err?.message || t("common.error"));
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.profileMain}>
          <div
            className={styles.avatar}
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter") fileRef.current?.click(); }}
          >
            {profile.profilePhotoUrl ? (
              <img src={profile.profilePhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
            ) : initials}
            <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
          </div>
          <div>
            <h2 className={styles.name}>{fullName}</h2>
            <p className={styles.meta}>
              {user?.schoolName || "—"} • ID: {user?.id ?? "—"} • {profile.email || user?.email || ""}
            </p>
            <div className={styles.tags}>
              <span className={styles.tag}>{t("roles.TEACHER")}</span>
            </div>
            {avatarError ? <p style={{ color: "var(--danger)", fontSize: 13 }}>{avatarError}</p> : null}
          </div>
        </div>

        <div className={styles.heroStats}>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("teacher.profile.kpiClasses")}</p>
            <p className={styles.metricValue}>{summary.length || "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("teacher.profile.kpiStudents")}</p>
            <p className={styles.metricValue}>{studentsTotal || "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("teacher.profile.kpiAssignments")}</p>
            <p className={styles.metricValue}>{assignmentsTotal || "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("teacher.profile.kpiAvgScore")}</p>
            <p className={styles.metricValue}>{avgGrade}</p>
          </article>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("teacher.profile.contactInfo")}</h3>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{profile.email || user?.email || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("admin.registration.firstName")}</span>
              <span className={styles.rowValue}>{profile.firstName || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("admin.registration.lastName")}</span>
              <span className={styles.rowValue}>{profile.lastName || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("admin.registration.school")}</span>
              <span className={styles.rowValue}>{user?.schoolName || "—"}</span>
            </li>
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("teacher.profile.account")}</h3>
          <textarea
            rows={5}
            value={bio}
            onChange={(e) => setBioDraft(e.target.value)}
            placeholder={t("teacher.profile.bioPlaceholder")}
            style={{ width: "100%", padding: 10, border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)", resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
            <button type="button" onClick={saveBio} disabled={savingBio || bioDraft === null}>
              {savingBio ? t("common.saving") : t("common.save")}
            </button>
            {bioDraft !== null ? <button type="button" onClick={() => setBioDraft(null)}>{t("common.cancel")}</button> : null}
            {bioError ? <span style={{ color: "var(--danger)", fontSize: 13 }}>{bioError}</span> : null}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.widePanel}`}>
          <h3 className={styles.panelTitle}>{t("teacher.profile.myClasses")}</h3>
          {pairsQuery.loading && !pairs.length ? <p>{t("common.loading")}</p> : pairs.length ? (
            <div className={styles.classList}>
              {pairs.map((pair) => (
                <div key={pair.assignmentId ?? `${pair.classId}-${pair.subjectId}`} className={styles.classItem}>
                  <p className={styles.classTitle}>{pair.className || "—"} • {pair.subjectName || "—"}</p>
                  <p className={styles.classMeta}>{pair.academicYear || ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>{t("teacher.profile.noClasses")}</p>
          )}
        </article>
      </section>
    </div>
  );
}
