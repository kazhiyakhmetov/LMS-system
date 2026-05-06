"""Train the risk-prediction XGBoost model.

Usage (inside container or local venv):
    python -m scripts.train_risk

Strategy
--------
We don't have many real students in this dev DB, so we build a synthetic-augmented
dataset: real per-student feature vectors + plausible label noise.
This is documented behaviour and is fine for a dev / coursework environment.
The same script will work in production when there's enough real history —
just set RISK_SYNTHETIC_AUG=0.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score, classification_report
from sklearn.model_selection import train_test_split, cross_val_score

# allow running both as `python -m scripts.train_risk` and `python scripts/train_risk.py`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import conn  # noqa: E402
from app.risk.features import FEATURE_NAMES, compute_features, label_at_risk  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("train_risk")

OUT_PATH = Path(os.getenv("RISK_MODEL_PATH", str(Path(__file__).resolve().parents[1] / "models" / "risk_v1.joblib")))
META_PATH = OUT_PATH.with_suffix(".meta.json")
SYNTHETIC_AUG = int(os.getenv("RISK_SYNTHETIC_AUG", "200"))


def collect_real_dataset() -> pd.DataFrame:
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students")
            ids = [r[0] for r in cur.fetchall()]
        if not ids:
            log.warning("No students in DB — only synthetic data will be used")
            return pd.DataFrame(columns=["student_id", *FEATURE_NAMES])
        df = compute_features(ids, c)
    df["label"] = label_at_risk(df)
    return df


def synthetic_dataset(n: int) -> pd.DataFrame:
    """Generate plausible feature rows with rule-based labels.

    Mirrors the empirical ranges of features observed in StudIX.
    Uses a fixed seed so training is reproducible.
    """
    rng = np.random.default_rng(42)

    # Three clusters: healthy, borderline, at-risk
    rows = []
    for _ in range(n):
        archetype = rng.choice(["healthy", "border", "risk"], p=[0.45, 0.30, 0.25])
        if archetype == "healthy":
            avg = rng.normal(4.4, 0.3)
            attendance = rng.beta(20, 1)
            overdue = max(0, int(rng.poisson(0.3)))
            grade_count = int(rng.uniform(8, 30))
            low_ratio = rng.beta(1, 12)
            absence = rng.poisson(1)
            sub_rate = rng.beta(18, 1)
            trend = rng.normal(0.05, 0.2)
            std_g = rng.normal(0.4, 0.15)
        elif archetype == "border":
            avg = rng.normal(3.6, 0.25)
            attendance = rng.beta(8, 2)
            overdue = max(0, int(rng.poisson(1.5)))
            grade_count = int(rng.uniform(5, 18))
            low_ratio = rng.beta(3, 7)
            absence = rng.poisson(3)
            sub_rate = rng.beta(7, 2)
            trend = rng.normal(-0.1, 0.3)
            std_g = rng.normal(0.7, 0.2)
        else:  # risk
            avg = rng.normal(2.7, 0.3)
            attendance = rng.beta(2, 5)
            overdue = max(0, int(rng.poisson(4.5)))
            grade_count = int(rng.uniform(2, 12))
            low_ratio = rng.beta(7, 2)
            absence = rng.poisson(8)
            sub_rate = rng.beta(2, 6)
            trend = rng.normal(-0.4, 0.3)
            std_g = rng.normal(1.1, 0.3)

        rows.append({
            "student_id": -1,
            "avg_grade": float(np.clip(avg, 0.0, 5.0)),
            "grade_count": int(grade_count),
            "grade_std": float(np.clip(std_g, 0.0, 2.0)),
            "grade_trend": float(trend),
            "low_grades_ratio": float(np.clip(low_ratio, 0.0, 1.0)),
            "attendance_rate": float(np.clip(attendance, 0.0, 1.0)),
            "absence_count": float(absence),
            "submission_rate": float(np.clip(sub_rate, 0.0, 1.0)),
            "overdue_count": float(overdue),
            "graded_subjects": int(rng.uniform(1, 10)),
        })

    df = pd.DataFrame(rows)
    df["label"] = label_at_risk(df)
    return df


def train(df: pd.DataFrame):
    from xgboost import XGBClassifier

    X = df[FEATURE_NAMES].fillna(0).to_numpy(dtype=float)
    y = df["label"].to_numpy(dtype=int)

    if y.sum() == 0 or y.sum() == len(y):
        raise RuntimeError(
            f"Degenerate labels (all {y[0]}). Need both at-risk and not-at-risk samples."
        )

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42,
        n_jobs=2,
    )
    model.fit(X_tr, y_tr)

    proba_te = model.predict_proba(X_te)[:, 1]
    pred_te = (proba_te >= 0.5).astype(int)
    auc = roc_auc_score(y_te, proba_te)
    log.info("Holdout ROC-AUC = %.3f", auc)
    log.info("\n%s", classification_report(y_te, pred_te, digits=3))

    cv_auc = cross_val_score(model, X, y, cv=5, scoring="roc_auc", n_jobs=1)
    log.info("5-fold CV ROC-AUC mean = %.3f (std %.3f)", cv_auc.mean(), cv_auc.std())

    return model, {
        "holdout_auc": float(auc),
        "cv_auc_mean": float(cv_auc.mean()),
        "cv_auc_std": float(cv_auc.std()),
    }


def main() -> None:
    log.info("Collecting real student features…")
    real = collect_real_dataset()
    log.info("Real samples: %d (positives: %d)", len(real), int(real["label"].sum()) if len(real) else 0)

    if SYNTHETIC_AUG > 0:
        log.info("Generating synthetic samples: n=%d", SYNTHETIC_AUG)
        synth = synthetic_dataset(SYNTHETIC_AUG)
        df = pd.concat([real, synth], ignore_index=True)
    else:
        df = real

    log.info("Training set: %d rows (positives: %d)", len(df), int(df["label"].sum()))

    model, metrics = train(df)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "feature_names": FEATURE_NAMES}, OUT_PATH)
    log.info("Saved model to %s", OUT_PATH)

    META_PATH.write_text(json.dumps({
        "version": "v1",
        "trained_at": date.today().isoformat(),
        "feature_names": FEATURE_NAMES,
        "metrics": metrics,
        "n_samples": int(len(df)),
        "n_positives": int(df["label"].sum()),
        "synthetic_aug": SYNTHETIC_AUG,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info("Saved metadata to %s", META_PATH)


if __name__ == "__main__":
    main()
