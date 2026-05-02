import styles from "./StudentSettingsPage.module.css";
import { useT } from "../../../../shared/lib/i18n";

const PREF_KEYS = [
  { key: "pushAssignments", enabled: true },
  { key: "emailGrades", enabled: true },
  { key: "onlineStatus", enabled: false },
  { key: "darkMode", enabled: false },
];

export default function StudentSettingsPage() {
  const { t } = useT();

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("student.settings.title")}</h2>
        <p className={styles.sub}>{t("student.settings.sub")}</p>
      </section>

      <section className={styles.settingsCard}>
        <h3 className={styles.blockTitle}>{t("admin.settings.account")}</h3>
        <ul className={styles.list}>
          {PREF_KEYS.map((item) => (
            <li key={item.key} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{t(`student.settings.${item.key}`)}</p>
                <p className={styles.rowHint}>{t(`student.settings.${item.key}Hint`)}</p>
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
