import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import styles from "./RoleDashboardContent.module.css";

function getCurrentSection(pathname, menu) {
  if (!menu.length) return null;

  const exact = menu.find((item) => pathname === item.href);
  if (exact) return exact;

  return menu.find((item) => pathname.startsWith(`${item.href}/`)) ?? menu[0];
}

export default function RoleDashboardContent({
  roleName,
  menu,
  summaryCards,
  quickItems,
  notices,
}) {
  const { pathname } = useLocation();

  const section = useMemo(() => getCurrentSection(pathname, menu ?? []), [pathname, menu]);

  const cards = summaryCards ?? [];
  const tasks = quickItems ?? [];
  const updates = notices ?? [];

  return (
    <div className={styles.layout}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>{roleName} workspace</p>
          <h2 className={styles.title}>{section?.label || "Dashboard"}</h2>
          <p className={styles.subtitle}>
            Structured overview for this section. Backend integration can be connected here later
            without changing the dashboard shell.
          </p>
        </div>

        <div className={styles.status}>
          <span className={styles.statusDot} />
          Live
        </div>
      </section>

      <section className={styles.cards}>
        {cards.map((card) => (
          <article key={card.label} className={styles.card}>
            <p className={styles.cardLabel}>{card.label}</p>
            <p className={styles.cardValue}>{card.value}</p>
            <p className={styles.cardMeta}>{card.meta}</p>
          </article>
        ))}
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Quick Focus</h3>
          <ul className={styles.list}>
            {tasks.map((item) => (
              <li key={item} className={styles.listItem}>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>Updates</h3>
          <ul className={styles.list}>
            {updates.map((item) => (
              <li key={item} className={styles.listItem}>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
