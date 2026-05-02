import { useMemo } from "react";
import styles from "./StudentGamificationPage.module.css";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { gamificationApi } from "../../../../shared/lib/api";
import { getAvatarUrl, getInitials } from "../../../../shared/lib/utils/avatar";
import { useT } from "../../../../shared/lib/i18n";

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

  return (
    <div className={styles.page}>
      {statsQuery.loading && stats.level == null ? (
        <p style={{ padding: 16 }}>{t("common.loading")}</p>
      ) : (
        <section className={styles.levelCard}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 className={styles.title}>
              {t("student.gamification.currentLevel", { level: stats.level ?? "—" })}
            </h2>
            <p className={styles.sub}>
              {toNext > 0
                ? `${t("student.gamification.nextLevelXp")}: ${toNext} XP`
                : t("student.gamification.maxLevel")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginTop: 18 }}>
              <div style={{ padding: "10px 12px", background: "var(--panel)", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
                  {t("student.gamification.totalEarned")}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--accent-strong)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {stats.totalXp ?? 0}
                </p>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--panel)", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
                  {t("student.gamification.rank")}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#d97706", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  #{stats.rank ?? "—"}
                </p>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--panel)", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
                  {t("student.gamification.streak")}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {stats.currentStreak ?? 0} 🔥
                </p>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--panel)", border: "1px solid var(--stroke)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
                  {t("student.gamification.completedAssignments")}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#10b981", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {stats.completedAssignments ?? 0}
                </p>
              </div>
            </div>
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
      )}

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("student.gamification.myBadges")}</h3>
          {achievementsQuery.loading && !earnedBadges.length ? (
            <p>{t("common.loading")}</p>
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
            <p style={{ color: "var(--muted)" }}>{t("student.gamification.noBadges")}</p>
          )}
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("student.gamification.leaderboard")}</h3>
          {leaderboardQuery.loading && !leaderboard.length ? (
            <p>{t("common.loading")}</p>
          ) : leaderboard.length ? (
            <ul className={styles.leaderboard}>
              {leaderboard.map((row) => {
                const isMe = user?.id != null && String(row.studentId) === String(user.id);
                const avatarUrl = getAvatarUrl(row.profilePhotoPath);
                return (
                  <li
                    key={row.studentId}
                    className={styles.row}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: isMe ? "var(--accent-soft-2)" : "var(--panel-2)",
                      border: isMe ? "1px solid var(--accent)" : "1px solid var(--stroke-soft)",
                      marginBottom: 6,
                      transition: "all 200ms",
                    }}
                  >
                    <span
                      className={styles.rank}
                      style={{
                        minWidth: 36,
                        height: 36,
                        borderRadius: "var(--radius-pill)",
                        background: row.rank === 1 ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                                  : row.rank === 2 ? "linear-gradient(135deg, #cbd5e1, #94a3b8)"
                                  : row.rank === 3 ? "linear-gradient(135deg, #f59e0b, #b45309)"
                                  : "var(--accent-soft)",
                        color: row.rank <= 3 ? "#ffffff" : "var(--accent-strong)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {row.rank ?? "—"}
                    </span>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: "var(--radius-pill)", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--radius-pill)",
                          background: "linear-gradient(135deg, var(--accent), var(--accent-alt))",
                          color: "#ffffff",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 800,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(row.studentName)}
                      </span>
                    )}
                    <span
                      className={styles.name}
                      style={{
                        flex: 1,
                        fontWeight: isMe ? 800 : 600,
                        color: isMe ? "var(--accent-strong)" : "var(--text)",
                      }}
                    >
                      {isMe ? t("student.gamification.you") : row.studentName}
                      {row.className ? <span style={{ marginLeft: 6, color: "var(--muted)", fontWeight: 500, fontSize: 12 }}>· {row.className}</span> : null}
                    </span>
                    <span
                      className={styles.xp}
                      style={{
                        fontWeight: 800,
                        color: "var(--accent-strong)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.totalXp ?? 0} XP
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ color: "var(--muted)" }}>{t("student.gamification.leaderboardEmpty")}</p>
          )}
        </article>
      </section>
    </div>
  );
}
