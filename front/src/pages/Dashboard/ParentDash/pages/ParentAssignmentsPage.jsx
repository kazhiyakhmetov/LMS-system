import { useEffect, useMemo, useState } from "react";
import styles from "./ParentAssignmentsPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { formatDateTime } from "../../../../shared/lib/utils/date";

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "pending", label: "Активные" },
  { key: "submitted", label: "Сданы" },
  { key: "graded", label: "Оценены" },
  { key: "overdue", label: "Просрочены" },
];

const STATUS_LABEL = {
  pending: "Активно",
  submitted: "Сдано",
  graded: "Оценено",
  overdue: "Просрочено",
};

export default function ParentAssignmentsPage() {
  const childrenQuery = useApi(() => parentApi.children(), []);
  const children = useMemo(
    () => Array.isArray(childrenQuery.data) ? childrenQuery.data : [],
    [childrenQuery.data],
  );

  const [childId, setChildId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (childId == null && children.length) setChildId(children[0].id);
  }, [children, childId]);

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

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>Загрузка…</div>;
  }
  if (!children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>К вашему аккаунту не привязаны дети.</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Задания ребёнка</h2>
          <p className={styles.sub}>
            Все домашние и контрольные работы класса с отметками о сдаче и полученной оценкой.
          </p>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.tabs}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`${styles.tabBtn} ${filter === f.key ? styles.tabBtnActive : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} {counts[f.key] ? `(${counts[f.key]})` : ""}
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
          <p className={styles.cardLabel}>Активные</p>
          <p className={styles.cardValue}>{counts.pending}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_mint}`}>
          <p className={styles.cardLabel}>Сданы</p>
          <p className={styles.cardValue}>{counts.submitted}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_gold}`}>
          <p className={styles.cardLabel}>Оценены</p>
          <p className={styles.cardValue}>{counts.graded}</p>
        </article>
        <article className={`${styles.card} ${styles.tone_rose}`}>
          <p className={styles.cardLabel}>Просрочены</p>
          <p className={styles.cardValue}>{counts.overdue}</p>
        </article>
      </section>

      {assignmentsQuery.loading && !assignments.length ? (
        <p style={{ padding: 16, color: "var(--muted)" }}>Загрузка заданий…</p>
      ) : filtered.length ? (
        <ul className={styles.list}>
          {filtered.map((a) => (
            <li key={a.id} className={`${styles.item} ${styles[a.status] || ""}`}>
              <div>
                <div className={styles.itemHead}>
                  {a.subjectName ? <span className={styles.subjectBadge}>{a.subjectName}</span> : null}
                  <span className={`${styles.statusBadge} ${styles[`status_${a.status}`] || ""}`}>
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                  {a.type ? <span className={styles.subjectBadge}>{a.type}</span> : null}
                </div>
                <p className={styles.itemTitle}>{a.title}</p>
                {a.description ? <p className={styles.itemDesc}>{a.description}</p> : null}
                <p className={styles.itemMeta}>
                  {a.deadline ? `Дедлайн: ${formatDateTime(a.deadline)}` : "Без дедлайна"}
                  {a.teacherName ? ` • ${a.teacherName}` : ""}
                  {a.submittedAt ? ` • Сдано: ${formatDateTime(a.submittedAt)}` : ""}
                </p>
              </div>
              {a.status === "graded" && a.gradeValue != null ? (
                <div className={styles.gradeBox}>
                  <span className={styles.gradeValue}>{a.gradeValue}</span>
                  <span className={styles.gradeLabel}>оценка</span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Заданий по выбранному фильтру пока нет.</p>
      )}
    </div>
  );
}
