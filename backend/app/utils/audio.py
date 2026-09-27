# Audio decoding, upload validation and chunking helpers, all backed by ffmpeg via pydub.
import io
from dataclasses import dataclass
from typing import List, Optional
import pydub.utils
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
from app.config import get_settings
from app.utils.exceptions import ValidationError
_settings = get_settings()
if _settings.ffmpeg_path:
    AudioSegment.converter = _settings.ffmpeg_path
if _settings.ffprobe_path:
    pydub.utils.get_prober_name = lambda: _settings.ffprobe_path
ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "aac", "ogg", "flac", "webm", "mp4"}
EXTENSION_CONTENT_TYPES = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
    "flac": "audio/flac",
    "webm": "audio/webm",
    "mp4": "audio/mp4",
}
# What we learn about an upload once ffmpeg has actually decoded it.
@dataclass
class AudioMetadata:
    duration_seconds: float
    content_type: str
    extension: str
    is_shorter_than_recommended: bool
# Strips path separators and unprintable characters out of a client-supplied filename.
def sanitize_filename(filename: str) -> str:
    name = filename.replace("\\", "/").split("/")[-1].strip()
    name = "".join(ch for ch in name if ch.isprintable())
    return name[:255] or "audio"
# Returns the lowercase file extension, or an empty string when there isn't one.
def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()
# Decodes raw bytes into an AudioSegment, trying the extension hint first and autodetect after.
def _decode_audio(file_bytes: bytes, format_hint: Optional[str] = None) -> AudioSegment:
    attempts = [format_hint, None] if format_hint else [None]
    last_error: Exception | None = None
    for fmt in attempts:
        try:
            return AudioSegment.from_file(io.BytesIO(file_bytes), format=fmt)
        except CouldntDecodeError as exc:
            last_error = exc
        except Exception as exc:
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
# Runs every upload check and returns the real duration that ffmpeg reports.
def validate_and_probe_audio(
    file_bytes: bytes,
    filename: str,
    *,
    max_size_bytes: int,
    min_duration_seconds: int,
) -> AudioMetadata:
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
# Cuts the audio into ordered WAV chunks small enough for a single Gnani request.
def split_audio_into_chunks(
    file_bytes: bytes, chunk_seconds: int, format_hint: Optional[str] = None
) -> List[bytes]:
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
