import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleSectionPath } from "../shared/lib/auth/roleRedirect";
import styles from "./Header.module.css";

const LANGUAGE_OPTIONS = ["Kazakh", "Russian", "English"];
const ROLES_WITH_PROFILE = new Set(["STUDENT", "TEACHER"]);

function useClickOutside(refs, onOutside) {
  const refsRef = useRef(refs);
  const onOutsideRef = useRef(onOutside);

  useEffect(() => {
    refsRef.current = refs;
    onOutsideRef.current = onOutside;
  });

  useEffect(() => {
    // Слушатель навешивается один раз, а актуальные refs берём из ref-хранилища.
    const handleOutsideClick = (event) => {
      const clickedInside = refsRef.current.some((ref) => ref.current && ref.current.contains(event.target));
      if (!clickedInside) {
        onOutsideRef.current?.();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);
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
    default:
      return null;
  }
}

export default function Header() {
  const { user, logout } = useAuth();
  const [userOpen, setUserOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const userButtonRef = useRef(null);
  const userMenuRef = useRef(null);
  const langContainerRef = useRef(null);

  const hasProfile = ROLES_WITH_PROFILE.has(user?.role);
  const profilePath = roleSectionPath(user?.role, "profile");
  const settingsPath = roleSectionPath(user?.role, "settings");

  useClickOutside([userButtonRef, userMenuRef], () => setUserOpen(false));
  useClickOutside([langContainerRef], () => setLangOpen(false));

  return (
    <header className={styles.header}>
      <div className={styles.right}>
        <button className={styles.iconBtn} aria-label="Notifications" title="Notifications">
          <Icon name="bell" />
        </button>

        <div className={styles.dropdown} ref={langContainerRef}>
          <button
            className={styles.iconBtn}
            aria-label="Language"
            title="Language"
            onClick={() => setLangOpen((value) => !value)}
          >
            <Icon name="globe" />
          </button>

          {langOpen ? (
            <div className={styles.menu} role="menu">
              {LANGUAGE_OPTIONS.map((option) => (
                <button key={option} className={styles.menuItem} type="button">
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          ref={userButtonRef}
          className={styles.userBtn}
          onClick={() => setUserOpen((value) => !value)}
          aria-label="Profile"
          title="Profile"
        >
          <Icon name="user" />
        </button>

        {userOpen ? (
          <div ref={userMenuRef} className={styles.userMenu} role="menu">
            <div className={styles.userHead}>
              <div className={styles.userName}>{user?.name || "User"}</div>
              <div className={styles.userRole}>{user?.role || ""}</div>
            </div>

            {hasProfile ? (
              <Link className={styles.userItem} to={profilePath} onClick={() => setUserOpen(false)}>
                <span className={styles.userItemIco}>
                  <Icon name="user" />
                </span>
                Профиль
              </Link>
            ) : null}

            <Link className={styles.userItem} to={settingsPath} onClick={() => setUserOpen(false)}>
              <span className={styles.userItemIco}>
                <Icon name="settings" />
              </span>
              Настройки
            </Link>

            <button
              className={styles.userItem}
              type="button"
              onClick={() => {
                setUserOpen(false);
                logout();
              }}
            >
              <span className={styles.userItemIco}>
                <Icon name="logout" />
              </span>
              Выйти
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
