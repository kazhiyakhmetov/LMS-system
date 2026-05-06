"""Sanity tests for feature engineering — values must be in expected ranges."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd

from app.db import conn
from app.risk.features import FEATURE_NAMES, compute_features, label_at_risk


def test_compute_features_returns_all_expected_columns():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students LIMIT 5")
            ids = [r[0] for r in cur.fetchall()]
        df = compute_features(ids, c)
    if not ids:
        return  # no students yet — fine
    assert "student_id" in df.columns
    for col in FEATURE_NAMES:
        assert col in df.columns, f"missing column {col}"


def test_avg_grade_in_zero_to_five():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students")
            ids = [r[0] for r in cur.fetchall()]
        df = compute_features(ids, c)
    if df.empty:
        return
    bad = df[(df["avg_grade"] < 0) | (df["avg_grade"] > 5.01)]
    assert bad.empty, f"avg_grade out of [0,5]: {bad[['student_id','avg_grade']].to_dict('records')}"


def test_attendance_rate_in_zero_to_one():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students")
            ids = [r[0] for r in cur.fetchall()]
        df = compute_features(ids, c)
    if df.empty:
        return
    bad = df[(df["attendance_rate"] < 0) | (df["attendance_rate"] > 1.001)]
    assert bad.empty, bad.to_dict("records")


def test_submission_rate_in_zero_to_one():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students")
            ids = [r[0] for r in cur.fetchall()]
        df = compute_features(ids, c)
    if df.empty:
        return
    bad = df[(df["submission_rate"] < 0) | (df["submission_rate"] > 1.001)]
    assert bad.empty, bad.to_dict("records")


def test_label_at_risk_consistency():
    df = pd.DataFrame([
        {"avg_grade": 5.0, "grade_count": 10, "attendance_rate": 1.0, "overdue_count": 0,
         "grade_std": 0.2, "grade_trend": 0.0, "low_grades_ratio": 0.0,
         "absence_count": 0, "submission_rate": 1.0, "graded_subjects": 5},
        {"avg_grade": 2.5, "grade_count": 10, "attendance_rate": 0.9, "overdue_count": 0,
         "grade_std": 0.2, "grade_trend": 0.0, "low_grades_ratio": 0.5,
         "absence_count": 1, "submission_rate": 1.0, "graded_subjects": 5},
        {"avg_grade": 4.0, "grade_count": 10, "attendance_rate": 0.5, "overdue_count": 0,
         "grade_std": 0.2, "grade_trend": 0.0, "low_grades_ratio": 0.0,
         "absence_count": 10, "submission_rate": 1.0, "graded_subjects": 5},
    ])
    labels = label_at_risk(df).tolist()
    assert labels == [0, 1, 1], f"expected [0,1,1], got {labels}"
