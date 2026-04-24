import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import styles from "./TeacherProfilePage.module.css";

const classes = [
  { className: "10-А", subject: "Алгебра", students: 27, performance: "4.1" },
  { className: "9-Б", subject: "Геометрия", students: 29, performance: "3.8" },
  { className: "11-А", subject: "Математика", students: 18, performance: "4.6" },
];

const achievements = [
  { title: "Лучший цифровой курс месяца", meta: "LMS • февраль 2026" },
  { title: "92% сдачи работ в срок", meta: "Суммарно по классам за четверть" },
  { title: "Рост успеваемости 10-А", meta: "+0.3 к среднему баллу за 2 месяца" },
];

export default function TeacherProfilePage() {
  const { user } = useAuth();

  const fullName = user?.name || "Айнур Муханова";

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
            <p className={styles.meta}>Учитель математики • ID: TC-204 • Алматы</p>
            <div className={styles.tags}>
              <span className={styles.tag}>Преподаватель</span>
              <span className={styles.tag}>Классный руководитель 10-А</span>
              <span className={styles.tag}>Стаж: 8 лет</span>
            </div>
          </div>
        </div>

        <div className={styles.heroStats}>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Классов в работе</p>
            <p className={styles.metricValue}>6</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Средний балл классов</p>
            <p className={styles.metricValue}>4.2</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Проверено за неделю</p>
            <p className={styles.metricValue}>147</p>
          </article>
          <article className={styles.metric}>
            <p className={styles.metricLabel}>Посещаемость</p>
            <p className={styles.metricValue}>93%</p>
          </article>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Личные данные</h3>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Дата рождения</span>
              <span className={styles.rowValue}>18.09.1992</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Категория</span>
              <span className={styles.rowValue}>Педагог-эксперт</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Стаж</span>
              <span className={styles.rowValue}>8 лет</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Предмет</span>
              <span className={styles.rowValue}>Алгебра, Геометрия</span>
            </li>
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Контакты</h3>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>a.mukhanova@school.edu</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Телефон</span>
              <span className={styles.rowValue}>+7 700 245 66 01</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Кабинет</span>
              <span className={styles.rowValue}>203</span>
            </li>
            <li className={styles.row}>
              <span className={styles.rowLabel}>Рабочие часы</span>
              <span className={styles.rowValue}>08:00 - 17:00</span>
            </li>
          </ul>
        </article>

        <article className={`${styles.panel} ${styles.widePanel}`}>
          <h3 className={styles.panelTitle}>Профиль нагрузки</h3>
          <div className={styles.progressList}>
            <div className={styles.progressRow}>
              <div className={styles.progressHead}>
                <span>Выполнение учебного плана</span>
                <span>78%</span>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: "78%" }} />
              </div>
            </div>
            <div className={styles.progressRow}>
              <div className={styles.progressHead}>
                <span>Проверка работ</span>
                <span>84%</span>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: "84%" }} />
              </div>
            </div>
            <div className={styles.progressRow}>
              <div className={styles.progressHead}>
                <span>Коммуникация с родителями</span>
                <span>72%</span>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: "72%" }} />
              </div>
            </div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.widePanel}`}>
          <h3 className={styles.panelTitle}>Мои классы</h3>
          <div className={styles.classList}>
            {classes.map((item) => (
              <div key={`${item.className}-${item.subject}`} className={styles.classItem}>
                <p className={styles.classTitle}>
                  {item.className} • {item.subject}
                </p>
                <p className={styles.classMeta}>
                  Учеников: {item.students} • Средний балл: {item.performance}
                </p>
              </div>
            ))}
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
