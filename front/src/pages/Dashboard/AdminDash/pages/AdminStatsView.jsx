import { Link } from "react-router-dom";
import styles from "./AdminPages.module.css";

const stats = [
  { label: "Ученики", value: "1,248", meta: "+28 за месяц", href: "/admin/users?role=STUDENT" },
  { label: "Учителя", value: "86", meta: "14 кафедр", href: "/admin/users?role=TEACHER" },
  { label: "Родители", value: "1,032", meta: "84% подключены", href: "/admin/users?role=PARENT" },
  { label: "Классы", value: "42", meta: "6 новых в этом году", href: "/admin/users?role=STUDENT" },
  { label: "Посещаемость сегодня", value: "96%", meta: "по всем классам" },
  { label: "Домашние задания", value: "317", meta: "в проверке" },
  { label: "Открытые обращения", value: "12", meta: "в support" },
  { label: "Опубликованные опросы", value: "9", meta: "3 активных сейчас" },
];

const activities = [
  { text: "Новый класс 10-Б добавлен в расписание", time: "10 минут назад" },
  { text: "Синхронизация учителей из HR успешно завершена", time: "45 минут назад" },
  { text: "Опубликован опрос по качеству домашних заданий", time: "1 час назад" },
  { text: "Зарегистрированы 23 новых ученика", time: "сегодня" },
];

const roleDistribution = [
  { label: "Ученики", percent: 78 },
  { label: "Родители", percent: 64 },
  { label: "Учителя", percent: 91 },
  { label: "Классные руководители", percent: 58 },
];

const atRisk = [
  { group: "9-А", attendance: "88%", issue: "Низкая посещаемость", severity: "high" },
  { group: "11-В", attendance: "86%", issue: "Просроченные задания", severity: "high" },
  { group: "10-Б", attendance: "89%", issue: "Низкая активность в опросах", severity: "medium" },
];

const statTones = ["toneHot", "toneSky", "toneGold", "toneMint"];

export default function AdminStatsView() {
  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Общая статистика школы</h2>
          <p className={styles.sectionSub}>
            Ключевые показатели по пользователям, учебному процессу и активности в системе.
          </p>
        </div>
        <span className={styles.statusChip}>
          <span className={styles.dot} />
          Обновлено только что
        </span>
      </section>

      <section className={styles.statsGrid}>
        {stats.map((item, index) => {
          const cardClass = `${styles.statCard} ${styles[statTones[index % statTones.length]]}`;

          if (item.href) {
            return (
              <Link key={item.label} to={item.href} className={`${cardClass} ${styles.statCardLink}`}>
                <p className={styles.statLabel}>{item.label}</p>
                <p className={styles.statValue}>{item.value}</p>
                <p className={styles.statMeta}>{item.meta}</p>
                <p className={styles.statHint}>Открыть список</p>
              </Link>
            );
          }

          return (
            <article key={item.label} className={cardClass}>
              <p className={styles.statLabel}>{item.label}</p>
              <p className={styles.statValue}>{item.value}</p>
              <p className={styles.statMeta}>{item.meta}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Последняя активность</h3>
          <ul className={styles.activityList}>
            {activities.map((item) => (
              <li key={item.text} className={styles.activityItem}>
                <span className={styles.activityMain}>{item.text}</span>
                <span className={styles.activityTime}>{item.time}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Заполненность профилей</h3>
          <ul className={styles.progressList}>
            {roleDistribution.map((item) => (
              <li key={item.label} className={styles.progressRow}>
                <div className={styles.progressHead}>
                  <span>{item.label}</span>
                  <span>{item.percent}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${item.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Класс</th>
              <th>Посещаемость</th>
              <th>Риск</th>
            </tr>
          </thead>
          <tbody>
            {atRisk.map((row) => (
              <tr key={row.group}>
                <td>{row.group}</td>
                <td className={styles.riskAttendance}>{row.attendance}</td>
                <td>
                  <span className={`${styles.riskTag} ${styles[row.severity]}`}>{row.issue}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
