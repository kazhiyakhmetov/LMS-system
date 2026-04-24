import styles from "./TeacherSettingsPage.module.css";

const preferences = [
  { title: "Push-уведомления о новых сообщениях", hint: "Уведомления из чатов с классами и родителями", enabled: true },
  { title: "Email-отчеты по успеваемости", hint: "Недельная сводка по классам и предметам", enabled: true },
  { title: "Напоминания о проверке работ", hint: "Уведомления за 24 часа до дедлайна", enabled: true },
  { title: "Показывать статус в рабочем чате", hint: "Коллеги и родители видят вашу активность", enabled: false },
];

export default function TeacherSettingsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Настройки</h2>
        <p className={styles.sub}>Персональные параметры аккаунта преподавателя, уведомления и безопасность.</p>
      </section>

      <section className={styles.settingsCard}>
        <h3 className={styles.blockTitle}>Предпочтения</h3>
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

