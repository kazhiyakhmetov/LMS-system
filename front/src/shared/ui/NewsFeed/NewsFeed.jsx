import { useEffect, useMemo, useState } from "react";
import styles from "./NewsFeed.module.css";
import { useApi } from "../../lib/hooks/useApi";
import { newsApi } from "../../lib/api";
import { getAvatarUrl } from "../../lib/utils/avatar";

function formatDate(value) {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return String(value);
  }
}

function formatRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} — ${e}`;
  return s || e || "";
}

function typeLabel(type) {
  if (type === "LOCAL") return "Школьная";
  if (type === "GENERAL") return "Общая";
  return type || "";
}

/**
 * Универсальная лента новостей.
 *
 * @param {object} props
 * @param {string} [props.title]   — заголовок страницы
 * @param {string} [props.subtitle] — подпись
 */
export default function NewsFeed({ title = "Новости", subtitle = "Свежие объявления школы и общие новости" }) {
  const [active, setActive] = useState(null);

  const query = useApi(() => newsApi.list(), []);
  const items = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionSub}>{subtitle}</p>
        </div>
        <span className={styles.statusChip}>
          <span className={styles.dot} />
          {items.length} активных
        </span>
      </section>

      {query.loading && !items.length ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Загружаем новости…</p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">📭</div>
          <p className={styles.emptyTitle}>Пока ничего нового</p>
          <p className={styles.emptyHint}>Здесь появятся объявления школы и общие новости, как только они будут опубликованы.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((post) => {
            const photoUrl = post.photoPath ? getAvatarUrl(post.photoPath) : null;
            return (
              <article key={post.id} className={styles.card}>
                <div className={styles.cardPhotoWrap}>
                  {photoUrl ? (
                    <img className={styles.cardPhoto} src={photoUrl} alt={post.title} loading="lazy" />
                  ) : (
                    <div className={styles.cardPhotoPlaceholder} aria-hidden="true">📰</div>
                  )}
                  <span
                    className={`${styles.cardTypeBadge} ${post.type === "LOCAL" ? styles.cardTypeLocal : styles.cardTypeGeneral}`}
                  >
                    {typeLabel(post.type)}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{post.title}</h3>
                  <p className={styles.cardMeta}>{formatRange(post.startDate, post.endDate)}</p>
                  {post.description ? <p className={styles.cardDesc}>{post.description}</p> : null}
                  <div className={styles.cardFooter}>
                    <button
                      type="button"
                      className={styles.moreBtn}
                      onClick={() => setActive(post)}
                    >
                      Подробнее
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {active ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={() => setActive(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {active.photoPath ? (
              <div className={styles.modalPhotoWrap}>
                <img className={styles.modalPhoto} src={getAvatarUrl(active.photoPath)} alt={active.title} />
              </div>
            ) : null}
            <div className={styles.modalBody}>
              <div className={styles.modalHead}>
                <div style={{ display: "grid", gap: 6 }}>
                  <h3 className={styles.modalTitle}>{active.title}</h3>
                  <p className={styles.modalSub}>
                    {typeLabel(active.type)} • {formatRange(active.startDate, active.endDate)}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setActive(null)}
                  aria-label="Закрыть"
                >×</button>
              </div>
              {active.description ? (
                <p className={styles.modalDesc}>{active.description}</p>
              ) : (
                <p className={styles.modalDesc} style={{ color: "var(--muted)" }}>Описание не добавлено.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
