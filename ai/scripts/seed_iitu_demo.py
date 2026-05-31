"""Reset and seed a coherent IITU demo dataset.

Run inside the ai container:
    docker compose exec ai python -m scripts.seed_iitu_demo
"""
from __future__ import annotations

import json
import logging
import random
import sys
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import close_pool, conn  # noqa: E402
from app.recommend.service import refresh_all  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("seed_iitu_demo")

ACADEMIC_YEAR = "2025-2026"
SCHOOL_NAME = "IITU"
NOW = datetime(2026, 5, 31, 12, 0, 0)
PASSWORD_HASH = "$2b$10$XYtreYkCLpwY9U6TTGTCK.HWzICvh1ImUZ41cw40G5/JYAt0U8Tia"  # password

ROLES = ["admin", "teacher", "student", "parent"]

SUBJECTS = [
    "Алгебра",
    "Геометрия",
    "Физика",
    "Химия",
    "Биология",
    "Информатика",
    "English",
    "Қазақ тілі",
    "Русский язык",
    "История Казахстана",
    "География",
    "Физкультура",
]

TEACHERS = [
    ("teacher.math@iitu.kz", "Айгуль", "Смагулова", "Алгебра"),
    ("teacher.geometry@iitu.kz", "Ерлан", "Касымов", "Геометрия"),
    ("teacher.physics@iitu.kz", "Алишер", "Нургалиев", "Физика"),
    ("teacher.chemistry@iitu.kz", "Марат", "Тастанов", "Химия"),
    ("teacher.biology@iitu.kz", "Сауле", "Искакова", "Биология"),
    ("teacher.it@iitu.kz", "Дамир", "Ахметов", "Информатика"),
    ("teacher.english@iitu.kz", "Карлыгаш", "Мухамеджанова", "English"),
    ("teacher.kazakh@iitu.kz", "Айжан", "Калиева", "Қазақ тілі"),
    ("teacher.history@iitu.kz", "Руслан", "Жумабаев", "История Казахстана"),
    ("teacher.pe@iitu.kz", "Арман", "Кожанов", "Физкультура"),
]

CLASS_NAMES = ["7А", "7Б", "8А", "8Б", "9А", "9Б", "10А", "10Б", "11А", "11Б"]

STUDENTS = [
    ("student.7a@iitu.kz", "Аружан", "Серикова", "7А", "excellent"),
    ("student.7b@iitu.kz", "Данияр", "Омаров", "7Б", "average"),
    ("student.8a@iitu.kz", "Нурбол", "Ахметов", "8А", "at-risk"),
    ("student.8a2@iitu.kz", "Мансур", "Есенов", "8А", "good"),
    ("student.8a3@iitu.kz", "София", "Ли", "8А", "excellent"),
    ("student.8a4@iitu.kz", "Ерасыл", "Кайрат", "8А", "average"),
    ("student.8a5@iitu.kz", "Диана", "Абилова", "8А", "struggling"),
    ("student.8b@iitu.kz", "Аида", "Ким", "8Б", "good"),
    ("student.9a@iitu.kz", "Тимур", "Абаев", "9А", "struggling"),
    ("student.9b@iitu.kz", "Зарина", "Бекова", "9Б", "excellent"),
    ("student.10a@iitu.kz", "Санжар", "Ибраев", "10А", "average"),
    ("student.10b@iitu.kz", "Алия", "Нурбекова", "10Б", "struggling"),
    ("student.11a@iitu.kz", "Мадина", "Сулеймен", "11А", "good"),
    ("student.11b@iitu.kz", "Ильяс", "Рахимов", "11Б", "at-risk"),
]

PARENTS = [
    ("parent.askar@iitu.kz", "Аскар", "Сериков", ["student.7a@iitu.kz", "student.8a@iitu.kz", "student.8a2@iitu.kz", "student.11a@iitu.kz"]),
    ("parent.samal@iitu.kz", "Самал", "Омарова", ["student.7b@iitu.kz", "student.8a4@iitu.kz", "student.9a@iitu.kz", "student.10b@iitu.kz"]),
    ("parent.dina@iitu.kz", "Дина", "Бекова", ["student.8a3@iitu.kz", "student.8a5@iitu.kz", "student.8b@iitu.kz", "student.9b@iitu.kz", "student.10a@iitu.kz", "student.11b@iitu.kz"]),
]

PROFILES = {
    "excellent": {"mean": 0.93, "std": 0.04, "submit": 1.00, "attendance": [("PRESENT", 0.97), ("SICK", 0.02), ("ABSENT", 0.01)]},
    "good": {"mean": 0.82, "std": 0.07, "submit": 0.92, "attendance": [("PRESENT", 0.92), ("SICK", 0.05), ("EXCUSED", 0.02), ("ABSENT", 0.01)]},
    "average": {"mean": 0.69, "std": 0.09, "submit": 0.72, "attendance": [("PRESENT", 0.82), ("SICK", 0.08), ("EXCUSED", 0.03), ("ABSENT", 0.07)]},
    "struggling": {"mean": 0.56, "std": 0.12, "submit": 0.50, "attendance": [("PRESENT", 0.70), ("SICK", 0.08), ("EXCUSED", 0.04), ("ABSENT", 0.18)]},
    "at-risk": {"mean": 0.43, "std": 0.13, "submit": 0.30, "attendance": [("PRESENT", 0.54), ("SICK", 0.10), ("EXCUSED", 0.05), ("ABSENT", 0.31)]},
}

CORE_BY_GRADE = {
    7: ["Алгебра", "Геометрия", "Биология", "Информатика", "English", "Қазақ тілі", "История Казахстана", "Физкультура"],
    8: ["Алгебра", "Геометрия", "Физика", "Биология", "Информатика", "English", "Қазақ тілі", "Физкультура"],
    9: ["Алгебра", "Геометрия", "Физика", "Химия", "Биология", "Информатика", "English", "История Казахстана"],
    10: ["Алгебра", "Геометрия", "Физика", "Химия", "Информатика", "English", "География", "Физкультура"],
    11: ["Алгебра", "Геометрия", "Физика", "Химия", "Информатика", "English", "Русский язык", "История Казахстана"],
}

LESSON_TIMES = [
    (1, time(8, 30), time(9, 15), 10),
    (2, time(9, 25), time(10, 10), 15),
    (3, time(10, 25), time(11, 10), 10),
    (4, time(11, 20), time(12, 5), 10),
    (5, time(12, 15), time(13, 0), 35),
    (6, time(13, 35), time(14, 20), 10),
]

QUIZ_TEMPLATES = [
    ("Алгебра", "Квадратные уравнения", ["D = b² - 4ac", "2 корня", "теорема Виета"]),
    ("Физика", "Силы и движение", ["F = ma", "Ньютон", "м/с²"]),
    ("Информатика", "Python: условия и циклы", ["if", "for", "list"]),
    ("English", "Past Simple practice", ["went", "did", "regular verbs"]),
    ("Химия", "Периодическая таблица", ["атомный номер", "группа", "период"]),
    ("Биология", "Клетка и ткани", ["ядро", "митохондрия", "мембрана"]),
]


def one(cur, sql: str, params: tuple = ()) -> int:
    cur.execute(sql, params)
    row = cur.fetchone()
    if row is None:
        raise RuntimeError(f"Expected RETURNING row for query: {sql}")
    return int(row[0])


def choose_weighted(items: list[tuple[str, float]], rng: random.Random) -> str:
    point = rng.random()
    total = 0.0
    for value, weight in items:
        total += weight
        if point <= total:
            return value
    return items[-1][0]


def clamp(value: float, low: int, high: int) -> int:
    return max(low, min(high, int(round(value))))


def grade_number(class_name: str) -> int:
    return int("".join(ch for ch in class_name if ch.isdigit()))


def weekday_name(d: date) -> str:
    return ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"][d.weekday()]


def create_user(cur, school_id: int, role_ids: dict[str, int], email: str, first: str, last: str, role: str, bio: str = "") -> int:
    user_id = one(
        cur,
        """
        INSERT INTO users (email, password_hash, first_name, last_name, school_id, created_at, bio)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (email, PASSWORD_HASH, first, last, school_id, NOW, bio),
    )
    cur.execute("INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)", (user_id, role_ids[role]))
    return user_id


def reset_database(cur) -> None:
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    tables = [row[0] for row in cur.fetchall()]
    quoted = ", ".join(f'public."{table}"' for table in tables)
    cur.execute(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE")


def seed_static(cur) -> dict:
    role_ids = {role: one(cur, "INSERT INTO roles (name) VALUES (%s) RETURNING id", (role,)) for role in ROLES}
    school_id = one(
        cur,
        "INSERT INTO schools (name, address, created_at) VALUES (%s, %s, %s) RETURNING id",
        (SCHOOL_NAME, "Almaty, Kazakhstan", NOW),
    )

    subject_ids = {
        name: one(cur, "INSERT INTO subjects (name) VALUES (%s) RETURNING id", (name,))
        for name in SUBJECTS
    }
    for number, start, end, break_duration in LESSON_TIMES:
        cur.execute(
            """
            INSERT INTO school_lesson_times (school_id, lesson_number, start_time, end_time, break_duration)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (school_id, number, start, end, break_duration),
        )

    cur.execute(
        """
        INSERT INTO grade_formula_config (fo_weight, sor_weight, soch_weight, exam_weight, year_weight, max_scale, updated_at)
        VALUES (0.30, 0.25, 0.30, 0.15, 1.0, 100, %s)
        """,
        (NOW,),
    )

    admin_id = create_user(cur, school_id, role_ids, "admin@iitu.kz", "Admin", "IITU", "admin", "Демо-администратор школы IITU")

    teacher_ids: dict[str, int] = {}
    subject_teacher: dict[str, int] = {}
    for email, first, last, main_subject in TEACHERS:
        teacher_id = create_user(cur, school_id, role_ids, email, first, last, "teacher", f"Учитель: {main_subject}")
        cur.execute("INSERT INTO teachers (user_id) VALUES (%s)", (teacher_id,))
        teacher_ids[email] = teacher_id
        subject_teacher[main_subject] = teacher_id
    subject_teacher["Русский язык"] = subject_teacher["История Казахстана"]
    subject_teacher["География"] = subject_teacher["История Казахстана"]

    class_ids: dict[str, int] = {}
    homerooms = list(teacher_ids.values())
    for idx, class_name in enumerate(CLASS_NAMES):
        class_ids[class_name] = one(
            cur,
            """
            INSERT INTO school_classes (school_id, name, academic_year, active, homeroom_teacher_id, language)
            VALUES (%s, %s, %s, true, %s, %s)
            RETURNING id
            """,
            (school_id, class_name, ACADEMIC_YEAR, homerooms[idx % len(homerooms)], "RU"),
        )

    student_ids: dict[str, int] = {}
    student_profiles: dict[int, str] = {}
    student_classes: dict[int, str] = {}
    for email, first, last, class_name, profile in STUDENTS:
        student_id = create_user(cur, school_id, role_ids, email, first, last, "student", f"Демо-профиль: {profile}")
        cur.execute("INSERT INTO students (user_id, class_id) VALUES (%s, %s)", (student_id, class_ids[class_name]))
        student_ids[email] = student_id
        student_profiles[student_id] = profile
        student_classes[student_id] = class_name

    parent_ids: dict[str, int] = {}
    for email, first, last, children in PARENTS:
        parent_id = create_user(cur, school_id, role_ids, email, first, last, "parent", "Родитель демо-учеников IITU")
        cur.execute("INSERT INTO parents (user_id) VALUES (%s)", (parent_id,))
        parent_ids[email] = parent_id
        for child_email in children:
            cur.execute(
                "INSERT INTO parent_student (parent_id, student_id) VALUES (%s, %s)",
                (parent_id, student_ids[child_email]),
            )

    return {
        "school_id": school_id,
        "admin_id": admin_id,
        "role_ids": role_ids,
        "subject_ids": subject_ids,
        "teacher_ids": teacher_ids,
        "subject_teacher": subject_teacher,
        "class_ids": class_ids,
        "student_ids": student_ids,
        "student_profiles": student_profiles,
        "student_classes": student_classes,
        "parent_ids": parent_ids,
    }


def seed_teacher_links(cur, ctx: dict) -> dict[tuple[str, str], int]:
    link_teachers: dict[tuple[str, str], int] = {}
    for class_name, class_id in ctx["class_ids"].items():
        for subject in CORE_BY_GRADE[grade_number(class_name)]:
            teacher_id = ctx["subject_teacher"][subject]
            cur.execute(
                """
                INSERT INTO teacher_class_subjects (teacher_id, class_id, subject_id, active, assigned_at)
                VALUES (%s, %s, %s, true, %s)
                """,
                (teacher_id, class_id, ctx["subject_ids"][subject], NOW),
            )
            link_teachers[(class_name, subject)] = teacher_id
    return link_teachers


def seed_schedule(cur, ctx: dict, link_teachers: dict[tuple[str, str], int]) -> list[dict]:
    lessons: list[dict] = []
    week_starts = [date(2026, 6, 1), date(2026, 6, 8)]
    for class_index, (class_name, class_id) in enumerate(ctx["class_ids"].items()):
        subjects = CORE_BY_GRADE[grade_number(class_name)]
        for week_number, week_start in enumerate(week_starts, start=1):
            template_id = one(
                cur,
                """
                INSERT INTO schedule_templates (class_id, quarter, week_number, week_start, week_end)
                VALUES (%s, 4, %s, %s, %s)
                RETURNING id
                """,
                (class_id, week_number, week_start, week_start + timedelta(days=6)),
            )
            for day_offset in range(5):
                current = week_start + timedelta(days=day_offset)
                day_id = one(
                    cur,
                    """
                    INSERT INTO schedule_days (template_id, date, day_of_week, is_holiday)
                    VALUES (%s, %s, %s, false)
                    RETURNING id
                    """,
                    (template_id, current, weekday_name(current)),
                )
                for lesson_number, start, end, _break_duration in LESSON_TIMES[:5]:
                    subject = subjects[(lesson_number + day_offset + class_index + week_number) % len(subjects)]
                    teacher_id = link_teachers[(class_name, subject)]
                    lesson_id = one(
                        cur,
                        """
                        INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (day_id, lesson_number, start, end, f"{class_name}-{lesson_number}", ctx["subject_ids"][subject], teacher_id),
                    )
                    cur.execute(
                        """
                        INSERT INTO teacher_schedules (
                            teacher_id, class_id, subject_id, lesson_id, date, day_of_week, lesson_number,
                            start_time, end_time, classroom, schedule_type, description, created_at, created_by
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'LESSON', %s, %s, %s)
                        """,
                        (
                            teacher_id,
                            class_id,
                            ctx["subject_ids"][subject],
                            lesson_id,
                            current,
                            weekday_name(current),
                            lesson_number,
                            start,
                            end,
                            f"{class_name}-{lesson_number}",
                            f"{subject}: плановый урок",
                            NOW,
                            ctx["admin_id"],
                        ),
                    )
                    lessons.append({
                        "id": lesson_id,
                        "class_name": class_name,
                        "class_id": class_id,
                        "subject": subject,
                        "subject_id": ctx["subject_ids"][subject],
                        "teacher_id": teacher_id,
                        "date": current,
                    })
    return lessons


def seed_assignments_and_grades(cur, ctx: dict, rng: random.Random, link_teachers: dict[tuple[str, str], int]) -> list[dict]:
    assignments: list[dict] = []
    assignment_specs = [
        ("Практика по теме", "HOMEWORK", date(2026, 4, 18), 5),
        ("Мини-СОР", "SOR", date(2026, 4, 28), 100),
        ("Домашнее закрепление", "HOMEWORK", date(2026, 5, 6), 5),
        ("Проектная работа", "PROJECT", date(2026, 5, 14), 100),
        ("Контрольная работа", "SOCH", date(2026, 5, 22), 100),
        ("Повторение раздела", "HOMEWORK", date(2026, 5, 29), 5),
        ("Подготовка к модулю", "HOMEWORK", date(2026, 6, 6), 5),
        ("Итоговый чек-лист", "PROJECT", date(2026, 6, 12), 100),
    ]
    for class_name, class_id in ctx["class_ids"].items():
        subjects = CORE_BY_GRADE[grade_number(class_name)]
        for idx, (title, work_type, deadline, max_grade) in enumerate(assignment_specs):
            subject = subjects[idx % len(subjects)]
            teacher_id = link_teachers[(class_name, subject)]
            assignment_id = one(
                cur,
                """
                INSERT INTO assignments (title, description, type, max_grade, deadline, created_at, subject_id, teacher_id, class_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    f"{title}: {subject}",
                    f"Демо-задание для {class_name}. Материал подобран для проверки мобильных экранов и AI-аналитики.",
                    work_type,
                    max_grade,
                    datetime.combine(deadline, time(23, 59)),
                    datetime.combine(deadline - timedelta(days=8), time(10, 0)),
                    ctx["subject_ids"][subject],
                    teacher_id,
                    class_id,
                ),
            )
            assignments.append({
                "id": assignment_id,
                "class_name": class_name,
                "class_id": class_id,
                "subject": subject,
                "subject_id": ctx["subject_ids"][subject],
                "teacher_id": teacher_id,
                "max_grade": max_grade,
                "deadline": deadline,
            })

    journal_values: dict[tuple[int, int, int, int], list[float]] = defaultdict(list)
    for student_id, class_name in ctx["student_classes"].items():
        profile_name = ctx["student_profiles"][student_id]
        profile = PROFILES[profile_name]
        class_assignments = [a for a in assignments if a["class_name"] == class_name]
        for idx, assignment in enumerate(class_assignments):
            is_future = assignment["deadline"] > NOW.date()
            should_submit = is_future or rng.random() <= profile["submit"]
            if not should_submit:
                continue
            submitted_at = datetime.combine(
                assignment["deadline"] - timedelta(days=rng.choice([0, 1, 2, 3])),
                time(rng.choice([16, 18, 20]), rng.choice([5, 15, 35])),
            )
            if profile_name in {"struggling", "at-risk"} and rng.random() < 0.35:
                submitted_at = datetime.combine(assignment["deadline"] + timedelta(days=1), time(19, 10))
            submission_id = one(
                cur,
                """
                INSERT INTO submissions (assignment_id, student_id, submitted_at, status, comment, file_name, file_path, file_size)
                VALUES (%s, %s, %s, 'graded', %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    assignment["id"],
                    student_id,
                    submitted_at,
                    "Автоматически сгенерированная демо-работа",
                    f"assignment_{assignment['id']}_{student_id}.pdf",
                    f"/demo/iitu/assignment_{assignment['id']}_{student_id}.pdf",
                    rng.randint(180_000, 850_000),
                ),
            )
            pct = max(0.12, min(1.0, rng.gauss(profile["mean"], profile["std"])))
            if idx >= 4 and profile_name in {"struggling", "at-risk"}:
                pct = max(0.1, pct - 0.08)
            grade_value = clamp(pct * assignment["max_grade"], 1, assignment["max_grade"])
            graded_at = submitted_at + timedelta(hours=rng.choice([6, 18, 26]))
            one(
                cur,
                """
                INSERT INTO grades (submission_id, teacher_id, grade_value, comment, graded_at)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (submission_id, assignment["teacher_id"], grade_value, "Проверено в демо-наборе IITU", graded_at),
            )
            normalized = grade_value / assignment["max_grade"] * 5.0
            journal_values[(student_id, assignment["class_id"], assignment["subject_id"], assignment["teacher_id"])].append(normalized)
            cur.execute(
                """
                INSERT INTO journal_entries (
                    student_id, class_id, subject_id, teacher_id, lesson_date, quarter, entry_type,
                    numeric_value, max_value, display_value, comment, is_manual, source_type, source_id, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, 4, 'ASSIGNMENT_GRADE', %s, %s, %s, %s, false, 'ASSIGNMENT', %s, %s, %s)
                """,
                (
                    student_id,
                    assignment["class_id"],
                    assignment["subject_id"],
                    assignment["teacher_id"],
                    assignment["deadline"],
                    float(grade_value),
                    float(assignment["max_grade"]),
                    f"{grade_value}/{assignment['max_grade']}",
                    assignment["subject"],
                    assignment["id"],
                    graded_at,
                    graded_at,
                ),
            )

    for (student_id, class_id, subject_id, teacher_id), values in journal_values.items():
        avg = round(sum(values) / len(values), 2)
        cur.execute(
            """
            INSERT INTO journal_final_grades (
                student_id, class_id, subject_id, teacher_id, quarter, calculated_quarter_grade,
                quarter_grade, is_quarter_manual, calculated_year_grade, year_grade, is_year_manual, updated_at
            )
            VALUES (%s, %s, %s, %s, 4, %s, %s, false, %s, %s, false, %s)
            """,
            (student_id, class_id, subject_id, teacher_id, avg, avg, avg, avg, NOW),
        )

    return assignments


def seed_attendance(cur, ctx: dict, rng: random.Random, link_teachers: dict[tuple[str, str], int]) -> None:
    start = date(2026, 5, 4)
    school_days = [start + timedelta(days=i) for i in range(28) if (start + timedelta(days=i)).weekday() < 5]
    for student_id, class_name in ctx["student_classes"].items():
        class_id = ctx["class_ids"][class_name]
        subjects = CORE_BY_GRADE[grade_number(class_name)]
        profile = PROFILES[ctx["student_profiles"][student_id]]
        for day_index, current in enumerate(school_days):
            for slot in range(4):
                subject = subjects[(day_index + slot) % len(subjects)]
                status = choose_weighted(profile["attendance"], rng)
                cur.execute(
                    """
                    INSERT INTO attendance_marks (student_id, class_id, subject_id, teacher_id, lesson_date, quarter, status)
                    VALUES (%s, %s, %s, %s, %s, 4, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        student_id,
                        class_id,
                        ctx["subject_ids"][subject],
                        link_teachers[(class_name, subject)],
                        current,
                        status,
                    ),
                )


def seed_q3_journal_snapshot(cur, ctx: dict, rng: random.Random, link_teachers: dict[tuple[str, str], int]) -> None:
    q3_dates = [
        date(2026, 1, 12),
        date(2026, 1, 23),
        date(2026, 2, 6),
        date(2026, 2, 20),
        date(2026, 3, 6),
        date(2026, 3, 18),
    ]
    for student_id, class_name in ctx["student_classes"].items():
        class_id = ctx["class_ids"][class_name]
        profile_name = ctx["student_profiles"][student_id]
        profile = PROFILES[profile_name]
        for subject in CORE_BY_GRADE[grade_number(class_name)]:
            teacher_id = link_teachers[(class_name, subject)]
            subject_id = ctx["subject_ids"][subject]
            values = []
            for idx, lesson_date in enumerate(q3_dates):
                status = choose_weighted(profile["attendance"], rng)
                cur.execute(
                    """
                    INSERT INTO attendance_marks (student_id, class_id, subject_id, teacher_id, lesson_date, quarter, status)
                    VALUES (%s, %s, %s, %s, %s, 3, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (student_id, class_id, subject_id, teacher_id, lesson_date, status),
                )

                if idx in {1, 4} and profile_name == "at-risk":
                    continue
                if idx == 4 and profile_name == "struggling":
                    continue

                mark = clamp(rng.gauss(profile["mean"], profile["std"]) * 10, 2, 10)
                entry_type = "LESSON_GRADE"
                source_type = "LESSON_Q3"
                if idx == 2:
                    entry_type = "SOR_GRADE"
                    source_type = "SOR"
                elif idx == 5:
                    entry_type = "SOCH_GRADE"
                    source_type = "SOCH"
                cur.execute(
                    """
                    INSERT INTO journal_entries (
                        student_id, class_id, subject_id, teacher_id, lesson_date, quarter, entry_type,
                        numeric_value, max_value, display_value, comment, is_manual, source_type, source_id, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, 3, %s, %s, 10.0, %s, %s, false, %s, NULL, %s, %s)
                    """,
                    (
                        student_id,
                        class_id,
                        subject_id,
                        teacher_id,
                        lesson_date,
                        entry_type,
                        float(mark),
                        str(mark),
                        "Демо-оценка за 3 четверть",
                        source_type,
                        datetime.combine(lesson_date, time(14, 30)),
                        datetime.combine(lesson_date, time(14, 30)),
                    ),
                )
                values.append(mark)

            if values:
                q_grade = clamp((sum(values) / len(values)) / 2, 2, 5)
                cur.execute(
                    """
                    INSERT INTO journal_final_grades (
                        student_id, class_id, subject_id, teacher_id, quarter, calculated_quarter_grade,
                        quarter_grade, is_quarter_manual, calculated_year_grade, year_grade, is_year_manual, updated_at
                    )
                    VALUES (%s, %s, %s, %s, 3, %s, %s, false, %s, %s, false, %s)
                    """,
                    (student_id, class_id, subject_id, teacher_id, float(q_grade), float(q_grade), float(q_grade), float(q_grade), NOW),
                )


def seed_quizzes(cur, ctx: dict, rng: random.Random, link_teachers: dict[tuple[str, str], int]) -> None:
    for index, class_name in enumerate(CLASS_NAMES):
        class_id = ctx["class_ids"][class_name]
        subject, title, keywords = QUIZ_TEMPLATES[index % len(QUIZ_TEMPLATES)]
        if subject not in CORE_BY_GRADE[grade_number(class_name)]:
            subject = CORE_BY_GRADE[grade_number(class_name)][index % len(CORE_BY_GRADE[grade_number(class_name)])]
            title = f"Практический квиз: {subject}"
            keywords = ["понятие", "пример", "решение"]
        teacher_id = link_teachers[(class_name, subject)]
        quiz_id = one(
            cur,
            """
            INSERT INTO quiz (title, description, active, created_at, updated_at, subject_id, teacher_id)
            VALUES (%s, %s, true, %s, %s, %s, %s)
            RETURNING id
            """,
            (title, f"Квиз для {class_name}: {subject}", NOW - timedelta(days=10 - index), NOW, ctx["subject_ids"][subject], teacher_id),
        )
        question_ids = []
        for q_index, keyword in enumerate(keywords, start=1):
            question_id = one(
                cur,
                """
                INSERT INTO quiz_question (quiz_id, question_text, question_type, points, required)
                VALUES (%s, %s, 'SINGLE_CHOICE', 1, true)
                RETURNING id
                """,
                (quiz_id, f"{q_index}. Выберите верный ответ по теме «{keyword}»."),
            )
            correct_option_id = None
            for option_index, (text_value, is_correct) in enumerate(
                [(f"{keyword}: верное утверждение", True), ("Частично верно", False), ("Не относится к теме", False), ("Нет правильного ответа", False)],
                start=1,
            ):
                option_id = one(
                    cur,
                    """
                    INSERT INTO quiz_option (question_id, option_text, is_correct, order_index)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (question_id, text_value, is_correct, option_index),
                )
                if is_correct:
                    correct_option_id = option_id
            question_ids.append((question_id, correct_option_id))
        assignment_id = one(
            cur,
            """
            INSERT INTO quiz_assignment (quiz_id, class_id, teacher_id, active, created_at, start_time, end_time, time_limit_minutes)
            VALUES (%s, %s, %s, true, %s, %s, %s, 20)
            RETURNING id
            """,
            (
                quiz_id,
                class_id,
                teacher_id,
                NOW - timedelta(days=7),
                NOW - timedelta(days=6),
                datetime(2026, 6, 14, 23, 59),
            ),
        )
        class_students = [sid for sid, c_name in ctx["student_classes"].items() if c_name == class_name]
        for student_id in class_students:
            cur.execute(
                "INSERT INTO quiz_assignment_student (quiz_assignment_id, student_id) VALUES (%s, %s)",
                (assignment_id, student_id),
            )
            profile_name = ctx["student_profiles"][student_id]
            should_attempt = (
                profile_name in {"excellent", "good", "average"}
                or (profile_name == "struggling" and index % 2 == 0)
                or (profile_name == "at-risk" and index % 3 == 2)
            )
            if not should_attempt:
                continue
            correct_count = {
                "excellent": rng.choice([3, 3, 2]),
                "good": rng.choice([2, 3]),
                "average": rng.choice([1, 2]),
                "struggling": rng.choice([1, 1, 2]),
                "at-risk": rng.choice([0, 1]),
            }[profile_name]
            started = NOW - timedelta(days=rng.randint(1, 5), minutes=rng.randint(5, 60))
            duration = rng.randint(240, 980)
            attempt_id = one(
                cur,
                """
                INSERT INTO quiz_attempt (quiz_assignment_id, student_id, status, start_time, end_time, duration_seconds, score)
                VALUES (%s, %s, 'SUBMITTED', %s, %s, %s, %s)
                RETURNING id
                """,
                (assignment_id, student_id, started, started + timedelta(seconds=duration), duration, correct_count),
            )
            for answer_index, (question_id, correct_option_id) in enumerate(question_ids):
                is_correct = answer_index < correct_count
                selected = correct_option_id if is_correct else correct_option_id + 1
                cur.execute(
                    """
                    INSERT INTO quiz_answer (
                        quiz_attempt_id, question_id, answer_text, selected_option_ids_json, is_correct, points_awarded
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        attempt_id,
                        question_id,
                        "selected",
                        json.dumps([selected]),
                        is_correct,
                        1.0 if is_correct else 0.0,
                    ),
                )
            cur.execute(
                """
                INSERT INTO journal_entries (
                    student_id, class_id, subject_id, teacher_id, lesson_date, quarter, entry_type,
                    numeric_value, max_value, display_value, comment, is_manual, source_type, source_id, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, 4, 'QUIZ_GRADE', %s, 3.0, %s, %s, false, 'QUIZ', %s, %s, %s)
                """,
                (
                    student_id,
                    class_id,
                    ctx["subject_ids"][subject],
                    teacher_id,
                    started.date(),
                    float(correct_count),
                    f"{correct_count}/3",
                    title,
                    quiz_id,
                    started,
                    started,
                ),
            )


def seed_surveys_news_notifications(cur, ctx: dict, rng: random.Random) -> None:
    news = [
        ("Старт летнего учебного модуля", "С 1 июня классы работают по обновленному расписанию.", "GENERAL"),
        ("Неделя проектов IITU", "Ученики 9-11 классов защищают мини-проекты по информатике и естественным наукам.", "LOCAL"),
        ("Родительские встречи", "Классные руководители проведут встречи по итогам четверти.", "GENERAL"),
    ]
    for offset, (title, description, news_type) in enumerate(news):
        cur.execute(
            """
            INSERT INTO news_posts (title, description, type, school_id, start_date, end_date, created_at, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                title,
                description,
                news_type,
                ctx["school_id"],
                date(2026, 5, 30) + timedelta(days=offset),
                date(2026, 6, 14),
                NOW - timedelta(days=offset),
                ctx["admin_id"],
            ),
        )

    banners = [
        ("Расписание обновлено", "Проверьте уроки на период 1-14 июня.", "INFO", True, True, True),
        ("Дедлайны недели", "Не забудьте закрыть задания до пятницы.", "WARNING", False, True, True),
    ]
    for title, message, severity, for_parents, for_students, for_teachers in banners:
        cur.execute(
            """
            INSERT INTO notification_banners (
                title, message, severity, for_parents, for_students, for_teachers,
                start_date, end_date, created_at, created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                title,
                message,
                severity,
                for_parents,
                for_students,
                for_teachers,
                date(2026, 5, 31),
                date(2026, 6, 14),
                NOW,
                ctx["admin_id"],
            ),
        )

    survey_id = one(
        cur,
        """
        INSERT INTO surveys (title, description, active, is_active, for_students, for_teachers, created_at, expires_at, created_by)
        VALUES (%s, %s, true, true, true, false, %s, %s, %s)
        RETURNING id
        """,
        ("Комфорт обучения", "Короткий опрос для учеников по нагрузке и расписанию.", NOW, datetime(2026, 6, 14, 23, 59), ctx["admin_id"]),
    )
    question_id = one(
        cur,
        """
        INSERT INTO survey_questions (survey_id, text, type, question_type, required, order_index)
        VALUES (%s, %s, 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', true, 1)
        RETURNING id
        """,
        (survey_id, "Насколько комфортна учебная нагрузка на этой неделе?"),
    )
    option_ids = []
    for index, text_value in enumerate(["Комфортно", "Средне", "Слишком много"], start=1):
        option_ids.append(one(cur, "INSERT INTO survey_options (question_id, text, order_index) VALUES (%s, %s, %s) RETURNING id", (question_id, text_value, index)))
    text_question_id = one(
        cur,
        """
        INSERT INTO survey_questions (survey_id, text, type, question_type, required, order_index)
        VALUES (%s, %s, 'TEXT', 'TEXT', false, 2)
        RETURNING id
        """,
        (survey_id, "Что стоит улучшить в мобильной версии?"),
    )
    for student_id in ctx["student_classes"]:
        response_id = one(
            cur,
            """
            INSERT INTO survey_responses (survey_id, user_id, answers_json, submitted_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (
                survey_id,
                student_id,
                json.dumps({"load": rng.choice(["Комфортно", "Средне", "Слишком много"]), "mobile": "Сделать карточки компактнее"}, ensure_ascii=False),
                NOW - timedelta(hours=rng.randint(1, 36)),
            ),
        )
        selected_option = rng.choice(option_ids)
        cur.execute(
            "INSERT INTO survey_answers (response_id, question_id, option_id, text_answer) VALUES (%s, %s, %s, NULL)",
            (response_id, question_id, selected_option),
        )
        cur.execute(
            "INSERT INTO survey_answers (response_id, question_id, option_id, text_answer) VALUES (%s, %s, NULL, %s)",
            (response_id, text_question_id, "Хочу быстрее видеть оценки и дедлайны."),
        )

    all_users = [ctx["admin_id"], *ctx["teacher_ids"].values(), *ctx["student_ids"].values(), *ctx["parent_ids"].values()]
    for user_id in all_users:
        cur.execute(
            """
            INSERT INTO notifications (user_id, type, message, is_read, hidden, related_id, created_at)
            VALUES (%s, %s, %s, %s, false, NULL, %s)
            """,
            (
                user_id,
                "INFO",
                "Демо-данные IITU обновлены: проверьте расписание, оценки и уведомления.",
                rng.random() < 0.35,
                NOW - timedelta(minutes=rng.randint(5, 240)),
            ),
        )


def seed_gamification_and_tags(cur, ctx: dict, rng: random.Random) -> None:
    achievement_specs = [
        ("Первый шаг", "Первое выполненное задание", "starter", "ASSIGNMENT_COMPLETED", 1, 25),
        ("Стабильность", "Пять учебных действий подряд", "streak", "STREAK", 5, 50),
        ("Отличник", "Высокие результаты по заданиям", "star", "PERFECT_ASSIGNMENTS", 3, 80),
        ("Квиз-мастер", "Успешные попытки квизов", "quiz", "QUIZ_COMPLETED", 3, 60),
    ]
    achievement_ids = []
    for spec in achievement_specs:
        achievement_ids.append(
            one(
                cur,
                """
                INSERT INTO achievements (name, description, icon, achievement_type, required_value, xp_reward)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                spec,
            )
        )

    tag_ids = {}
    for name, description in [
        ("Высокий риск", "Нужна поддержка классного руководителя"),
        ("Стабильный прогресс", "Положительная динамика"),
        ("Сильная посещаемость", "Редко пропускает уроки"),
        ("Просрочки", "Есть незакрытые дедлайны"),
    ]:
        tag_ids[name] = one(cur, "INSERT INTO tags (name, description) VALUES (%s, %s) RETURNING id", (name, description))

    rank = 1
    profile_xp = {"excellent": 920, "good": 680, "average": 430, "struggling": 260, "at-risk": 140}
    for student_id, profile in sorted(ctx["student_profiles"].items(), key=lambda item: -profile_xp[item[1]]):
        xp = profile_xp[profile] + rng.randint(-30, 45)
        cur.execute(
            """
            INSERT INTO student_stats (
                student_id, total_xp, level, current_streak, max_streak, completed_assignments,
                perfect_assignments, rank_position
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                student_id,
                xp,
                max(1, xp // 200 + 1),
                {"excellent": 9, "good": 5, "average": 3, "struggling": 1, "at-risk": 0}[profile],
                {"excellent": 14, "good": 8, "average": 5, "struggling": 3, "at-risk": 1}[profile],
                {"excellent": 8, "good": 7, "average": 5, "struggling": 4, "at-risk": 2}[profile],
                {"excellent": 4, "good": 2, "average": 1, "struggling": 0, "at-risk": 0}[profile],
                rank,
            ),
        )
        cur.execute(
            """
            INSERT INTO xp_event (student_id, xp_change, total_xp_after, source, source_id, created_at)
            VALUES (%s, %s, %s, 'DEMO_SEED', NULL, %s)
            """,
            (student_id, rng.randint(20, 90), xp, NOW - timedelta(days=rng.randint(1, 12))),
        )
        for achievement_id in achievement_ids[: {"excellent": 4, "good": 3, "average": 2, "struggling": 1, "at-risk": 1}[profile]]:
            cur.execute(
                "INSERT INTO student_achievements (student_id, achievement_id, unlocked_at, progress_value) VALUES (%s, %s, %s, %s)",
                (student_id, achievement_id, NOW - timedelta(days=rng.randint(1, 20)), rng.randint(1, 8)),
            )
        if profile in {"at-risk", "struggling"}:
            cur.execute("INSERT INTO student_tags (student_id, tag_id) VALUES (%s, %s)", (student_id, tag_ids["Высокий риск"]))
            cur.execute("INSERT INTO student_tags (student_id, tag_id) VALUES (%s, %s)", (student_id, tag_ids["Просрочки"]))
        elif profile in {"excellent", "good"}:
            cur.execute("INSERT INTO student_tags (student_id, tag_id) VALUES (%s, %s)", (student_id, tag_ids["Стабильный прогресс"]))
            cur.execute("INSERT INTO student_tags (student_id, tag_id) VALUES (%s, %s)", (student_id, tag_ids["Сильная посещаемость"]))
        rank += 1


def seed_exam_materials_and_messages(cur, ctx: dict) -> None:
    materials = [
        ("СОР: алгебра 4 четверть", "Алгебра", "SOR", "RU", "Материал для подготовки к СОР."),
        ("SOCH Physics checklist", "Физика", "SOCH", "EN", "Checklist for final physics revision."),
        ("Информатика: практические задачи", "Информатика", "SOR", "RU", "Подборка задач по Python."),
    ]
    for title, subject, material_type, language, description in materials:
        teacher_id = ctx["subject_teacher"][subject]
        cur.execute(
            """
            INSERT INTO exam_materials (
                title, description, type, language, quarter, file_name, file_path, is_public,
                download_count, like_count, created_at, author_teacher_id, subject_id
            )
            VALUES (%s, %s, %s, %s, 4, %s, %s, true, %s, %s, %s, %s, %s)
            """,
            (
                title,
                description,
                material_type,
                language,
                f"{title.replace(' ', '_')}.pdf",
                f"/demo/iitu/materials/{title.replace(' ', '_')}.pdf",
                12,
                3,
                NOW - timedelta(days=3),
                teacher_id,
                ctx["subject_ids"][subject],
            ),
        )

    first_parent = next(iter(ctx["parent_ids"].values()))
    first_teacher = next(iter(ctx["teacher_ids"].values()))
    cur.execute(
        """
        INSERT INTO messages (sender_id, receiver_id, conversation_id, content, created_at, is_read)
        VALUES (%s, %s, %s, %s, %s, true)
        """,
        (first_parent, first_teacher, f"{first_parent}:{first_teacher}", "Здравствуйте! Посмотрела расписание на июнь, спасибо.", NOW - timedelta(hours=5)),
    )
    cur.execute(
        """
        INSERT INTO messages (sender_id, receiver_id, conversation_id, content, created_at, is_read)
        VALUES (%s, %s, %s, %s, %s, false)
        """,
        (first_teacher, first_parent, f"{first_parent}:{first_teacher}", "Добрый день! Если будут вопросы по заданиям, напишите мне.", NOW - timedelta(hours=4, minutes=20)),
    )


def main() -> None:
    rng = random.Random(20260531)
    with conn() as c:
        with c.transaction():
            with c.cursor() as cur:
                log.info("Resetting public tables")
                reset_database(cur)
                log.info("Seeding static entities")
                ctx = seed_static(cur)
                link_teachers = seed_teacher_links(cur, ctx)
                log.info("Seeding schedule for 2026-06-01..2026-06-14")
                seed_schedule(cur, ctx, link_teachers)
                log.info("Seeding assignments, submissions, grades, and journal")
                seed_assignments_and_grades(cur, ctx, rng, link_teachers)
                log.info("Seeding attendance")
                seed_attendance(cur, ctx, rng, link_teachers)
                log.info("Seeding Q3 journal snapshot")
                seed_q3_journal_snapshot(cur, ctx, rng, link_teachers)
                log.info("Seeding quizzes and attempts")
                seed_quizzes(cur, ctx, rng, link_teachers)
                log.info("Seeding surveys, news, banners, and notifications")
                seed_surveys_news_notifications(cur, ctx, rng)
                log.info("Seeding gamification, tags, materials, and messages")
                seed_gamification_and_tags(cur, ctx, rng)
                seed_exam_materials_and_messages(cur, ctx)

    refreshed = refresh_all()
    log.info("Refreshed AI recommendations for %s students", refreshed)
    close_pool()
    log.info("IITU demo seed complete. Password for all demo users: password")


if __name__ == "__main__":
    main()
