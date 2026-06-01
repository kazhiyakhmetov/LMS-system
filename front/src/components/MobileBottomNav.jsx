import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./MobileBottomNav.module.css";
import { useT } from "../shared/lib/i18n";

function Icon({ name }) {
  const props = {
    className: styles.icon,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
  };

  switch (name) {
    case "home":
      return <svg {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10h14V10" /></svg>;
    case "calendar":
      return <svg {...props}><path d="M8 2v3M16 2v3" /><path d="M3 9h18" /><path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>;
    case "star":
      return <svg {...props}><path d="M12 3l2.6 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.7 20l1-6.2-4.4-4.3 6.1-.9L12 3Z" /></svg>;
    case "users":
    case "user-plus":
      return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.3" /><path d="M2 21v-2a3.5 3.5 0 0 1 2.5-3.3" /></svg>;
    case "user":
      return <svg {...props}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="4" /></svg>;
    case "chat":
      return <svg {...props}><path d="M20 14a3 3 0 0 1-3 3H9l-4 3v-3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v8Z" /><path d="M7 8h7M7 12h5" /></svg>;
    case "clipboard":
      return <svg {...props}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6v3H9z" /><path d="M8 12h8" /><path d="M8 16h5" /></svg>;
    case "book":
      return <svg {...props}><path d="M4 19a2 2 0 0 1 2-2h14" /><path d="M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /></svg>;
    case "news":
      return <svg {...props}><path d="M4 5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" /><path d="M19 8h2v9a2 2 0 0 1-2 2" /><path d="M8 9h7M8 13h7M8 17h4" /></svg>;
    case "academic":
      return <svg {...props}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 0 3 2 6 2s6-2 6-2v-5" /><path d="M22 10v6" /></svg>;
    case "quiz":
      return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9a2 2 0 1 1 3 1.7c-1 .6-1 1.3-1 1.8" /><circle cx="11" cy="16" r="0.5" /></svg>;
    case "poll":
      return <svg {...props}><path d="M8 7h11M8 12h11M8 17h11" /><circle cx="5" cy="7" r="1" /><circle cx="5" cy="12" r="1" /><circle cx="5" cy="17" r="1" /></svg>;
    case "chart":
      return <svg {...props}><path d="M3 3v18h18" /><path d="M7 14.5 10.5 11l3 2.5 4.5-5" /></svg>;
    case "menu":
      return <svg {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function getLabel(item, t) {
  return item?.labelKey ? t(item.labelKey) : item?.label || "";
}

function getPrimaryHrefs(items) {
  const first = items?.[0]?.href || "";
  if (first.startsWith("/teacher")) return ["/teacher", "/teacher/schedule", "/teacher/grades", "/teacher/homeroom"];
  if (first.startsWith("/student")) return ["/student", "/student/schedule", "/student/assignments", "/student/grades"];
  if (first.startsWith("/parent")) return ["/parent", "/parent/children", "/parent/schedule", "/parent/grades"];
  return [];
}

function getMobileMenu(items) {
  const list = [...(items ?? [])];
  const first = list[0]?.href || "";
  const role = first.startsWith("/teacher")
    ? "teacher"
    : first.startsWith("/student")
      ? "student"
      : first.startsWith("/parent")
        ? "parent"
        : "";

  if (!role) return list;

  [
    { href: `/${role}/chat`, label: "Чат", icon: "chat" },
    { href: `/${role}/profile`, label: "Профиль", icon: "user" },
  ].forEach((extra) => {
    if (!list.some((item) => item.href === extra.href)) list.push(extra);
  });

  return list;
}

function isActivePath(pathname, item) {
  if (!item?.href) return false;
  return item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function MobileBottomNav({ items }) {
  const { t } = useT();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menu = useMemo(() => getMobileMenu(items), [items]);
  const primaryHrefs = useMemo(() => getPrimaryHrefs(menu), [menu]);
  const primaryItems = primaryHrefs.map((href) => menu.find((item) => item.href === href)).filter(Boolean);
  const moreItems = menu.filter((item) => !primaryHrefs.includes(item.href));
  const moreActive = moreItems.some((item) => isActivePath(location.pathname, item));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (primaryItems.length < 4) return null;

  return (
    <>
      {open ? <button type="button" className={styles.backdrop} aria-label="Закрыть меню" onClick={() => setOpen(false)} /> : null}
      <nav className={styles.bar} aria-label="Mobile navigation">
        {primaryItems.map((item) => {
          const label = getLabel(item, t);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={Boolean(item.end)}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <Icon name={item.icon} />
              <span>{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={`${styles.item} ${styles.moreBtn} ${open || moreActive ? styles.active : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <Icon name="menu" />
          <span>Еще</span>
        </button>
      </nav>
      <section className={`${styles.sheet} ${open ? styles.sheetOpen : ""}`} aria-hidden={!open}>
        <div className={styles.sheetHandle} />
        <h2 className={styles.sheetTitle}>Все разделы</h2>
        <div className={styles.sheetGrid}>
          {moreItems.map((item) => {
            const label = getLabel(item, t);
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={Boolean(item.end)}
                className={({ isActive }) => `${styles.sheetLink} ${isActive ? styles.sheetLinkActive : ""}`}
              >
                <span className={styles.sheetIcon}><Icon name={item.icon} /></span>
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </section>
    </>
  );
}
