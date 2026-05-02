import styles from "./TeacherSettingsPage.module.css";
import { useT } from "../../../../shared/lib/i18n";

const PREF_KEYS = [
  { key: "pushNotifications", enabled: true },
  { key: "emailReports", enabled: true },
  { key: "autoGrade", enabled: false },
  { key: "darkMode", enabled: false },
];

export default function TeacherSettingsPage() {
  const { t } = useT();

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("teacher.settings.title")}</h2>
        <p className={styles.sub}>{t("teacher.settings.sub")}</p>
      </section>

      <section className={styles.settingsCard}>
        <h3 className={styles.blockTitle}>{t("admin.settings.account")}</h3>
        <ul className={styles.list}>
          {PREF_KEYS.map((item) => (
            <li key={item.key} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{t(`teacher.settings.${item.key}`)}</p>
                <p className={styles.rowHint}>{t(`teacher.settings.${item.key}Hint`)}</p>
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
        <h3 className={styles.blockTitle}>{t("admin.settings.security")}</h3>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} type="button">
            {t("admin.settings.changePassword")}
          </button>
          <button className={styles.ghostBtn} type="button">
            {t("admin.settings.twoFactor")}
          </button>
        </div>
      </section>
    </div>
  );
}
