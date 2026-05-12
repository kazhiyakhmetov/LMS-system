import { useEffect, useMemo, useState } from "react";
import styles from "./TeacherHomeroomPage.module.css";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";
import { lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { homeroomApi, ApiError } from "../../../../shared/lib/api";
import {
  addDaysISO,
  formatDateTime,
  formatWeekRange,
  getMondayISO,
  toISODate,
} from "../../../../shared/lib/utils/date";

const TAB_SCHEDULE = "schedule";
const TAB_STUDENTS = "students";
const TAB_UPCOMING = "upcoming";

const QUARTERS = [1, 2, 3, 4];

function emptyGrid() {
  return Object.fromEntries(weekDays.map((d) => [d.key, lessonSlots.map(() => null)]));
}

function buildScheduleGrid(lessons) {
  const grid = emptyGrid();
  if (!Array.isArray(lessons)) return grid;
  lessons.forEach((lesson) => {
    const key = lesson?.dayOfWeek ? lesson.dayOfWeek.toLowerCase() : null;
    if (!key || !grid[key]) return;
    const idx = (lesson.lessonNumber ?? 1) - 1;
    if (idx < 0 || idx >= grid[key].length) return;
    grid[key][idx] = {
      subject: lesson.subjectName || "",
      metaLine: lesson.teacherName || "",
      extraLine: lesson.classroom ? `Каб. ${lesson.classroom}` : "",
    };
  });
  return grid;
}

function initials(fullName) {
  if (!fullName) return "?";
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function avatarSrc(avatarPath) {
  if (!avatarPath) return null;
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath;
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const root = base.replace(/\/api\/?$/, "");
  return `${root}${avatarPath.startsWith("/") ? "" : "/"}${avatarPath}`;
}

function formatGrade(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return (Math.round(n * 10) / 10).toString();
}

function StudentAvatar({ avatarPath, fullName, size = "card" }) {
  const src = avatarSrc(avatarPath);
  const cls = size === "modal" ? styles.modalHeadAvatar : styles.studentAvatar;
  return (
    <span className={cls}>
      {src ? (
        <img src={src} alt={fullName} onError={(e) => { e.currentTarget.style.display = "none"; }} />
      ) : (
        initials(fullName)
      )}
    </span>
  );
}

function StudentGradesModal({ student, onClose }) {
  const [quarter, setQuarter] = useState(() => {
    const m = new Date().getMonth() + 1;
    if (m >= 9 && m <= 10) return 1;
    if (m === 11 || m === 12) return 2;
    if (m >= 1 && m <= 3) return 3;
    return 4;
  });

  const { data, loading, error } = useApi(
    () => homeroomApi.studentGrades(student.studentId, quarter),
    [student.studentId, quarter],
  );

  const subjects = Array.isArray(data?.subjects) ? data.subjects : [];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHead}>
          <StudentAvatar avatarPath={student.avatarPath} fullName={student.fullName} size="modal" />
          <div>
            <h3 className={styles.modalHeadTitle}>{student.fullName}</h3>
            <p className={styles.modalHeadSub}>
              {student.email ? `${student.email} • ` : ""}
              Средний балл: {formatGrade(student.averageGrade)}
            </p>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className={styles.modalQuarterTabs}>
          {QUARTERS.map((q) => (
            <button
              key={q}
              type="button"
              className={`${styles.quarterTab} ${q === quarter ? styles.quarterTabActive : ""}`}
              onClick={() => setQuarter(q)}
            >
              {`${q} четверть`}
            </button>
          ))}
        </div>

        <div className={styles.modalBody}>
          {loading && !data ? (
            <p className={styles.emptyState}>Загрузка оценок…</p>
          ) : error ? (
            <p className={styles.emptyState}>Не удалось загрузить оценки: {error.message}</p>
          ) : subjects.length === 0 ? (
            <p className={styles.emptyState}>За эту четверть оценок пока нет.</p>
          ) : (
            subjects.map((subj) => {
              const entries = Array.isArray(subj.entries) ? subj.entries : [];
              const finalGrade = subj.finalGrade || {};
              const finalValue = finalGrade.quarterGrade ?? finalGrade.calculatedQuarterGrade;
              return (
                <article key={subj.subjectId} className={styles.subjectCard}>
                  <div className={styles.subjectHead}>
                    <h4 className={styles.subjectName}>{subj.subjectName}</h4>
                    <div className={styles.subjectFlags}>
                      {subj.readOnly ? (
                        <span className={styles.flagReadOnly}>read-only</span>
                      ) : null}
                      <span className={styles.subjectAvg}>
                        avg {formatGrade(subj.subjectAverage)}
                      </span>
                    </div>
                  </div>

                  {entries.length ? (
                    <div className={styles.gradesRow}>
                      {entries.map((entry) => (
                        <span key={entry.id} className={styles.gradeChip} title={entry.lessonDate || ""}>
                          <span className={styles.gradeChipKind}>{entry.label || entry.entryType}</span>
                          <span>{entry.displayValue || formatGrade(entry.numericValue)}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>Записей за четверть нет.</p>
                  )}

                  <div className={styles.subjectFooter}>
                    <span>Четвертная оценка</span>
                    <span className={styles.subjectFinalValue}>
                      {finalValue !== undefined && finalValue !== null
                        ? formatGrade(finalValue)
                        : "—"}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherHomeroomPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [startDate, setStartDate] = useState(() => getMondayISO());
  const [tab, setTab] = useState(TAB_SCHEDULE);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const infoQuery = useApi(() => homeroomApi.info(), []);
  const isNotHomeroom =
    infoQuery.error instanceof ApiError && infoQuery.error.status === 404;

  // Only fetch the rest if user IS homeroom
  const studentsQuery = useApi(
    () => (isNotHomeroom ? Promise.resolve([]) : homeroomApi.students()),
    [isNotHomeroom],
  );
  const weekQuery = useApi(
    () => (isNotHomeroom ? Promise.resolve([]) : homeroomApi.scheduleWeek(startDate)),
    [isNotHomeroom, startDate],
  );
  const upcomingQuery = useApi(
    () => (isNotHomeroom ? Promise.resolve([]) : homeroomApi.upcoming()),
    [isNotHomeroom],
  );

  const info = infoQuery.data;
  const students = Array.isArray(studentsQuery.data) ? studentsQuery.data : [];
  const lessons = Array.isArray(weekQuery.data) ? weekQuery.data : [];
  const upcoming = Array.isArray(upcomingQuery.data) ? upcomingQuery.data : [];

  const scheduleGrid = useMemo(() => buildScheduleGrid(lessons), [lessons]);
  const weekRange = useMemo(() => formatWeekRange(startDate), [startDate]);

  // Recompute deadlines count for the next 7 days for KPI
  const upcomingNext7 = useMemo(() => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 7);
    return upcoming.filter((a) => {
      if (!a?.deadline) return false;
      const d = new Date(a.deadline);
      return d <= horizon;
    }).length;
  }, [upcoming]);

  useEffect(() => {
    if (isNotHomeroom && selectedStudent) setSelectedStudent(null);
  }, [isNotHomeroom, selectedStudent]);

  if (infoQuery.loading && !infoQuery.data && !infoQuery.error) {
    return <div style={{ padding: 24 }}>Загрузка панели классного руководителя…</div>;
  }

  if (isNotHomeroom) {
    return (
      <div className={styles.page}>
        <section className={styles.notHomeroom}>
          <h2 className={styles.notHomeroomTitle}>Вы не назначены классным руководителем</h2>
          <p className={styles.notHomeroomText}>
            Этот раздел доступен только классным руководителям. Если вы должны быть назначены, обратитесь к администратору школы.
          </p>
        </section>
      </div>
    );
  }

  if (infoQuery.error) {
    return (
      <div style={{ padding: 24, color: "var(--danger)" }}>
        Ошибка: {infoQuery.error.message}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.heroEyebrow}>Классное руководство</p>
          <h2 className={styles.heroTitle}>
            Мой класс {info?.className || ""}
          </h2>
          <p className={styles.heroSub}>
            Расписание класса, состав учеников и предстоящие дедлайны в одном месте.
          </p>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}>
              Учеников: <strong>{info?.studentsCount ?? students.length}</strong>
            </span>
            <span className={styles.heroBadge}>
              Средний балл: <strong>{formatGrade(info?.averageGrade)}</strong>
            </span>
            {info?.academicYear ? (
              <span className={styles.heroBadge}>
                Год: <strong>{info.academicYear}</strong>
              </span>
            ) : null}
            {info?.language ? (
              <span className={styles.heroBadge}>
                Язык: <strong>{info.language}</strong>
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.kpis}>
        <article className={`${styles.kpiCard} ${styles.kpiToneEmerald}`}>
          <p className={styles.kpiLabel}>Учеников</p>
          <p className={styles.kpiValue}>{info?.studentsCount ?? students.length}</p>
          <p className={styles.kpiMeta}>в классе {info?.className || ""}</p>
        </article>
        <article className={`${styles.kpiCard} ${styles.kpiToneTeal}`}>
          <p className={styles.kpiLabel}>Средний балл</p>
          <p className={styles.kpiValue}>{formatGrade(info?.averageGrade)}</p>
          <p className={styles.kpiMeta}>по всем предметам</p>
        </article>
        <article className={`${styles.kpiCard} ${styles.kpiToneAmber}`}>
          <p className={styles.kpiLabel}>Дедлайнов на 7 дней</p>
          <p className={styles.kpiValue}>{upcomingNext7}</p>
          <p className={styles.kpiMeta}>заданий и работ</p>
        </article>
      </section>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === TAB_SCHEDULE}
          className={`${styles.tabBtn} ${tab === TAB_SCHEDULE ? styles.tabBtnActive : ""}`}
          onClick={() => setTab(TAB_SCHEDULE)}
        >
          Расписание
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === TAB_STUDENTS}
          className={`${styles.tabBtn} ${tab === TAB_STUDENTS ? styles.tabBtnActive : ""}`}
          onClick={() => setTab(TAB_STUDENTS)}
        >
          Ученики
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === TAB_UPCOMING}
          className={`${styles.tabBtn} ${tab === TAB_UPCOMING ? styles.tabBtnActive : ""}`}
          onClick={() => setTab(TAB_UPCOMING)}
        >
          Предстоящие
        </button>
      </div>

      {tab === TAB_SCHEDULE ? (
        weekQuery.loading && !lessons.length ? (
          <div className={styles.section}>
            <p className={styles.emptyState}>Загрузка расписания…</p>
          </div>
        ) : (
          <WeeklyScheduleTable
            title={`Расписание класса ${info?.className || ""}`}
            weekRange={weekRange}
            weekDays={weekDays}
            slots={lessonSlots}
            schedule={scheduleGrid}
            emptyLabel="—"
            onPrevWeek={() => setStartDate(addDaysISO(startDate, -7))}
            onNextWeek={() => setStartDate(addDaysISO(startDate, 7))}
            onToday={() => setStartDate(getMondayISO())}
            todayLabel="Сегодня"
          />
        )
      ) : null}

      {tab === TAB_STUDENTS ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Состав класса</h3>
          {studentsQuery.loading && !students.length ? (
            <p className={styles.emptyState}>Загрузка списка…</p>
          ) : students.length === 0 ? (
            <p className={styles.emptyState}>В классе пока нет учеников.</p>
          ) : (
            <div className={styles.studentsGrid}>
              {students.map((s) => (
                <button
                  type="button"
                  key={s.studentId}
                  className={styles.studentCard}
                  onClick={() => setSelectedStudent(s)}
                >
                  <div className={styles.studentHead}>
                    <StudentAvatar avatarPath={s.avatarPath} fullName={s.fullName} />
                    <div style={{ minWidth: 0 }}>
                      <p className={styles.studentName}>{s.fullName}</p>
                      {s.email ? <p className={styles.studentEmail}>{s.email}</p> : null}
                    </div>
                  </div>
                  <div className={styles.studentMeta}>
                    <span className={styles.studentEmail}>Открыть оценки →</span>
                    {s.averageGrade !== null && s.averageGrade !== undefined ? (
                      <span className={styles.studentAvg}>{formatGrade(s.averageGrade)}</span>
                    ) : (
                      <span className={styles.studentAvgEmpty}>нет оценок</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === TAB_UPCOMING ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Предстоящие задания и работы</h3>
          {upcomingQuery.loading && !upcoming.length ? (
            <p className={styles.emptyState}>Загрузка…</p>
          ) : upcoming.length === 0 ? (
            <p className={styles.emptyState}>Ближайших дедлайнов нет.</p>
          ) : (
            <ul className={styles.upcomingList}>
              {upcoming.map((a) => (
                <li key={a.id} className={styles.upcomingItem}>
                  <span className={styles.upcomingType}>
                    {a.type || "задание"} • {a.subjectName || "—"}
                  </span>
                  <p className={styles.upcomingTitle}>{a.title}</p>
                  <p className={styles.upcomingMeta}>
                    Дедлайн: {a.deadline ? formatDateTime(a.deadline) : "—"}
                    {a.teacherName ? ` • ${a.teacherName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {selectedStudent ? (
        <StudentGradesModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      ) : null}

      {/* swallow today */}
      <span style={{ display: "none" }}>{today}</span>
    </div>
  );
}
