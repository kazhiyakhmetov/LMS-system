import { useEffect, useState } from "react";
import styles from "./VideoHelpModal.module.css";

/**
 * Кнопка-подсказка «?» рядом с генерацией. По клику — модалка с видео-инструкцией и текстом.
 * Адаптивна под мобилку. Видео берётся из /quiz-tutorial.mp4 (папка front/public).
 */
export default function VideoHelpModal({
  videoSrc = "/quiz-tutorial.mp4",
  title = "Как пользоваться ИИ-генератором",
}) {
  const [open, setOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.helpBtn}
        onClick={() => setOpen(true)}
        title="Как это работает"
        aria-label="Инструкция"
      >
        ?
      </button>

      {open ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <header className={styles.head}>
              <h3 className={styles.title}>{title}</h3>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </header>

            <div className={styles.videoWrap}>
              {videoError ? (
                <div className={styles.videoPlaceholder}>
                  🎬 Видео-инструкция скоро появится
                </div>
              ) : (
                <video
                  className={styles.video}
                  src={videoSrc}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setVideoError(true)}
                />
              )}
            </div>

            <div className={styles.text}>
              <p className={styles.lead}>
                ИИ создаёт тестовые вопросы автоматически по вашему тексту. Это
                экономит время — не нужно придумывать вопросы вручную.
              </p>
              <p className={styles.stepsTitle}>Как пользоваться:</p>
              <ol className={styles.steps}>
                <li>
                  Вставьте <b>текст материала</b> (параграф из учебника, конспект),
                  по которому нужны вопросы — минимум 20 символов.
                </li>
                <li>
                  Выберите <b>количество вопросов</b> (2–15) и <b>уровень сложности</b>
                  (лёгкий / средний / сложный).
                </li>
                <li>
                  Нажмите <b>«✨ Сгенерировать ИИ»</b> и подождите ~30–60 секунд —
                  ИИ читает текст и составляет вопросы.
                </li>
                <li>
                  <b>Проверьте</b> готовые вопросы и правильные ответы, при
                  необходимости отредактируйте.
                </li>
                <li>
                  <b>Сохраните</b> тест и при желании назначьте его классу.
                </li>
              </ol>
              <p className={styles.note}>
                💡 Совет: чем понятнее и насыщеннее исходный текст, тем качественнее
                вопросы. Всегда просматривайте результат перед назначением ученикам.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
