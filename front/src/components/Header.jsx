import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useT } from "../shared/lib/i18n";
import { useApi } from "../shared/lib/hooks/useApi";
import { notificationsApi } from "../shared/lib/api";
import { roleSectionPath } from "../shared/lib/auth/roleRedirect";
import styles from "./Header.module.css";

const ROLES_WITH_PROFILE = new Set(["STUDENT", "TEACHER"]);
const NOTIF_POLL_MS = 60_000;

function useClickOutside(refs, onOutside) {
  const refsRef = useRef(refs);
  const onOutsideRef = useRef(onOutside);

  useEffect(() => {
    refsRef.current = refs;
    onOutsideRef.current = onOutside;
  });

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedInside = refsRef.current.some((ref) => ref.current && ref.current.contains(event.target));
      if (!clickedInside) onOutsideRef.current?.();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);
}

function timeAgo(iso, t) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return t("header.notif.justNow");
  if (min < 60) return `${min} ${t("header.notif.minAbbr")}`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${t("header.notif.hAbbr")}`;
  const d = Math.round(h / 24);
  return `${d} ${t("header.notif.dAbbr")}`;
}

function notifIconType(type) {
  if (!type) return "info";
  if (type.includes("assignment")) return "assignment";
  if (type.includes("grade")) return "grade";
  if (type.includes("survey")) return "survey";
  if (type.includes("message") || type.includes("chat")) return "message";
  return "info";
}

function NotifTypeIcon({ type }) {
  const c = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (notifIconType(type)) {
    case "assignment":
      return <svg {...c}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6v3H9z"/><path d="M8 12h8M8 16h5"/></svg>;
    case "grade":
      return <svg {...c}><path d="M12 3l2.6 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.7 20 7.7 13.8 3.3 9.5l6.1-.9L12 3Z"/></svg>;
    case "survey":
      return <svg {...c}><path d="M8 7h11M8 12h11M8 17h11"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/></svg>;
    case "message":
      return <svg {...c}><path d="M20 14a3 3 0 0 1-3 3H9l-4 3v-3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v8Z"/></svg>;
    default:
      return <svg {...c}><circle cx="12" cy="12" r="10"/><path d="M12 8v.01"/><path d="M12 12v4"/></svg>;
  }
}

function Icon({ name }) {
  const common = { className: styles.ico, viewBox: "0 0 24 24", fill: "none" };

  switch (name) {
    case "bell":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2c3 3 3 17 0 20" />
          <path d="M12 2c-3 3-3 17 0 20" />
        </svg>
      );
    case "user":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 0 1-1.4 3.4 2 2 0 0 1-1.4-.6l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V20a2 2 0 0 1-4 0v-.2a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1.1H4a2 2 0 0 1 0-4h.2a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1.1-1.7V4a2 2 0 0 1 4 0v.2a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1H20a2 2 0 0 1 0 4h-.2a1.8 1.8 0 0 0-1.7 1.1Z" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 16l-4-4 4-4" />
          <path d="M6 12h10" />
          <path d="M14 4h6v16h-6" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      );
    case "checkAll":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12l5 5L17 7" />
          <path d="M9 17l1 1 11-11" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang, languages, t } = useT();

  const [userOpen, setUserOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userButtonRef = useRef(null);
  const userMenuRef = useRef(null);
  const langContainerRef = useRef(null);
  const notifContainerRef = useRef(null);

  const hasProfile = ROLES_WITH_PROFILE.has(user?.role);
  const profilePath = roleSectionPath(user?.role, "profile");
  const settingsPath = roleSectionPath(user?.role, "settings");

  const activeLanguage = languages.find((l) => l.code === lang) ?? languages[0];

  const countQuery = useApi(() => notificationsApi.unreadCount(), []);
  const listQuery = useApi(
    () => (notifOpen ? notificationsApi.all() : Promise.resolve(null)),
    [notifOpen],
    { immediate: false },
  );

  useEffect(() => {
    if (notifOpen) listQuery.refetch().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  useEffect(() => {
    const id = setInterval(() => {
      countQuery.refetch().catch(() => {});
    }, NOTIF_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = countQuery.data?.count ?? countQuery.data?.unreadCount ?? 0;
  const notifications = Array.isArray(listQuery.data) ? listQuery.data : [];

  useClickOutside([userButtonRef, userMenuRef], () => setUserOpen(false));
  useClickOutside([langContainerRef], () => setLangOpen(false));
  useClickOutside([notifContainerRef], () => setNotifOpen(false));

  async function markRead(id) {
    try {
      await notificationsApi.markRead(id);
      await Promise.all([countQuery.refetch(), listQuery.refetch()]);
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      await Promise.all([countQuery.refetch(), listQuery.refetch()]);
    } catch { /* ignore */ }
  }

  return (
    <header className={styles.header}>
      <div className={styles.right}>
        <div className={styles.dropdown} ref={notifContainerRef}>
          <button
            className={styles.iconBtn}
            aria-label={t("header.notifications")}
            title={t("header.notifications")}
            onClick={() => setNotifOpen((v) => !v)}
            aria-expanded={notifOpen}
          >
            <Icon name="bell" />
            {unreadCount > 0 ? (
              <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </button>

          {notifOpen ? (
            <div className={`${styles.menu} ${styles.notifMenu}`} role="menu">
              <div className={styles.notifHead}>
                <span className={styles.notifTitle}>{t("header.notifications")}</span>
                {unreadCount > 0 ? (
                  <button type="button" className={styles.notifMarkAll} onClick={markAllRead} title={t("header.notif.markAll")}>
                    <Icon name="checkAll" />
                    <span>{t("header.notif.markAll")}</span>
                  </button>
                ) : null}
              </div>

              {listQuery.loading && !notifications.length ? (
                <div className={styles.notifEmpty}>{t("common.loading")}</div>
              ) : notifications.length ? (
                <ul className={styles.notifList}>
                  {notifications.slice(0, 12).map((n) => (
                    <li key={n.id} className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ""}`}>
                      <span className={styles.notifIco}><NotifTypeIcon type={n.type} /></span>
                      <div className={styles.notifBody}>
                        <p className={styles.notifMsg}>{n.message}</p>
                        <p className={styles.notifMeta}>{timeAgo(n.createdAt, t)}</p>
                      </div>
                      {!n.read ? (
                        <button
                          type="button"
                          className={styles.notifReadBtn}
                          onClick={() => markRead(n.id)}
                          title={t("header.notif.markRead")}
                          aria-label={t("header.notif.markRead")}
                        >
                          <Icon name="check" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.notifEmpty}>{t("header.notif.empty")}</div>
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.dropdown} ref={langContainerRef}>
          <button
            className={styles.langBtn}
            aria-label={t("header.language")}
            title={t("header.language")}
            aria-expanded={langOpen}
            onClick={() => setLangOpen((v) => !v)}
          >
            <Icon name="globe" />
            <span className={styles.langCode}>{activeLanguage.short}</span>
          </button>

          {langOpen ? (
            <div className={styles.menu} role="menu">
              <div className={styles.menuHead}>{t("language.label")}</div>
              {languages.map((option) => {
                const active = option.code === lang;
                return (
                  <button
                    key={option.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`${styles.menuItem} ${active ? styles.menuItemActive : ""}`}
                    onClick={() => {
                      setLang(option.code);
                      setLangOpen(false);
                    }}
                  >
                    <span className={styles.langShort}>{option.short}</span>
                    <span className={styles.langLabel}>{option.label}</span>
                    {active ? (
                      <span className={styles.menuCheck}><Icon name="check" /></span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button
          ref={userButtonRef}
          className={styles.userBtn}
          onClick={() => setUserOpen((v) => !v)}
          aria-label={t("header.profile")}
          title={t("header.profile")}
          aria-expanded={userOpen}
        >
          <Icon name="user" />
        </button>

        {userOpen ? (
          <div ref={userMenuRef} className={styles.userMenu} role="menu">
            <div className={styles.userHead}>
              <div className={styles.userName}>{user?.name || t("header.profile")}</div>
              <div className={styles.userRole}>{t(`roles.${user?.role || "STUDENT"}`)}</div>
            </div>

            {hasProfile ? (
              <Link className={styles.userItem} to={profilePath} onClick={() => setUserOpen(false)}>
                <span className={styles.userItemIco}><Icon name="user" /></span>
                {t("header.profile")}
              </Link>
            ) : null}

            <Link className={styles.userItem} to={settingsPath} onClick={() => setUserOpen(false)}>
              <span className={styles.userItemIco}><Icon name="settings" /></span>
              {t("header.settings")}
            </Link>

            <button
              className={`${styles.userItem} ${styles.userItemDanger}`}
              type="button"
              onClick={() => {
                setUserOpen(false);
                logout();
              }}
            >
              <span className={styles.userItemIco}><Icon name="logout" /></span>
              {t("header.logout")}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
