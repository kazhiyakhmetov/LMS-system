import { useMemo } from "react";
import styles from "./StudentGamificationPage.module.css";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { gamificationApi } from "../../../../shared/lib/api";

export default function StudentGamificationPage() {
  const { user } = useAuth();

  const statsQuery = useApi(() => gamificationApi.studentStats(), []);
  const achievementsQuery = useApi(() => gamificationApi.studentAchievements(), []);
  const leaderboardQuery = useApi(() => gamificationApi.leaderboard(), []);

  const stats = statsQuery.data || {};
  const achievements = Array.isArray(achievementsQuery.data) ? achievementsQuery.data : [];
  const leaderboard = Array.isArray(leaderboardQuery.data) ? leaderboardQuery.data : [];

  const currentXp = stats.currentLevelXp ?? 0;
  const nextXp = stats.nextLevelXp ?? 0;
  const percent = nextXp > 0 ? Math.min(100, Math.round((currentXp / nextXp) * 100)) : 0;
  const toNext = Math.max(0, nextXp - currentXp);

  const earnedBadges = useMemo(
    () => achievements.filter((a) => a.unlocked).slice(0, 6),
    [achievements],
  );

  return (
    <div className={styles.page}>
      {statsQuery.loading && !stats.level ? (
        <p style={{ padding: 16 }}>Загрузка статистики…</p>
      ) : (
        <section className={styles.levelCard}>
          <div>
            <h2 className={styles.title}>
              Уровень {stats.level ?? "—"}
            </h2>
            <p className={styles.sub}>
              {toNext > 0
                ? `До следующего уровня осталось ${toNext} XP`
                : "Продолжай активность в заданиях и опросах"}
            </p>
          </div>
          <div className={styles.progressWrap}>
            <div className={styles.progressHead}>
              <span>{currentXp} / {nextXp} XP</span>
              <span>{percent}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
        </section>
      )}

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Твои бейджи</h3>
          {achievementsQuery.loading && !earnedBadges.length ? (
            <p>Загрузка…</p>
          ) : earnedBadges.length ? (
            <div className={styles.badges}>
              {earnedBadges.map((badge) => (
                <article key={badge.id} className={styles.badgeCard}>
                  <p className={styles.badgeTitle}>{badge.name}</p>
                  <p className={styles.badgeDesc}>{badge.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>Пока нет разблокированных достижений.</p>
          )}
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Лидерборд класса</h3>
          {leaderboardQuery.loading && !leaderboard.length ? (
            <p>Загрузка…</p>
          ) : leaderboard.length ? (
            <ul className={styles.leaderboard}>
              {leaderboard.map((row) => {
                const isMe = user?.id != null && String(row.studentId) === String(user.id);
                return (
                  <li key={row.studentId} className={styles.row}>
                    <span className={styles.rank}>#{row.rank ?? "—"}</span>
                    <span className={styles.name}>
                      {isMe ? "Ты" : row.studentName}
                      {row.className ? ` · ${row.className}` : ""}
                    </span>
                    <span className={styles.xp}>{row.totalXp ?? 0} XP</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ color: "var(--muted)" }}>Данных по лидерборду пока нет.</p>
          )}
        </article>
      </section>
    </div>
  );
}
