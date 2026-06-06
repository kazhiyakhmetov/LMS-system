"""Content-based recommender for quizzes/topics."""
from __future__ import annotations

import logging
from typing import List

from ..db import conn

log = logging.getLogger(__name__)


class StudentNotFound(RuntimeError):
    pass


def recommend(student_id: int, limit: int = 5) -> List:
    from .routes import Recommendation

    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT 1 FROM students WHERE user_id = %s", (student_id,))
            if cur.fetchone() is None:
                raise StudentNotFound(f"Student {student_id} not found")

            # 1. Find subjects the student is weak in — normalized 0..5 average.
            cur.execute(
                """
                WITH norm AS (
                    SELECT a.subject_id,
                           sub.name,
                           LEAST(GREATEST((g.grade_value::float / NULLIF(a.max_grade, 0)) * 5.0, 0.0), 5.0) AS norm_g
                    FROM submissions s
                    JOIN grades g ON g.submission_id = s.id
                    JOIN assignments a ON a.id = s.assignment_id
                    JOIN subjects sub ON sub.id = a.subject_id
                    WHERE s.student_id = %s
                      AND a.max_grade IS NOT NULL AND a.max_grade > 0
                      AND g.grade_value IS NOT NULL
                      AND g.grade_value <= a.max_grade * 1.2
                )
                SELECT subject_id, name, AVG(norm_g)::float AS avg_g, COUNT(*) AS cnt
                FROM norm
                GROUP BY subject_id, name
                HAVING COUNT(*) >= 1
                ORDER BY avg_g ASC, cnt DESC
                LIMIT 5
                """,
                (student_id,),
            )
            weak_subjects = cur.fetchall()  # [(subject_id, name, avg, cnt), ...]

            # 2. Pull student's class to find quizzes assigned to it (if any)
            cur.execute(
                "SELECT class_id FROM students WHERE user_id = %s",
                (student_id,),
            )
            row = cur.fetchone()
            class_id = row[0] if row else None

            # 3. Quizzes user has not attempted, prioritized by weak subjects
            cur.execute(
                """
                SELECT q.id, q.title, q.subject_id, sub.name AS subject_name
                FROM quiz q
                LEFT JOIN subjects sub ON sub.id = q.subject_id
                WHERE q.active = true
                  AND NOT EXISTS (
                    SELECT 1 FROM quiz_attempt qa
                    JOIN quiz_assignment qass ON qass.id = qa.quiz_assignment_id
                    WHERE qass.quiz_id = q.id AND qa.student_id = %s
                  )
                ORDER BY q.created_at DESC
                LIMIT 50
                """,
                (student_id,),
            )
            candidate_quizzes = cur.fetchall()

    # weak_subject_ids: only subjects whose normalized avg < 4.0
    weak_subject_ids = {
        row[0]: (row[1], row[2]) for row in weak_subjects if row[2] is not None and row[2] < 4.0
    }

    # Score each quiz: priority = 100 minus avg (normalized 0..5) ⇒ 20..100
    recs = []
    for qid, title, subj_id, subj_name in candidate_quizzes:
        if subj_id in weak_subject_ids:
            sname, savg = weak_subject_ids[subj_id]
            # avg in [0,4) → score in [20, 100]
            score = (5.0 - float(savg)) * 20.0
            reason = f"Слабый средний по «{sname}» ({savg:.1f}) — попробуй квиз"
        elif subj_id is not None:
            score = 35.0
            reason = "Практика по предмету"
        else:
            score = 25.0
            reason = "Новый квиз для практики"

        recs.append({
            "kind": "quiz",
            "targetId": qid,
            "title": title or "Без названия",
            "score": round(score, 1),
            "reason": reason,
            "subjectName": subj_name,
        })

    # Sort, then dedupe by title (avoid recommending two quizzes with the same name)
    recs.sort(key=lambda r: r["score"], reverse=True)
    sliced = []
    seen_titles: set[str] = set()
    for r in recs:
        key = (r["title"] or "").strip().lower()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        sliced.append(r)
        if len(sliced) >= limit:
            break

    # If still too few, add "topic to revise" suggestions from weak subjects
    weak_remaining = [w for w in weak_subjects if w[2] is not None and w[2] < 4.0]
    while len(sliced) < limit and weak_remaining:
        sid_, sname_, savg_, _cnt = weak_remaining.pop(0)
        sliced.append({
            "kind": "topic",
            "targetId": sid_,
            "title": f"Подтянуть {sname_}",
            "score": round((5.0 - float(savg_)) * 20.0, 1),
            "reason": f"Средний балл {float(savg_):.1f}",
            "subjectName": sname_,
        })

    from .routes import Recommendation
    return [Recommendation(**r) for r in sliced]


def refresh_all() -> int:
    """Recompute and persist recommendations for all active students."""
    refreshed = 0
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students")
            student_ids = [r[0] for r in cur.fetchall()]

        for sid in student_ids:
            try:
                recs = recommend(sid, limit=10)
            except Exception as e:  # pragma: no cover
                log.warning("recommend failed for %s: %s", sid, e)
                continue
            with c.cursor() as cur:
                cur.execute("DELETE FROM recommendations WHERE student_id = %s", (sid,))
                for r in recs:
                    cur.execute(
                        """
                        INSERT INTO recommendations (student_id, kind, target_id, title, score, reason, subject_name, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (sid, r.kind, r.targetId, r.title, r.score, r.reason, r.subjectName),
                    )
            refreshed += 1
    log.info("Refreshed recommendations for %d students", refreshed)
    return refreshed
