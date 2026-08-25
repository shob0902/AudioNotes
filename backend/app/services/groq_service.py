"""
GroqService — the only place in the codebase that talks to the Groq LLM API.

Uses Groq's OpenAI-compatible chat completions endpoint with
`response_format: {"type": "json_object"}` to get back a structured summary
matching the schema in app.schemas.note.NoteSummary:

    { summary, key_points[], action_items[], decisions[], topics[] }

For very long transcripts, sending the whole thing in one prompt would blow
past the model's context window and cost/latency budget. Instead this
service does a map-reduce pass: the transcript is split into
GROQ_MAX_INPUT_CHARS-sized pieces, each is condensed independently, and the
condensed pieces are combined into a final structured summary in a second
pass. Short transcripts skip straight to a single-pass summary.
"""

import json
from typing import List

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings
from app.utils.exceptions import PermanentServiceError, TransientServiceError
from app.utils.logging import get_logger

logger = get_logger(__name__)

_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

_JSON_SCHEMA_INSTRUCTIONS = """You produce structured notes from meeting/audio transcripts.
Respond with ONLY a JSON object (no markdown fences, no commentary) with exactly these keys:
{
  "summary": "a concise 2-4 sentence overview of the whole transcript",
  "key_points": ["short bullet points of the most important information"],
  "action_items": ["concrete follow-up tasks mentioned, phrased as actions; empty array if none"],
  "decisions": ["decisions that were explicitly made; empty array if none"],
  "topics": ["short topic/tag labels covering what was discussed"]
}
All arrays must contain plain strings. If a category has nothing relevant, return an empty array for it — never omit a key."""

_MAP_INSTRUCTIONS = """You are condensing one part of a longer transcript into dense notes for later
summarization. Write concise bullet points capturing key facts, decisions, action items, and topics
from this excerpt. Plain text bullets only, no JSON, no preamble."""

_REDUCE_INSTRUCTIONS = f"""You are given condensed notes from sequential parts of one long transcript,
in chronological order. Combine them into a single structured summary of the ENTIRE transcript.
{_JSON_SCHEMA_INSTRUCTIONS}"""


def _as_str_list(value) -> List[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _chunk_text(text: str, max_chars: int) -> List[str]:
    """Splits text into pieces of at most max_chars, breaking on whitespace
    near the boundary so words aren't cut in half."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    remaining = text
    while len(remaining) > max_chars:
        split_at = remaining.rfind(" ", 0, max_chars)
        if split_at <= 0:
            split_at = max_chars
        chunks.append(remaining[:split_at].strip())
        remaining = remaining[split_at:].strip()
    if remaining:
        chunks.append(remaining)
    return chunks


class GroqService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def summarize_transcript(self, transcript: str, note_id: str) -> dict:
        if not self.settings.groq_api_key:
            raise PermanentServiceError(
                "Summarization is not configured on the server.",
                technical_detail="GROQ_API_KEY is not set",
            )

        transcript = transcript.strip()
        if not transcript:
            raise PermanentServiceError("There is no transcript text to summarize.")

        if len(transcript) <= self.settings.groq_max_input_chars:
            return self._summarize_single_pass(transcript, note_id)
        return self._summarize_map_reduce(transcript, note_id)

    # -- single pass -----------------------------------------------------------

    def _summarize_single_pass(self, transcript: str, note_id: str) -> dict:
        content = self._chat_json(
            system_prompt=_JSON_SCHEMA_INSTRUCTIONS,
            user_content=f"Transcript:\n\n{transcript}",
            note_id=note_id,
            stage="single_pass",
        )
        return self._parse_summary_json(content, note_id)

    # -- map-reduce for long transcripts -----------------------------------------

    def _summarize_map_reduce(self, transcript: str, note_id: str) -> dict:
        pieces = _chunk_text(transcript, self.settings.groq_max_input_chars)
        logger.info("groq.map_reduce_start", extra={"note_id": note_id, "chunk_count": len(pieces)})

        condensed_notes = []
        for index, piece in enumerate(pieces):
            note_text = self._chat_text(
                system_prompt=_MAP_INSTRUCTIONS,
                user_content=f"Transcript excerpt {index + 1} of {len(pieces)}:\n\n{piece}",
                note_id=note_id,
                stage=f"map-{index}",
            )
            condensed_notes.append(f"[Part {index + 1}]\n{note_text}")

        combined = "\n\n".join(condensed_notes)
        content = self._chat_json(
            system_prompt=_REDUCE_INSTRUCTIONS,
            user_content=f"Condensed notes from all parts, in order:\n\n{combined}",
            note_id=note_id,
            stage="reduce",
        )
        return self._parse_summary_json(content, note_id)

    # -- HTTP + retry plumbing --------------------------------------------------

    def _chat_json(self, *, system_prompt: str, user_content: str, note_id: str, stage: str) -> str:
        return self._call_with_retry(system_prompt, user_content, note_id, stage, json_mode=True)

    def _chat_text(self, *, system_prompt: str, user_content: str, note_id: str, stage: str) -> str:
        return self._call_with_retry(system_prompt, user_content, note_id, stage, json_mode=False)

    def _call_with_retry(self, system_prompt: str, user_content: str, note_id: str, stage: str, json_mode: bool) -> str:
        retrying = retry(
            reraise=True,
            stop=stop_after_attempt(self.settings.groq_max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=20),
            retry=retry_if_exception_type(TransientServiceError),
        )
        return retrying(self._call_groq)(system_prompt, user_content, note_id, stage, json_mode)

    def _call_groq(self, system_prompt: str, user_content: str, note_id: str, stage: str, json_mode: bool) -> str:
        logger.info("groq.request", extra={"note_id": note_id, "stage": stage})

        payload = {
            "model": self.settings.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.settings.groq_api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.settings.groq_timeout_seconds) as client:
                response = client.post(self.settings.groq_api_url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise TransientServiceError(
                "Summarization timed out. Please try again.",
                technical_detail=f"Groq timeout on stage={stage} for note {note_id}: {exc}",
            ) from exc
        except httpx.HTTPError as exc:
            raise TransientServiceError(
                "Could not reach the summarization service. Please try again.",
                technical_detail=f"Groq connection error on stage={stage} for note {note_id}: {exc}",
            ) from exc

        return self._extract_content(response, note_id, stage)

    def _extract_content(self, response: httpx.Response, note_id: str, stage: str) -> str:
        status = response.status_code

        if status == 200:
            try:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except (ValueError, KeyError, IndexError, TypeError) as exc:
                raise TransientServiceError(
                    "Received an unreadable response from the summarization service.",
                    technical_detail=f"Malformed Groq 200 response on stage={stage} for note {note_id}: {exc}",
                ) from exc

        if status in (401, 403):
            raise PermanentServiceError(
                "Summarization service authentication failed. Please contact support.",
                technical_detail=f"Groq auth error {status} on stage={stage}: {response.text[:500]}",
            )

        if status == 404:
            raise PermanentServiceError(
                "The configured summarization model is unavailable.",
                technical_detail=f"Groq 404 (check GROQ_MODEL) on stage={stage}: {response.text[:500]}",
            )

        if status == 400:
            raise PermanentServiceError(
                "The summarization service rejected this request.",
                technical_detail=f"Groq 400 on stage={stage} for note {note_id}: {response.text[:500]}",
            )

        if status in _RETRYABLE_STATUS_CODES:
            raise TransientServiceError(
                "The summarization service is temporarily unavailable. Retrying...",
                technical_detail=f"Groq {status} on stage={stage} for note {note_id}: {response.text[:500]}",
            )

        raise PermanentServiceError(
            "The summarization service returned an unexpected error.",
            technical_detail=f"Groq unexpected status {status} on stage={stage}: {response.text[:500]}",
        )

    def _parse_summary_json(self, content: str, note_id: str) -> dict:
        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise TransientServiceError(
                "Received an unreadable summary from the AI model. Retrying...",
                technical_detail=f"Groq JSON decode error for note {note_id}: {exc}; content={content[:500]}",
            ) from exc

        if not isinstance(data, dict) or not str(data.get("summary", "")).strip():
            raise TransientServiceError(
                "The AI model returned an incomplete summary. Retrying...",
                technical_detail=f"Groq summary missing 'summary' field for note {note_id}: {data}",
            )

        return {
            "summary": str(data.get("summary", "")).strip(),
            "key_points": _as_str_list(data.get("key_points")),
            "action_items": _as_str_list(data.get("action_items")),
            "decisions": _as_str_list(data.get("decisions")),
            "topics": _as_str_list(data.get("topics")),
        }
