import styles from "./WeeklyScheduleTable.module.css";

export default function WeeklyScheduleTable({
  title,
  weekRange,
  weekDays,
  slots,
  schedule,
  slotHeadLabel = "Урок",
  emptyLabel = "—",
  rightControls = null,
  actionLabel = null,
  onPrevWeek = null,
  onNextWeek = null,
  onToday = null,
  todayLabel = "Сегодня",
}) {
  return (
    <div className={styles.page}>
      <section className={styles.toolbar}>
        <h2 className={styles.title}>{title}</h2>

        <div className={styles.weekControls}>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={onPrevWeek || undefined}
            disabled={!onPrevWeek}
            aria-label="Предыдущая неделя"
          >
            ◀
          </button>
          {onToday ? (
            <button type="button" className={styles.todayBtn} onClick={onToday}>
              {todayLabel}
            </button>
          ) : null}
          <p className={styles.weekRange}>{weekRange}</p>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={onNextWeek || undefined}
            disabled={!onNextWeek}
            aria-label="Следующая неделя"
          >
            ▶
          </button>
        </div>

        <div className={styles.rightBlock}>
          {rightControls}
          {actionLabel ? (
            <button type="button" className={styles.actionBtn}>
              {actionLabel}
            </button>
          ) : null}
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.slotHead}>{slotHeadLabel}</th>
                {weekDays.map((day) => (
                  <th key={day.key}>{day.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => (
                <tr key={slot.number}>
                  <th className={styles.slotCell}>
                    <span className={styles.slotNumber}>{slot.number}</span>
                    <span className={styles.slotTime}>{slot.time}</span>
                  </th>

                  {weekDays.map((day) => {
                    const lesson = schedule[day.key][index];
                    return (
                      <td key={`${day.key}-${slot.number}`}>
                        {lesson ? (
                          <div className={styles.lesson}>
                            <p className={styles.lessonSubject}>{lesson.subject}</p>
                            <p className={styles.lessonMeta}>{lesson.metaLine}</p>
                            <p className={styles.lessonExtra}>{lesson.extraLine}</p>
                          </div>
                        ) : (
                          <span className={styles.empty}>{emptyLabel}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
