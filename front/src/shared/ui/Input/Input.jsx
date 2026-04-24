import styles from "./Input.module.css";

export default function Input({ label, error, className = '', value = '', icon = null, ...props }) {
  const hasValue = String(value ?? "").length > 0;
  const inputClass = `${styles.input} ${error ? styles.invalid : ''} ${className}`.trim();
  return (
    <label className={styles.root}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <input className={inputClass} value={value} {...props} />
      <span className={`${styles.floating} ${hasValue ? styles.filled : ''} ${error ? styles.errLabel : ''}`}>
        {label}
      </span>
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}
