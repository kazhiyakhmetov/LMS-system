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
        "Ты — опытный учитель, который составляет качественные тестовые вопросы single-choice "
        "на русском языке. СТРОГИЕ ПРАВИЛА каждого вопроса:\n"
        "1. РОВНО 4 варианта ответа — все РАЗНЫЕ по смыслу.\n"
        "2. ТОЛЬКО ОДИН вариант правильный. Остальные 3 — правдоподобные, но фактически НЕВЕРНЫЕ.\n"
        "3. Неправильные варианты НЕ должны быть синонимами или эквивалентом правильного "
        "(например «365 дней» и «1 год» — это одно и то же, так нельзя).\n"
        "4. Запрещены варианты «все перечисленное», «всё верно», «нет правильного ответа», «правда/ложь».\n"
        "5. Только русский язык — никаких иностранных слов в вопросах, вариантах и объяснениях.\n"
        "6. Вопрос чёткий, однозначный, ответ выводится из текста.\n"
        "Отвечаешь СТРОГО валидным JSON без markdown, без комментариев, без префиксов."
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
        "- Формулируй вопрос как ОТКРЫТЫЙ: начинай со слов «Сколько», «Какой», «Что», «Где», «Когда», «Почему».\n"
        "- ЗАПРЕЩЕНО делать вопрос-утверждение со знаком вопроса в конце (типа «Земля круглая?»).\n"
        "- РОВНО 4 РАЗНЫХ варианта-ЗНАЧЕНИЯ (числа, термины, факты). НЕ «правда»/«ложь»/«верно»/«неверно»/«это не так»/«нет правильного ответа».\n"
        "- Только ОДИН правильный; остальные 3 — правдоподобные, но фактически НЕВЕРНЫЕ и НЕ синонимы правильного.\n"
        "- correctIdx (0..3) ОБЯЗАТЕЛЬНО указывает на ВЕРНЫЙ вариант — перепроверь факт перед ответом.\n"
        "- Только русский язык. Короткое объяснение в \"explanation\" (1 предложение).\n\n"
        "ПРИМЕР правильного вопроса (формат и стиль — копируй):\n"
        '{"q":"Сколько планет в Солнечной системе?","options":["восемь","девять","семь","десять"],"correctIdx":0,"explanation":"В Солнечной системе восемь планет."}\n\n'
        "ПЛОХОЙ пример (так НЕ делай): вопрос-утверждение «Солнце — звезда?» с вариантами «правда/ложь».\n\n"
        f"Структура ответа (массив РОВНО из {n} объектов):\n"
        '{"questions":[ {"q":"...","options":["...","...","...","..."],"correctIdx":0,"explanation":"..."} ]}\n\n'
        f"Сгенерируй {n} вопросов. Только JSON, без префиксов и markdown."
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

    # raw correct index (before normalization)
    correct_idx = raw.get("correctIdx")
    if correct_idx is None:
        correct_idx = raw.get("correctIndex")
    if correct_idx is None:
        correct_idx = raw.get("correct")
    try:
        correct_idx = int(correct_idx)
    except (TypeError, ValueError):
        correct_idx = 0

    raw_opts = [str(o).strip() for o in options]
    # remember the correct option's TEXT before we dedupe/reorder
    correct_text = raw_opts[correct_idx] if 0 <= correct_idx < len(raw_opts) and raw_opts[correct_idx] else None

    # dedupe case-insensitively, drop empties — kills "365 дней"/"365 дней" type repeats
    seen: set[str] = set()
    uniq: list[str] = []
    for o in raw_opts:
        if not o:
            continue
        key = o.lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(o)

    # STRICT: exactly 4 distinct meaningful options, otherwise reject → retry re-asks
    if len(uniq) < 4:
        return None
    options = uniq[:4]

    # Reject degenerate true/false-style options the small model falls back to.
    _banned = {
        "правда", "ложь", "верно", "неверно", "это не так", "не так",
        "нет правильного ответа", "все верно", "всё верно", "все правильно",
        "все перечисленное", "всё перечисленное", "все перечисленные",
        "да", "нет", "истина", "не соответствует факту", "фальсифицирует",
    }
    if any(o.lower().strip(" .!?") in _banned for o in options):
        return None

    # locate the correct option in the cleaned list; if it was dropped, the question is unreliable
    if not correct_text or correct_text not in options:
        return None
    correct_idx = options.index(correct_text)

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
