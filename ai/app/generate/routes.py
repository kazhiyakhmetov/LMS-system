"""HTTP routes for AI quiz/test generation."""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import service

log = logging.getLogger(__name__)
router = APIRouter()


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=20, max_length=8000)
    nQuestions: int = Field(5, ge=2, le=15)
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")
    kind: str = Field("quiz", pattern="^(quiz|test)$")


class GeneratedOption(BaseModel):
    text: str


class GeneratedQuestion(BaseModel):
    id: int
    q: str
    options: List[str]
    correctIdx: int
    explanation: Optional[str] = ""


class GenerateResponse(BaseModel):
    model: str
    kind: str
    difficulty: str
    requested: int
    received: int
    questions: List[GeneratedQuestion]


@router.post("/quiz", response_model=GenerateResponse)
def generate_quiz(req: GenerateRequest) -> GenerateResponse:
    try:
        out = service.generate_quiz(
            text=req.text,
            n_questions=req.nQuestions,
            difficulty=req.difficulty,
            kind=req.kind,
        )
        return GenerateResponse(**out)
    except service.GenerationError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        log.exception("generate_quiz failed")
        raise HTTPException(status_code=500, detail=str(e))
