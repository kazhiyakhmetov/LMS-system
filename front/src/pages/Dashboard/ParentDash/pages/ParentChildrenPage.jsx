import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ParentChildrenPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { getAvatarUrl, getInitials } from "../../../../shared/lib/utils/avatar";

function ChildCard({ child }) {
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
          <p className={styles.metricLabel}>Средний балл</p>
          <p className={styles.metricValue}>{stats.avgGrade ?? "—"}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Оценок</p>
          <p className={styles.metricValue}>{stats.totalGrades ?? "—"}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Активные</p>
          <p className={styles.metricValue}>{stats.pending ?? "—"}</p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Просрочено</p>
          <p className={styles.metricValue}>{stats.overdue ?? "—"}</p>
        </div>
      </div>

      {info.bio ? <div className={styles.bio}>{info.bio}</div> : null}

      <div className={styles.actions}>
        <Link to="/parent/grades" className={`${styles.actionLink} ${styles.primaryAction}`}>Оценки</Link>
        <Link to="/parent/journal" className={styles.actionLink}>Журнал</Link>
        <Link to="/parent/schedule" className={styles.actionLink}>Расписание</Link>
        <Link to="/parent/assignments" className={styles.actionLink}>Задания</Link>
      </div>
    </article>
  );
}

function TeachersBlock({ childId }) {
  const teachersQuery = useApi(
    () => (childId ? parentApi.childTeachers(childId) : Promise.resolve([])),
    [childId],
    { immediate: Boolean(childId) },
  );

  const teachers = Array.isArray(teachersQuery.data) ? teachersQuery.data : [];

  if (!childId) return null;

  return (
    <article className={styles.teachersCard}>
      <h3 className={styles.teachersTitle}>Учителя ребёнка</h3>
      {teachersQuery.loading && !teachers.length ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>Загрузка…</p>
      ) : teachers.length ? (
        <ul className={styles.teachersList}>
          {teachers.map((t, idx) => (
            <li key={`${t.teacherId}-${t.subjectId}-${idx}`} className={styles.teacherItem}>
              <div>
                <p className={styles.teacherName}>{t.teacherName || "—"}</p>
                <p className={styles.teacherMeta}>{t.teacherEmail || ""}</p>
              </div>
              <span className={styles.subjectBadge}>{t.subjectName || "—"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "var(--muted)", margin: 0 }}>Учителя пока не назначены.</p>
      )}
    </article>
  );
}

export default function ParentChildrenPage() {
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
    return <div style={{ padding: 24, color: "var(--muted)" }}>Загрузка детей…</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Мои дети</h2>
        <p className={styles.sub}>
          Профиль каждого ребёнка с учебной статистикой, средними оценками и быстрым доступом к разделам.
        </p>
      </section>

      {children.length ? (
        <>
          <section className={styles.grid}>
            {children.map((child) => (
              <div key={child.id} onClick={() => setSelectedChildId(child.id)} style={{ cursor: "pointer" }}>
                <ChildCard child={child} />
              </div>
            ))}
          </section>

          <TeachersBlock childId={selectedChildId} />
        </>
      ) : (
        <p className={styles.empty}>
          К вашему аккаунту не привязаны дети. Свяжитесь с администратором школы для добавления детей.
        </p>
      )}
    </div>
  );
}
