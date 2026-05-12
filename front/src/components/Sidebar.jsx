import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";
import logo from "../assets/logo.png";
import { useT } from "../shared/lib/i18n";

function NavIcon({ name }) {
  const common = {
    className: styles.ico,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };

  switch (name) {
    case "home":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 14.5 10.5 11l3 2.5 4.5-5" />
        </svg>
      );
    case "user":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "user-plus":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M20 8v6" />
          <path d="M17 11h6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.3" />
          <path d="M2 21v-2a3.5 3.5 0 0 1 2.5-3.3" />
          <path d="M18.5 5.5a3 3 0 0 1 0 5" />
          <path d="M5.5 5.5a3 3 0 0 0 0 5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19a2 2 0 0 1 2-2h14" />
          <path d="M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
          <path d="M17 6h3a2 2 0 0 1-2 3h-1" />
          <path d="M7 6H4a2 2 0 0 0 2 3h1" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4.5h6v3H9z" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14a3 3 0 0 1-3 3H9l-4 3v-3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v8Z" />
          <path d="M7 8h7" />
          <path d="M7 12h5" />
        </svg>
      );
    case "calendar-plus":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v3M16 2v3" />
          <path d="M3 9h18" />
          <path d="M12 13v6" />
          <path d="M9 16h6" />
          <path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "poll":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 7h11" />
          <path d="M8 12h11" />
          <path d="M8 17h11" />
          <circle cx="5" cy="7" r="1" />
          <circle cx="5" cy="12" r="1" />
          <circle cx="5" cy="17" r="1" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l2.6 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.7 20 7.7 13.8 3.3 9.5l6.1-.9L12 3Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v3M16 2v3" />
          <path d="M3 9h18" />
          <path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case "quiz":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9a2 2 0 1 1 3 1.7c-1 .6-1 1.3-1 1.8" />
          <circle cx="11" cy="16" r="0.5" />
        </svg>
      );
    case "academic":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10L12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 0 3 2 6 2s6-2 6-2v-5" />
          <path d="M22 10v6" />
        </svg>
      );
    case "link":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
          <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
        </svg>
      );
    case "news":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" />
          <path d="M19 8h2v9a2 2 0 0 1-2 2" />
          <path d="M8 9h7" />
          <path d="M8 13h7" />
          <path d="M8 17h4" />
        </svg>
      );
    default:
      return (
        <svg {...common} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function ChevronIcon({ isOpen }) {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {isOpen ? (
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function Sidebar({ items }) {
  const { t } = useT();
  const menu = useMemo(() => items ?? [], [items]);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isOpen = pinned || hovered;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setPinned(false);
      setHovered(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      className={`${styles.wrap} ${isOpen ? styles.open : ""}`}
      aria-label="Sidebar"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false);
      }}
    >
      <div className={styles.top}>
        <button
          type="button"
          className={styles.brandBtn}
          onClick={() => setPinned((value) => !value)}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
          aria-pressed={pinned}
          title={pinned ? "Unpin sidebar" : "Pin sidebar"}
        >
          <img src={logo} alt="StudIX" className={styles.logoImg} />
          <span className={styles.brandText}>StudIX</span>
        </button>

        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setPinned((value) => !value)}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronIcon isOpen={isOpen} />
        </button>
      </div>

      <nav className={styles.nav}>
        {menu.map((item) => {
          const label = item.labelKey ? t(item.labelKey) : item.label;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={Boolean(item.end)}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
              title={!isOpen ? label : undefined}
            >
              <span className={styles.iconWrap}>
                {typeof item.icon === "string" ? <NavIcon name={item.icon} /> : item.icon}
              </span>
              <span className={styles.label}>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
