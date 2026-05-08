"""Quiz/test generation via local Ollama (Qwen 2.5 3B)."""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import urllib.error
import urllib.request

log = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

DIFFICULTY_LABELS = {
    "easy":   "лёгкий (базовые понятия)",
    "medium": "средний (применение и выводы)",
    "hard":   "сложный (анализ и нестандартные задачи)",
}


class GenerationError(RuntimeError):
    pass


def _system_prompt() -> str:
    return (
        "Ты помощник учителя школы. Генерируешь тестовые вопросы single-choice на "
        "русском языке. Все варианты ответов должны быть осмысленными конкретными "
        "значениями (не \"A\",\"B\",\"C\",\"D\"). Отвечаешь СТРОГО валидным JSON "
        "без markdown, без комментариев, без префиксов."
    )


def _user_prompt(text: str, n: int, difficulty: str, kind: str) -> str:
    diff_label = DIFFICULTY_LABELS.get(difficulty, DIFFICULTY_LABELS["medium"])
    target_word = "квиза" if kind == "quiz" else "теста"
    return (
        f"Тебе ОБЯЗАТЕЛЬНО нужно сгенерировать РОВНО {n} вопросов single-choice "
        f"для {target_word} по приведённому тексту. Не меньше {n} и не больше {n}. "
        f"Уровень сложности: {diff_label}.\n\n"
        f"Текст:\n«{text.strip()}»\n\n"
        "Требования:\n"
        f"- В массиве \"questions\" должно быть РОВНО {n} элементов.\n"
        "- Каждый вопрос на русском языке, чёткий и однозначный.\n"
        "- 4 разных осмысленных варианта ответа в \"options\" (не буквы, а реальные значения/фразы).\n"
        "- Один вариант правильный — его индекс в поле correctIdx (0..3).\n"
        "- Короткое объяснение в поле explanation (1 предложение).\n\n"
        f"Структура ответа (массив должен содержать ИМЕННО {n} объектов):\n"
        '{"questions":[\n'
        + ",\n".join(
            f'  {{"q":"Вопрос {i+1}?","options":["вариант 1","вариант 2","вариант 3","вариант 4"],"correctIdx":0,"explanation":"объяснение"}}'
            for i in range(n)
        )
        + "\n]}\n\n"
        f"Сгенерируй контент. ОБЯЗАТЕЛЬНО {n} вопросов. Только JSON, без префиксов и markdown."
    )


def _call_ollama(messages: list[dict], format_json: bool = True, max_tokens: int = 1500, temperature: float = 0.4) -> str:
    body = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if format_json:
        body["format"] = "json"

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            payload = json.loads(r.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise GenerationError(f"Ollama unreachable: {e}")
    except Exception as e:
        raise GenerationError(f"Ollama call failed: {e}")

    msg = payload.get("message") or {}
    content = msg.get("content") or ""
    if not content:
        raise GenerationError("Empty response from Ollama")
    return content


def _try_parse_questions(content: str) -> list[dict]:
    """Try multiple strategies to extract questions array from raw content."""
    # Strategy 1: parse as-is
    for candidate in (content, _strip_fences(content)):
        try:
            obj = json.loads(candidate)
            qs = _extract_questions(obj)
            if qs:
                return qs
        except (json.JSONDecodeError, TypeError):
            pass

    # Strategy 2: find first {...} substring
    m = re.search(r"\{.*\}", content, re.DOTALL)
    if m:
        try:
            obj = json.loads(m.group(0))
            qs = _extract_questions(obj)
            if qs:
                return qs
        except json.JSONDecodeError:
            pass

    raise GenerationError("Could not parse JSON questions from model output")


def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s[3:]
    if s.endswith("```"):
        s = s.rsplit("```", 1)[0]
    return s.strip()


def _extract_questions(obj: Any) -> list[dict]:
    if isinstance(obj, dict):
        for key in ("questions", "items", "result", "data"):
            v = obj.get(key)
            if isinstance(v, list):
                return v
        # If dict has q/options at top level, wrap as single
        if "q" in obj and "options" in obj:
            return [obj]
    if isinstance(obj, list):
        return obj
    return []


def _sanitize_question(raw: dict, idx: int) -> dict | None:
    """Validate and normalize a single question; returns None if unusable."""
    if not isinstance(raw, dict):
        return None
    q = raw.get("q") or raw.get("question") or raw.get("text")
    options = raw.get("options") or raw.get("answers") or []
    if not isinstance(q, str) or not q.strip():
        return None
    if not isinstance(options, list) or len(options) < 2:
        return None
    options = [str(o).strip() for o in options if str(o).strip()]
    if len(options) < 2:
        return None
    # ensure 4 options if possible (truncate to 4)
    options = options[:4]
    while len(options) < 2:
        return None
    correct_idx = raw.get("correctIdx")
    if correct_idx is None:
        correct_idx = raw.get("correctIndex")
    if correct_idx is None:
        correct_idx = raw.get("correct")
    try:
        correct_idx = int(correct_idx)
    except (TypeError, ValueError):
        correct_idx = 0
    if correct_idx < 0 or correct_idx >= len(options):
        correct_idx = 0
    explanation = raw.get("explanation") or raw.get("comment") or ""
    if not isinstance(explanation, str):
        explanation = str(explanation)
    return {
        "id": idx,
        "q": q.strip(),
        "options": options,
        "correctIdx": correct_idx,
        "explanation": explanation.strip(),
    }


def generate_quiz(text: str, n_questions: int = 5, difficulty: str = "medium", kind: str = "quiz") -> dict:
    """Generate a list of single-choice questions from a text passage.

    Args:
        text: source paragraph or material to base questions on.
        n_questions: requested count (3..15).
        difficulty: easy | medium | hard.
        kind: "quiz" (студент) или "test" (учитель) — влияет только на формулировки.
    """
    n = max(2, min(15, int(n_questions)))
    text = (text or "").strip()
    if len(text) < 20:
        raise GenerationError("Текст слишком короткий — минимум 20 символов")

    messages = [
        {"role": "system", "content": _system_prompt()},
        {"role": "user",   "content": _user_prompt(text, n, difficulty, kind)},
    ]

    cleaned: list[dict] = []
    # Up to 3 attempts: small models sometimes return only 1-2 questions.
    # Each retry top-ups missing items with a re-prompt asking for what's left.
    for attempt in range(3):
        if len(cleaned) >= n:
            break
        # Compute remaining count for this attempt
        remaining = n - len(cleaned)
        # On retries, ask only for what's missing
        if attempt > 0:
            messages = [
                {"role": "system", "content": _system_prompt()},
                {"role": "user",   "content": _user_prompt(text, remaining, difficulty, kind)},
            ]
        # Higher num_predict for retries; slightly lower temp on first try for stability
        max_tokens = 2500 + 600 * attempt
        temperature = 0.25 + 0.15 * attempt
        try:
            raw = _call_ollama(messages, format_json=True, max_tokens=max_tokens, temperature=temperature)
        except GenerationError as e:
            log.warning("Ollama call attempt %d failed: %s", attempt + 1, e)
            if attempt == 0:
                raise
            break
        log.info("Ollama attempt %d output (%d chars)", attempt + 1, len(raw))

        try:
            questions_raw = _try_parse_questions(raw)
        except GenerationError:
            questions_raw = []

        for q in questions_raw:
            if len(cleaned) >= n:
                break
            sanitized = _sanitize_question(q, len(cleaned))
            if sanitized:
                cleaned.append(sanitized)

        log.info("After attempt %d: %d/%d questions collected", attempt + 1, len(cleaned), n)

    if not cleaned:
        raise GenerationError("Не удалось распарсить вопросы из ответа модели")

    # Bypass the old single-pass pipeline below
    return {
        "model": OLLAMA_MODEL,
        "kind": kind,
        "difficulty": difficulty,
        "requested": n,
        "received": len(cleaned),
        "questions": cleaned,
    }

    # (unreachable — kept for original-fallback structure if needed)
    questions_raw = _try_parse_questions("")
    if not questions_raw:
        raise GenerationError("Модель вернула пустой список вопросов")

    cleaned = []
    for i, q in enumerate(questions_raw[:n]):
        sanitized = _sanitize_question(q, i)
        if sanitized:
            cleaned.append(sanitized)

    if not cleaned:
        raise GenerationError("Не удалось распарсить вопросы из ответа модели")

    return {
        "model": OLLAMA_MODEL,
        "kind": kind,
        "difficulty": difficulty,
        "requested": n,
        "received": len(cleaned),
        "questions": cleaned,
    }
