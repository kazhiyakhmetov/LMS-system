"""Train the risk-prediction XGBoost model — REAL predictive task.

Usage (inside container or local venv):
    python -m scripts.train_risk

Methodology (v2)
----------------
Earlier the label was a rule computed from the SAME features the model sees, so
the model just relearned the rule (AUC ≈ 1.0, meaningless). Now it's a genuine
*forward-looking* task:

    FEATURES  = a student's academic behaviour up to the end of Q3 (snapshot)
    LABEL     = did the student end up at academic risk in Q4
                (Q4 quarter-grade average < RISK_THRESHOLD) — a FUTURE outcome
                the features cannot see.

So the model predicts a later outcome from earlier behaviour — real prediction,
not circular. We augment the 107 real students with synthetic students whose Q4
outcome carries realistic drift noise (some improve, some decline), so the task
has genuine uncertainty and the metrics are honest.
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

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import conn  # noqa: E402
from app.risk.features import FEATURE_NAMES, compute_features  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("train_risk")

OUT_PATH = Path(os.getenv("RISK_MODEL_PATH", str(Path(__file__).resolve().parents[1] / "models" / "risk_v1.joblib")))
META_PATH = OUT_PATH.with_suffix(".meta.json")

# End of Q3 — features use only data up to here; label uses Q4 (the future).
Q3_SNAPSHOT = date(2026, 4, 1)
# Q4 quarter-average below this (5-point scale) ⇒ "at academic risk".
RISK_THRESHOLD = float(os.getenv("RISK_THRESHOLD", "3.3"))
SYNTHETIC_AUG = int(os.getenv("RISK_SYNTHETIC_AUG", "400"))


def collect_real_dataset() -> pd.DataFrame:
    """Real students: features at Q3 snapshot → label = poor Q4 outcome."""
    with conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT user_id FROM students")
            ids = [r[0] for r in cur.fetchall()]
            # future outcome: Q4 quarter-grade average per student
            cur.execute(
                "SELECT student_id, AVG(quarter_grade)::float FROM journal_final_grades "
                "WHERE quarter = 4 GROUP BY student_id"
            )
            q4 = {r[0]: r[1] for r in cur.fetchall()}
        if not ids:
            log.warning("No students in DB — only synthetic data will be used")
            return pd.DataFrame(columns=["student_id", *FEATURE_NAMES, "label"])
        df = compute_features(ids, c, snapshot=Q3_SNAPSHOT)

    # keep only students for whom we know the Q4 outcome (can be labelled)
    df = df[df["student_id"].isin(q4.keys())].copy()
    df["label"] = df["student_id"].map(lambda sid: 1 if q4[sid] < RISK_THRESHOLD else 0).astype(int)
    return df


def synthetic_dataset(n: int) -> pd.DataFrame:
    """Synthetic students with a latent ability → Q3 features + a NOISY Q4 outcome.

    The Q4 outcome = ability carried forward + drift noise, so Q3 behaviour does
    NOT perfectly determine Q4 — this gives the model a genuinely hard, realistic
    prediction task (and balances the classes).
    """
    rng = np.random.default_rng(42)
    rows = []
    for _ in range(n):
        ability = rng.uniform(1.7, 4.9)              # latent academic ability (0-5)
        avg = float(np.clip(rng.normal(ability, 0.35), 0.0, 5.0))
        attendance = float(np.clip(rng.normal(0.55 + 0.085 * ability, 0.12), 0.30, 1.0))
        sub_rate = float(np.clip(rng.normal(0.50 + 0.095 * ability, 0.12), 0.20, 1.0))
        overdue = max(0, int(rng.poisson(max(0.2, 5.0 - ability))))
        absence = max(0, int(rng.poisson(max(0.5, 9.0 - 1.6 * ability))))
        grade_count = int(rng.uniform(15, 45))
        low_ratio = float(np.clip(rng.normal(max(0.0, (3.5 - avg) / 3.5), 0.10), 0.0, 1.0))
        std_g = float(np.clip(rng.normal(0.75, 0.25), 0.1, 2.0))
        trend = float(rng.normal(0.0, 0.25))
        subjects = int(rng.uniform(5, 9))

        # FUTURE Q4 outcome — ability + drift (the realism that makes it predictable but not certain)
        q4_grade = ability + rng.normal(0.0, 0.55) + trend * 0.6
        label = 1 if q4_grade < RISK_THRESHOLD else 0

        rows.append({
            "student_id": -1,
            "avg_grade": avg,
            "grade_count": grade_count,
            "grade_std": std_g,
            "grade_trend": trend,
            "low_grades_ratio": low_ratio,
            "attendance_rate": attendance,
            "absence_count": float(absence),
            "submission_rate": sub_rate,
            "overdue_count": float(overdue),
            "graded_subjects": subjects,
            "label": label,
        })
    return pd.DataFrame(rows)


def train(df: pd.DataFrame):
    from xgboost import XGBClassifier

    X = df[FEATURE_NAMES].fillna(0).to_numpy(dtype=float)
    y = df["label"].to_numpy(dtype=int)

    if y.sum() == 0 or y.sum() == len(y):
        raise RuntimeError(f"Degenerate labels (all {y[0]}). Need both classes.")

    pos = int(y.sum())
    neg = int(len(y) - pos)
    spw = max(1.0, neg / max(1, pos))  # handle class imbalance

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = XGBClassifier(
        n_estimators=180,
        max_depth=4,
        learning_rate=0.07,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=spw,
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
    log.info("Collecting real student features at Q3 snapshot (%s)…", Q3_SNAPSHOT)
    real = collect_real_dataset()
    log.info("Real samples: %d (at-risk in Q4: %d)", len(real), int(real["label"].sum()) if len(real) else 0)

    if SYNTHETIC_AUG > 0:
        log.info("Generating synthetic samples with drift noise: n=%d", SYNTHETIC_AUG)
        synth = synthetic_dataset(SYNTHETIC_AUG)
        df = pd.concat([real, synth], ignore_index=True)
    else:
        df = real

    log.info("Training set: %d rows (at-risk: %d / %.0f%%)",
             len(df), int(df["label"].sum()), 100.0 * df["label"].mean())

    model, metrics = train(df)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "feature_names": FEATURE_NAMES}, OUT_PATH)
    log.info("Saved model to %s", OUT_PATH)

    META_PATH.write_text(json.dumps({
        "version": "v2",
        "trained_at": date.today().isoformat(),
        "task": "predict Q4 academic risk from behaviour up to end of Q3",
        "label": f"Q4 quarter-grade average < {RISK_THRESHOLD}",
        "snapshot": Q3_SNAPSHOT.isoformat(),
        "feature_names": FEATURE_NAMES,
        "metrics": metrics,
        "n_samples": int(len(df)),
        "n_positives": int(df["label"].sum()),
        "n_real": int(len(real)),
        "synthetic_aug": SYNTHETIC_AUG,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info("Saved metadata to %s", META_PATH)


if __name__ == "__main__":
    main()
