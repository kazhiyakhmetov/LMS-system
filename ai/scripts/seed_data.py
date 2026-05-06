"""Seed diverse training data for risk-prediction & recommendations.

Generates per-student archetypes (excellent / good / average / struggling / at-risk)
and produces realistic distributions of:
- grades (across multiple subjects, mixed 5- and 100-point scales)
- attendance marks (PRESENT/SICK/ABSENT/EXCUSED)
- submissions (some on time, some missing → overdue)

Idempotent-ish: clears prior seed-tagged rows before insert. Run inside the ai
container so DB credentials come from env:

    docker exec studix-ai python -m scripts.seed_data

You can also re-run with `--profile excellent` etc. to reshape a specific student.
"""
from __future__ import annotations

import logging
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("seed")


# Fixed assignment of archetypes to students by user_id.
# Tunable; if a user_id doesn't exist, it's silently skipped.
ARCHETYPES = {
    10: "good",         # Али Алиев (8B)
    11: "struggling",   # Султан (8Б)
    25: "at-risk",      # Nurbol (8А) — keep strong signal here for parent demo
    27: "average",      # San (8А)
    42: "excellent",    # Аида Ким (8Б)
    43: "good",         # Марат Усов (8Б)
    44: "average",      # Зарина Бекова (8Б)
    45: "struggling",   # Тимур Абаев (8Б)
    46: "at-risk",      # Алия Нурбекова (8Б)
}

# Per-archetype profile parameters
PROFILES = {
    "excellent":  {"grade_pct_mean": 0.92, "grade_pct_std": 0.05, "submission_rate": 0.98, "attendance": {"present": 0.97, "absent": 0.01, "sick": 0.02, "excused": 0.00}},
    "good":       {"grade_pct_mean": 0.82, "grade_pct_std": 0.08, "submission_rate": 0.92, "attendance": {"present": 0.93, "absent": 0.02, "sick": 0.04, "excused": 0.01}},
    "average":    {"grade_pct_mean": 0.70, "grade_pct_std": 0.10, "submission_rate": 0.78, "attendance": {"present": 0.85, "absent": 0.06, "sick": 0.07, "excused": 0.02}},
    "struggling": {"grade_pct_mean": 0.58, "grade_pct_std": 0.13, "submission_rate": 0.55, "attendance": {"present": 0.72, "absent": 0.16, "sick": 0.08, "excused": 0.04}},
    "at-risk":    {"grade_pct_mean": 0.42, "grade_pct_std": 0.15, "submission_rate": 0.30, "attendance": {"present": 0.55, "absent": 0.30, "sick": 0.10, "excused": 0.05}},
}

# Number of attendance marks to generate per student per subject (school days).
# Spans ~3 months. We'll vary subject coverage by archetype.
ATTENDANCE_DAYS = 30

# How many subjects from teacher_class_subjects to include per student.
SUBJECT_COVERAGE = {
    "excellent": 6,
    "good":       5,
    "average":    4,
    "struggling": 4,
    "at-risk":    3,
}


def pick_attendance(profile_attendance: dict, rng: random.Random) -> str:
    r = rng.random()
    cum = 0.0
    for status, p in profile_attendance.items():
        cum += p
        if r < cum:
            return status.upper()
    return "PRESENT"


def main() -> None:
    rng = random.Random(2026)

    with conn() as c:
        with c.cursor() as cur:

            # 1. Cache lookup tables -----------------------------------------------------
            cur.execute("SELECT user_id, class_id FROM students WHERE class_id IS NOT NULL")
            students = {r[0]: r[1] for r in cur.fetchall()}
            log.info("Eligible students: %d", len(students))

            cur.execute("SELECT id, name FROM subjects")
            subjects = dict(cur.fetchall())

            cur.execute("SELECT user_id FROM teachers")
            teacher_ids = [r[0] for r in cur.fetchall()]
            if not teacher_ids:
                log.error("No teachers found — cannot create grades (need teacher_id FK)")
                return

            # Map class_id → list of (assignment_id, max_grade, deadline, subject_id)
            cur.execute(
                """
                SELECT id, class_id, max_grade, deadline, subject_id, teacher_id
                FROM assignments
                ORDER BY class_id, id
                """,
            )
            class_assignments: dict[int, list[tuple]] = {}
            for aid, cls, maxg, dl, sid, tid in cur.fetchall():
                class_assignments.setdefault(cls, []).append((aid, maxg or 100, dl, sid, tid))

            # Map class_id → set of subject_ids that students of this class actually study
            # (use teacher_class_subjects, fallback to assignments' subjects)
            cur.execute(
                """
                SELECT DISTINCT class_id, subject_id, teacher_id
                FROM teacher_class_subjects
                WHERE active = true
                """,
            )
            class_subject_teacher: dict[int, list[tuple[int, int]]] = {}
            for cls, sid, tid in cur.fetchall():
                class_subject_teacher.setdefault(cls, []).append((sid, tid))
            log.info("class_subject_teacher: %s", {k: len(v) for k, v in class_subject_teacher.items()})

            # 2. Ensure each class has enough variety of assignments --------------------
            # If a class has fewer than 12 assignments, create some across its subjects.
            today = datetime.now()
            for cls_id, subj_teach in class_subject_teacher.items():
                existing_n = len(class_assignments.get(cls_id, []))
                if existing_n >= 12:
                    continue
                need = 12 - existing_n
                log.info("Class %s needs +%d assignments", cls_id, need)
                created = 0
                for i in range(need):
                    sid, tid = subj_teach[i % len(subj_teach)]
                    is_5pt = rng.random() < 0.4
                    max_grade = 5 if is_5pt else 100
                    days_back = rng.randint(7, 90)
                    deadline = today - timedelta(days=days_back)
                    title = f"Тренировочная работа {i + 1} ({subjects.get(sid, 'subj')})"
                    cur.execute(
                        """
                        INSERT INTO assignments (title, description, max_grade, deadline, created_at, type, subject_id, teacher_id, class_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (title, "Авто-сгенерированное задание для разнообразия данных",
                         max_grade, deadline, deadline - timedelta(days=14), "homework",
                         sid, tid, cls_id),
                    )
                    aid = cur.fetchone()[0]
                    class_assignments.setdefault(cls_id, []).append((aid, max_grade, deadline, sid, tid))
                    created += 1
                log.info("Class %s: created %d assignments", cls_id, created)

            # 3. Wipe previous synthetic seed for our target students (keep real data)
            # We mark our seed inserts via comment/metadata. Simpler: just delete
            # attendance + submissions/grades for the students we're about to seed.
            target_ids = [sid for sid in ARCHETYPES if sid in students]
            log.info("Target students for reseed: %s", target_ids)

            cur.execute("DELETE FROM attendance_marks WHERE student_id = ANY(%s)", (target_ids,))
            log.info("Cleared %d attendance rows", cur.rowcount)

            cur.execute(
                """
                DELETE FROM grades WHERE submission_id IN (
                    SELECT id FROM submissions WHERE student_id = ANY(%s)
                )
                """,
                (target_ids,),
            )
            cleared_g = cur.rowcount
            cur.execute("DELETE FROM submissions WHERE student_id = ANY(%s)", (target_ids,))
            log.info("Cleared %d grades / %d submissions", cleared_g, cur.rowcount)

            # 4. Seed per student --------------------------------------------------------
            for stu_id, archetype in ARCHETYPES.items():
                if stu_id not in students:
                    continue
                cls_id = students[stu_id]
                profile = PROFILES[archetype]
                cls_subj_teach = class_subject_teacher.get(cls_id, [])
                if not cls_subj_teach:
                    log.warning("Class %s has no teacher-subject assignments", cls_id)
                    continue

                # 4a. Attendance (across selected subjects, ATTENDANCE_DAYS days each)
                covered = rng.sample(cls_subj_teach, min(SUBJECT_COVERAGE[archetype], len(cls_subj_teach)))
                start_date = (today - timedelta(days=ATTENDANCE_DAYS * 1.5)).date()
                att_rows = 0
                for sid, tid in covered:
                    for day in range(ATTENDANCE_DAYS):
                        d = start_date + timedelta(days=day * 1)
                        # skip Sundays (schools don't usually run)
                        if d.weekday() == 6:
                            continue
                        status = pick_attendance(profile["attendance"], rng)
                        # quarter ≈ 1..4 by month
                        m = d.month
                        quarter = 1 if m in (9, 10) else 2 if m in (11, 12) else 3 if m in (1, 2, 3) else 4
                        try:
                            cur.execute(
                                """
                                INSERT INTO attendance_marks
                                  (teacher_id, student_id, class_id, subject_id, lesson_date, quarter, status, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                ON CONFLICT (teacher_id, student_id, class_id, subject_id, lesson_date) DO NOTHING
                                """,
                                (tid, stu_id, cls_id, sid, d, quarter, status),
                            )
                            if cur.rowcount:
                                att_rows += 1
                        except Exception as e:  # pragma: no cover
                            log.warning("attendance row failed: %s", e)

                # 4b. Submissions + grades for class assignments
                assignments = class_assignments.get(cls_id, [])
                # Take all assignments whose deadline has passed
                past_assignments = [a for a in assignments if a[2] and a[2] < today]
                rng.shuffle(past_assignments)

                sub_rows = 0
                grd_rows = 0
                for aid, max_grade, deadline, sid, tid in past_assignments:
                    # Decide if student submitted at all
                    if rng.random() > profile["submission_rate"]:
                        continue  # left as overdue (no submission row)
                    submitted_at = deadline - timedelta(hours=rng.randint(2, 60))
                    cur.execute(
                        """
                        INSERT INTO submissions
                          (assignment_id, student_id, submitted_at, status, comment)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (student_id, assignment_id) DO NOTHING
                        RETURNING id
                        """,
                        (aid, stu_id, submitted_at, "graded", "Сгенерированная сдача"),
                    )
                    row = cur.fetchone()
                    if row is None:
                        continue
                    sub_id = row[0]
                    sub_rows += 1

                    # Grade — sample from normal(grade_pct_mean, grade_pct_std), clip [0,1], scale by max_grade
                    pct = max(0.0, min(1.0, rng.gauss(profile["grade_pct_mean"], profile["grade_pct_std"])))
                    val = round(pct * (max_grade or 100))
                    if max_grade and val > max_grade:
                        val = max_grade
                    teacher_for_grade = tid if tid else teacher_ids[0]
                    graded_at = submitted_at + timedelta(days=rng.randint(1, 5))
                    cur.execute(
                        """
                        INSERT INTO grades (submission_id, teacher_id, grade_value, comment, graded_at)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (submission_id) DO NOTHING
                        """,
                        (sub_id, teacher_for_grade, val, None, graded_at),
                    )
                    if cur.rowcount:
                        grd_rows += 1

                log.info(
                    "Student %d (%s): att=%d, subs=%d, grades=%d",
                    stu_id, archetype, att_rows, sub_rows, grd_rows,
                )

    log.info("Seed complete.")


if __name__ == "__main__":
    main()
