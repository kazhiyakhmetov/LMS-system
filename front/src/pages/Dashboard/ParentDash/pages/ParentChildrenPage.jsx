import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ParentChildrenPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { getAvatarUrl, getInitials } from "../../../../shared/lib/utils/avatar";
import { useT } from "../../../../shared/lib/i18n";

const TEACHERS_PAGE_SIZE = 8;

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

function ChildCard({ child, t }) {
  const statsQuery = useApi(() => parentApi.childStats(child.id), [child.id]);
  const infoQuery = useApi(() => parentApi.childInfo(child.id), [child.id]);

  const stats = statsQuery.data || {};
  const info = infoQuery.data || {};
  const tags = Array.isArray(info.tags) ? info.tags : [];

  const avatarUrl = useMemo(() => getAvatarUrl(child.profilePhotoUrl), [child.profilePhotoUrl]);
  const initials = useMemo(() => getInitials(child.fio), [child.fio]);

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.avatar}>
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className={styles.cardName}>{child.fio || "—"}</p>
          <p className={styles.cardMeta}>
            {child.className || "—"}
            {child.schoolName ? ` • ${child.schoolName}` : ""}
          </p>
          {child.email ? (
            <p className={styles.cardMeta} style={{ marginTop: 2 }}>{child.email}</p>
          ) : null}
        </div>
      </div>

      {tags.length ? (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag.id} className={styles.tag}>{tag.name}</span>
          ))}
        </div>
      ) : null}

      <div className={styles.metricsRow}>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>{t("parent.children.avgGrade")}</p>
          <p className={styles.metricValue}>{stats.avgGrade ?? "—"}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>{t("parent.children.gradesCount")}</p>
          <p className={styles.metricValue}>{stats.totalGrades ?? "—"}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>{t("parent.children.pending")}</p>
          <p className={styles.metricValue}>{stats.pending ?? "—"}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>{t("parent.children.overdue")}</p>
          <p className={styles.metricValue}>{stats.overdue ?? "—"}</p>
        </div>
      </div>

      {info.bio ? <div className={styles.bio}>{info.bio}</div> : null}

      <div className={styles.actions}>
        <Link to="/parent/grades" className={`${styles.actionLink} ${styles.primaryAction}`}>{t("parent.children.gradesBtn")}</Link>
        <Link to="/parent/journal" className={styles.actionLink}>{t("parent.children.journalBtn")}</Link>
        <Link to="/parent/schedule" className={styles.actionLink}>{t("parent.children.scheduleBtn")}</Link>
        <Link to="/parent/assignments" className={styles.actionLink}>{t("parent.children.assignmentsBtn")}</Link>
      </div>
    </article>
  );
}

function TeachersBlock({ childId, t }) {
  const teachersQuery = useApi(
    () => (childId ? parentApi.childTeachers(childId) : Promise.resolve([])),
    [childId],
    { immediate: Boolean(childId) },
  );

  const allTeachers = Array.isArray(teachersQuery.data) ? teachersQuery.data : [];

  // Dedup just in case backend returns duplicates (different rows for same teacher+subject pair)
  const teachers = useMemo(() => {
    const map = new Map();
    allTeachers.forEach((row) => {
      const key = `${row.teacherId}-${row.subjectId}`;
      if (!map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  }, [allTeachers]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [childId]);

  const totalPages = Math.max(1, Math.ceil(teachers.length / TEACHERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * TEACHERS_PAGE_SIZE;
  const pageItems = teachers.slice(sliceStart, sliceStart + TEACHERS_PAGE_SIZE);
  const pageNums = pageNumbers(safePage, totalPages);

  if (!childId) return null;

  return (
    <article className={styles.teachersCard}>
      <h3 className={styles.teachersTitle}>{t("parent.children.teachersTitle")}</h3>
      {teachersQuery.loading && !teachers.length ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>{t("parent.common.loading")}</p>
      ) : teachers.length ? (
        <>
          <ul className={styles.teachersList}>
            {pageItems.map((row, idx) => (
              <li key={`${row.teacherId}-${row.subjectId}-${idx}`} className={styles.teacherItem}>
                <div>
                  <p className={styles.teacherName}>{row.teacherName || "—"}</p>
                  <p className={styles.teacherMeta}>{row.teacherEmail || ""}</p>
                </div>
                <span className={styles.subjectBadge}>{row.subjectName || "—"}</span>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav className={styles.teachersPagination} aria-label="Teachers pagination">
              <span className={styles.teachersPageInfo}>
                {t("parent.assignments.pagination.info", {
                  start: sliceStart + 1,
                  end: Math.min(sliceStart + TEACHERS_PAGE_SIZE, teachers.length),
                  total: teachers.length,
                })}
              </span>
              <div className={styles.teachersPageBtns}>
                <button
                  type="button"
                  className={styles.teachersPageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  {t("parent.assignments.pagination.prev")}
                </button>
                {pageNums.map((n, i) => (
                  n === "…" ? (
                    <span key={`dots-${i}`} className={styles.teachersPageDots}>…</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.teachersPageBtn} ${n === safePage ? styles.teachersPageBtnActive : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  )
                ))}
                <button
                  type="button"
                  className={styles.teachersPageBtn}
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
        <p style={{ color: "var(--muted)", margin: 0 }}>{t("parent.children.teachersEmpty")}</p>
      )}
    </article>
  );
}

export default function ParentChildrenPage() {
  const { t } = useT();
  const childrenQuery = useApi(() => parentApi.children(), []);
  const children = useMemo(
    () => Array.isArray(childrenQuery.data) ? childrenQuery.data : [],
    [childrenQuery.data],
  );

  const [selectedChildId, setSelectedChildId] = useState(null);
  useEffect(() => {
    if (selectedChildId == null && children.length) setSelectedChildId(children[0].id);
  }, [children, selectedChildId]);

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.loadingChildren")}</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>{t("parent.children.title")}</h2>
        <p className={styles.sub}>{t("parent.children.sub")}</p>
      </section>

      {children.length ? (
        <>
          <section className={styles.grid}>
            {children.map((child) => (
              <div key={child.id} onClick={() => setSelectedChildId(child.id)} style={{ cursor: "pointer" }}>
                <ChildCard child={child} t={t} />
              </div>
            ))}
          </section>

          <TeachersBlock childId={selectedChildId} t={t} />
        </>
      ) : (
        <p className={styles.empty}>{t("parent.common.noChildren")}</p>
      )}
    </div>
  );
}
