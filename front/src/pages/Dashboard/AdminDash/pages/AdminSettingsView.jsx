import { useMemo } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useT } from "../../../../shared/lib/i18n";
import styles from "./AdminPages.module.css";

function Icon({ name }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "user":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
          <path d="M12 2c3 3 3 17 0 20" /><path d="M12 2c-3 3-3 17 0 20" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    case "info":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v.01" /><path d="M12 12v4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "key":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="15" r="4" /><path d="M11 13l9-9" /><path d="M17 7l3 3" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /><path d="M14 4h6v16h-6" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminSettingsView() {
  const { user, logout } = useAuth();
  const { t } = useT();

  const initials = useMemo(() => {
    const name = user?.name || user?.email || "A";
    return name.split(" ").slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
  }, [user]);

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.settings.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.settings.sub")}</p>
        </div>
        <span className={styles.statusChip}>
          <span className={styles.dot} />
          {t("roles.ADMIN")}
        </span>
      </section>

      <section className={styles.settingsGrid}>
        {/* Account card */}
        <article className={styles.settingsCard}>
          <header className={styles.settingsCardHead}>
            <div className={styles.settingsIcon}><Icon name="user" /></div>
            <div>
              <h3 className={styles.settingsCardTitle}>{t("admin.settings.account")}</h3>
              <p className={styles.settingsCardSub}>{t("admin.settings.accountSub")}</p>
            </div>
          </header>

          <div className={styles.profilePreview}>
            <div className={styles.profileAvatar}>{initials}</div>
            <div className={styles.profileInfo}>
              <p className={styles.profileName}>{user?.name || "—"}</p>
              <p className={styles.profileMeta}>{user?.email || "—"}</p>
            </div>
          </div>

          <ul className={styles.settingsRows}>
            <li className={styles.settingsRow}>
              <span className={styles.settingsRowLabel}>{t("admin.settings.userId")}</span>
              <span className={styles.settingsRowValue}>{user?.id ?? "—"}</span>
            </li>
            <li className={styles.settingsRow}>
              <span className={styles.settingsRowLabel}>{t("admin.settings.role")}</span>
              <span className={styles.settingsRowValue}>{t(`roles.${user?.role || "ADMIN"}`)}</span>
            </li>
            <li className={styles.settingsRow}>
              <span className={styles.settingsRowLabel}>{t("admin.settings.school")}</span>
              <span className={styles.settingsRowValue}>{user?.schoolName || "—"}</span>
            </li>
          </ul>
        </article>

        {/* Theme card */}
        <article className={styles.settingsCard}>
          <header className={styles.settingsCardHead}>
            <div className={styles.settingsIcon}><Icon name="moon" /></div>
            <div>
              <h3 className={styles.settingsCardTitle}>{t("admin.settings.theme")}</h3>
              <p className={styles.settingsCardSub}>{t("admin.settings.themeSub")}</p>
            </div>
          </header>

          <div className={styles.themeChoices}>
            <button type="button" className={`${styles.themeChoice} ${styles.themeChoiceActive}`}>
              <span className={styles.themeChoiceIcon}><Icon name="sun" /></span>
              {t("admin.settings.themeLight")}
            </button>
            <button type="button" className={styles.themeChoice} disabled>
              <span className={styles.themeChoiceIcon}><Icon name="moon" /></span>
              {t("admin.settings.themeDark")}
              <span className={styles.todoBadge}>{t("admin.settings.todo")}</span>
            </button>
          </div>
        </article>

        {/* Security card */}
        <article className={styles.settingsCard}>
          <header className={styles.settingsCardHead}>
            <div className={styles.settingsIcon}><Icon name="shield" /></div>
            <div>
              <h3 className={styles.settingsCardTitle}>{t("admin.settings.security")}</h3>
              <p className={styles.settingsCardSub}>{t("admin.settings.securitySub")}</p>
            </div>
          </header>

          <ul className={styles.actionList}>
            <li className={styles.actionItem}>
              <span className={styles.actionIcon}><Icon name="key" /></span>
              <span className={styles.actionLabel}>{t("admin.settings.changePassword")}</span>
              <span className={styles.todoBadge}>{t("admin.settings.todo")}</span>
            </li>
            <li className={styles.actionItem}>
              <span className={styles.actionIcon}><Icon name="shield" /></span>
              <span className={styles.actionLabel}>{t("admin.settings.twoFactor")}</span>
              <span className={styles.todoBadge}>{t("admin.settings.todo")}</span>
            </li>
          </ul>
        </article>

        {/* About card */}
        <article className={styles.settingsCard}>
          <header className={styles.settingsCardHead}>
            <div className={styles.settingsIcon}><Icon name="info" /></div>
            <div>
              <h3 className={styles.settingsCardTitle}>{t("admin.settings.about")}</h3>
              <p className={styles.settingsCardSub}>StudIX LMS</p>
            </div>
          </header>

          <ul className={styles.settingsRows}>
            <li className={styles.settingsRow}>
              <span className={styles.settingsRowLabel}>{t("admin.settings.version")}</span>
              <span className={styles.settingsRowValue}>1.0.0 (diploma)</span>
            </li>
            <li className={styles.settingsRow}>
              <span className={styles.settingsRowLabel}>API</span>
              <span className={styles.settingsRowValue}>Spring Boot 3.5</span>
            </li>
            <li className={styles.settingsRow}>
              <span className={styles.settingsRowLabel}>UI</span>
              <span className={styles.settingsRowValue}>React 19 + Vite</span>
            </li>
          </ul>
        </article>

        {/* Logout card */}
        <article className={`${styles.settingsCard} ${styles.dangerCard}`}>
          <header className={styles.settingsCardHead}>
            <div className={`${styles.settingsIcon} ${styles.settingsIconDanger}`}><Icon name="logout" /></div>
            <div>
              <h3 className={styles.settingsCardTitle}>{t("admin.settings.logout")}</h3>
              <p className={styles.settingsCardSub}>{t("admin.settings.logoutWarning")}</p>
            </div>
          </header>

          <button type="button" className={styles.dangerBtn} onClick={() => logout()}>
            <Icon name="logout" />
            {t("admin.settings.logoutBtn")}
          </button>
        </article>
      </section>
    </div>
  );
}
