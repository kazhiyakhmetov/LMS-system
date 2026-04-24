import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./StudentProfilePage.module.css";

const achievements = [
  { title: "Топ-3 по активности", meta: "Чат класса • за эту неделю" },
  { title: "Все дедлайны в срок", meta: "12 заданий подряд без просрочек" },
  { title: "Рост среднего балла", meta: "+0.4 за последние 2 месяца" },
];

export default function StudentProfilePage() {
  const { user } = useAuth();

  const fullName = user?.name || "Алия Есенова";

  const initials = useMemo(() => {
    return fullName
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [fullName]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.profileMain}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <h2 className={styles.name}>{fullName}</h2>
            <p className={styles.meta}>10-А • ID: ST-1024 • Алматы</p>
            <div className={styles.tags}>
              <span className={styles.tag}>Ученик</span>
              <span className={styles.tag}>Физ-мат направление</span>
              <span className={styles.tag}>Смена: 1</span>
            </div>
          </div>
        </div>

        <div className={styles.heroStats}>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Средний балл</p>
            <p className={styles.metricValue}>4.6</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Посещаемость</p>
            <p className={styles.metricValue}>96%</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Сдано вовремя</p>
            <p className={styles.metricValue}>92%</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Рейтинг LMS</p>
            <p className={styles.metricValue}>A</p>
          </article>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Личные данные</h3>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Дата рождения</span>
              <span className={styles.rowValue}>12.04.2009</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Язык обучения</span>
              <span className={styles.rowValue}>Русский</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Класс</span>
              <span className={styles.rowValue}>10-А</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Куратор</span>
              <span className={styles.rowValue}>Динара Турсынова</span>
            </li>
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Контакты</h3>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>aliya.student@school.edu</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Телефон</span>
              <span className={styles.rowValue}>+7 700 123 45 67</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Родитель</span>
              <span className={styles.rowValue}>Есенова Марал</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Экстренный контакт</span>
              <span className={styles.rowValue}>+7 701 555 98 40</span>
            </li>
          </ul>
        </article>

        <article className={`${styles.panel} ${styles.widePanel}`}>
          <h3 className={styles.panelTitle}>Учебный профиль</h3>
          <div className={styles.progressList}>
            <div className={styles.progressRow}>
              <div className={styles.progressHead}>
                <span>Академический прогресс</span>
                <span>87%</span>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: "87%" }} />
              </div>
            </div>
            <div className={styles.progressRow}>
              <div className={styles.progressHead}>
                <span>Домашние задания</span>
                <span>92%</span>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: "92%" }} />
              </div>
            </div>
            <div className={styles.progressRow}>
              <div className={styles.progressHead}>
                <span>Активность в LMS</span>
                <span>81%</span>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: "81%" }} />
              </div>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Достижения</h3>
          <ul className={styles.achievementList}>
            {achievements.map((item) => (
              <li key={item.title} className={styles.achievementItem}>
                <p className={styles.achievementTitle}>{item.title}</p>
                <p className={styles.achievementMeta}>{item.meta}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
