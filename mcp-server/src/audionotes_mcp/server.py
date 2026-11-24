# MCP server exposing the AudioNotes platform as tools. Runs over stdio:
# never print() here, stdout is the protocol channel.
import asyncio
import uuid
from pathlib import Path

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations

from .client import AudioNotesClient

mcp = MCPServer(
    name="audionotes",
    instructions=(
        "Tools for the user's AudioNotes account: audio recordings that are transcribed "
        "and summarized into key points, action items, decisions and topics."
    ),
)

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm", ".mp4"}
FINISHED_STATUSES = {"completed", "failed"}
POLL_INTERVAL_SECONDS = 3

_client: AudioNotesClient | None = None


# Creates the API client on first use, so a missing key shows up as a tool error
# instead of crashing the server at startup.
def get_client() -> AudioNotesClient:
    global _client
    if _client is None:
        _client = AudioNotesClient()
    return _client


def _format_duration(seconds: float | None) -> str:
    if not seconds:
        return "-"
    minutes, secs = divmod(int(seconds), 60)
    return f"{minutes}:{secs:02d}"


# Rejects anything that isn't a UUID before it reaches the API, with a hint on where ids come from.
def _check_note_id(note_id: str) -> str:
    try:
        return str(uuid.UUID(note_id.strip()))
    except ValueError:
        raise ToolError(f"'{note_id}' is not a valid note id. Use list_notes to find note ids.") from None


def _bullets(heading: str, items: list[str]) -> list[str]:
    if not items:
        return []
    return ["", f"**{heading}**", *[f"- {item}" for item in items]]


# Renders a full note as markdown. The transcript is left out unless asked for, since it can be very long.
def _format_note(note: dict, include_transcript: bool = False) -> str:
    lines = [
        f"# {note['title']}",
        f"id: `{note['id']}` | status: {note['status']} | duration: {_format_duration(note['duration'])} "
        f"| created: {note['created_at'][:10]}",
    ]

    if note["status"] == "failed":
        reason = note.get("error_message") or "Unknown error."
        lines += ["", f"**Processing failed:** {reason} Use retry_note to try again."]

    summary = note.get("summary")
    if summary:
        lines += ["", "**Summary**", summary["summary"]]
        lines += _bullets("Key points", summary.get("key_points", []))
        lines += _bullets("Action items", summary.get("action_items", []))
        lines += _bullets("Decisions", summary.get("decisions", []))
        if summary.get("topics"):
            lines += ["", f"**Topics:** {', '.join(summary['topics'])}"]
    elif note["status"] not in FINISHED_STATUSES:
        lines += ["", "Still processing. Use wait_for_note to wait for the summary."]

    transcript = note.get("transcript")
    if transcript and include_transcript:
        lines += ["", "**Transcript**", transcript]
    elif transcript:
        lines += ["", f"(Transcript has {len(transcript):,} characters. Call get_note with include_transcript=true to read it.)"]
    return "\n".join(lines)


# Polls the cheap status endpoint until the note finishes, then fetches it in full.
# Returns None if it is still running when the timeout is reached.
async def _wait_until_finished(note_id: str, timeout_seconds: int) -> dict | None:
    client = get_client()
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout_seconds
    while True:
        status = await client.get_status(note_id)
        if status["status"] in FINISHED_STATUSES:
            return await client.get_note(note_id)
        if loop.time() >= deadline:
            return None
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


# Shared ending for tools that queue processing: either return right away or wait for the result.
async def _queued_result(note_id: str, wait: bool, timeout_seconds: int) -> str:
    if not wait:
        return f"Queued note `{note_id}`. Use wait_for_note or get_note to check on it."
    note = await _wait_until_finished(note_id, timeout_seconds)
    if note is None:
        return f"Note `{note_id}` is still processing after {timeout_seconds}s. Call wait_for_note to keep waiting."
    return _format_note(note)


@mcp.tool(annotations=ToolAnnotations(read_only_hint=True))
async def whoami() -> str:
    """Show which AudioNotes account this server is signed in as. Use it to check the connection works."""
    user = await get_client().me()
    name = user.get("name") or "(no name)"
    return f"Signed in as {name} <{user['email']}>"


@mcp.tool(annotations=ToolAnnotations(read_only_hint=True))
async def list_notes(limit: int = 20, offset: int = 0) -> str:
    """List the user's audio notes, newest first, with each note's id, title, status, duration and date.

    Use the returned id with other tools to read a note. Page through results with offset.
    """
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    data = await get_client().list_notes(limit=limit, offset=offset)
    items = data["items"]
    if not items:
        return "No notes found."

    lines = [f"Showing {offset + 1}-{offset + len(items)} of {data['total']} notes:", ""]
    for note in items:
        lines.append(
            f"- **{note['title']}** - {note['status']}, {_format_duration(note['duration'])}, "
            f"{note['created_at'][:10]} (id: `{note['id']}`)"
        )
    return "\n".join(lines)


@mcp.tool(annotations=ToolAnnotations(read_only_hint=True))
async def get_note(note_id: str, include_transcript: bool = False) -> str:
    """Read one note: its summary, key points, action items, decisions and topics.

    Set include_transcript=true only when the full transcript is needed, because it can be very long.
    """
    note = await get_client().get_note(_check_note_id(note_id))
    return _format_note(note, include_transcript)


@mcp.tool(annotations=ToolAnnotations(read_only_hint=True))
async def wait_for_note(note_id: str, timeout_seconds: int = 300) -> str:
    """Wait for a note that is still processing to finish, then return its summary.

    Processing usually takes one to a few minutes depending on the recording length.
    """
    note_id = _check_note_id(note_id)
    timeout_seconds = max(10, min(timeout_seconds, 900))
    note = await _wait_until_finished(note_id, timeout_seconds)
    if note is None:
        return f"Note `{note_id}` is still processing after {timeout_seconds}s. Call wait_for_note again to keep waiting."
    return _format_note(note)


@mcp.tool()
async def upload_audio(file_path: str, wait: bool = True, timeout_seconds: int = 300) -> str:
    """Upload a local audio file to AudioNotes to be transcribed and summarized.

    file_path must be a path on this computer. Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC, WEBM, MP4.
    Recordings must be at least 2 minutes long and at most 200 MB.
    With wait=true (default) it waits for processing to finish and returns the summary.
    """
    path = Path(file_path).expanduser()
    if not path.is_file():
        raise ToolError(f"No file found at '{path}'.")
    if path.suffix.lower() not in ALLOWED_AUDIO_EXTENSIONS:
        allowed = ", ".join(sorted(ext[1:].upper() for ext in ALLOWED_AUDIO_EXTENSIONS))
        raise ToolError(f"'{path.suffix}' files aren't supported. Use one of: {allowed}.")

    created = await get_client().upload_audio(path)
    return await _queued_result(created["id"], wait, max(10, min(timeout_seconds, 900)))


@mcp.tool()
async def create_note_from_text(transcript: str, title: str | None = None, wait: bool = True) -> str:
    """Save text that is already transcribed (e.g. a meeting transcript) as a note and summarize it.

    Use this instead of upload_audio when there is no audio file, only text.
    """
    created = await get_client().create_text_note(transcript, title)
    return await _queued_result(created["id"], wait, 300)


@mcp.tool(annotations=ToolAnnotations(idempotent_hint=True))
async def retry_note(note_id: str, wait: bool = False) -> str:
    """Re-run processing for a note whose status is 'failed'. Only failed notes can be retried."""
    created = await get_client().retry_note(_check_note_id(note_id))
    return await _queued_result(created["id"], wait, 300)


@mcp.tool(annotations=ToolAnnotations(destructive_hint=True))
async def delete_note(note_id: str) -> str:
    """Permanently delete a note and its stored audio. This cannot be undone, so confirm with the user first."""
    note_id = _check_note_id(note_id)
    await get_client().delete_note(note_id)
    return f"Deleted note `{note_id}`."


def main() -> None:
    mcp.run()
