import json

import httpx
import pytest
import respx

from app.config import get_settings
from app.services.groq_service import GroqService, _chunk_text
from app.utils.exceptions import PermanentServiceError, TransientServiceError


def _service(**overrides):
    settings = get_settings().model_copy(update=overrides)
    return GroqService(settings=settings)


def _groq_response(payload: dict) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(payload)}}]})


def test_chunk_text_breaks_on_whitespace_without_splitting_words():
    text = "one two three four five six seven eight nine ten"
    chunks = _chunk_text(text, max_chars=15)
    assert "".join(chunks).replace(" ", "") == text.replace(" ", "")
    assert all(len(chunk) <= 20 for chunk in chunks)  # some slack for the boundary word


@respx.mock
def test_single_pass_summary_success():
    settings = get_settings()
    expected = {
        "summary": "A short overview.",
        "key_points": ["point one"],
        "action_items": ["do the thing"],
        "decisions": ["we decided X"],
        "topics": ["planning"],
    }
    respx.post(settings.groq_api_url).mock(return_value=_groq_response(expected))

    service = _service(groq_max_input_chars=10_000)
    result = service.summarize_transcript("A reasonably short transcript.", note_id="note-1")

    assert result == expected


@respx.mock
def test_long_transcript_triggers_map_reduce():
    settings = get_settings()
    max_chars = 20
    long_transcript = "word " * 20  # comfortably over the chunk budget
    expected_map_calls = len(_chunk_text(long_transcript, max_chars))

    reduce_payload = {
        "summary": "Combined summary.",
        "key_points": [],
        "action_items": [],
        "decisions": [],
        "topics": [],
    }
    map_response = httpx.Response(200, json={"choices": [{"message": {"content": "condensed bullet notes"}}]})
    route = respx.post(settings.groq_api_url).mock(
        side_effect=[map_response] * expected_map_calls + [_groq_response(reduce_payload)]
    )

    service = _service(groq_max_input_chars=max_chars)
    result = service.summarize_transcript(long_transcript, note_id="note-1")

    assert route.call_count == expected_map_calls + 1  # N map calls + 1 reduce call
    assert result["summary"] == "Combined summary."


@respx.mock
def test_auth_failure_is_permanent():
    settings = get_settings()
    route = respx.post(settings.groq_api_url).mock(return_value=httpx.Response(401, text="bad key"))

    service = _service(groq_max_retries=3)
    with pytest.raises(PermanentServiceError):
        service.summarize_transcript("some transcript", note_id="note-1")

    assert route.call_count == 1


@respx.mock
def test_malformed_json_exhausts_retries_and_raises_transient():
    settings = get_settings()
    respx.post(settings.groq_api_url).mock(
        return_value=httpx.Response(200, json={"choices": [{"message": {"content": "not valid json"}}]})
    )

    service = _service(groq_max_retries=2)
    with pytest.raises(TransientServiceError):
        service.summarize_transcript("some transcript", note_id="note-1")


def test_missing_api_key_raises_permanent_error_without_network_call():
    service = _service(groq_api_key="")
    with pytest.raises(PermanentServiceError):
        service.summarize_transcript("some transcript", note_id="note-1")
