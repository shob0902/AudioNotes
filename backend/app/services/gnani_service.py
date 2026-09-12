# Wrapper around Gnani's Speech-to-Text API, the only file that makes those HTTP calls.
import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)
from app.config import Settings, get_settings
from app.utils.audio import split_audio_into_chunks
from app.utils.exceptions import PermanentServiceError, TransientServiceError
from app.utils.logging import get_logger
logger = get_logger(__name__)
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
class GnaniService:
    # Keeps the settings this service needs, falling back to the shared app settings.
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
    # Chunks the audio, transcribes each chunk in order and joins the pieces into one transcript.
    def transcribe_audio(self, file_bytes: bytes, note_id: str, extension: str | None = None) -> str:
        if not self.settings.gnani_api_key:
            raise PermanentServiceError(
                "Speech-to-text is not configured on the server.",
                technical_detail="GNANI_API_KEY is not set",
            )
        chunks = split_audio_into_chunks(file_bytes, self.settings.gnani_chunk_seconds, format_hint=extension)
        logger.info(
            "gnani.chunking_complete",
            extra={"note_id": note_id, "chunk_count": len(chunks)},
        )
        transcripts = []
        with httpx.Client(timeout=self.settings.gnani_timeout_seconds) as client:
            for index, chunk_bytes in enumerate(chunks):
                logger.info(
                    "gnani.chunk_start",
                    extra={"note_id": note_id, "chunk_index": index, "chunk_total": len(chunks)},
                )
                transcript = self._transcribe_chunk_with_retry(client, chunk_bytes, note_id, index)
                transcripts.append(transcript.strip())
        combined = " ".join(t for t in transcripts if t)
        if not combined:
            raise PermanentServiceError(
                "Transcription produced no text. The audio may be silent or unintelligible."
            )
        return combined
    # Retries a single chunk with exponential backoff, but only for transient failures.
    def _transcribe_chunk_with_retry(self, client: httpx.Client, chunk_bytes: bytes, note_id: str, index: int) -> str:
        retrying = retry(
            reraise=True,
            stop=stop_after_attempt(self.settings.gnani_max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=15),
            retry=retry_if_exception_type(TransientServiceError),
        )
        return retrying(self._transcribe_chunk)(client, chunk_bytes, note_id, index)
    # Posts one audio chunk to Gnani and turns connection problems into transient errors.
    def _transcribe_chunk(self, client: httpx.Client, chunk_bytes: bytes, note_id: str, index: int) -> str:
        headers = {"X-API-Key-ID": self.settings.gnani_api_key}
        data = {
            "language_code": self.settings.gnani_language_code,
            "format": self.settings.gnani_transcript_format,
            "itn_native_numerals": "false",
        }
        files = {"audio_file": (f"chunk_{index}.wav", chunk_bytes, "audio/wav")}
        try:
            response = client.post(self.settings.gnani_api_url, headers=headers, data=data, files=files)
        except httpx.TimeoutException as exc:
            raise TransientServiceError(
                "Transcription timed out. Please try again.",
                technical_detail=f"Gnani request timeout on chunk {index} for note {note_id}: {exc}",
            ) from exc
        except httpx.HTTPError as exc:
            raise TransientServiceError(
                "Could not reach the transcription service. Please try again.",
                technical_detail=f"Gnani connection error on chunk {index} for note {note_id}: {exc}",
            ) from exc
        return self._parse_response(response, note_id, index)
    # Reads the transcript out of a Gnani reply and maps each status code to the right error type.
    def _parse_response(self, response: httpx.Response, note_id: str, index: int) -> str:
        status = response.status_code
        if status == 200:
            try:
                payload = response.json()
            except ValueError as exc:
                raise TransientServiceError(
                    "Received an unreadable response from the transcription service.",
                    technical_detail=f"Non-JSON 200 response from Gnani on chunk {index}: {exc}",
                ) from exc
            if not payload.get("success"):
                raise PermanentServiceError(
                    "Transcription failed for part of the audio.",
                    technical_detail=f"Gnani success=false on chunk {index} for note {note_id}: {payload}",
                )
            transcript = payload.get("transcript")
            if transcript is None:
                raise TransientServiceError(
                    "Received an incomplete response from the transcription service.",
                    technical_detail=f"Gnani response missing 'transcript' field on chunk {index}: {payload}",
                )
            return transcript
        if status in (401, 403):
            raise PermanentServiceError(
                "Transcription service authentication failed. Please contact support.",
                technical_detail=f"Gnani auth error {status} on chunk {index}: {response.text[:500]}",
            )
        if status == 400:
            raise PermanentServiceError(
                "The transcription service rejected this audio as invalid or unsupported.",
                technical_detail=f"Gnani 400 on chunk {index} for note {note_id}: {response.text[:500]}",
            )
        if status in _RETRYABLE_STATUS_CODES:
            raise TransientServiceError(
                "The transcription service is temporarily unavailable. Retrying...",
                technical_detail=f"Gnani {status} on chunk {index} for note {note_id}: {response.text[:500]}",
            )
        raise PermanentServiceError(
            "The transcription service returned an unexpected error.",
            technical_detail=f"Gnani unexpected status {status} on chunk {index}: {response.text[:500]}",
        )
