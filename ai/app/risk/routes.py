"""Risk-prediction HTTP routes."""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from . import service

log = logging.getLogger(__name__)
router = APIRouter()


class RiskFactor(BaseModel):
    feature: str
    label: str
    value: float
    direction: str  # "up" | "down"


class StudentRisk(BaseModel):
    studentId: int
    score: float           # 0..100
    level: str             # "low" | "mid" | "high"
    topFactors: List[RiskFactor]
    modelVersion: str


@router.get("/student/{student_id}", response_model=StudentRisk)
def predict_for_student(student_id: int) -> StudentRisk:
    try:
        return service.predict(student_id)
    except service.ModelNotReady as e:
        raise HTTPException(status_code=503, detail=str(e))
    except service.StudentNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/class/{class_id}", response_model=List[StudentRisk])
def predict_for_class(class_id: int, level: Optional[str] = Query(None, pattern="^(low|mid|high)$")) -> List[StudentRisk]:
    try:
        rows = service.predict_class(class_id)
    except service.ModelNotReady as e:
        raise HTTPException(status_code=503, detail=str(e))
    if level:
        rows = [r for r in rows if r.level == level]
    return rows


@router.get("/school/{school_id}/summary")
def school_summary(school_id: int) -> dict:
    try:
        return service.school_summary(school_id)
    except service.ModelNotReady as e:
        raise HTTPException(status_code=503, detail=str(e))
