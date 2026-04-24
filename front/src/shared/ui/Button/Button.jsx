import styles from './Button.module.css'
export default function Button({ loading, children, ...props }) {
  return (
    <button className={styles.btn} disabled={loading || props.disabled} {...props}>
      <span className={styles.inner}>
        {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {children}
      </span>
    </button>
  )
}