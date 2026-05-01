import styles from "./Chart.module.css";

/**
 * Lightweight donut chart based on SVG stroke-dasharray.
 * data: [{ label, value, color }]
 */
export function DonutChart({ data, size = 200, strokeWidth = 26, centerLabel, centerValue }) {
  const items = Array.isArray(data) ? data : [];
  const total = items.reduce((sum, d) => sum + (d.value || 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let acc = 0;
  const center = size / 2;

  return (
    <div className={styles.donutWrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="var(--bg-soft)"
          strokeWidth={strokeWidth}
        />
        {total > 0 && items.map((d, i) => {
          const fraction = (d.value || 0) / total;
          const dashLen = fraction * circumference;
          const dashoffset = -acc * circumference;
          acc += fraction;
          return (
            <circle
              key={d.label ?? i}
              cx={center} cy={center} r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference}`}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: "stroke-dasharray 600ms ease, stroke-dashoffset 600ms ease" }}
            />
          );
        })}
      </svg>
      <div className={styles.donutCenter}>
        <span className={styles.donutValue}>{centerValue ?? total}</span>
        {centerLabel ? <span className={styles.donutLabel}>{centerLabel}</span> : null}
      </div>
    </div>
  );
}

/**
 * Horizontal bar list. Each item shows label + bar + value.
 * data: [{ label, value, color }]
 */
export function BarList({ data, max, valueFormatter }) {
  const items = Array.isArray(data) ? data : [];
  const cap = max ?? Math.max(1, ...items.map((d) => d.value || 0));
  const fmt = valueFormatter ?? ((v) => v);

  return (
    <ul className={styles.barList}>
      {items.map((d, i) => {
        const percent = cap > 0 ? Math.round(((d.value || 0) / cap) * 100) : 0;
        return (
          <li key={d.label ?? i} className={styles.barItem}>
            <div className={styles.barTop}>
              <span className={styles.barLabel}>{d.label}</span>
              <span className={styles.barValue}>{fmt(d.value || 0)}</span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  width: `${percent}%`,
                  background: d.color || "linear-gradient(90deg, var(--accent), var(--accent-alt))",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Chart legend below donut.
 * data: [{ label, value, color }]
 */
export function ChartLegend({ data }) {
  const items = Array.isArray(data) ? data : [];
  return (
    <ul className={styles.legend}>
      {items.map((d, i) => (
        <li key={d.label ?? i} className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: d.color }} />
          <span className={styles.legendLabel}>{d.label}</span>
          <span className={styles.legendValue}>{d.value}</span>
        </li>
      ))}
    </ul>
  );
}
