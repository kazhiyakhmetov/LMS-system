"""Risk prediction service: loads trained model, computes features per student, returns risk score."""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd

from ..db import conn
from . import features as feat_mod

log = logging.getLogger(__name__)

MODEL_PATH = Path(os.getenv("RISK_MODEL_PATH", "/app/models/risk_v1.joblib"))
META_PATH = MODEL_PATH.with_suffix(".meta.json")

FEATURE_LABELS_RU = {
    "avg_grade": "Средний балл",
    "grade_count": "Кол-во оценок",
    "grade_std": "Разброс оценок",
    "grade_trend": "Тренд оценок",
    "low_grades_ratio": "Доля слабых оценок",
    "attendance_rate": "Посещаемость",
    "absence_count": "Пропусков",
    "submission_rate": "Сдано работ",
    "overdue_count": "Просрочено",
    "graded_subjects": "Предметов с оценками",
}


class ModelNotReady(RuntimeError):
    pass


class StudentNotFound(RuntimeError):
    pass


@dataclass
class _ModelBundle:
    model: Any
    feature_names: list[str]
    version: str


_bundle: _ModelBundle | None = None


def _load() -> _ModelBundle:
    global _bundle
    if _bundle is not None:
        return _bundle
    if not MODEL_PATH.exists():
        raise ModelNotReady(
            f"Risk model file not found at {MODEL_PATH}. Train it via "
            "`python -m scripts.train_risk` first."
        )
    obj = joblib.load(MODEL_PATH)
    meta = {}
    if META_PATH.exists():
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    _bundle = _ModelBundle(
        model=obj["model"],
        feature_names=obj["feature_names"],
        version=meta.get("version", "v1"),
    )
    log.info("Risk model loaded (version=%s, features=%d)", _bundle.version, len(_bundle.feature_names))
    return _bundle


def _level(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "mid"
    return "low"


_BAD_WHEN_HIGH = {"absence_count", "overdue_count", "low_grades_ratio", "grade_std"}

# Threshold + scale per feature for measuring "adversity" (how badly this value
# pushes the student toward risk). "good" thresholds = below threshold is bad.
# "bad" thresholds = above threshold is bad.
_THRESHOLDS = {
    # good-when-high (low value is adverse)
    "avg_grade":         {"kind": "good", "threshold": 3.7, "scale": 5.0},
    "attendance_rate":   {"kind": "good", "threshold": 0.85, "scale": 1.0},
    "submission_rate":   {"kind": "good", "threshold": 0.85, "scale": 1.0},
    "grade_trend":       {"kind": "good", "threshold": -0.3, "scale": 1.5},
    # bad-when-high (high value is adverse)
    "absence_count":     {"kind": "bad",  "threshold": 4.0,  "scale": 15.0},
    "overdue_count":     {"kind": "bad",  "threshold": 2.0,  "scale": 10.0},
    "low_grades_ratio":  {"kind": "bad",  "threshold": 0.25, "scale": 1.0},
    "grade_std":         {"kind": "bad",  "threshold": 0.9,  "scale": 2.0},
}


def _adversity(name: str, value: float) -> float:
    """Returns 0..1 — how strongly this feature value pushes the student toward risk."""
    cfg = _THRESHOLDS.get(name)
    if cfg is None:
        return 0.0
    threshold = cfg["threshold"]
    scale = cfg["scale"]
    if cfg["kind"] == "good":
        # below threshold is adverse
        gap = max(0.0, threshold - float(value))
        return min(1.0, gap / max(scale, 1e-9))
    else:
        # above threshold is adverse
        gap = max(0.0, float(value) - threshold)
        return min(1.0, gap / max(scale, 1e-9))


def _top_factors(model, feature_names: list[str], values: dict[str, float], k: int = 3) -> list[dict]:
    """Pick k features that actually contribute to *risk* for this student.
    Score = global feature_importances_ × per-prediction adversity.
    Filters out features that are not adverse (e.g. attendance=1.0 is not a risk factor).
    """
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return []

    contribs: list[tuple[str, float, float]] = []
    for name, imp in zip(feature_names, importances):
        if name not in _THRESHOLDS:
            continue
        v = float(values.get(name, 0.0) or 0.0)
        adv = _adversity(name, v)
        if adv <= 0.0:
            continue
        weight = float(imp) * adv
        contribs.append((name, weight, v))

    contribs.sort(key=lambda x: x[1], reverse=True)
    out = []
    for name, _w, val in contribs[:k]:
        out.append({
            "feature": name,
            "label": FEATURE_LABELS_RU.get(name, name),
            "value": float(round(val, 2)),
            "direction": "up" if name in _BAD_WHEN_HIGH else "down",
        })
    return out


def predict(student_id: int) -> Any:
    bundle = _load()
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT 1 FROM students WHERE user_id = %s", (student_id,))
            if cur.fetchone() is None:
                raise StudentNotFound(f"Student {student_id} not found")
        df = feat_mod.compute_features([student_id], c)
    if df.empty:
        raise StudentNotFound(f"Could not compute features for student {student_id}")

    return _row_to_dto(df.iloc[0], bundle)


def predict_class(class_id: int) -> list:
    bundle = _load()
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM students WHERE class_id = %s",
                (class_id,),
            )
            ids = [r[0] for r in cur.fetchall()]
        if not ids:
            return []
        df = feat_mod.compute_features(ids, c)
    out = []
    for _, row in df.iterrows():
        out.append(_row_to_dto(row, bundle))
    return out


def school_summary(school_id: int) -> dict:
    bundle = _load()
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT s.user_id
                FROM students s
                JOIN school_classes sc ON sc.id = s.class_id
                WHERE sc.school_id = %s
                """,
                (school_id,),
            )
            ids = [r[0] for r in cur.fetchall()]
        if not ids:
            return {"total": 0, "high": 0, "mid": 0, "low": 0, "topRisk": []}
        df = feat_mod.compute_features(ids, c)

    rows = []
    for _, r in df.iterrows():
        rows.append(_row_to_dto(r, bundle))

    counts = {"low": 0, "mid": 0, "high": 0}
    for r in rows:
        counts[r.level] += 1

    top = sorted(rows, key=lambda r: r.score, reverse=True)[:10]
    return {
        "total": len(rows),
        "high": counts["high"],
        "mid": counts["mid"],
        "low": counts["low"],
        "topRisk": [r.model_dump() for r in top],
    }


def _row_to_dto(row: pd.Series, bundle: _ModelBundle):
    from .routes import StudentRisk, RiskFactor

    feats = bundle.feature_names
    x = row[feats].fillna(0).to_numpy(dtype=float).reshape(1, -1)
    proba = float(bundle.model.predict_proba(x)[0, 1]) * 100.0
    score = round(proba, 1)
    factors_raw = _top_factors(bundle.model, feats, row.to_dict(), k=3)
    factors = [RiskFactor(**f) for f in factors_raw]
    return StudentRisk(
        studentId=int(row["student_id"]),
        score=score,
        level=_level(score),
        topFactors=factors,
        modelVersion=bundle.version,
    )
