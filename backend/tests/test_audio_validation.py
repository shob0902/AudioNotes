# Tests for the upload validation rules in app.utils.audio.
import pytest
from app.utils.audio import validate_and_probe_audio
from app.utils.exceptions import ValidationError
from tests.conftest import make_wav_bytes
MAX_SIZE = 200 * 1024 * 1024
MIN_DURATION = 120
# A zero-byte upload should be refused.
def test_rejects_empty_file():
    with pytest.raises(ValidationError, match="empty"):
        validate_and_probe_audio(b"", "audio.wav", max_size_bytes=MAX_SIZE, min_duration_seconds=MIN_DURATION)
# A file over the size limit should be refused.
def test_rejects_oversized_file():
    with pytest.raises(ValidationError, match="too large"):
        validate_and_probe_audio(
            make_wav_bytes(), "audio.wav", max_size_bytes=10, min_duration_seconds=MIN_DURATION
        )
# A file whose extension isn't on the allow-list should be refused.
def test_rejects_unsupported_extension():
    with pytest.raises(ValidationError, match="Unsupported"):
        validate_and_probe_audio(
            make_wav_bytes(), "audio.txt", max_size_bytes=MAX_SIZE, min_duration_seconds=MIN_DURATION
        )
# Bytes that ffmpeg cannot decode should be refused even when the extension looks fine.
def test_rejects_corrupt_audio():
    with pytest.raises(ValidationError) as exc_info:
        validate_and_probe_audio(
            b"this is not audio data at all",
            "audio.mp3",
            max_size_bytes=MAX_SIZE,
            min_duration_seconds=MIN_DURATION,
        )
    assert "corrupt" in exc_info.value.user_message or "processed" in exc_info.value.user_message
# A valid but short clip is accepted and simply flagged as shorter than recommended.
def test_accepts_valid_short_wav_but_flags_it_as_short():
    metadata = validate_and_probe_audio(
        make_wav_bytes(duration_seconds=1.0),
        "audio.wav",
        max_size_bytes=MAX_SIZE,
        min_duration_seconds=MIN_DURATION,
    )
    assert metadata.duration_seconds == pytest.approx(1.0, abs=0.1)
    assert metadata.is_shorter_than_recommended is True
    assert metadata.content_type == "audio/wav"
# Audio at or over the recommended length is not flagged as short.
def test_does_not_flag_audio_at_or_above_minimum_duration():
    metadata = validate_and_probe_audio(
        make_wav_bytes(duration_seconds=125.0),
        "audio.wav",
        max_size_bytes=MAX_SIZE,
        min_duration_seconds=MIN_DURATION,
    )
    assert metadata.is_shorter_than_recommended is False
