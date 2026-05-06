"""Seed realistic quizzes with questions, options, assignments, and student attempts.

Creates varied content across subjects so:
- Teacher → Тесты page shows quizzes with completion stats
- Student → Квизы page shows assigned quizzes (some attempted, some pending)
- AI recommendations have meaningful targets

Idempotent: deletes prior seeded rows (quiz title starts with the SEED_TAG)
before re-inserting, so re-running the script doesn't duplicate.

Run inside the ai container:
    docker exec studix-ai python -m scripts.seed_quizzes
"""
from __future__ import annotations

import logging
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("seed_quizzes")

SEED_TAG = "[SEED]"  # marker placed in description (NOT title) so we can clean up

# Quiz templates: each one becomes a Quiz with N questions.
# Values are chosen to be plausible school-level content.
QUIZ_TEMPLATES = [
    {
        "title": "Квадратные уравнения · базовый",
        "subject_name": "АЛГЕБРА",
        "description": "Проверка базовых навыков решения квадратных уравнений и применения теоремы Виета.",
        "questions": [
            ("Какова сумма корней уравнения x² − 5x + 6 = 0?",
             [("5", True), ("−5", False), ("6", False), ("−6", False)]),
            ("Какова сумма корней уравнения x² + 3x − 10 = 0?",
             [("3", False), ("−3", True), ("10", False), ("−10", False)]),
            ("Дискриминант уравнения 2x² − 4x + 1:",
             [("8", True), ("16", False), ("−8", False), ("12", False)]),
            ("Какое из чисел является корнем x² − 7x + 12 = 0?",
             [("3", True), ("5", False), ("7", False), ("12", False)]),
            ("Если x₁ + x₂ = 4 и x₁·x₂ = 3, то уравнение:",
             [("x² − 4x + 3 = 0", True), ("x² + 4x + 3 = 0", False),
              ("x² − 4x − 3 = 0", False), ("x² − 3x + 4 = 0", False)]),
        ],
    },
    {
        "title": "Тригонометрические тождества",
        "subject_name": "АЛГЕБРА",
        "description": "Основные формулы и тождества тригонометрии.",
        "questions": [
            ("Чему равно sin²x + cos²x?",
             [("1", True), ("0", False), ("2", False), ("sin 2x", False)]),
            ("Чему равно cos(2x)?",
             [("cos²x − sin²x", True), ("2 sin x cos x", False),
              ("1 + cos x", False), ("sin²x − cos²x", False)]),
            ("Период функции y = sin x:",
             [("2π", True), ("π", False), ("π/2", False), ("4π", False)]),
            ("Чему равно tg(π/4)?",
             [("1", True), ("0", False), ("√2", False), ("1/2", False)]),
        ],
    },
    {
        "title": "Геометрия: треугольники",
        "subject_name": "ГЕОМЕТРИЯ",
        "description": "Свойства треугольников, теоремы Пифагора и подобия.",
        "questions": [
            ("В прямоугольном треугольнике катеты 3 и 4. Чему равна гипотенуза?",
             [("5", True), ("6", False), ("7", False), ("4.5", False)]),
            ("Сумма углов треугольника:",
             [("180°", True), ("90°", False), ("360°", False), ("270°", False)]),
            ("Признак подобия треугольников по двум углам:",
             [("Равенство двух углов", True), ("Равенство трёх сторон", False),
              ("Равенство двух сторон", False), ("Равенство периметров", False)]),
            ("Площадь треугольника со сторонами a и b и углом γ между ними:",
             [("½ a·b·sin γ", True), ("a·b·sin γ", False),
              ("½ a·b·cos γ", False), ("a + b + γ", False)]),
            ("Биссектриса делит противоположную сторону в отношении:",
             [("Прилежащих сторон", True), ("Высот", False),
              ("Медиан", False), ("Углов", False)]),
        ],
    },
    {
        "title": "Физика · законы Ньютона",
        "subject_name": "ФИЗИКА",
        "description": "Три закона Ньютона и их применение в задачах.",
        "questions": [
            ("Тело массой 5 кг с ускорением 2 м/с². Какая сила действует на него?",
             [("10 Н", True), ("2.5 Н", False), ("7 Н", False), ("3 Н", False)]),
            ("Чему равно ускорение свободного падения у Земли?",
             [("≈9.8 м/с²", True), ("≈3.7 м/с²", False),
              ("≈100 м/с²", False), ("≈1 м/с²", False)]),
            ("Первый закон Ньютона — это закон:",
             [("Инерции", True), ("Тяготения", False),
              ("Сохранения импульса", False), ("Действия и противодействия", False)]),
            ("Если на тело не действуют силы, оно:",
             [("Сохраняет состояние покоя или равномерного движения", True),
              ("Останавливается", False), ("Ускоряется", False),
              ("Падает вниз", False)]),
        ],
    },
    {
        "title": "Биология · строение клетки",
        "subject_name": "БИОЛОГИЯ",
        "description": "Органоиды клетки и их функции.",
        "questions": [
            ("Какой органоид отвечает за энергию клетки?",
             [("Митохондрия", True), ("Рибосома", False),
              ("Лизосома", False), ("Ядро", False)]),
            ("Где синтезируются белки в клетке?",
             [("На рибосомах", True), ("В митохондрии", False),
              ("В ядре", False), ("В вакуоле", False)]),
            ("Что хранит наследственную информацию?",
             [("ДНК в ядре", True), ("Цитоплазма", False),
              ("Клеточная стенка", False), ("Хлоропласт", False)]),
            ("Какой органоид есть только в растительных клетках?",
             [("Хлоропласт", True), ("Митохондрия", False),
              ("Рибосома", False), ("Ядро", False)]),
            ("Полупроницаемая структура, окружающая клетку:",
             [("Клеточная мембрана", True), ("Цитоплазма", False),
              ("Ядрышко", False), ("Эндоплазматическая сеть", False)]),
        ],
    },
    {
        "title": "Химия · периодический закон",
        "subject_name": "ХИМИЯ",
        "description": "Периодическая система Менделеева, валентность, оксиды.",
        "questions": [
            ("Сколько электронов на внешнем уровне у натрия (Na)?",
             [("1", True), ("2", False), ("7", False), ("11", False)]),
            ("Какой химический символ у золота?",
             [("Au", True), ("Ag", False), ("Fe", False), ("Cu", False)]),
            ("К какой группе относится кислород?",
             [("VI группа (главная)", True), ("VII группа", False),
              ("II группа", False), ("V группа", False)]),
            ("Какой оксид является основным?",
             [("Na₂O", True), ("CO₂", False), ("SO₃", False), ("N₂O₅", False)]),
        ],
    },
    {
        "title": "Английский · времена группы Simple",
        "subject_name": "АНГЛИЙСКИЙ",
        "description": "Present, Past, Future Simple — образование и использование.",
        "questions": [
            ("She ___ to school every day.",
             [("goes", True), ("go", False), ("going", False), ("gone", False)]),
            ("They ___ in London last year.",
             [("lived", True), ("live", False), ("living", False), ("will live", False)]),
            ("I ___ help you tomorrow.",
             [("will", True), ("did", False), ("am", False), ("does", False)]),
            ("Did you ___ the homework yesterday?",
             [("do", True), ("did", False), ("doing", False), ("done", False)]),
            ("She ___ not like coffee.",
             [("does", True), ("do", False), ("did", False), ("is", False)]),
        ],
    },
    {
        "title": "Русский · знаки препинания",
        "subject_name": "РУССКИЙ",
        "description": "Запятая в сложных предложениях и при обращении.",
        "questions": [
            ("Где нужна запятая? «Когда наступила ночь_ мы вернулись домой»",
             [("После «ночь»", True), ("После «когда»", False),
              ("Перед «когда»", False), ("Не нужна вообще", False)]),
            ("Сколько запятых в предложении «Маша которая опаздывала ловила такси»?",
             [("2", True), ("1", False), ("3", False), ("0", False)]),
            ("Запятая ставится перед союзом:",
             [("И при перечислении однородных", False),
              ("Но всегда", True), ("А никогда", False), ("Между подлежащим и сказуемым", False)]),
        ],
    },
    {
        "title": "Геометрия: окружность",
        "subject_name": "ГЕОМЕТРИЯ",
        "description": "Радиус, диаметр, длина окружности и площадь круга.",
        "questions": [
            ("Длина окружности радиуса R:",
             [("2πR", True), ("πR²", False), ("πR", False), ("R²", False)]),
            ("Площадь круга радиуса R:",
             [("πR²", True), ("2πR", False), ("R²", False), ("πR", False)]),
            ("Если диаметр 10, чему равен радиус?",
             [("5", True), ("20", False), ("10", False), ("2.5", False)]),
            ("Угол вписанный в полуокружность:",
             [("90°", True), ("60°", False), ("180°", False), ("45°", False)]),
        ],
    },
    {
        "title": "Math · базовая арифметика",
        "subject_name": "Math",
        "description": "Дроби, проценты, степени и базовые вычисления.",
        "questions": [
            ("Сколько процентов от 200 равно 50?",
             [("25%", True), ("50%", False), ("75%", False), ("4%", False)]),
            ("Чему равно 2³ × 2²?",
             [("32", True), ("16", False), ("64", False), ("8", False)]),
            ("Какая дробь больше: 3/4 или 5/8?",
             [("3/4", True), ("5/8", False), ("Равны", False), ("Зависит", False)]),
            ("Чему равно √144?",
             [("12", True), ("14", False), ("11", False), ("16", False)]),
            ("Произведение 0.4 и 25:",
             [("10", True), ("100", False), ("4", False), ("2.5", False)]),
        ],
    },
    {
        "title": "Алгебра · функции и графики",
        "subject_name": "АЛГЕБРА",
        "description": "Линейная функция, параболы, обратная пропорциональность.",
        "questions": [
            ("График y = kx — это:",
             [("Прямая через начало координат", True), ("Парабола", False),
              ("Гипербола", False), ("Окружность", False)]),
            ("График y = x² — это:",
             [("Парабола", True), ("Прямая", False),
              ("Окружность", False), ("Гипербола", False)]),
            ("Точка пересечения y = 2x − 4 с осью Ox:",
             [("(2, 0)", True), ("(0, −4)", False),
              ("(0, 2)", False), ("(−4, 0)", False)]),
        ],
    },
]


# Per-archetype attempt strategy (matches risk seed archetypes)
ARCHETYPES = {
    10: "good", 11: "struggling", 25: "at-risk", 27: "average",
    42: "excellent", 43: "good", 44: "average", 45: "struggling", 46: "at-risk",
}

ATTEMPT_PROFILE = {
    "excellent":  {"attempt_prob": 0.95, "correct_prob_mean": 0.92, "correct_prob_std": 0.05},
    "good":       {"attempt_prob": 0.85, "correct_prob_mean": 0.80, "correct_prob_std": 0.08},
    "average":    {"attempt_prob": 0.65, "correct_prob_mean": 0.65, "correct_prob_std": 0.10},
    "struggling": {"attempt_prob": 0.45, "correct_prob_mean": 0.50, "correct_prob_std": 0.12},
    "at-risk":    {"attempt_prob": 0.20, "correct_prob_mean": 0.35, "correct_prob_std": 0.15},
}


def main() -> None:
    rng = random.Random(2026)

    with conn() as c:
        with c.cursor() as cur:
            # 1) Drop prior seeded rows — match by exact title from QUIZ_TEMPLATES.
            seed_titles = [tpl["title"] for tpl in QUIZ_TEMPLATES]
            cur.execute("SELECT id FROM quiz WHERE title = ANY(%s)", (seed_titles,))
            old_ids = [r[0] for r in cur.fetchall()]
            if old_ids:
                cur.execute("DELETE FROM quiz_answer WHERE quiz_attempt_id IN (SELECT id FROM quiz_attempt WHERE quiz_assignment_id IN (SELECT id FROM quiz_assignment WHERE quiz_id = ANY(%s)))", (old_ids,))
                cur.execute("DELETE FROM quiz_attempt WHERE quiz_assignment_id IN (SELECT id FROM quiz_assignment WHERE quiz_id = ANY(%s))", (old_ids,))
                cur.execute("DELETE FROM quiz_assignment_student WHERE quiz_assignment_id IN (SELECT id FROM quiz_assignment WHERE quiz_id = ANY(%s))", (old_ids,))
                cur.execute("DELETE FROM quiz_assignment WHERE quiz_id = ANY(%s)", (old_ids,))
                cur.execute("DELETE FROM quiz_option WHERE question_id IN (SELECT id FROM quiz_question WHERE quiz_id = ANY(%s))", (old_ids,))
                cur.execute("DELETE FROM quiz_question WHERE quiz_id = ANY(%s)", (old_ids,))
                cur.execute("DELETE FROM quiz WHERE id = ANY(%s)", (old_ids,))
                log.info("Cleaned %d previously seeded quizzes", len(old_ids))

            # 2) Lookup tables
            cur.execute("SELECT id, name FROM subjects")
            subj_by_name = {row[1]: row[0] for row in cur.fetchall()}

            cur.execute("SELECT teacher_id, subject_id, class_id FROM teacher_class_subjects WHERE active=true")
            tcs = cur.fetchall()
            # subject_id -> list of (teacher_id, class_id)
            subj_to_pairs: dict[int, list[tuple[int, int]]] = {}
            for tid, sid, cid in tcs:
                subj_to_pairs.setdefault(sid, []).append((tid, cid))

            cur.execute("SELECT user_id, class_id FROM students WHERE class_id IS NOT NULL")
            class_to_students: dict[int, list[int]] = {}
            for stu, cls in cur.fetchall():
                class_to_students.setdefault(cls, []).append(stu)

            # 3) Build quizzes ------------------------------------------------------
            now = datetime.now()
            quizzes_created = 0
            attempts_created = 0

            for tpl in QUIZ_TEMPLATES:
                sid = subj_by_name.get(tpl["subject_name"])
                if sid is None:
                    log.warning("Subject %s not found, skipping", tpl["subject_name"])
                    continue
                pairs = subj_to_pairs.get(sid, [])
                if not pairs:
                    log.warning("No teachers for subject %s, skipping", tpl["subject_name"])
                    continue

                # Pick first teacher for this subject (any class works as anchor)
                teacher_id = pairs[0][0]
                title = tpl["title"]
                description = tpl["description"]

                cur.execute(
                    """
                    INSERT INTO quiz (active, created_at, updated_at, description, title, subject_id, teacher_id)
                    VALUES (true, NOW(), NOW(), %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (description, title, sid, teacher_id),
                )
                quiz_id = cur.fetchone()[0]

                # Insert questions + options
                question_ids: list[int] = []
                question_correct_option: dict[int, int] = {}  # qid -> correct option_id
                question_all_options: dict[int, list[int]] = {}  # qid -> [opt_id]
                for q_idx, (qtext, options) in enumerate(tpl["questions"]):
                    cur.execute(
                        """
                        INSERT INTO quiz_question (quiz_id, question_type, question_text, points, required, order_index)
                        VALUES (%s, 'SINGLE_CHOICE', %s, 1, true, %s)
                        RETURNING id
                        """,
                        (quiz_id, qtext, q_idx),
                    )
                    qid = cur.fetchone()[0]
                    question_ids.append(qid)
                    opt_ids: list[int] = []
                    for o_idx, (otext, is_correct) in enumerate(options):
                        cur.execute(
                            """
                            INSERT INTO quiz_option (question_id, option_text, is_correct, order_index)
                            VALUES (%s, %s, %s, %s)
                            RETURNING id
                            """,
                            (qid, otext, is_correct, o_idx),
                        )
                        oid = cur.fetchone()[0]
                        opt_ids.append(oid)
                        if is_correct:
                            question_correct_option[qid] = oid
                    question_all_options[qid] = opt_ids

                # 4) Make assignments to all classes that have teachers for this subject
                seen_classes: set[int] = set()
                for tid, cid in pairs:
                    if cid in seen_classes:
                        continue
                    seen_classes.add(cid)
                    start = now - timedelta(days=rng.randint(7, 35))
                    end = now + timedelta(days=rng.randint(7, 30))
                    cur.execute(
                        """
                        INSERT INTO quiz_assignment
                          (active, created_at, end_time, start_time, time_limit_minutes, quiz_id, class_id, teacher_id)
                        VALUES (true, NOW(), %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (end, start, 30, quiz_id, cid, tid),
                    )
                    qa_id = cur.fetchone()[0]

                    # 5) Generate attempts per student in this class
                    students_in_class = class_to_students.get(cid, [])
                    for stu in students_in_class:
                        archetype = ARCHETYPES.get(stu, "average")
                        prof = ATTEMPT_PROFILE[archetype]
                        if rng.random() > prof["attempt_prob"]:
                            continue  # didn't attempt

                        att_start = start + timedelta(days=rng.randint(0, max(1, (now - start).days)))
                        duration_s = rng.randint(180, 1500)  # 3..25 min
                        att_end = att_start + timedelta(seconds=duration_s)
                        if att_end > now:
                            att_end = now
                            duration_s = max(60, int((att_end - att_start).total_seconds()))

                        # decide correctness per question, count score
                        correct_count = 0
                        answers_buf = []
                        for qid in question_ids:
                            p = max(0.0, min(1.0, rng.gauss(prof["correct_prob_mean"], prof["correct_prob_std"])))
                            is_correct = rng.random() < p
                            if is_correct:
                                selected = question_correct_option[qid]
                            else:
                                wrong = [o for o in question_all_options[qid] if o != question_correct_option[qid]]
                                selected = rng.choice(wrong) if wrong else question_correct_option[qid]
                                # very rare floor: if all are correct, fallback to correct
                                if selected == question_correct_option[qid]:
                                    is_correct = True
                            if is_correct:
                                correct_count += 1
                            answers_buf.append((qid, selected, is_correct))

                        score_pct = round((correct_count / max(1, len(question_ids))) * 100)
                        status = "SUBMITTED"

                        cur.execute(
                            """
                            INSERT INTO quiz_attempt
                              (quiz_assignment_id, student_id, status, start_time, end_time, duration_seconds, score)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                            """,
                            (qa_id, stu, status, att_start, att_end, duration_s, score_pct),
                        )
                        att_id = cur.fetchone()[0]
                        attempts_created += 1

                        # answer rows
                        for qid, selected, is_correct in answers_buf:
                            cur.execute(
                                """
                                INSERT INTO quiz_answer
                                  (quiz_attempt_id, question_id, selected_option_ids_json, is_correct, points_awarded)
                                VALUES (%s, %s, %s, %s, %s)
                                """,
                                (att_id, qid, f"[{selected}]", is_correct, 1 if is_correct else 0),
                            )

                quizzes_created += 1
                log.info("Created quiz %d (%s) for %d classes",
                         quiz_id, tpl["title"], len(seen_classes))

            log.info("Done: %d quizzes, %d attempts created", quizzes_created, attempts_created)


if __name__ == "__main__":
    main()
