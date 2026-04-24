import { useState } from "react";
import styles from "./AdminPages.module.css";

const todayLessons = [
  { time: "08:30 - 09:15", classGroup: "10-А", subject: "Математика", room: "203" },
  { time: "09:30 - 10:15", classGroup: "8-В", subject: "История", room: "114" },
  { time: "10:30 - 11:15", classGroup: "11-Б", subject: "Физика", room: "Lab-2" },
  { time: "11:30 - 12:15", classGroup: "9-Г", subject: "Английский", room: "310" },
];

const templates = [
  "Шаблон: Старшая школа (5 дней)",
  "Шаблон: Средняя школа (6 дней)",
  "Шаблон: Смешанный поток (смены)",
];

export default function AdminScheduleView() {
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("Запись расписания сохранена в черновике.");
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Конструктор расписания</h2>
          <p className={styles.sectionSub}>
            Управление слотами уроков, учителями и кабинетами по дням недели.
          </p>
        </div>
        <span className={`${styles.pill} ${styles.pillDraft}`}>PLANNING</span>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Добавить урок</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGrid3}>
              <label className={styles.field}>
                <span className={styles.label}>День</span>
                <select className={styles.select} defaultValue="MONDAY">
                  <option value="MONDAY">Понедельник</option>
                  <option value="TUESDAY">Вторник</option>
                  <option value="WEDNESDAY">Среда</option>
                  <option value="THURSDAY">Четверг</option>
                  <option value="FRIDAY">Пятница</option>
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Начало</span>
                <input className={styles.input} type="time" defaultValue="08:30" />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Окончание</span>
                <input className={styles.input} type="time" defaultValue="09:15" />
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Класс</span>
                <input className={styles.input} placeholder="10-А" required />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Предмет</span>
                <input className={styles.input} placeholder="Математика" required />
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Учитель</span>
                <input className={styles.input} placeholder="ФИО учителя" />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Кабинет</span>
                <input className={styles.input} placeholder="203" />
              </label>
            </div>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit">
                Добавить в расписание
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => setMessage("")}>
                Сбросить сообщение
              </button>
            </div>

            <p className={styles.hint}>{message || "Готово для интеграции с API расписания."}</p>
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Шаблоны</h3>
          <ul className={styles.noteList}>
            {templates.map((item) => (
              <li key={item} className={styles.noteItem}>
                <p className={styles.noteMain}>{item}</p>
                <p className={styles.noteMeta}>Можно применить к новому учебному периоду</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Время</th>
              <th>Класс</th>
              <th>Предмет</th>
              <th>Кабинет</th>
            </tr>
          </thead>
          <tbody>
            {todayLessons.map((row) => (
              <tr key={`${row.time}-${row.classGroup}`}>
                <td>{row.time}</td>
                <td>{row.classGroup}</td>
                <td>{row.subject}</td>
                <td>{row.room}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
