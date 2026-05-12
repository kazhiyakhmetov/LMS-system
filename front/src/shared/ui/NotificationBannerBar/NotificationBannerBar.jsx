import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./NotificationBannerBar.module.css";
import { bannersApi } from "../../lib/api";

const DISMISS_KEY_PREFIX = "studix_banner_dismissed_";

function isDismissed(id) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${DISMISS_KEY_PREFIX}${id}`) === "1";
  } catch {
    return false;
  }
}

function markDismissed(id) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${DISMISS_KEY_PREFIX}${id}`, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

function severityClass(severity) {
  switch ((severity || "INFO").toUpperCase()) {
    case "WARNING":
      return styles.warning;
    case "SUCCESS":
      return styles.success;
    case "INFO":
    default:
      return styles.info;
  }
}

function severityIcon(severity) {
  switch ((severity || "INFO").toUpperCase()) {
    case "WARNING":
      return "!";
    case "SUCCESS":
      return "✓";
    case "INFO":
    default:
      return "i";
  }
}

/**
 * Лента глобальных баннеров под Header.
 *
 * - Загружает активные баннеры через `bannersApi.active()`.
 * - Скрытие баннера хранится в localStorage: `studix_banner_dismissed_<id>`.
 * - После endDate бэкенд перестаёт отдавать баннер — он естественно исчезает.
 */
export default function NotificationBannerBar() {
  const [items, setItems] = useState([]);
  const [dismissedTick, setDismissedTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    bannersApi
      .active()
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    // dismissedTick участвует в зависимости, чтобы пересчитать при закрытии.
    void dismissedTick;
    return items.filter((b) => b && b.id != null && !isDismissed(b.id));
  }, [items, dismissedTick]);

  const handleDismiss = useCallback((id) => {
    markDismissed(id);
    setDismissedTick((t) => t + 1);
  }, []);

  if (!visible.length) return null;

  return (
    <div className={styles.wrap} role="region" aria-label="Уведомления">
      {visible.map((banner) => {
        const cls = `${styles.banner} ${severityClass(banner.severity)}`;
        return (
          <div key={banner.id} className={cls} role="status">
            <span className={styles.icon} aria-hidden="true">
              {severityIcon(banner.severity)}
            </span>
            <div className={styles.body}>
              <p className={styles.title}>{banner.title}</p>
              {banner.message ? <p className={styles.message}>{banner.message}</p> : null}
            </div>
            {banner.linkUrl ? (
              <a
                className={styles.link}
                href={banner.linkUrl}
                target={/^https?:\/\//i.test(banner.linkUrl) ? "_blank" : undefined}
                rel={/^https?:\/\//i.test(banner.linkUrl) ? "noopener noreferrer" : undefined}
              >
                {banner.linkLabel || "Подробнее"}
              </a>
            ) : null}
            <button
              type="button"
              className={styles.close}
              onClick={() => handleDismiss(banner.id)}
              aria-label="Закрыть уведомление"
              title="Скрыть"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
