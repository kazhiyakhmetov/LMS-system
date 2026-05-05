import { useEffect, useMemo, useState } from "react";
import styles from "./ParentAssignmentsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const FILTER_KEYS = ["all", "pending", "submitted", "graded", "overdue"];
const PAGE_SIZE = 10;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) result.push("…");
    result.push(n);
    prev = n;
  }
  return result;
}

export default function ParentAssignmentsPage() {
  const { t } = useT();
  const childrenQuery = useApi(() => parentApi.children(), []);
  const children = useMemo(
    () => Array.isArray(childrenQuery.data) ? childrenQuery.data : [],
    [childrenQuery.data],
  );

  const [childId, setChildId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (childId == null && children.length) setChildId(children[0].id);
  }, [children, childId]);

  // Reset to first page when child or filter changes
  useEffect(() => { setPage(1); }, [childId, filter]);

  const assignmentsQuery = useApi(
    () => (childId ? parentApi.childAssignments(childId) : Promise.resolve([])),
    [childId],
    { immediate: Boolean(childId) },
  );

  const assignments = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];

  const counts = useMemo(() => {
    const c = { all: assignments.length, pending: 0, submitted: 0, graded: 0, overdue: 0 };
    assignments.forEach((a) => {
      if (c[a.status] != null) c[a.status]++;
    });
    return c;
  }, [assignments]);

  const filtered = useMemo(
    () => filter === "all" ? assignments : assignments.filter((a) => a.status === filter),
    [assignments, filter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);
  const pageNums = pageNumbers(safePage, totalPages);

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.loading")}</div>;
  }
  if (!children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.noChildren")}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("parent.assignments.title")}</h2>
          <p className={styles.sub}>{t("parent.assignments.sub")}</p>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.tabs}>
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`${styles.tabBtn} ${filter === key ? styles.tabBtnActive : ""}`}
                onClick={() => setFilter(key)}
              >
                {t(`parent.assignments.filters.${key}`)} {counts[key] ? `(${counts[key]})` : ""}
              </button>
            ))}
          </div>

          <select className={styles.select} value={childId ?? ""} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.fio} {c.className ? `(${c.className})` : ""}</option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.cards}>
        <article className={`${styles.card} ${styles.tone_indigo}`}>
          <p className={styles.cardLabel}>{t("parent.assignments.kpi.pending")}</p>
          <p className={styles.cardValue}>{counts.pending}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_mint}`}>
          <p className={styles.cardLabel}>{t("parent.assignments.kpi.submitted")}</p>
          <p className={styles.cardValue}>{counts.submitted}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_gold}`}>
          <p className={styles.cardLabel}>{t("parent.assignments.kpi.graded")}</p>
          <p className={styles.cardValue}>{counts.graded}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_rose}`}>
          <p className={styles.cardLabel}>{t("parent.assignments.kpi.overdue")}</p>
          <p className={styles.cardValue}>{counts.overdue}</p>
        </article>
      </section>

      {assignmentsQuery.loading && !assignments.length ? (
        <p style={{ padding: 16, color: "var(--muted)" }}>{t("parent.assignments.loading")}</p>
      ) : filtered.length ? (
        <>
          <ul className={styles.list}>
            {pageItems.map((a) => (
              <li key={a.id} className={`${styles.item} ${styles[a.status] || ""}`}>
                <div>
                  <div className={styles.itemHead}>
                    {a.subjectName ? <span className={styles.subjectBadge}>{a.subjectName}</span> : null}
                    <span className={`${styles.statusBadge} ${styles[`status_${a.status}`] || ""}`}>
                      {t(`parent.assignments.statusLabels.${a.status}`)}
                    </span>
                    {a.type ? <span className={styles.subjectBadge}>{a.type}</span> : null}
                  </div>
                  <p className={styles.itemTitle}>{a.title}</p>
                  {a.description ? <p className={styles.itemDesc}>{a.description}</p> : null}
                  <p className={styles.itemMeta}>
                    {a.deadline ? t("parent.assignments.meta.deadline", { date: formatDateTime(a.deadline) }) : t("parent.assignments.meta.noDeadline")}
                    {a.teacherName ? ` • ${a.teacherName}` : ""}
                    {a.submittedAt ? ` • ${t("parent.assignments.meta.submitted", { date: formatDateTime(a.submittedAt) })}` : ""}
                  </p>
                </div>
                {a.status === "graded" && a.gradeValue != null ? (
                  <div className={styles.gradeBox}>
                    <span className={styles.gradeValue}>{a.gradeValue}</span>
                    <span className={styles.gradeLabel}>{t("parent.assignments.gradeLabel")}</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Pagination">
              <span className={styles.pageInfo}>
                {t("parent.assignments.pagination.info", {
                  start: sliceStart + 1,
                  end: Math.min(sliceStart + PAGE_SIZE, filtered.length),
                  total: filtered.length,
                })}
              </span>
              <div className={styles.pageBtns}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  {t("parent.assignments.pagination.prev")}
                </button>
                {pageNums.map((n, i) => (
                  n === "…" ? (
                    <span key={`dots-${i}`} className={styles.pageDots}>…</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.pageBtn} ${n === safePage ? styles.pageBtnActive : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  )
                ))}
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  {t("parent.assignments.pagination.next")}
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : (
        <p className={styles.empty}>{t("parent.assignments.empty")}</p>
      )}
    </div>
  );
}
