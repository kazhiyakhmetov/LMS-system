import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./NewsSlider.module.css";
import { useApi } from "../../lib/hooks/useApi";
import { newsApi } from "../../lib/api";
import { getAvatarUrl } from "../../lib/utils/avatar";

function formatDate(value) {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return String(value);
  }
}

function typeMeta(type) {
  if (type === "LOCAL") return { label: "Школа", icon: "🏫", cls: styles.badgeLocal };
  return { label: "Общая", icon: "📢", cls: styles.badgeGeneral };
}

/**
 * Слайдер активных новостей. Авто-прокрутка с паузой по hover,
 * пагинация-точки и стрелки для ручного переключения.
 *
 * @param {object} props
 * @param {number} [props.height=360]      — высота карточки в px
 * @param {number} [props.intervalMs=7000] — интервал авто-прокрутки в мс
 */
export default function NewsSlider({ height, intervalMs = 7000 }) {
  const query = useApi(() => newsApi.list(), []);
  const items = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  // Если данные изменились и текущий индекс выходит за пределы — сбрасываем.
  useEffect(() => {
    if (index >= items.length && items.length > 0) {
      setIndex(0);
    }
  }, [items.length, index]);

  const goTo = useCallback((next) => {
    setIndex((prev) => {
      if (items.length === 0) return 0;
      const n = ((next % items.length) + items.length) % items.length;
      return n;
    });
  }, [items.length]);

  const goNext = useCallback(() => {
    setIndex((prev) => (items.length === 0 ? 0 : (prev + 1) % items.length));
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (items.length === 0 ? 0 : (prev - 1 + items.length) % items.length));
  }, [items.length]);

  // Авто-прокрутка: запускаем только если новостей > 1 и не на паузе.
  useEffect(() => {
    if (paused) return undefined;
    if (items.length <= 1) return undefined;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return undefined;

    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paused, items.length, intervalMs]);

  const containerStyle = height ? { minHeight: `${height}px` } : undefined;

  // === Empty / loading ===
  if (query.loading && items.length === 0) {
    return (
      <div className={styles.card} style={containerStyle} aria-busy="true">
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">📰</div>
          <p className={styles.emptyTitle}>Загружаем новости…</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.card} style={containerStyle}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">📭</div>
          <p className={styles.emptyTitle}>Нет активных новостей</p>
          <p className={styles.emptyHint}>Здесь появятся свежие объявления, как только они будут опубликованы.</p>
        </div>
      </div>
    );
  }

  const current = items[index] ?? items[0];
  const photoUrl = current?.photoPath ? getAvatarUrl(current.photoPath) : null;
  const meta = typeMeta(current?.type);
  const showControls = items.length > 1;

  return (
    <div
      className={styles.card}
      style={containerStyle}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.viewport} aria-roledescription="карусель">
        <article
          key={current?.id ?? index}
          className={styles.slide}
          aria-live="polite"
          aria-label={`Новость ${index + 1} из ${items.length}`}
        >
          <div className={styles.photoWrap}>
            {photoUrl ? (
              <img
                className={styles.photo}
                src={photoUrl}
                alt={current?.title || "Новость"}
                loading="lazy"
              />
            ) : (
              <div className={styles.photoPlaceholder} aria-hidden="true">
                <span className={styles.placeholderEmoji}>📰</span>
              </div>
            )}
            <span className={`${styles.badge} ${meta.cls}`}>
              <span className={styles.badgeIcon} aria-hidden="true">{meta.icon}</span>
              <span>{meta.label}</span>
            </span>
          </div>

          <div className={styles.body}>
            <h3 className={styles.title}>{current?.title}</h3>
            {current?.description ? (
              <p className={styles.description}>{current.description}</p>
            ) : (
              <p className={styles.descriptionMuted}>Без описания</p>
            )}
            <p className={styles.date}>{formatDate(current?.startDate)}</p>
          </div>
        </article>

        {showControls ? (
          <>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navPrev}`}
              onClick={goPrev}
              aria-label="Предыдущая новость"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navNext}`}
              onClick={goNext}
              aria-label="Следующая новость"
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        ) : null}
      </div>

      {showControls ? (
        <div className={styles.dots} role="tablist" aria-label="Навигация по новостям">
          {items.map((it, i) => (
            <button
              key={it.id ?? i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Перейти к новости ${i + 1}`}
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
