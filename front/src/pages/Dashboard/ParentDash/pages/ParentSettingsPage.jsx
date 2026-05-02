import styles from "./ParentSettingsPage.module.css";

const preferences = [
  { title: "Push-уведомления о новых оценках", hint: "Уведомлять, когда учитель выставляет оценку ребёнку", enabled: true },
  { title: "Email-сводка по успеваемости", hint: "Еженедельный отчёт о среднем балле и пропусках", enabled: true },
  { title: "Уведомления о домашних заданиях", hint: "Получать уведомления о новых заданиях ребёнка", enabled: true },
  { title: "Уведомления о пропусках", hint: "Напоминание, если ребёнок отсутствовал на уроке", enabled: false },
  { title: "Темный режим", hint: "Экспериментальная тема интерфейса", enabled: false },
];

export default function ParentSettingsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Настройки</h2>
        <p className={styles.sub}>Параметры уведомлений, безопасности аккаунта и предпочтения интерфейса.</p>
      </section>

      <section className={styles.settingsCard}>
        <h3 className={styles.blockTitle}>Уведомления</h3>
        <ul className={styles.list}>
          {preferences.map((item) => (
            <li key={item.title} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{item.title}</p>
                <p className={styles.rowHint}>{item.hint}</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" defaultChecked={item.enabled} />
                <span className={styles.slider} />
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.securityCard}>
        <h3 className={styles.blockTitle}>Безопасность</h3>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} type="button">
            Сменить пароль
          </button>
          <button className={styles.ghostBtn} type="button">
            Включить 2FA
          </button>
        </div>
      </section>
    </div>
  );
}
