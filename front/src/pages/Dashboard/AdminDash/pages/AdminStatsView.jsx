import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./AdminPages.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { schoolsApi, surveysApi, usersApi } from "../../../../shared/lib/api";
import { normalizeRole } from "../../../../shared/lib/auth/roleNormalize";
import { useT } from "../../../../shared/lib/i18n";
import { DonutChart, BarList, ChartLegend } from "../../../../shared/ui/Chart/Chart";

const ROLE_COLORS = {
  STUDENT: "#4f46e5",
  TEACHER: "#10b981",
  PARENT: "#f59e0b",
  ADMIN: "#ef4444",
};

function StatIcon({ name }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "student":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5L2 10L12 15L22 10Z"/><path d="M6 12V17C6 17 9 19 12 19C15 19 18 17 18 17V12"/><path d="M22 10V16"/></svg>;
    case "teacher":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M16 4l3-2"/></svg>;
    case "parent":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M21 21v-2a3 3 0 0 0-3-3"/></svg>;
    case "school":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-6h6v6"/></svg>;
    case "users":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "shield":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>;
    case "poll":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7h11M8 12h11M8 17h11"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/></svg>;
    case "question":
      return <svg {...c} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5"/></svg>;
    default:
      return null;
  }
}

export default function AdminStatsView() {
  const { t } = useT();
  const usersQuery = useApi(() => usersApi.all(), []);
  const schoolsQuery = useApi(() => schoolsApi.all(), []);
  const surveysQuery = useApi(() => surveysApi.adminList(), []);

  const users = Array.isArray(usersQuery.data) ? usersQuery.data : [];
  const schools = Array.isArray(schoolsQuery.data) ? schoolsQuery.data : [];
  const surveys = Array.isArray(surveysQuery.data) ? surveysQuery.data : [];

  const counts = useMemo(() => {
    const c = { STUDENT: 0, TEACHER: 0, PARENT: 0, ADMIN: 0 };
    users.forEach((u) => {
      const role = normalizeRole(u.roles?.[0] ?? u.role);
      if (role && c[role] != null) c[role] += 1;
    });
    return c;
  }, [users]);

  const usersBySchool = useMemo(() => {
    const map = new Map();
    schools.forEach((s) => map.set(s.id, { id: s.id, name: s.name, count: 0 }));
    users.forEach((u) => {
      const sid = u.schoolId;
      if (sid && map.has(sid)) map.get(sid).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [users, schools]);

  const totalQuestions = useMemo(
    () => surveys.reduce((acc, s) => acc + (s.questionsCount || 0), 0),
    [surveys],
  );

  const stats = [
    { key: "students", label: t("admin.stats.students"), value: counts.STUDENT, meta: t("admin.stats.total"), tone: "toneSky", icon: "student", href: "/admin/users?role=STUDENT" },
    { key: "teachers", label: t("admin.stats.teachers"), value: counts.TEACHER, meta: t("admin.stats.total"), tone: "toneMint", icon: "teacher", href: "/admin/users?role=TEACHER" },
    { key: "parents",  label: t("admin.stats.parents"),  value: counts.PARENT,  meta: t("admin.stats.total"), tone: "toneGold", icon: "parent",  href: "/admin/users?role=PARENT"  },
    { key: "schools",  label: t("admin.stats.schools"),  value: schools.length, meta: t("admin.stats.inSystem"), tone: "toneHot",  icon: "school" },
    { key: "totalUsers",     label: t("admin.stats.totalUsers"),     value: users.length,    meta: t("admin.stats.accounts"),  tone: "toneSky",  icon: "users" },
    { key: "admins",         label: t("admin.stats.admins"),         value: counts.ADMIN,    meta: t("admin.stats.adminsHint"),tone: "toneHot",  icon: "shield" },
    { key: "surveys",        label: t("admin.stats.surveys"),        value: surveys.length,  meta: t("admin.stats.published"), tone: "tonePink", icon: "poll" },
    { key: "totalQuestions", label: t("admin.stats.questions"),       value: totalQuestions,  meta: t("admin.stats.summary"),   tone: "toneCyan", icon: "question" },
  ];

  const isLoading = usersQuery.loading && !users.length;

  if (isLoading) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  const roleData = [
    { label: t("roles.STUDENT"), value: counts.STUDENT, color: ROLE_COLORS.STUDENT },
    { label: t("roles.TEACHER"), value: counts.TEACHER, color: ROLE_COLORS.TEACHER },
    { label: t("roles.PARENT"),  value: counts.PARENT,  color: ROLE_COLORS.PARENT  },
    { label: t("roles.ADMIN"),   value: counts.ADMIN,   color: ROLE_COLORS.ADMIN   },
  ].filter((d) => d.value > 0);

  const schoolData = usersBySchool.map((s) => ({
    label: s.name,
    value: s.count,
    color: "linear-gradient(90deg, var(--accent), var(--accent-alt))",
  }));

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>{t("admin.stats.title")}</h2>
          <p className={styles.sectionSub}>{t("admin.stats.sub")}</p>
        </div>
        <span className={styles.statusChip}>
          <span className={styles.dot} />
          {t("admin.stats.live")}
        </span>
      </section>

      <section className={styles.statsGrid}>
        {stats.map((item) => {
          const inner = (
            <>
              <div className={styles.statCardHead}>
                <p className={styles.statLabel}>{item.label}</p>
                <span className={styles.statCardIcon}><StatIcon name={item.icon} /></span>
              </div>
              <p className={styles.statValue}>{item.value}</p>
              <p className={styles.statMeta}>{item.meta}</p>
              {item.href ? <p className={styles.statHint}>{t("admin.stats.openList")} →</p> : null}
            </>
          );
          const cardClass = `${styles.statCard} ${styles[item.tone]}`;
          return item.href ? (
            <Link key={item.key} to={item.href} className={`${cardClass} ${styles.statCardLink}`}>
              {inner}
            </Link>
          ) : (
            <article key={item.key} className={cardClass}>{inner}</article>
          );
        })}
      </section>

      <section className={styles.chartsRow}>
        <article className={styles.chartPanel}>
          <header className={styles.chartPanelHead}>
            <div>
              <h3 className={styles.chartPanelTitle}>{t("admin.stats.roleDistribution")}</h3>
              <p className={styles.chartPanelSub}>{users.length} {t("admin.stats.accounts")}</p>
            </div>
          </header>
          {users.length ? (
            <div className={styles.chartPanelBody}>
              <DonutChart
                data={roleData}
                size={200}
                strokeWidth={28}
                centerValue={users.length}
                centerLabel={t("admin.stats.totalUsers")}
              />
              <ChartLegend data={roleData} />
            </div>
          ) : (
            <p className={styles.emptyState}>{t("admin.stats.noUsers")}</p>
          )}
        </article>

        <article className={styles.chartPanel}>
          <header className={styles.chartPanelHead}>
            <div>
              <h3 className={styles.chartPanelTitle}>{t("admin.stats.usersPerSchool")}</h3>
              <p className={styles.chartPanelSub}>{schools.length} {t("admin.stats.schools").toLowerCase()}</p>
            </div>
          </header>
          {schools.length ? (
            <BarList data={schoolData} valueFormatter={(v) => `${v}`} />
          ) : (
            <p className={styles.emptyState}>{t("admin.stats.noSchools")}</p>
          )}
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("admin.stats.schoolsList")}</h3>
          {schools.length ? (
            <ul className={styles.activityList}>
              {schools.map((s) => (
                <li key={s.id} className={styles.activityItem}>
                  <span className={styles.activityMain}>{s.name}</span>
                  <span className={styles.activityTime}>ID: {s.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("admin.stats.noSchools")}</p>
          )}
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t("admin.surveys.existing")}</h3>
          {surveys.length ? (
            <ul className={styles.activityList}>
              {surveys.slice(0, 5).map((s) => (
                <li key={s.id} className={styles.activityItem}>
                  <span className={styles.activityMain}>{s.title}</span>
                  <span className={styles.activityTime}>{t("admin.surveys.questionsCount", { count: s.questionsCount ?? 0 })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>{t("admin.surveys.empty")}</p>
          )}
        </article>
      </section>
    </div>
  );
}
