"""Feature engineering for risk-prediction.

Pulls per-student aggregates from Postgres and returns a pandas DataFrame.
Used both at training time (over a historical snapshot) and inference (latest data).
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Iterable, Optional

import pandas as pd

log = logging.getLogger(__name__)

FEATURE_NAMES: list[str] = [
    "avg_grade",
    "grade_count",
    "grade_std",
    "grade_trend",
    "low_grades_ratio",
    "attendance_rate",
    "absence_count",
    "submission_rate",
    "overdue_count",
    "graded_subjects",
]


def compute_features(student_ids: Iterable[int], cursor_or_conn, snapshot: Optional[date] = None) -> pd.DataFrame:
    """Compute the FEATURE_NAMES vector for each student.

    Parameters
    ----------
    student_ids : list of student.user_id
    cursor_or_conn : either a psycopg connection or a cursor (we'll create a cursor)
    snapshot : if provided, all aggregates are computed using only data up to this date.
               If None, uses NOW() (live inference).
    """
    ids = list({int(x) for x in student_ids})
    if not ids:
        return pd.DataFrame(columns=["student_id", *FEATURE_NAMES])

    if hasattr(cursor_or_conn, "cursor"):
        cur = cursor_or_conn.cursor()
        owns_cursor = True
    else:
        cur = cursor_or_conn
        owns_cursor = False

    try:
        snap = snapshot or date.today()
        snap_str = snap.isoformat()
        win_start = (snap - timedelta(days=60)).isoformat()  # used for trend

        # Grades — normalize each grade to 0-5 scale: grade_value / max_grade * 5
        # so we can mix tasks graded out of 5 and 100 in one model.
        cur.execute(
            """
            WITH norm AS (
                SELECT s.student_id,
                       a.subject_id,
                       g.graded_at,
                       LEAST(GREATEST((g.grade_value::float / NULLIF(a.max_grade, 0)) * 5.0, 0.0), 5.0) AS norm_grade
                FROM submissions s
                JOIN grades g ON g.submission_id = s.id
                JOIN assignments a ON a.id = s.assignment_id
                WHERE s.student_id = ANY(%s)
                  AND (g.graded_at IS NULL OR g.graded_at::date <= %s)
                  AND a.max_grade IS NOT NULL AND a.max_grade > 0
                  AND g.grade_value IS NOT NULL
                  AND g.grade_value <= a.max_grade * 1.2
            )
            SELECT student_id,
                   COUNT(*) AS cnt,
                   AVG(norm_grade)::float AS avg_g,
                   COALESCE(STDDEV_POP(norm_grade), 0)::float AS std_g,
                   SUM(CASE WHEN norm_grade <= 3 THEN 1 ELSE 0 END)::float AS low_cnt,
                   COUNT(DISTINCT subject_id) AS subjects
            FROM norm
            GROUP BY student_id
            """,
            (ids, snap_str),
        )
        grades_rows = {r[0]: r for r in cur.fetchall()}

        # Grade trend (normalized 0-5 scale)
        cur.execute(
            """
            WITH norm AS (
                SELECT s.student_id,
                       g.graded_at,
                       LEAST(GREATEST((g.grade_value::float / NULLIF(a.max_grade, 0)) * 5.0, 0.0), 5.0) AS norm_grade
                FROM submissions s
                JOIN grades g ON g.submission_id = s.id
                JOIN assignments a ON a.id = s.assignment_id
                WHERE s.student_id = ANY(%s)
                  AND g.graded_at::date <= %s
                  AND a.max_grade IS NOT NULL AND a.max_grade > 0
                  AND g.grade_value IS NOT NULL
                  AND g.grade_value <= a.max_grade * 1.2
            )
            SELECT student_id,
                   AVG(norm_grade) FILTER (WHERE graded_at::date > (%s::date - INTERVAL '30 day')::date) AS recent_avg,
                   AVG(norm_grade) FILTER (WHERE graded_at::date <= (%s::date - INTERVAL '30 day')::date
                                           AND graded_at::date > (%s::date - INTERVAL '60 day')::date) AS prev_avg
            FROM norm
            GROUP BY student_id
            """,
            (ids, snap_str, snap_str, snap_str, snap_str),
        )
        trend_rows = {r[0]: (r[1], r[2]) for r in cur.fetchall()}

        # Attendance
        cur.execute(
            """
            SELECT student_id,
                   COUNT(*)::float AS total,
                   SUM(CASE WHEN status='PRESENT' THEN 1 ELSE 0 END)::float AS present,
                   SUM(CASE WHEN status IN ('ABSENT','SICK','EXCUSED') THEN 1 ELSE 0 END)::float AS absent
            FROM attendance_marks
            WHERE student_id = ANY(%s)
              AND lesson_date <= %s
            GROUP BY student_id
            """,
            (ids, snap_str),
        )
        att_rows = {r[0]: r for r in cur.fetchall()}

        # Submissions vs assignments (only assignments whose deadline is past)
        cur.execute(
            """
            SELECT st.user_id AS student_id,
                   COUNT(DISTINCT a.id)::float AS total_assigned,
                   COUNT(DISTINCT s.id)::float AS total_submitted,
                   COUNT(DISTINCT a.id) FILTER (
                       WHERE a.deadline::date < %s AND s.id IS NULL
                   )::float AS overdue
            FROM students st
            JOIN assignments a ON a.class_id = st.class_id
            LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = st.user_id
            WHERE st.user_id = ANY(%s)
              AND a.deadline::date <= %s
            GROUP BY st.user_id
            """,
            (snap_str, ids, snap_str),
        )
        sub_rows = {r[0]: r for r in cur.fetchall()}

        records = []
        for sid in ids:
            g = grades_rows.get(sid)
            t = trend_rows.get(sid, (None, None))
            a = att_rows.get(sid)
            su = sub_rows.get(sid)

            avg_grade = float(g[2]) if g and g[2] is not None else 0.0
            grade_count = int(g[1]) if g else 0
            grade_std = float(g[3]) if g else 0.0
            low_grades = float(g[4]) if g else 0.0
            low_grades_ratio = (low_grades / grade_count) if grade_count else 0.0
            graded_subjects = int(g[5]) if g else 0

            recent_avg, prev_avg = t
            if recent_avg is not None and prev_avg is not None:
                trend = float(recent_avg) - float(prev_avg)
            else:
                trend = 0.0

            if a:
                total_att = float(a[1]) or 0.0
                presents = float(a[2]) or 0.0
                absents = float(a[3]) or 0.0
                attendance_rate = (presents / total_att) if total_att else 1.0
                absence_count = absents
            else:
                attendance_rate = 1.0
                absence_count = 0.0

            if su:
                total_assigned = float(su[1]) or 0.0
                total_submitted = float(su[2]) or 0.0
                overdue_count = float(su[3]) or 0.0
                submission_rate = (total_submitted / total_assigned) if total_assigned else 1.0
            else:
                submission_rate = 1.0
                overdue_count = 0.0

            records.append({
                "student_id": sid,
                "avg_grade": avg_grade,
                "grade_count": grade_count,
                "grade_std": grade_std,
                "grade_trend": trend,
                "low_grades_ratio": low_grades_ratio,
                "attendance_rate": attendance_rate,
                "absence_count": absence_count,
                "submission_rate": submission_rate,
                "overdue_count": overdue_count,
                "graded_subjects": graded_subjects,
            })

        return pd.DataFrame.from_records(records)

    finally:
        if owns_cursor:
            cur.close()


def label_at_risk(features_df: pd.DataFrame) -> pd.Series:
    """Rule-based label: avg<3.5 OR attendance<0.7 OR overdue>=3."""
    return (
        (features_df["avg_grade"] < 3.5) & (features_df["grade_count"] >= 3)
        | (features_df["attendance_rate"] < 0.7)
        | (features_df["overdue_count"] >= 3)
    ).astype(int)
