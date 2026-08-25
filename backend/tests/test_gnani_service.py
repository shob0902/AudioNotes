import httpx
import pytest
import respx

from app.config import get_settings
from app.services.gnani_service import GnaniService
from app.utils.exceptions import PermanentServiceError, TransientServiceError
from tests.conftest import make_wav_bytes


def _service(**overrides):
    settings = get_settings().model_copy(update=overrides)
    return GnaniService(settings=settings)


@respx.mock
def test_transcribe_audio_single_chunk_success():
    settings = get_settings()
    respx.post(settings.gnani_api_url).mock(
        return_value=httpx.Response(
            200, json={"success": True, "request_id": "r1", "timestamp": "t", "transcript": "hello world"}
        )
    )

    service = _service(gnani_chunk_seconds=60)
    result = service.transcribe_audio(make_wav_bytes(duration_seconds=2.0), note_id="note-1", extension="wav")

    assert result == "hello world"


@respx.mock
def test_transcribe_audio_splits_long_audio_into_multiple_calls():
    settings = get_settings()
    route = respx.post(settings.gnani_api_url).mock(
        side_effect=[
            httpx.Response(200, json={"success": True, "request_id": "r1", "timestamp": "t", "transcript": "part one"}),
            httpx.Response(200, json={"success": True, "request_id": "r2", "timestamp": "t", "transcript": "part two"}),
        ]
    )

    # 1-second chunks over a 2-second file => two sequential Gnani calls.
    service = _service(gnani_chunk_seconds=1)
    result = service.transcribe_audio(make_wav_bytes(duration_seconds=2.0), note_id="note-1", extension="wav")

    assert route.call_count == 2
    assert result == "part one part two"


@respx.mock
def test_auth_failure_is_permanent_and_not_retried():
    settings = get_settings()
    route = respx.post(settings.gnani_api_url).mock(return_value=httpx.Response(401, text="invalid key"))

    service = _service(gnani_chunk_seconds=60, gnani_max_retries=3)
    with pytest.raises(PermanentServiceError):
        service.transcribe_audio(make_wav_bytes(duration_seconds=1.0), note_id="note-1", extension="wav")

    assert route.call_count == 1  # no retries for auth errors


@respx.mock
def test_rate_limit_retries_then_succeeds():
    settings = get_settings()
    respx.post(settings.gnani_api_url).mock(
        side_effect=[
            httpx.Response(429, text="rate limited"),
            httpx.Response(
                200, json={"success": True, "request_id": "r2", "timestamp": "t", "transcript": "recovered"}
            ),
        ]
    )

    service = _service(gnani_chunk_seconds=60, gnani_max_retries=3)
    result = service.transcribe_audio(make_wav_bytes(duration_seconds=1.0), note_id="note-1", extension="wav")

    assert result == "recovered"


@respx.mock
def test_persistent_server_error_exhausts_retries_and_raises_transient():
    settings = get_settings()
    respx.post(settings.gnani_api_url).mock(return_value=httpx.Response(503, text="unavailable"))

    service = _service(gnani_chunk_seconds=60, gnani_max_retries=2)
    with pytest.raises(TransientServiceError):
        service.transcribe_audio(make_wav_bytes(duration_seconds=1.0), note_id="note-1", extension="wav")


def test_missing_api_key_raises_permanent_error_without_network_call():
    service = _service(gnani_api_key="")
    with pytest.raises(PermanentServiceError):
        service.transcribe_audio(make_wav_bytes(duration_seconds=1.0), note_id="note-1", extension="wav")
