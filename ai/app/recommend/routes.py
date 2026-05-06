"""Recommendation HTTP routes."""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import service

log = logging.getLogger(__name__)
router = APIRouter()


class Recommendation(BaseModel):
    kind: str           # "quiz" | "topic"
    targetId: int | None
    title: str
    score: float
    reason: str
    subjectName: str | None = None


@router.get("/student/{student_id}", response_model=List[Recommendation])
def for_student(student_id: int, limit: int = 5) -> List[Recommendation]:
    try:
        return service.recommend(student_id, limit=limit)
    except service.StudentNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/refresh")
def refresh_all() -> dict:
    """Recompute & cache recommendations for all active students. Called by Spring scheduler."""
    n = service.refresh_all()
    return {"refreshed": n}
