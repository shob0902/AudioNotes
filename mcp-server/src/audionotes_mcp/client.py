# Thin async wrapper around the AudioNotes REST API. Every error becomes a ToolError
# so Claude sees a readable message instead of a stack trace.
import mimetypes
import os
from pathlib import Path
from typing import Any

import httpx
from mcp.server.mcpserver.exceptions import ToolError

DEFAULT_API_URL = "http://localhost:8000"
UPLOAD_TIMEOUT = httpx.Timeout(600.0, connect=10.0)


class AudioNotesClient:
    def __init__(self) -> None:
        api_url = os.environ.get("AUDIONOTES_API_URL", DEFAULT_API_URL).rstrip("/")
        api_key = os.environ.get("AUDIONOTES_API_KEY", "").strip()
        if not api_key:
            raise ToolError("AUDIONOTES_API_KEY is not set. Add it to the MCP server's environment.")
        self._http = httpx.AsyncClient(
            base_url=f"{api_url}/api",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=httpx.Timeout(60.0, connect=10.0),
        )

    # Sends one request and returns the parsed JSON, or raises ToolError with the API's own message.
    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = await self._http.request(method, path, **kwargs)
        except httpx.TimeoutException as exc:
            raise ToolError("The AudioNotes API took too long to respond. Try again.") from exc
        except httpx.HTTPError as exc:
            raise ToolError(f"Could not reach the AudioNotes API: {exc}") from exc

        if response.status_code == 401:
            raise ToolError("Your AudioNotes API key is invalid or expired. Create a new one and update the config.")
        if response.status_code >= 400:
            try:
                detail = response.json().get("detail")
            except ValueError:
                detail = None
            raise ToolError(str(detail or f"AudioNotes API returned HTTP {response.status_code}."))
        if response.status_code == 204:
            return None
        return response.json()

    async def me(self) -> dict:
        return await self._request("GET", "/auth/me")

    async def list_notes(self, limit: int = 20, offset: int = 0) -> dict:
        return await self._request("GET", "/notes", params={"limit": limit, "offset": offset})

    async def get_note(self, note_id: str) -> dict:
        return await self._request("GET", f"/notes/{note_id}")

    async def get_status(self, note_id: str) -> dict:
        return await self._request("GET", f"/notes/{note_id}/status")

    # Uploads a local audio file as multipart form data, the same way the web app does.
    async def upload_audio(self, file_path: Path) -> dict:
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        file_bytes = file_path.read_bytes()
        return await self._request(
            "POST",
            "/notes",
            files={"file": (file_path.name, file_bytes, content_type)},
            timeout=UPLOAD_TIMEOUT,
        )

    # Creates a note from text that is already transcribed; only the summary step runs.
    async def create_text_note(self, transcript: str, title: str | None = None) -> dict:
        form = {"transcript": transcript}
        if title:
            form["title"] = title
        return await self._request("POST", "/notes/live", data=form)

    async def retry_note(self, note_id: str) -> dict:
        return await self._request("POST", f"/notes/{note_id}/retry")

    async def delete_note(self, note_id: str) -> None:
        await self._request("DELETE", f"/notes/{note_id}")
