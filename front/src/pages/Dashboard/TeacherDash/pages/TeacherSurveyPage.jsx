import styles from "./TeacherSurveyPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";
import { useT } from "../../../../shared/lib/i18n";

export default function TeacherSurveyPage() {
  const { t } = useT();
  const listQuery = useApi(() => surveysApi.available(), []);
  const surveys = Array.isArray(listQuery.data) ? listQuery.data : [];

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("teacher.surveys.title")}</h2>
          <p className={styles.sub}>{t("teacher.surveys.sub")}</p>
        </div>
      </section>

      {listQuery.loading && !surveys.length ? (
        <p style={{ padding: 16 }}>{t("common.loading")}</p>
      ) : listQuery.error ? (
        <p style={{ padding: 16, color: "var(--danger)" }}>{t("common.error")}: {listQuery.error.message}</p>
      ) : surveys.length ? (
        <section className={styles.list}>
          {surveys.map((survey) => (
            <article key={survey.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.subject}>{t("student.surveys.surveyBadge")}</span>
                <span className={`${styles.badge} ${styles.active}`}>{t("student.surveys.statusActive")}</span>
              </div>
              <p className={styles.cardTitle}>{survey.title}</p>
              <p className={styles.cardDesc ?? ""}>{survey.description || ""}</p>
              <div className={styles.metaRow}>
                <span>{t("student.surveys.questionsCount", { count: survey.questionsCount ?? survey.questions?.length ?? 0 })}</span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.emptyState}>{t("teacher.surveys.empty")}</div>
      )}
    </div>
  );
}
