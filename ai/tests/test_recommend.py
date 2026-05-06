"""End-to-end test for recommendations."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import conn
from app.recommend import service as rec


def test_recommend_returns_valid_objects_for_real_students():
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students LIMIT 5")
            ids = [r[0] for r in cur.fetchall()]
    if not ids:
        return
    for sid in ids:
        recs = rec.recommend(sid, limit=5)
        for r in recs:
            assert r.kind in ("quiz", "topic")
            assert 0.0 <= r.score <= 100.0
            assert isinstance(r.title, str) and r.title
            assert isinstance(r.reason, str) and r.reason


def test_recommend_unknown_student_raises():
    import pytest
    with pytest.raises(rec.StudentNotFound):
        rec.recommend(-12345, limit=3)


def test_refresh_all_writes_recommendations_table():
    n = rec.refresh_all()
    assert n >= 0
    if n == 0:
        return
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM recommendations")
            count = cur.fetchone()[0]
            assert count > 0, "refresh_all reported success but no rows in recommendations"
