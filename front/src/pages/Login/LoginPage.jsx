import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import Input from "../../shared/ui/Input/Input";
import Button from "../../shared/ui/Button/Button";
import { useAuth } from "../../contexts/AuthContext";
import { roleToPath } from "../../shared/lib/auth/roleRedirect";
import logo from "../../assets/logo.png";

const INITIAL_FORM = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const { login: doLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");

  const isMountedRef = useRef(true);
  const forgotStatusTimeoutRef = useRef(null);
  const forgotCloseTimeoutRef = useRef(null);

  const fieldErrors = useMemo(() => {
    const errors = {};

    if (!form.email.trim()) errors.email = "Обязательное поле";
    if (!form.password.trim()) errors.password = "Обязательное поле";

    return errors;
  }, [form.email, form.password]);

  const canSubmit = Object.keys(fieldErrors).length === 0 && !loading;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearTimeout(forgotStatusTimeoutRef.current);
      clearTimeout(forgotCloseTimeoutRef.current);
    };
  }, []);

  const updateFormField = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearForgotTimers = () => {
    clearTimeout(forgotStatusTimeoutRef.current);
    clearTimeout(forgotCloseTimeoutRef.current);
  };

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setAttemptedSubmit(true);

    if (!canSubmit) return;

    try {
      setLoading(true);

      // Логин и пароль подчищаем только в момент отправки, чтобы не мешать вводу.
      const result = await doLogin({
        email: form.email.trim(),
        password: form.password,
      });

      navigate(roleToPath(result.user.role), { replace: true });
    } catch (error) {
      setSubmitError(error?.message || "Ошибка входа");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }

  function openForgot() {
    clearForgotTimers();
    setForgotEmail("");
    setForgotStatus("");
    setForgotOpen(true);
  }

  function closeForgot() {
    clearForgotTimers();
    setForgotOpen(false);
  }

  async function sendForgot(event) {
    event.preventDefault();

    if (!forgotEmail.trim()) {
      setForgotStatus("Введите почту");
      return;
    }

    // Чистим таймеры, чтобы статус не обновлялся после закрытия окна.
    clearForgotTimers();
    setForgotStatus("Отправка...");

    forgotStatusTimeoutRef.current = setTimeout(() => {
      setForgotStatus("Инструкция отправлена на вашу почту");
      forgotCloseTimeoutRef.current = setTimeout(() => {
        setForgotOpen(false);
      }, 1200);
    }, 800);
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.glowA} aria-hidden="true" />
      <div className={styles.glowB} aria-hidden="true" />

      <main className={styles.cardWrap}>
        <section className={styles.welcomeCard}>
          <div className={styles.welcomeHeader}>
            <img className={styles.welcomeLogoImg} src={logo} alt="" />
            <div className={styles.welcome}>StudIX</div>
          </div>

          <div className={styles.welcomeBody}>
            <h1 className={styles.welcomeH1}>Добро пожаловать!</h1>
            <p className={styles.welcomeSub}>
              Войдите в свою учётную запись и пользуйтесь всеми возможностями школьной платформы.
            </p>
          </div>

          <div className={styles.welcomeFooter}>
            <div className={styles.welcomeFeature}>
              <span className={styles.welcomeFeatureDot}>📅</span>
              Расписание, журнал и оценки в одном окне
            </div>
            <div className={styles.welcomeFeature}>
              <span className={styles.welcomeFeatureDot}>📝</span>
              Домашние задания и тесты онлайн
            </div>
            <div className={styles.welcomeFeature}>
              <span className={styles.welcomeFeatureDot}>💬</span>
              Чаты учеников, родителей и учителей
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <div className={styles.subtitle}>Вход в систему</div>
            </div>
          </header>

          <form className={styles.form} onSubmit={onSubmit}>
            <Input
              label="Email"
              type="email"
              placeholder=""
              autoComplete="email"
              value={form.email}
              onChange={updateFormField("email")}
              error={attemptedSubmit ? fieldErrors.email ?? "" : ""}
              icon={
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              }
            />

            <Input
              label="Пароль"
              type="password"
              placeholder=""
              autoComplete="current-password"
              value={form.password}
              onChange={updateFormField("password")}
              error={attemptedSubmit ? fieldErrors.password ?? "" : ""}
              icon={
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-5 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                </svg>
              }
            />

            {submitError ? <div className={styles.submitError}>{submitError}</div> : null}

            <div className={styles.rowActions}>
              <button type="button" className={styles.forgot} onClick={openForgot}>
                Забыли пароль?
              </button>
            </div>

            <Button type="submit" loading={loading} disabled={loading}>
              Войти
            </Button>
          </form>
        </section>
      </main>

      {forgotOpen ? (
        <div className={styles.forgotOverlay} role="dialog" aria-modal="true">
          <div className={styles.forgotBox}>
            <h3>Восстановление пароля</h3>

            <form onSubmit={sendForgot} className={styles.forgotForm}>
              <Input
                label="Почта"
                placeholder=""
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                icon={
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                }
              />

              <div className={styles.forgotStatus}>{forgotStatus}</div>

              <div style={{ display: "flex", gap: 10 }}>
                <Button type="submit">Отправить</Button>
                <button type="button" className={styles.ghost} onClick={closeForgot}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
