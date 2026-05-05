import { useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./ParentProfilePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi, profileApi } from "../../../../shared/lib/api";
import { getAvatarUrl, getInitials } from "../../../../shared/lib/utils/avatar";
import { useT } from "../../../../shared/lib/i18n";

function ChildLine({ child, t }) {
  const statsQuery = useApi(() => parentApi.childStats(child.id), [child.id]);
  const stats = statsQuery.data || {};
  const avatarUrl = useMemo(() => getAvatarUrl(child.profilePhotoUrl), [child.profilePhotoUrl]);
  const initials = useMemo(() => getInitials(child.fio), [child.fio]);

  return (
    <li className={styles.childItem}>
      <div className={styles.childAvatar}>
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <p className={styles.childName}>{child.fio || "—"}</p>
        <p className={styles.childMeta}>
          {child.className || "—"}
          {child.schoolName ? ` • ${child.schoolName}` : ""}
        </p>
      </div>
      <span className={styles.childAvg} title={t("parent.children.avgGrade")}>
        {stats.avgGrade ?? "—"}
      </span>
    </li>
  );
}

export default function ParentProfilePage() {
  const { t } = useT();
  const { user } = useAuth();
  const fileRef = useRef(null);

  const profileQuery = useApi(() => profileApi.me(), []);
  const meQuery = useApi(() => parentApi.me(), []);
  const childrenQuery = useApi(() => parentApi.children(), []);

  const profile = profileQuery.data ?? {};
  const me = meQuery.data ?? {};
  const children = useMemo(
    () => Array.isArray(childrenQuery.data) ? childrenQuery.data : [],
    [childrenQuery.data],
  );

  const [bioDraft, setBioDraft] = useState(null);
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const bio = bioDraft ?? profile.bio ?? me.bio ?? "";

  const fullName = useMemo(() => {
    if (me.fio) return me.fio;
    if (profile.firstName || profile.lastName) {
      return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    }
    return user?.name || t("roles.PARENT");
  }, [me.fio, profile.firstName, profile.lastName, user?.name, t]);

  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const avatarUrl = useMemo(
    () => getAvatarUrl(profile.profilePhotoUrl || profile.profilePhotoPath || me.profilePhotoUrl),
    [profile.profilePhotoUrl, profile.profilePhotoPath, me.profilePhotoUrl],
  );

  async function saveBio() {
    setSavingBio(true);
    setBioError("");
    try {
      await profileApi.updateBio(bio || "");
      await profileQuery.refetch();
      await meQuery.refetch();
      setBioDraft(null);
    } catch (err) {
      setBioError(err?.message || t("parent.profile.bioErrorDefault"));
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
      await meQuery.refetch();
    } catch (err) {
      setAvatarError(err?.message || t("parent.profile.avatarErrorDefault"));
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
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") fileRef.current?.click(); }}
            title={t("header.profile")}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
            <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
          </div>
          <div>
            <h2 className={styles.name}>{fullName}</h2>
            <p className={styles.meta}>
              {me.schoolName || user?.schoolName || "—"} • ID: {me.id ?? user?.id ?? "—"} • {profile.email || me.email || user?.email || ""}
            </p>
            <div className={styles.tags}>
              <span className={styles.tag}>{t("parent.profile.tagParent")}</span>
              {me.childrenCount ? (
                <span className={styles.tag}>{t("parent.profile.tagChildren", { n: me.childrenCount })}</span>
              ) : null}
            </div>
            {avatarError ? <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{avatarError}</p> : null}
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("parent.profile.contactsTitle")}</h3>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("parent.profile.rows.email")}</span>
              <span className={styles.rowValue}>{profile.email || me.email || user?.email || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("parent.profile.rows.firstName")}</span>
              <span className={styles.rowValue}>{me.firstName || profile.firstName || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("parent.profile.rows.lastName")}</span>
              <span className={styles.rowValue}>{me.lastName || profile.lastName || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("parent.profile.rows.patronymic")}</span>
              <span className={styles.rowValue}>{me.patronymic || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>{t("parent.profile.rows.school")}</span>
              <span className={styles.rowValue}>{me.schoolName || user?.schoolName || "—"}</span>
            </li>
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("parent.profile.bioTitle")}</h3>
          <textarea
            className={styles.bioField}
            rows={6}
            value={bio}
            onChange={(e) => setBioDraft(e.target.value)}
            placeholder={t("parent.profile.bioPlaceholder")}
          />
          <div className={styles.bioActions}>
            <button type="button" className={styles.primaryBtn} onClick={saveBio} disabled={savingBio || bioDraft === null}>
              {savingBio ? t("parent.profile.bioSaving") : t("parent.profile.bioSave")}
            </button>
            {bioDraft !== null ? (
              <button type="button" className={styles.ghostBtn} onClick={() => setBioDraft(null)}>
                {t("parent.profile.bioCancel")}
              </button>
            ) : null}
            {bioError ? <span style={{ color: "var(--danger)", fontSize: 13 }}>{bioError}</span> : null}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.widePanel}`}>
          <h3 className={styles.panelTitle}>{t("parent.profile.childrenTitle", { n: children.length })}</h3>
          {childrenQuery.loading && !children.length ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>{t("parent.common.loading")}</p>
          ) : children.length ? (
            <ul className={styles.childrenList}>
              {children.map((c) => <ChildLine key={c.id} child={c} t={t} />)}
            </ul>
          ) : (
            <p style={{ color: "var(--muted)", margin: 0 }}>{t("parent.profile.childrenEmpty")}</p>
          )}
        </article>
      </section>
    </div>
  );
}
