"""
Audio decoding, validation, and chunking helpers.

Extension and client-supplied Content-Type are only ever used as *decoding
hints* — the file is never trusted based on those alone. The authoritative
check is actually decoding it with ffmpeg (via pydub) and reading real
duration, which also catches truncated/corrupt files that merely *look*
valid.

Requires the `ffmpeg` binary to be installed on the host / present in the
Docker image (see backend/Dockerfile).
"""

import io
from dataclasses import dataclass
from typing import List, Optional

import pydub.utils
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError

from app.config import get_settings
from app.utils.exceptions import ValidationError

# Pin pydub to specific ffmpeg/ffprobe binaries when configured, instead of
# leaving it to resolve `ffmpeg`/`ffprobe` off PATH — see FFMPEG_PATH /
# FFPROBE_PATH in config.py for why. Done once at import time, before any
# decoding happens.
#
# `AudioSegment.converter` is a real pydub setting (read directly by
# from_file/export) and covers the actual decode/encode step. Probing
# (reading duration/codec via ffprobe, used internally by from_file) is
# NOT controlled by any AudioSegment attribute — pydub always resolves it
# itself via get_prober_name(), which does its own independent `which()`
# lookup on PATH. The only way to pin that is to monkeypatch the function.
_settings = get_settings()
if _settings.ffmpeg_path:
    AudioSegment.converter = _settings.ffmpeg_path
if _settings.ffprobe_path:
    pydub.utils.get_prober_name = lambda: _settings.ffprobe_path

ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "aac", "ogg", "flac"}

# Used only to set a sensible Content-Type on the stored object — never used
# to decide whether a file is valid audio.
EXTENSION_CONTENT_TYPES = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
    "flac": "audio/flac",
}


@dataclass
class AudioMetadata:
    duration_seconds: float
    content_type: str
    extension: str
    is_shorter_than_recommended: bool


def sanitize_filename(filename: str) -> str:
    """Strips path separators and control characters so a client-supplied
    filename can never be used to escape its intended directory or storage
    prefix. This is defense-in-depth — storage keys are always generated
    server-side (see StorageService.build_storage_key), never derived
    directly from client input."""
    name = filename.replace("\\", "/").split("/")[-1].strip()
    name = "".join(ch for ch in name if ch.isprintable())
    return name[:255] or "audio"


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def _decode_audio(file_bytes: bytes, format_hint: Optional[str] = None) -> AudioSegment:
    """Decodes raw audio bytes into an AudioSegment, raising ValidationError
    with a user-safe message if that's not possible.

    `format_hint` (typically the file's extension) is tried first because
    ffmpeg's container autodetection is noticeably less reliable on a bare
    byte stream (no filename, no stdin) than when told what to expect. A
    wrong or missing hint falls back to plain autodetection before the file
    is rejected — either way, the file only passes if ffmpeg can actually
    decode real audio out of it, so a mislabeled extension is never trusted
    on its own.
    """
    attempts = [format_hint, None] if format_hint else [None]
    last_error: Exception | None = None

    for fmt in attempts:
        try:
            return AudioSegment.from_file(io.BytesIO(file_bytes), format=fmt)
        except CouldntDecodeError as exc:
            last_error = exc
        except Exception as exc:  # ffmpeg missing, unexpected container, etc.
            last_error = exc

    if isinstance(last_error, CouldntDecodeError):
        raise ValidationError(
            "The audio file appears to be corrupt or unreadable.",
            technical_detail=str(last_error),
        ) from last_error
    raise ValidationError(
        "The audio file could not be processed. It may be corrupt or in an unsupported format.",
        technical_detail=str(last_error),
    ) from last_error


def validate_and_probe_audio(
    file_bytes: bytes,
    filename: str,
    *,
    max_size_bytes: int,
    min_duration_seconds: int,
) -> AudioMetadata:
    """Runs all upload validation and returns the real, ffmpeg-derived
    duration. Raises ValidationError (safe to show to the user) on any
    problem."""

    if len(file_bytes) == 0:
        raise ValidationError("The uploaded file is empty.")

    if len(file_bytes) > max_size_bytes:
        max_mb = max_size_bytes // (1024 * 1024)
        raise ValidationError(f"The file is too large. Maximum allowed size is {max_mb} MB.")

    extension = get_extension(filename)
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ext.upper() for ext in ALLOWED_EXTENSIONS))
        raise ValidationError(f"Unsupported file format. Supported formats: {allowed}.")

    audio = _decode_audio(file_bytes, format_hint=extension)

    duration_seconds = len(audio) / 1000.0
    if duration_seconds <= 0:
        raise ValidationError("The audio file has no audible content.")

    return AudioMetadata(
        duration_seconds=duration_seconds,
        content_type=EXTENSION_CONTENT_TYPES.get(extension, "application/octet-stream"),
        extension=extension,
        is_shorter_than_recommended=duration_seconds < min_duration_seconds,
    )


def split_audio_into_chunks(
    file_bytes: bytes, chunk_seconds: int, format_hint: Optional[str] = None
) -> List[bytes]:
    """Splits audio into sequential, non-overlapping WAV-encoded chunks of at
    most `chunk_seconds` each, preserving chronological order.

    Chunks are always re-encoded to WAV regardless of the source format
    (MP3/M4A/AAC/OGG/FLAC) because Gnani's API accepts WAV directly and it
    avoids per-format container/codec quirks when re-exporting a slice with
    ffmpeg. This is necessary because Gnani's STT endpoint caps a single
    request at 60 seconds of audio (see /architecture for details) — files
    longer than that must be split before transcription.

    Note: this loads the full decoded waveform into memory, which is fine at
    the upload size limits enforced in this application (see
    MAX_UPLOAD_SIZE_MB) but would need a streaming approach for much larger
    files — documented as a future improvement.
    """
    audio = _decode_audio(file_bytes, format_hint=format_hint)
    chunk_ms = chunk_seconds * 1000
    total_ms = len(audio)

    chunks: List[bytes] = []
    for start_ms in range(0, total_ms, chunk_ms):
        segment = audio[start_ms : start_ms + chunk_ms]
        buffer = io.BytesIO()
        segment.export(buffer, format="wav")
        chunks.append(buffer.getvalue())

    if chunks:
        return chunks

    buffer = io.BytesIO()
    audio.export(buffer, format="wav")
    return [buffer.getvalue()]
