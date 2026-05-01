import styles from "./TeacherSurveyPage.module.css";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { surveysApi } from "../../../../shared/lib/api";

export default function TeacherSurveyPage() {
  const listQuery = useApi(() => surveysApi.available(), []);
  const surveys = Array.isArray(listQuery.data) ? listQuery.data : [];

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2 className={styles.title}>Опросы</h2>
          <p className={styles.sub}>
            Backend пока отдаёт только опросы, доступные текущему пользователю
            (<code>GET /api/surveys/available</code>). Создание и управление опросами для учителя
            реализовано на бэке только для роли <strong>admin</strong> — добавим teacher-эндпоинты
            следующим шагом.
          </p>
        </div>
      </section>

      {listQuery.loading && !surveys.length ? (
        <p style={{ padding: 16 }}>Загрузка опросов…</p>
      ) : listQuery.error ? (
        <p style={{ padding: 16, color: "var(--danger)" }}>Ошибка: {listQuery.error.message}</p>
      ) : surveys.length ? (
        <section className={styles.list}>
          {surveys.map((survey) => (
            <article key={survey.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.subject}>Опрос</span>
                <span className={`${styles.badge} ${styles.active}`}>Доступен</span>
              </div>
              <p className={styles.cardTitle}>{survey.title}</p>
              <p className={styles.cardDesc ?? ""}>{survey.description || ""}</p>
              <div className={styles.metaRow}>
                <span>{survey.questionsCount ?? survey.questions?.length ?? 0} вопросов</span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.emptyState}>Доступных опросов нет.</div>
      )}
    </div>
  );
}
