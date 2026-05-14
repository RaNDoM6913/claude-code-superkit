#!/usr/bin/env python3
"""intake-classifier.py — classify user prompt intent on UserPromptSubmit.

Adapts the VKirill/codex-starter-kit handoff-intake-classifier pattern to
the superkit. Two-layer classification:

  Layer 1: deterministic scorer (0-15) on RU+EN keywords. Always runs.
  Layer 2: optional LLM fallback (gpt-5.5-nano via OpenAI Responses API)
           when confidence < 0.78 AND OPENAI_API_KEY is set.

Output: hookSpecificOutput.additionalContext with guidance for the
assistant — intent, flags, and one-sentence rationale.

Fail-open: any parsing / network / model error is silently dropped so
the user's prompt is never blocked.

Profile: standard, strict (skipped on fast).
Opt-out: CLAUDE_DISABLE_INTAKE_CLASSIFIER=1

This hook coexists with user-intent-detect.sh (which handles the narrow
"[quick]" override signal). The two answer different questions.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from typing import Any
from urllib import error, request

API_URL = "https://api.openai.com/v1/responses"
DEFAULT_MODEL = "gpt-5.5-nano"
MAX_PROMPT_CHARS = 1800
MAX_LOG_LINES = 12


def setting(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def disabled() -> bool:
    if setting("CLAUDE_DISABLE_INTAKE_CLASSIFIER") == "1":
        return True
    if setting("CLAUDE_HOOK_PROFILE", "standard") == "fast":
        return True
    return False


def emit_context(context: str) -> None:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "UserPromptSubmit",
                    "additionalContext": context,
                }
            },
            ensure_ascii=False,
        )
    )


def normalize_prompt(prompt: str) -> str:
    lines = prompt.strip().splitlines()
    compacted: list[str] = []
    log_lines = 0
    for line in lines:
        stripped = line.strip()
        looks_like_log = bool(
            re.search(r"\b(GET|POST|PUT|PATCH|DELETE)\s+https?://", stripped)
            or re.search(r"\b(4\d\d|5\d\d)\b", stripped)
            or re.search(r"\bat\s+[\w.$-]+", stripped)
            or ".js:" in stripped
        )
        if looks_like_log:
            log_lines += 1
            if log_lines > MAX_LOG_LINES:
                continue
        compacted.append(stripped)
    text = "\n".join(compacted)
    if len(text) > MAX_PROMPT_CHARS:
        return text[:MAX_PROMPT_CHARS] + "\n[truncated for intake classification]"
    return text


def has_any(text: str, needles: tuple[str, ...]) -> bool:
    return any(needle in text for needle in needles)


def has_action_request(text: str) -> bool:
    patterns = (
        r"\bсделай\b",
        r"\bсделать\s+надо\b",
        r"\bисправ(ь|ляй|ить)\b",
        r"\bдобав(ь|ить)\b",
        r"\bобнов(и|ить)\b",
        r"\bперезапуст(и|ить)\b",
        r"\bпочини\b",
        r"\bпочинить\b",
        r"\bпередел(ай|ать)\b",
        r"\bдоработай\b",
        r"\bвнеси\b",
        r"\bзапушь\b",
        r"\bзакоммит(ь|ьте)?\b",
        r"\bреализ(уй|овать)\b",
        r"\bприступай\s+к\s+реализации\b",
        r"\bbuild\b",
        r"\bfix\b",
        r"\badd\b",
        r"\bcreate\b",
        r"\bimplement\b",
        r"\bcommit\b",
        r"\bpush\b",
    )
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)


def deterministic_classify(prompt: str) -> dict[str, Any]:
    lower = prompt.lower()
    score = 0
    reasons: list[str] = []

    question_mark = "?" in prompt
    action_requested = has_action_request(lower)
    planning_words = (
        "план",
        "сплан",
        "архитектур",
        "исслед",
        "проанализ",
        "посмотри как",
        "как лучше",
        "миграц",
        "plan",
        "architecture",
        "design",
        "analyze",
        "research",
    )
    question_words = (
        "почему",
        "зачем",
        "разве",
        "есть ли",
        "можно ли",
        "как понять",
        "вопрос",
        "what is",
        "why does",
        "how come",
        "is it possible",
    )
    continuation_words = ("продолжай", "лимиты обновились", "continue", "resume")
    multi_surface_words = (
        "дашборд",
        "crm",
        "бот",
        "api",
        "бд",
        "база",
        "платеж",
        "модел",
        "статист",
        "метрик",
        "dashboard",
        "database",
        "payment",
        "metrics",
        "endpoint",
    )
    bug_words = (
        "не работает",
        "не работают",
        "пусто",
        "по нулям",
        "ошибк",
        "500",
        "не меняется",
        "отсутств",
        "broken",
        "doesn't work",
        "fails",
        "crash",
        "error",
    )

    if has_any(lower, continuation_words):
        return {
            "intent": "continue",
            "score": 3,
            "confidence": 0.9,
            "should_edit": False,
            "should_plan": False,
            "should_use_task_ledger": False,
            "subagents_authorized": False,
            "reason": "User asks to continue an existing task.",
        }

    if action_requested:
        score += 5
        reasons.append("action verb")
    if has_any(lower, planning_words):
        score += 4
        reasons.append("planning/discovery language")
    if has_any(lower, multi_surface_words):
        score += 4
        reasons.append("multi-surface system terms")
    if has_any(lower, bug_words):
        score += 3
        reasons.append("bug/regression symptoms")
    if question_mark or has_any(lower, question_words):
        score += 2
        reasons.append("question language")
    if prompt.count("\n\n") >= 2 or len(prompt) > 900:
        score += 2
        reasons.append("multi-item prompt")

    score = min(score, 15)
    subagents_authorized = has_any(
        lower, ("сабагент", "subagent", "делег", "параллел", "parallel", "delegate")
    )

    if has_any(lower, ("начинай", "пиши план", "write a plan")) and has_any(
        lower, planning_words
    ):
        intent = "planning"
        should_edit = False
        should_plan = True
    elif action_requested:
        intent = "implementation"
        should_edit = True
        should_plan = score >= 10
    elif question_mark or has_any(lower, question_words):
        if score >= 8 and not has_any(lower, ("пока вопрос", "просто вопрос", "just curious")):
            intent = "analysis"
            should_edit = False
            should_plan = True
        else:
            intent = "question_only"
            should_edit = False
            should_plan = False
    elif has_any(lower, planning_words):
        intent = "planning"
        should_edit = False
        should_plan = True
    else:
        intent = "analysis"
        should_edit = False
        should_plan = score >= 7

    should_use_task_ledger = score >= 7 and intent not in {"question_only", "continue"}
    confidence = 0.86
    if question_mark and action_requested:
        confidence = 0.68
    elif intent == "analysis" and 6 <= score <= 8:
        confidence = 0.7
    elif len(prompt.strip()) < 20:
        confidence = 0.72

    return {
        "intent": intent,
        "score": score,
        "confidence": confidence,
        "should_edit": should_edit,
        "should_plan": should_plan,
        "should_use_task_ledger": should_use_task_ledger,
        "subagents_authorized": subagents_authorized,
        "reason": ", ".join(reasons[:3]) or "simple prompt",
    }


def should_call_llm(classification: dict[str, Any], prompt: str) -> bool:
    mode = setting("CLAUDE_INTAKE_LLM", "auto").lower()
    if mode in {"0", "false", "off", "none", "no"}:
        return False
    if mode in {"1", "true", "on", "always", "yes"}:
        return bool(setting("OPENAI_API_KEY"))
    if not setting("OPENAI_API_KEY"):
        return False
    if float(classification.get("confidence", 1.0)) < 0.78:
        return True
    lower = prompt.lower()
    return "?" in prompt and has_any(
        lower, ("сделай", "исправ", "надо", "план", "реализ", "fix", "add", "build")
    )


def extract_output_text(payload: dict[str, Any]) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]
    chunks: list[str] = []
    for item in payload.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []) or []:
            if isinstance(content, dict) and content.get("type") == "output_text":
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
    return "".join(chunks)


def llm_classify(prompt: str) -> dict[str, Any] | None:
    api_key = setting("OPENAI_API_KEY")
    if not api_key:
        return None
    model = setting("CLAUDE_INTAKE_MODEL", DEFAULT_MODEL)
    try:
        timeout = float(setting("CLAUDE_INTAKE_TIMEOUT", "2.0"))
    except ValueError:
        timeout = 2.0

    instructions = (
        "Classify a user prompt for an intake hook (Russian + English). "
        "Return only compact JSON with keys: intent, should_edit, should_plan, "
        "should_use_task_ledger, score_0_15, subagents_authorized, "
        "confidence_0_1, one_sentence_reason. "
        "Intent must be one of: question_only, analysis, planning, "
        "implementation, continue, execute_approved_plan. "
        "Subagents are authorized only when the user explicitly mentions "
        "subagents, delegation, or parallel work."
    )
    payload = {
        "model": model,
        "instructions": instructions,
        "input": normalize_prompt(prompt),
        "max_output_tokens": 220,
        "store": False,
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        API_URL,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
    except (OSError, error.HTTPError, error.URLError, TimeoutError):
        return None

    try:
        parsed = json.loads(body)
        text = extract_output_text(parsed).strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        result = json.loads(text)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None
    if not isinstance(result, dict):
        return None
    return result


def merged_classification(prompt: str) -> tuple[dict[str, Any], str]:
    base = deterministic_classify(prompt)
    if should_call_llm(base, prompt):
        start = time.monotonic()
        llm = llm_classify(prompt)
        if llm:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            return llm, f"llm:{elapsed_ms}ms"
    return base, "deterministic"


def context_from_classification(c: dict[str, Any], source: str) -> str:
    intent = str(c.get("intent", "analysis"))
    score = c.get("score_0_15", c.get("score", 0))
    confidence = c.get("confidence_0_1", c.get("confidence", 0))
    should_edit = bool(c.get("should_edit", False))
    should_plan = bool(c.get("should_plan", False))
    should_ledger = bool(c.get("should_use_task_ledger", False))
    subagents = bool(c.get("subagents_authorized", False))
    reason = str(c.get("one_sentence_reason", c.get("reason", "")))

    guidance = [
        f"Intake classifier ({source}): intent={intent}, score={score}, confidence={confidence}.",
        f"Flags: should_edit={str(should_edit).lower()}, should_plan={str(should_plan).lower()}, task_ledger={str(should_ledger).lower()}, subagents_authorized={str(subagents).lower()}.",
    ]
    if reason:
        guidance.append(f"Reason: {reason}")
    if intent == "question_only":
        guidance.append(
            "Answer the question directly. Do not edit files or run "
            "implementation commands unless the user explicitly asks for work."
        )
    elif intent == "planning":
        guidance.append(
            "Do discovery and produce a plan. Do not implement yet unless "
            "the user explicitly asks for implementation."
        )
    elif intent == "analysis":
        guidance.append(
            "Investigate enough to answer or plan. Avoid edits unless the "
            "prompt clearly asks for a fix."
        )
    elif intent in {"implementation", "execute_approved_plan"}:
        guidance.append(
            "Proceed with implementation. Build a task ledger for multi-issue "
            "work and verify before completion."
        )
    elif intent == "continue":
        guidance.append(
            "Continue the prior task using the current context; recover the "
            "last known state first if needed."
        )
    if not subagents:
        guidance.append(
            "Do not spawn subagents unless the user explicitly authorizes "
            "delegation, parallel work, or subagents."
        )
    return " ".join(guidance)


def main() -> int:
    if disabled():
        return 0

    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    event = payload.get("hook_event_name")
    if event and event != "UserPromptSubmit":
        return 0

    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return 0

    try:
        classification, source = merged_classification(prompt)
        emit_context(context_from_classification(classification, source))
    except Exception:
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
