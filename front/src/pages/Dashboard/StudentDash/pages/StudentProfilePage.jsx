import { useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./StudentProfilePage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { gamificationApi, profileApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";

export default function StudentProfilePage() {
  const { user } = useAuth();
  const fileRef = useRef(null);

  const profileQuery = useApi(() => profileApi.me(), []);
  const statsQuery = useApi(() => gamificationApi.studentStats(), []);
  const achievementsQuery = useApi(() => gamificationApi.studentAchievements(), []);

  const [bioDraft, setBioDraft] = useState(null);
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const profile = profileQuery.data ?? {};
  const bio = bioDraft ?? profile.bio ?? "";

  const fullName = useMemo(() => {
    if (profile.firstName || profile.lastName) {
      return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    }
    return user?.name || "Ученик";
  }, [profile.firstName, profile.lastName, user?.name]);

  const initials = useMemo(() => {
    return fullName.split(" ").slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  }, [fullName]);

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
      setBioError(err?.message || "Не удалось сохранить");
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
      setAvatarError(err?.message || "Ошибка загрузки");
    } finally {
      event.target.value = "";
    }
  }

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
            title="Загрузить аватар"
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
              <span className={styles.tag}>Ученик</span>
              {stats.level != null ? <span className={styles.tag}>Уровень {stats.level}</span> : null}
              {stats.rank != null ? <span className={styles.tag}>Ранг #{stats.rank}</span> : null}
            </div>
            {avatarError ? <p style={{ color: "var(--danger)", fontSize: 13 }}>{avatarError}</p> : null}
          </div>
        </div>

        <div className={styles.heroStats}>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Всего XP</p>
            <p className={styles.metricValue}>{stats.totalXp ?? "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Серия дней</p>
            <p className={styles.metricValue}>{stats.currentStreak ?? "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Сдано заданий</p>
            <p className={styles.metricValue}>{stats.completedAssignments ?? "—"}</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Достижений</p>
            <p className={styles.metricValue}>
              {stats.achievementsUnlocked ?? "—"}/{stats.totalAchievements ?? "—"}
            </p>
          </article>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Контакты</h3>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{profile.email || user?.email || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Имя</span>
              <span className={styles.rowValue}>{profile.firstName || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Фамилия</span>
              <span className={styles.rowValue}>{profile.lastName || "—"}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Школа</span>
              <span className={styles.rowValue}>{user?.schoolName || "—"}</span>
            </li>
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>О себе</h3>
          <textarea
            rows={5}
            value={bio}
            onChange={(e) => setBioDraft(e.target.value)}
            placeholder="Коротко о себе"
            style={{ width: "100%", padding: 10, border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)", resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
            <button type="button" onClick={saveBio} disabled={savingBio || bioDraft === null}>
              {savingBio ? "Сохранение…" : "Сохранить"}
            </button>
            {bioDraft !== null ? (
              <button type="button" onClick={() => setBioDraft(null)}>Отмена</button>
            ) : null}
            {bioError ? <span style={{ color: "var(--danger)", fontSize: 13 }}>{bioError}</span> : null}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.widePanel}`}>
          <h3 className={styles.panelTitle}>Последние достижения</h3>
          {achievementsQuery.loading && !unlockedAchievements.length ? (
            <p>Загрузка…</p>
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
