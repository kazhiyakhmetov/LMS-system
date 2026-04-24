import { useMemo, useState } from "react";
import styles from "./TeacherClassesPage.module.css";

const classRows = [
  {
    id: 1,
    className: "10-А",
    subject: "Алгебра",
    students: 27,
    curator: true,
    attendance: 94,
    average: 4.3,
    pendingTasks: 9,
    lessonsPerWeek: 6,
  },
  {
    id: 2,
    className: "10-А",
    subject: "Геометрия",
    students: 27,
    curator: true,
    attendance: 92,
    average: 4.1,
    pendingTasks: 7,
    lessonsPerWeek: 4,
  },
  {
    id: 3,
    className: "9-Б",
    subject: "Алгебра",
    students: 29,
    curator: false,
    attendance: 88,
    average: 3.8,
    pendingTasks: 12,
    lessonsPerWeek: 5,
  },
  {
    id: 4,
    className: "9-Б",
    subject: "Геометрия",
    students: 29,
    curator: false,
    attendance: 87,
    average: 3.7,
    pendingTasks: 11,
    lessonsPerWeek: 4,
  },
  {
    id: 5,
    className: "11-А",
    subject: "Математика",
    students: 18,
    curator: false,
    attendance: 96,
    average: 4.6,
    pendingTasks: 4,
    lessonsPerWeek: 3,
  },
  {
    id: 6,
    className: "8-В",
    subject: "Математика",
    students: 25,
    curator: false,
    attendance: 91,
    average: 4,
    pendingTasks: 8,
    lessonsPerWeek: 4,
  },
];

const todayActivities = [
  {
    time: "13:30",
    title: "Созвон с родителями 9-Б",
    note: "Разбор итогов контрольной • онлайн",
  },
  {
    time: "15:00",
    title: "Консультация 11-А",
    note: "Подготовка к пробному ЕНТ • каб. 301",
  },
  {
    time: "16:20",
    title: "Классный час 10-А",
    note: "План мероприятий на апрель • каб. 203",
  },
];

function getRiskTone(row) {
  if (row.average < 4 || row.attendance < 90 || row.pendingTasks >= 10) return "risk";
  if (row.average < 4.3 || row.pendingTasks >= 7) return "watch";
  return "good";
}

function progressLabel(row) {
  if (row.average >= 4.5 && row.attendance >= 95) return "Сильная динамика";
  if (row.average >= 4 && row.attendance >= 90) return "Стабильно";
  return "Требует внимания";
}

export default function TeacherClassesPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const classOptions = useMemo(() => ["all", ...new Set(classRows.map((row) => row.className))], []);
  const subjectOptions = useMemo(() => ["all", ...new Set(classRows.map((row) => row.subject))], []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return classRows.filter((row) => {
      const matchesClass = classFilter === "all" || row.className === classFilter;
      const matchesSubject = subjectFilter === "all" || row.subject === subjectFilter;
      const matchesQuery =
        !query ||
        row.className.toLowerCase().includes(query) ||
        row.subject.toLowerCase().includes(query) ||
        progressLabel(row).toLowerCase().includes(query);
      return matchesClass && matchesSubject && matchesQuery;
    });
  }, [search, classFilter, subjectFilter]);

  const summary = useMemo(() => {
    const classSet = new Set(filteredRows.map((row) => row.className));
    const studentsTotal = filteredRows.reduce((sum, row) => sum + row.students, 0);
    const pendingTotal = filteredRows.reduce((sum, row) => sum + row.pendingTasks, 0);
    const attendanceAvg = filteredRows.length
      ? Math.round(filteredRows.reduce((sum, row) => sum + row.attendance, 0) / filteredRows.length)
      : 0;

    return {
      classesCount: classSet.size,
      studentsTotal,
      pendingTotal,
      attendanceAvg,
    };
  }, [filteredRows]);

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Классы</h2>
        <p className={styles.sub}>
          Управляйте учебной нагрузкой по классам, отслеживайте риски по успеваемости и планируйте активности куратора.
        </p>
      </section>

      <section className={styles.summary}>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Классов в работе</p>
          <p className={styles.summaryValue}>{summary.classesCount}</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Учеников (суммарно)</p>
          <p className={styles.summaryValue}>{summary.studentsTotal}</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Работ на проверке</p>
          <p className={styles.summaryValue}>{summary.pendingTotal}</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Средняя посещаемость</p>
          <p className={styles.summaryValue}>{summary.attendanceAvg}%</p>
        </article>
      </section>

      <section className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Поиск по классу или предмету..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className={styles.selectRow}>
          <select className={styles.select} value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            {classOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Все классы" : option}
              </option>
            ))}
          </select>

          <select className={styles.select} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
            {subjectOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Все предметы" : option}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.classGrid}>
        {filteredRows.length ? (
          filteredRows.map((row) => {
            const tone = getRiskTone(row);
            return (
              <article key={row.id} className={`${styles.classCard} ${styles[tone]}`}>
                <div className={styles.classTop}>
                  <p className={styles.classTitle}>
                    {row.className} • {row.subject}
                  </p>
                  {row.curator ? <span className={styles.curatorBadge}>Куратор</span> : null}
                </div>
                <p className={styles.classMeta}>{progressLabel(row)}</p>

                <div className={styles.metrics}>
                  <span>Учеников: {row.students}</span>
                  <span>Нагрузка: {row.lessonsPerWeek} ур./нед</span>
                  <span>Посещаемость: {row.attendance}%</span>
                  <span>Средний балл: {row.average}</span>
                </div>

                <p className={styles.pending}>На проверке: {row.pendingTasks}</p>
              </article>
            );
          })
        ) : (
          <div className={styles.emptyState}>По текущим фильтрам классы не найдены.</div>
        )}
      </section>

      <section className={styles.bottom}>
        <article className={styles.tableCard}>
          <h3 className={styles.sectionTitle}>Сводка по классам</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Класс</th>
                <th>Предмет</th>
                <th>Учеников</th>
                <th>Посещаемость</th>
                <th>Средний балл</th>
                <th>На проверке</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={`table-${row.id}`}>
                  <td>{row.className}</td>
                  <td>{row.subject}</td>
                  <td>{row.students}</td>
                  <td>{row.attendance}%</td>
                  <td>{row.average}</td>
                  <td>{row.pendingTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className={styles.activityCard}>
          <h3 className={styles.sectionTitle}>Классное руководство</h3>
          <ul className={styles.activityList}>
            {todayActivities.map((item) => (
              <li key={`${item.time}-${item.title}`} className={styles.activityItem}>
                <p className={styles.activityTitle}>
                  {item.time} • {item.title}
                </p>
                <p className={styles.activityMeta}>{item.note}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
