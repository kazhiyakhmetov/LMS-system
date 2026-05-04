import { useMemo } from "react";
import styles from "./StudentGamificationPage.module.css";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { gamificationApi } from "../../../../shared/lib/api";
import { getInitials } from "../../../../shared/lib/utils/avatar";
import { useT } from "../../../../shared/lib/i18n";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function StudentGamificationPage() {
  const { t } = useT();
  const { user } = useAuth();

  const statsQuery = useApi(() => gamificationApi.studentStats(), []);
  const achievementsQuery = useApi(() => gamificationApi.studentAchievements(), []);
  const leaderboardQuery = useApi(() => gamificationApi.leaderboard(), []);

  const stats = statsQuery.data || {};
  const achievements = Array.isArray(achievementsQuery.data) ? achievementsQuery.data : [];
  const leaderboard = Array.isArray(leaderboardQuery.data) ? leaderboardQuery.data : [];

  const safeCurrentXp = Math.max(0, stats.currentLevelXp ?? 0);
  const safeNextXp = Math.max(1, stats.nextLevelXp ?? 1);
  const percent = Math.min(100, Math.round((safeCurrentXp / safeNextXp) * 100));
  const toNext = Math.max(0, safeNextXp - safeCurrentXp);

  const earnedBadges = useMemo(
    () => achievements.filter((a) => a.unlocked).slice(0, 6),
    [achievements],
  );

  // Top 3 for podium, rest for table
  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const rest = useMemo(() => leaderboard.slice(3, 10), [leaderboard]);

  // Pseudo-random sparkline (XP earned per day this week)
  // Replace with real per-day data if backend provides it
  const sparkData = useMemo(() => {
    const totalXp = stats.totalXp ?? 0;
    const seed = totalXp || 1;
    return WEEKDAYS.map((_, i) => Math.max(15, Math.round(((seed * (i + 3)) % 90) + 25)));
  }, [stats.totalXp]);
  const sparkMax = Math.max(...sparkData, 1);

  const isMe = (row) => user?.id != null && String(row.studentId) === String(user.id);

  return (
    <div className={styles.page}>
      {statsQuery.loading && stats.level == null ? (
        <p style={{ padding: 16 }}>{t("common.loading")}</p>
      ) : (
        <>
          {/* === Hero level card === */}
          <section className={styles.levelCard}>
            <div>
              <h2 className={styles.title}>
                {t("student.gamification.currentLevel", { level: stats.level ?? "—" })}
              </h2>
              <p className={styles.sub}>
                {toNext > 0
                  ? `Ещё ${toNext} XP до уровня ${(stats.level ?? 0) + 1} 🚀`
                  : t("student.gamification.maxLevel")}
              </p>
            </div>
            <div className={styles.progressWrap}>
              <div className={styles.progressHead}>
                <span>{safeCurrentXp} / {safeNextXp} XP</span>
                <span>{percent}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${percent}%` }} />
              </div>
            </div>
          </section>

          {/* === Stat tiles === */}
          <section className={styles.statRow}>
            <article className={`${styles.statTile} ${styles.statTile_xp}`}>
              <span className={styles.statTileLabel}>{t("student.gamification.totalEarned")}</span>
              <span className={styles.statTileValue}>{stats.totalXp ?? 0}</span>
              <span className={styles.statTileMeta}>опыт всего</span>
            </article>
            <article className={`${styles.statTile} ${styles.statTile_rank}`}>
              <span className={styles.statTileLabel}>{t("student.gamification.rank")}</span>
              <span className={styles.statTileValue}>#{stats.rank ?? "—"}</span>
              <span className={styles.statTileMeta}>в классе</span>
            </article>
            <article className={`${styles.statTile} ${styles.statTile_streak}`}>
              <span className={styles.statTileLabel}>{t("student.gamification.streak")} 🔥</span>
              <span className={styles.statTileValue}>{stats.currentStreak ?? 0}</span>
              <span className={styles.statTileMeta}>{`лучшая: ${stats.maxStreak ?? 0}`}</span>
            </article>
            <article className={`${styles.statTile} ${styles.statTile_done}`}>
              <span className={styles.statTileLabel}>{t("student.gamification.completedAssignments")}</span>
              <span className={styles.statTileValue}>{stats.completedAssignments ?? 0}</span>
              <span className={styles.statTileMeta}>{`идеально: ${stats.perfectAssignments ?? 0}`}</span>
            </article>
          </section>

          {/* === Layout: leaderboard left, badges + activity right === */}
          <section className={styles.grid}>
            <article className={styles.panel}>
              <h3 className={styles.panelTitle}>🏆 Топ класса</h3>

              {leaderboardQuery.loading && !leaderboard.length ? (
                <p style={{ color: "var(--muted)" }}>{t("common.loading")}</p>
              ) : top3.length ? (
                <>
                  <div className={styles.podium}>
                    {/* Position 2 (silver, left) */}
                    {top3[1] ? (
                      <div className={`${styles.podiumStep} ${styles.podiumStep_second}`}>
                        <div className={styles.podiumAvatar}>{getInitials(top3[1].studentName)}</div>
                        <div className={styles.podiumName}>
                          {isMe(top3[1]) ? t("student.gamification.you") : (top3[1].studentName?.split(" ")[0] || "—")}
                        </div>
                        <div className={styles.podiumXp}>{top3[1].totalXp ?? 0} XP</div>
                        <div className={styles.podiumBlock}>2</div>
                      </div>
                    ) : null}

                    {/* Position 1 (gold, center, with crown) */}
                    {top3[0] ? (
                      <div className={`${styles.podiumStep} ${styles.podiumStep_first}`}>
                        <div className={styles.podiumCrown}>👑</div>
                        <div className={styles.podiumAvatar}>{getInitials(top3[0].studentName)}</div>
                        <div className={styles.podiumName}>
                          {isMe(top3[0]) ? t("student.gamification.you") : (top3[0].studentName?.split(" ")[0] || "—")}
                        </div>
                        <div className={styles.podiumXp}>{top3[0].totalXp ?? 0} XP</div>
                        <div className={styles.podiumBlock}>1</div>
                      </div>
                    ) : null}

                    {/* Position 3 (bronze, right) */}
                    {top3[2] ? (
                      <div className={`${styles.podiumStep} ${styles.podiumStep_third}`}>
                        <div className={styles.podiumAvatar}>{getInitials(top3[2].studentName)}</div>
                        <div className={styles.podiumName}>
                          {isMe(top3[2]) ? t("student.gamification.you") : (top3[2].studentName?.split(" ")[0] || "—")}
                        </div>
                        <div className={styles.podiumXp}>{top3[2].totalXp ?? 0} XP</div>
                        <div className={styles.podiumBlock}>3</div>
                      </div>
                    ) : null}
                  </div>

                  {rest.length > 0 ? (
                    <ul className={styles.leaderboard}>
                      {rest.map((row) => (
                        <li
                          key={row.studentId}
                          className={`${styles.row} ${isMe(row) ? styles.rowMe : ""}`}
                        >
                          <span className={styles.rank}>{row.rank ?? "—"}</span>
                          <span className={styles.rowAvatar}>{getInitials(row.studentName)}</span>
                          <span className={styles.name}>
                            {isMe(row) ? t("student.gamification.you") : row.studentName}
                          </span>
                          <span className={styles.xp}>{row.totalXp ?? 0} XP</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p style={{ color: "var(--muted)" }}>{t("student.gamification.leaderboardEmpty")}</p>
              )}
            </article>

            <div style={{ display: "grid", gap: 16 }}>
              {/* Activity sparkline */}
              <article className={styles.panel}>
                <h3 className={styles.panelTitle}>📊 Активность за неделю</h3>
                <div className={styles.sparkRow}>
                  {sparkData.map((v, i) => (
                    <div
                      key={i}
                      className={styles.sparkBar}
                      style={{ height: `${(v / sparkMax) * 100}%` }}
                      title={`${v} XP`}
                    />
                  ))}
                </div>
                <div className={styles.sparkAxis}>
                  {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
                </div>
              </article>

              {/* Badges */}
              <article className={styles.panel}>
                <h3 className={styles.panelTitle}>{t("student.gamification.myBadges")}</h3>
                {achievementsQuery.loading && !earnedBadges.length ? (
                  <p style={{ color: "var(--muted)" }}>{t("common.loading")}</p>
                ) : earnedBadges.length ? (
                  <div className={styles.badges}>
                    {earnedBadges.map((badge) => (
                      <article key={badge.id} className={styles.badgeCard}>
                        <div className={styles.badgeIcon}>{badge.icon || "🏅"}</div>
                        <p className={styles.badgeTitle}>{badge.name}</p>
                        <p className={styles.badgeDesc}>{badge.description}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--muted)" }}>{t("student.gamification.noBadges")}</p>
                )}
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
