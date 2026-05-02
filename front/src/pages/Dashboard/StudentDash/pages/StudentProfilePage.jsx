import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./StudentProfilePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { gamificationApi, profileApi, tagsApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";
import { getAvatarUrl, getInitials } from "../../../../shared/lib/utils/avatar";
import { useT } from "../../../../shared/lib/i18n";

export default function StudentProfilePage() {
  const { t } = useT();
  const { user } = useAuth();
  const fileRef = useRef(null);

  const profileQuery = useApi(() => profileApi.me(), []);
  const statsQuery = useApi(() => gamificationApi.studentStats(), []);
  const achievementsQuery = useApi(() => gamificationApi.studentAchievements(), []);
  const myTagsQuery = useApi(() => tagsApi.studentMy(), []);
  const availableTagsQuery = useApi(() => tagsApi.studentAvailable(), []);

  const [bioDraft, setBioDraft] = useState(null);
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [pickedTags, setPickedTags] = useState(null);
  const [savingTags, setSavingTags] = useState(false);
  const [tagsMsg, setTagsMsg] = useState("");
  const [tagsErr, setTagsErr] = useState("");
  const [tagsSearch, setTagsSearch] = useState("");

  const profile = profileQuery.data ?? {};
  const bio = bioDraft ?? profile.bio ?? "";

  const myTags = useMemo(() => Array.isArray(myTagsQuery.data) ? myTagsQuery.data : [], [myTagsQuery.data]);
  const availableTags = useMemo(() => Array.isArray(availableTagsQuery.data) ? availableTagsQuery.data : [], [availableTagsQuery.data]);
  const allTagOptions = useMemo(() => {
    const map = new Map();
    [...myTags, ...availableTags].forEach((tag) => map.set(tag.id, tag));
    return Array.from(map.values());
  }, [myTags, availableTags]);

  useEffect(() => {
    if (pickedTags === null && myTags.length >= 0 && myTagsQuery.data !== null && myTagsQuery.data !== undefined) {
      setPickedTags(new Set(myTags.map((t) => t.id)));
    }
  }, [myTags, pickedTags, myTagsQuery.data]);

  const fullName = useMemo(() => {
    if (profile.firstName || profile.lastName) {
      return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    }
    return user?.name || t("student.profile.defaultName");
  }, [profile.firstName, profile.lastName, user?.name, t]);

  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const avatarUrl = useMemo(
    () => getAvatarUrl(profile.profilePhotoUrl || profile.profilePhotoPath),
    [profile.profilePhotoUrl, profile.profilePhotoPath],
  );

  const unlockedAchievements = useMemo(() => {
    const list = Array.isArray(achievementsQuery.data) ? achievementsQuery.data : [];
    return list.filter((a) => a.unlocked).slice(0, 3);
  }, [achievementsQuery.data]);

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

  function toggleTag(id) {
    setPickedTags((prev) => {
      const next = new Set(prev || []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveTags() {
    if (!pickedTags) return;
    setSavingTags(true);
    setTagsMsg("");
    setTagsErr("");
    try {
      await tagsApi.studentUpdate(Array.from(pickedTags));
      setTagsMsg(t("student.profile.tagsSaved"));
      await Promise.all([myTagsQuery.refetch(), availableTagsQuery.refetch()]);
    } catch (err) {
      setTagsErr(err?.message || t("common.error"));
    } finally {
      setSavingTags(false);
    }
  }

  const filteredTagOptions = useMemo(() => {
    const q = tagsSearch.trim().toLowerCase();
    if (!q) return allTagOptions;
    return allTagOptions.filter((tag) => (tag.name || "").toLowerCase().includes(q));
  }, [allTagOptions, tagsSearch]);

  const stats = statsQuery.data || {};

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
            title={t("student.profile.bioPlaceholder")}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
            ) : initials}
            <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
          </div>
          <div>
            <h2 className={styles.name}>{fullName}</h2>
            <p className={styles.meta}>
              {user?.schoolName || "—"} • ID: {user?.id ?? "—"} • {profile.email || user?.email || ""}
            </p>
            <div className={styles.tags}>
              <span className={styles.tag}>{t("roles.STUDENT")}</span>
              {stats.level != null ? <span className={styles.tag}>{t("student.gamification.currentLevel", { level: stats.level })}</span> : null}
              {stats.rank != null ? <span className={styles.tag}>#{stats.rank}</span> : null}
            </div>
            {avatarError ? <p style={{ color: "var(--danger)", fontSize: 13 }}>{avatarError}</p> : null}
          </div>
        </div>

        <div className={styles.heroStats}>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("student.gamification.totalEarned")}</p>
            <p className={styles.metricValue}>{stats.totalXp ?? "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("student.gamification.streak")}</p>
            <p className={styles.metricValue}>{stats.currentStreak ?? "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("student.gamification.completedAssignments")}</p>
            <p className={styles.metricValue}>{stats.completedAssignments ?? "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>{t("student.gamification.myBadges")}</p>
            <p className={styles.metricValue}>
              {stats.achievementsUnlocked ?? "—"}/{stats.totalAchievements ?? "—"}
            </p>
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
            placeholder={t("student.profile.bioPlaceholder")}
            style={{ width: "100%", padding: 10, border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)", resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
            <button type="button" onClick={saveBio} disabled={savingBio || bioDraft === null}>
              {savingBio ? t("common.saving") : t("common.save")}
            </button>
            {bioDraft !== null ? (
              <button type="button" onClick={() => setBioDraft(null)}>{t("common.cancel")}</button>
            ) : null}
            {bioError ? <span style={{ color: "var(--danger)", fontSize: 13 }}>{bioError}</span> : null}
          </div>
        </article>

        {/* === Теги === */}
        <article className={`${styles.panel} ${styles.widePanel}`}>
          <h3 className={styles.panelTitle}>{t("student.profile.tagsTitle")}</h3>
          <p style={{ margin: "-4px 0 14px", fontSize: 13, color: "var(--muted)" }}>
            {t("student.profile.tagsSub")}
          </p>

          <input
            type="text"
            placeholder={t("student.profile.tagsSearchPlaceholder")}
            value={tagsSearch}
            onChange={(e) => setTagsSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)", fontSize: 14, marginBottom: 14, fontFamily: "inherit" }}
          />

          {(myTagsQuery.loading || availableTagsQuery.loading) && !allTagOptions.length ? (
            <p style={{ color: "var(--muted)" }}>{t("common.loading")}</p>
          ) : allTagOptions.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {filteredTagOptions.map((tag) => {
                const active = pickedTags?.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 34,
                      padding: "0 14px",
                      borderRadius: "var(--radius-pill)",
                      border: active ? "1px solid var(--accent)" : "1px solid var(--stroke)",
                      background: active ? "var(--accent)" : "var(--panel)",
                      color: active ? "#ffffff" : "var(--text-2)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 600,
                      transition: "all 150ms",
                    }}
                  >
                    {active ? "✓ " : ""}{tag.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>{t("student.profile.tagsEmpty")}</p>
          )}

          {pickedTags ? (
            <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
              <button
                type="button"
                onClick={saveTags}
                disabled={savingTags}
                style={{
                  height: 38,
                  padding: "0 18px",
                  borderRadius: "var(--radius-sm)",
                  border: 0,
                  background: "linear-gradient(135deg, var(--accent), var(--accent-alt))",
                  color: "#ffffff",
                  cursor: savingTags ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: savingTags ? 0.6 : 1,
                  boxShadow: "var(--shadow-glow-soft)",
                }}
              >
                {savingTags ? t("common.saving") : t("student.profile.tagsSave")}
              </button>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {pickedTags.size} {pickedTags.size === 1 ? "тег" : "тегов"}
              </span>
              {tagsMsg ? <span style={{ color: "var(--success-strong)", fontSize: 13, fontWeight: 600 }}>{tagsMsg}</span> : null}
              {tagsErr ? <span style={{ color: "var(--danger-strong)", fontSize: 13, fontWeight: 600 }}>{tagsErr}</span> : null}
            </div>
          ) : null}
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Последние достижения</h3>
          {achievementsQuery.loading && !unlockedAchievements.length ? (
            <p>{t("common.loading")}</p>
          ) : unlockedAchievements.length ? (
            <ul className={styles.achievementList}>
              {unlockedAchievements.map((item) => (
                <li key={item.id} className={styles.achievementItem}>
                  <p className={styles.achievementTitle}>{item.name}</p>
                  <p className={styles.achievementMeta}>
                    {item.description}
                    {item.unlockedAt ? ` • ${formatDateTime(item.unlockedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--muted)" }}>Пока нет разблокированных достижений.</p>
          )}
        </article>
      </section>
    </div>
  );
}
