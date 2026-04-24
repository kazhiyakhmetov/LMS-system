import styles from "./StudentGamificationPage.module.css";

const badges = [
  { title: "7-day streak", description: "Ежедневный вход в LMS 7 дней подряд" },
  { title: "Quiz Master", description: "3 теста подряд на 90%+" },
  { title: "Fast Submit", description: "5 заданий сданы раньше дедлайна" },
  { title: "Team Helper", description: "10 полезных сообщений в учебном чате" },
];

const leaderboard = [
  { rank: 1, name: "Алия Е.", xp: "2 140 XP" },
  { rank: 2, name: "Мадияр С.", xp: "1 980 XP" },
  { rank: 3, name: "Ты", xp: "1 240 XP" },
  { rank: 4, name: "Нурбол Т.", xp: "1 110 XP" },
];

export default function StudentGamificationPage() {
  return (
    <div className={styles.page}>
      <section className={styles.levelCard}>
        <div>
          <h2 className={styles.title}>Уровень 8: Explorer</h2>
          <p className={styles.sub}>До уровня 9 осталось 260 XP. Продолжай активность в заданиях и опросах.</p>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressHead}>
            <span>1 240 / 1 500 XP</span>
            <span>83%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: "83%" }} />
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Твои бейджи</h3>
          <div className={styles.badges}>
            {badges.map((badge) => (
              <article key={badge.title} className={styles.badgeCard}>
                <p className={styles.badgeTitle}>{badge.title}</p>
                <p className={styles.badgeDesc}>{badge.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Лидерборд класса</h3>
          <ul className={styles.leaderboard}>
            {leaderboard.map((row) => (
              <li key={row.rank} className={styles.row}>
                <span className={styles.rank}>#{row.rank}</span>
                <span className={styles.name}>{row.name}</span>
                <span className={styles.xp}>{row.xp}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
