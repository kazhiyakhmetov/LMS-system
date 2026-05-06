"""End-to-end test: train → predict → verify reasonable output."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import conn
from app.risk import service as risk_service
from app.risk.service import _adversity, _level


def test_level_thresholds():
    assert _level(85) == "high"
    assert _level(70) == "high"
    assert _level(55) == "mid"
    assert _level(40) == "mid"
    assert _level(25) == "low"
    assert _level(0) == "low"


def test_adversity_good_features():
    # avg_grade good when high; threshold=3.7
    assert _adversity("avg_grade", 5.0) == 0.0
    assert _adversity("avg_grade", 3.7) == 0.0
    assert _adversity("avg_grade", 2.0) > 0
    # attendance threshold=0.85
    assert _adversity("attendance_rate", 1.0) == 0.0
    assert _adversity("attendance_rate", 0.5) > 0


def test_adversity_bad_features():
    # overdue_count bad when high; threshold=2
    assert _adversity("overdue_count", 0) == 0.0
    assert _adversity("overdue_count", 1) == 0.0
    assert _adversity("overdue_count", 5) > 0
    # absence_count threshold=4
    assert _adversity("absence_count", 0) == 0.0
    assert _adversity("absence_count", 8) > 0


def test_adversity_clamped_to_one():
    # Even extreme values cap at 1.0
    assert _adversity("avg_grade", -100) <= 1.0
    assert _adversity("overdue_count", 1000) <= 1.0


def test_predict_for_real_students():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students LIMIT 5")
            ids = [r[0] for r in cur.fetchall()]
    if not ids:
        return  # no students: skip
    for sid in ids:
        result = risk_service.predict(sid)
        assert 0.0 <= result.score <= 100.0, f"score out of range for {sid}: {result.score}"
        assert result.level in ("low", "mid", "high")
        # If level == "low", topFactors may be empty (nothing adverse)
        if result.level == "high":
            assert len(result.topFactors) >= 1, f"high-risk student {sid} should have at least one factor"


def test_top_factors_only_show_adverse():
    """No factor with attendance=1.0 should appear (it's not adverse)."""
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students")
            ids = [r[0] for r in cur.fetchall()]
    if not ids:
        return
    for sid in ids:
        try:
            res = risk_service.predict(sid)
        except Exception:
            continue
        for f in res.topFactors:
            if f.feature == "attendance_rate":
                assert f.value < 0.85 + 0.001, f"non-adverse attendance flagged for {sid}: {f.value}"
            if f.feature == "submission_rate":
                assert f.value < 0.85 + 0.001
            if f.feature == "overdue_count":
                assert f.value > 2, f"non-adverse overdue flagged for {sid}: {f.value}"


def test_predict_unknown_student_raises():
    import pytest
    with pytest.raises(risk_service.StudentNotFound):
        risk_service.predict(-999)
