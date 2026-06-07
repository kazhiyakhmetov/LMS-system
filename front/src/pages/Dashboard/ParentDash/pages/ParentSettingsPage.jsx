import styles from "./ParentSettingsPage.module.css";
import { useT } from "../../../../shared/lib/i18n";
import { usePush } from "../../../../shared/lib/hooks/usePush";

const TEST_BTN = { height: 30, fontSize: 12, padding: "0 12px", borderRadius: 8, border: "1px solid var(--stroke)", background: "var(--panel)", color: "var(--text)", cursor: "pointer" };

const PREF_KEYS = [
  { key: "grades", enabled: true },
  { key: "email", enabled: true },
  { key: "assignments", enabled: true },
  { key: "absence", enabled: false },
  { key: "dark", enabled: false },
];

export default function ParentSettingsPage() {
  const { t } = useT();
  const push = usePush();

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("parent.settings.title")}</h2>
        <p className={styles.sub}>{t("parent.settings.sub")}</p>
      </section>

      <section className={styles.settingsCard}>
        <h3 className={styles.blockTitle}>{t("parent.settings.preferencesTitle")}</h3>
        <ul className={styles.list}>
          {PREF_KEYS.map((item) => {
            const isPush = item.key === "grades";
            return (
              <li key={item.key} className={styles.row}>
                <div>
                  <p className={styles.rowTitle}>{t(`parent.settings.preferences.${item.key}Title`)}</p>
                  <p className={styles.rowHint} style={isPush && push.error ? { color: "var(--danger)" } : undefined}>
                    {isPush && push.error ? push.error : t(`parent.settings.preferences.${item.key}Hint`)}
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
