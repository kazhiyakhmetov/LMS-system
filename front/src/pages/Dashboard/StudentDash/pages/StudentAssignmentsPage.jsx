import { useEffect, useMemo, useState } from "react";
import styles from "./StudentAssignmentsPage.module.css";

const PAGE_SIZE = 5;

const assignments = [
  {
    id: 1,
    subject: "Физика",
    title: "Лабораторная: Законы Ньютона",
    deadline: "Завтра, 18:00",
    status: "urgent",
    teacher: "Н. Садыкова",
    materials: [
      { name: "Методичка: Законы Ньютона", href: "/materials/physics-newton-guide.txt" },
      { name: "Шаблон отчета лабораторной", href: "/materials/physics-lab-report-template.txt" },
    ],
  },
  {
    id: 2,
    subject: "Литература",
    title: "Эссе: Анализ произведения",
    deadline: "Через 2 дня",
    status: "inProgress",
    teacher: "Л. Толеу",
    materials: [{ name: "Требования к эссе", href: "/materials/literature-essay-template.txt" }],
  },
  {
    id: 3,
    subject: "Алгебра",
    title: "Домашняя работа №12",
    deadline: "Пятница, 20:00",
    status: "new",
    teacher: "К. Муханова",
    materials: [{ name: "Лист заданий №12", href: "/materials/algebra-hw12-sheet.txt" }],
  },
  {
    id: 4,
    subject: "История",
    title: "Презентация по теме XIX века",
    deadline: "Следующая неделя",
    status: "completed",
    teacher: "Д. Турсынбек",
    grade: "5/5",
    materials: [{ name: "Источники по теме XIX века", href: "/materials/history-xix-sources.txt" }],
  },
  {
    id: 5,
    subject: "Информатика",
    title: "Практика: SQL-запросы",
    deadline: "Сегодня, 21:00",
    status: "urgent",
    teacher: "А. Жанибек",
    materials: [
      { name: "Набор данных для SQL", href: "/materials/sql-practice-dataset.txt" },
      { name: "Памятка SQL-команд", href: "/materials/sql-commands-cheatsheet.txt" },
    ],
  },
  {
    id: 6,
    subject: "Английский",
    title: "Vocabulary test preparation",
    deadline: "Понедельник",
    status: "inProgress",
    teacher: "A. White",
    materials: [{ name: "Vocabulary list", href: "/materials/english-vocabulary-list.txt" }],
  },
  {
    id: 7,
    subject: "Биология",
    title: "Конспект: Клеточное строение",
    deadline: "Суббота",
    status: "new",
    teacher: "А. Нурали",
    materials: [{ name: "Конспект по клетке", href: "/materials/biology-cell-notes.txt" }],
  },
  {
    id: 8,
    subject: "Химия",
    title: "Решение задач по реакциям",
    deadline: "Через 3 дня",
    status: "completed",
    teacher: "С. Рахим",
    grade: "4/5",
    materials: [{ name: "Таблица формул и реакций", href: "/materials/chemistry-reactions-formula-sheet.txt" }],
  },
  {
    id: 9,
    subject: "География",
    title: "Карта: страны Азии",
    deadline: "Четверг",
    status: "new",
    teacher: "Г. Абдулла",
    materials: [{ name: "Контурная карта Азии", href: "/materials/geography-asia-map-reference.txt" }],
  },
  {
    id: 10,
    subject: "Казахский",
    title: "Сочинение на 250 слов",
    deadline: "Завтра, 15:00",
    status: "inProgress",
    teacher: "Ж. Аблай",
    materials: [{ name: "Критерии оценивания сочинения", href: "/materials/kazakh-essay-criteria.txt" }],
  },
  {
    id: 11,
    subject: "Физкультура",
    title: "Дневник активности за неделю",
    deadline: "Следующий вторник",
    status: "completed",
    teacher: "И. Ким",
    grade: "Зачет",
    materials: [{ name: "Шаблон дневника активности", href: "/materials/pe-activity-template.txt" }],
  },
  {
    id: 12,
    subject: "Алгебра",
    title: "Контрольная подготовка: тема 7",
    deadline: "Сегодня, 19:00",
    status: "urgent",
    teacher: "К. Муханова",
    materials: [{ name: "Примеры задач по теме 7", href: "/materials/algebra-theme7-samples.txt" }],
  },
];

const filters = [
  { key: "all", label: "Все" },
  { key: "completed", label: "Выполненные" },
  { key: "notCompleted", label: "Невыполненные" },
  { key: "urgent", label: "Срочные" },
  { key: "inProgress", label: "В процессе" },
  { key: "new", label: "Новые" },
];

function statusLabel(status) {
  switch (status) {
    case "completed":
      return "Выполнено";
    case "urgent":
      return "Срочно";
    case "inProgress":
      return "В процессе";
    default:
      return "Новое";
  }
}

function matchesStatus(item, statusFilter) {
  if (statusFilter === "all") return true;
  if (statusFilter === "notCompleted") return item.status !== "completed";
  return item.status === statusFilter;
}

function assignmentDescription(item) {
  return `Выполните задание по предмету "${item.subject}", внимательно проверьте требования преподавателя и загрузите итоговый файл до дедлайна. Формат сдачи: один файл с аккуратным оформлением и понятным названием.`;
}

export default function StudentAssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({});

  const subjectOptions = useMemo(() => {
    return ["all", ...new Set(assignments.map((item) => item.subject))];
  }, []);

  const filteredAssignments = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return assignments.filter((item) => {
      const matchesQuery =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.subject.toLowerCase().includes(normalizedSearch);
      const matchesSubject = subjectFilter === "all" || item.subject === subjectFilter;
      const matchesByStatus = matchesStatus(item, statusFilter);

      return matchesQuery && matchesSubject && matchesByStatus;
    });
  }, [searchQuery, statusFilter, subjectFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, subjectFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssignments.slice(start, start + PAGE_SIZE);
  }, [filteredAssignments, currentPage]);

  const startItem = filteredAssignments.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredAssignments.length);
  const uploadedFileName = selectedAssignment ? uploadedFiles[selectedAssignment.id] : "";
  const teacherMaterials = selectedAssignment?.materials ?? [];

  useEffect(() => {
    if (!selectedAssignment) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedAssignment(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedAssignment]);

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAssignment) return;

    setUploadedFiles((prev) => ({
      ...prev,
      [selectedAssignment.id]: file.name,
    }));
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <h2 className={styles.title}>Задания</h2>
        <p className={styles.sub}>Поиск, фильтрация по статусу и предметам, контроль дедлайнов и оценок.</p>
      </section>

      <section className={styles.controls}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="assignment-search">
            Поиск
          </label>
          <input
            id="assignment-search"
            className={styles.input}
            type="text"
            placeholder="Найти задание по названию или предмету..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="subject-filter">
            Предмет
          </label>
          <select
            id="subject-filter"
            className={styles.select}
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject === "all" ? "Все предметы" : subject}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.filters}>
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`${styles.filterChip} ${statusFilter === filter.key ? styles.filterChipActive : ""}`}
            onClick={() => setStatusFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </section>

      <p className={styles.resultMeta}>
        Показано {startItem}-{endItem} из {filteredAssignments.length}
      </p>

      <section className={styles.list}>
        {paginatedAssignments.length ? (
          paginatedAssignments.map((item) => (
            <article
              key={item.id}
              className={styles.card}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedAssignment(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedAssignment(item);
                }
              }}
            >
              <div className={styles.cardTop}>
                <p className={styles.subject}>{item.subject}</p>
                <span className={`${styles.badge} ${styles[item.status]}`}>{statusLabel(item.status)}</span>
              </div>

              <p className={styles.taskTitle}>{item.title}</p>

              <div className={styles.cardMetaRow}>
                <p className={styles.meta}>Срок: {item.deadline}</p>
                <p className={styles.meta}>Преподаватель: {item.teacher}</p>
              </div>

              {item.status === "completed" ? <p className={styles.grade}>Оценка: {item.grade}</p> : null}
            </article>
          ))
        ) : (
          <div className={styles.emptyState}>
            По текущим параметрам заданий нет. Попробуйте изменить поиск или фильтры.
          </div>
        )}
      </section>

      <section className={styles.pagination}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
          disabled={currentPage === 1}
        >
          Назад
        </button>

        <p className={styles.pageInfo}>
          Страница {currentPage} из {totalPages}
        </p>

        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
          disabled={currentPage === totalPages}
        >
          Вперед
        </button>
      </section>

      {selectedAssignment ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAssignment(null);
            }
          }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
            <div className={styles.modalHead}>
              <div>
                <h3 id="assignment-modal-title" className={styles.modalTitle}>
                  {selectedAssignment.title}
                </h3>
                <p className={styles.modalSub}>Карточка задания</p>
              </div>

              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть"
                onClick={() => setSelectedAssignment(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalInfoGrid}>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Предмет</p>
                <p className={styles.modalValue}>{selectedAssignment.subject}</p>
              </div>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Статус</p>
                <p className={styles.modalValue}>{statusLabel(selectedAssignment.status)}</p>
              </div>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Срок</p>
                <p className={styles.modalValue}>{selectedAssignment.deadline}</p>
              </div>
              <div className={styles.modalInfoItem}>
                <p className={styles.modalLabel}>Преподаватель</p>
                <p className={styles.modalValue}>{selectedAssignment.teacher}</p>
              </div>
              {selectedAssignment.grade ? (
                <div className={styles.modalInfoItem}>
                  <p className={styles.modalLabel}>Оценка</p>
                  <p className={styles.modalValue}>{selectedAssignment.grade}</p>
                </div>
              ) : null}
            </div>

            <div className={styles.modalSection}>
              <p className={styles.modalSectionTitle}>Описание</p>
              <p className={styles.modalText}>{assignmentDescription(selectedAssignment)}</p>
            </div>

            <div className={styles.modalSection}>
              <p className={styles.modalSectionTitle}>Материалы от преподавателя</p>
              {teacherMaterials.length ? (
                <ul className={styles.materialList}>
                  {teacherMaterials.map((material) => (
                    <li key={material.href} className={styles.materialItem}>
                      <span className={styles.materialName}>{material.name}</span>
                      <a className={styles.materialLink} href={material.href} download>
                        Скачать
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noMaterial}>Материал не прикреплен.</p>
              )}
            </div>

            <div className={styles.modalSection}>
              <p className={styles.modalSectionTitle}>Файл на проверку</p>
              <input
                id="assignment-upload-input"
                className={styles.fileInput}
                type="file"
                onChange={onFileChange}
              />
              <div className={styles.uploadRow}>
                <label htmlFor="assignment-upload-input" className={styles.uploadBtn}>
                  Сдать файл
                </label>
                <p className={styles.fileName}>{uploadedFileName ? `Выбрано: ${uploadedFileName}` : "Файл не выбран"}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
