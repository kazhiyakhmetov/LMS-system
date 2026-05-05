import styles from "./ParentSettingsPage.module.css";
import { useT } from "../../../../shared/lib/i18n";

const PREF_KEYS = [
  { key: "grades", enabled: true },
  { key: "email", enabled: true },
  { key: "assignments", enabled: true },
  { key: "absence", enabled: false },
  { key: "dark", enabled: false },
];

export default function ParentSettingsPage() {
  const { t } = useT();

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("parent.settings.title")}</h2>
        <p className={styles.sub}>{t("parent.settings.sub")}</p>
      </section>

      <section className={styles.settingsCard}>
        <h3 className={styles.blockTitle}>{t("parent.settings.preferencesTitle")}</h3>
        <ul className={styles.list}>
          {PREF_KEYS.map((item) => (
            <li key={item.key} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{t(`parent.settings.preferences.${item.key}Title`)}</p>
                <p className={styles.rowHint}>{t(`parent.settings.preferences.${item.key}Hint`)}</p>
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
        <h3 className={styles.blockTitle}>{t("parent.settings.securityTitle")}</h3>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} type="button">
            {t("parent.settings.changePassword")}
          </button>
          <button className={styles.ghostBtn} type="button">
            {t("parent.settings.enable2fa")}
          </button>
        </div>
      </section>
    </div>
  );
}
