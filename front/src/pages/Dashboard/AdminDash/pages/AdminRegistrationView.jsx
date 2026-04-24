import { useState } from "react";
import styles from "./AdminPages.module.css";

const recentRegistrations = [
  { person: "Айжан Нурланова", role: "STUDENT", meta: "10-А • зарегистрирован 15 минут назад" },
  { person: "Ермек Сагынов", role: "PARENT", meta: "родитель ученика 8-В" },
  { person: "Динара Бекетова", role: "TEACHER", meta: "математика • приглашение отправлено" },
];

function roleLabel(role) {
  switch (role) {
    case "STUDENT":
      return "Ученик";
    case "PARENT":
      return "Родитель";
    case "TEACHER":
      return "Учитель";
    default:
      return role;
  }
}

export default function AdminRegistrationView() {
  const [status, setStatus] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setStatus("Черновик регистрации сохранен. Можно подключить POST /users/create.");
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Регистрация пользователей</h2>
          <p className={styles.sectionSub}>
            Создание учеников, родителей и учителей из единой формы администратора.
          </p>
        </div>
        <span className={`${styles.pill} ${styles.pillDraft}`}>DRAFT MODE</span>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Новый пользователь</h3>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Имя и фамилия</span>
                <input className={styles.input} placeholder="Например, Айгерим Сатыбалдиева" required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Роль</span>
                <select className={styles.select} defaultValue="STUDENT">
                  <option value="STUDENT">Ученик</option>
                  <option value="PARENT">Родитель</option>
                  <option value="TEACHER">Учитель</option>
                </select>
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input className={styles.input} type="email" placeholder="name@school.edu" required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Телефон</span>
                <input className={styles.input} placeholder="+7 (___) ___-__-__" />
              </label>
            </div>

            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Класс / Группа</span>
                <input className={styles.input} placeholder="10-А" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>ID связанного профиля</span>
                <input className={styles.input} placeholder="Для родителя или учителя" />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Комментарий</span>
              <textarea
                className={styles.textarea}
                placeholder="Дополнительные данные для регистрации и первого входа"
              />
            </label>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit">
                Сохранить
              </button>
              <button className={styles.ghostBtn} type="button" onClick={() => setStatus("")}>
                Очистить статус
              </button>
            </div>

            <p className={styles.hint}>{status || "После интеграции здесь будет ответ backend."}</p>
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Последние регистрации</h3>
          <ul className={styles.noteList}>
            {recentRegistrations.map((item) => (
              <li key={item.person} className={styles.noteItem}>
                <p className={styles.noteMain}>
                  {item.person} <span className={`${styles.pill} ${styles.pillDraft}`}>{roleLabel(item.role)}</span>
                </p>
                <p className={styles.noteMeta}>{item.meta}</p>
              </li>
            ))}
          </ul>

          <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>
            Быстрый импорт
          </h3>
          <ul className={styles.noteList}>
            <li className={styles.noteItem}>
              <p className={styles.noteMain}>1. Загрузить CSV</p>
              <p className={styles.noteMeta}>Поля: fullName, role, email, classGroup, parentLinkId</p>
            </li>
            <li className={styles.noteItem}>
              <p className={styles.noteMain}>2. Проверить валидацию</p>
              <p className={styles.noteMeta}>Показывать ошибки до отправки в backend</p>
            </li>
            <li className={styles.noteItem}>
              <p className={styles.noteMain}>3. Отправить batch-запрос</p>
              <p className={styles.noteMeta}>POST /users/import и лог результата</p>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
