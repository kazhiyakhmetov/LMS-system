import styles from "./StudentSettingsPage.module.css";
import { useT } from "../../../../shared/lib/i18n";
import { usePush } from "../../../../shared/lib/hooks/usePush";

const TEST_BTN = { height: 30, fontSize: 12, padding: "0 12px", borderRadius: 8, border: "1px solid var(--stroke)", background: "var(--panel)", color: "var(--text)", cursor: "pointer" };

const PREF_KEYS = [
  { key: "pushAssignments", enabled: true },
  { key: "emailGrades", enabled: true },
  { key: "onlineStatus", enabled: false },
  { key: "darkMode", enabled: false },
];

export default function StudentSettingsPage() {
  const { t } = useT();
  const push = usePush();

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("student.settings.title")}</h2>
        <p className={styles.sub}>{t("student.settings.sub")}</p>
      </section>

      <section className={styles.settingsCard}>
        <h3 className={styles.blockTitle}>{t("admin.settings.account")}</h3>
        <ul className={styles.list}>
          {PREF_KEYS.map((item) => {
            const isPush = item.key === "pushAssignments";
            return (
              <li key={item.key} className={styles.row}>
                <div>
                  <p className={styles.rowTitle}>{t(`student.settings.${item.key}`)}</p>
                  <p className={styles.rowHint} style={isPush && push.error ? { color: "var(--danger)" } : undefined}>
                    {isPush && push.error ? push.error : t(`student.settings.${item.key}Hint`)}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isPush && push.enabled ? (
                    <button type="button" style={TEST_BTN} onClick={push.test}>Тест</button>
                  ) : null}
                  <label className={styles.switch}>
                    {isPush ? (
                      <input type="checkbox" checked={push.enabled} disabled={push.busy || !push.supported} onChange={push.toggle} />
                    ) : (
                      <input type="checkbox" defaultChecked={item.enabled} />
                    )}
                    <span className={styles.slider} />
                  </label>
                </div>
              </li>
            );
          })}
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
