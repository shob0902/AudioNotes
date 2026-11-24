# audionotes-mcp

An [MCP](https://modelcontextprotocol.io) server for the Audio Notes platform. It lets Claude Code (or any MCP client) work with your notes: list and read them, upload recordings, summarize text you already have, retry failed notes and delete old ones.

It's a thin client over the Audio Notes REST API and runs on your own machine over stdio. Nothing about your account is stored except the API key you give it.

## Setup

You need [uv](https://docs.astral.sh/uv/) and an Audio Notes account.

1. Sign in to Audio Notes, open **Settings → API keys**, and create a key. Copy it straight away: it's only shown once.
2. Add the server to Claude Code. The settings page shows this command with your values filled in:

   ```bash
   claude mcp add audionotes --scope user \
     -e AUDIONOTES_API_URL=https://<your-backend> \
     -e AUDIONOTES_API_KEY=an_... \
     -- uvx --from git+https://github.com/shob0902/AudioNotes#subdirectory=mcp-server audionotes-mcp
   ```
3. Restart Claude Code and run `/mcp`. `audionotes` should be listed as connected.

Try asking:

- *"List my audio notes."*
- *"Upload ~/Downloads/standup.mp3 and give me the action items."*
- *"Save this meeting transcript as a note and summarize it: …"*
- *"Which of my notes failed? Retry them."*

### Configuration

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `AUDIONOTES_API_KEY` | yes | | A personal API key (`an_…`) from Settings → API keys. |
| `AUDIONOTES_API_URL` | no | `http://localhost:8000` | The backend's origin, without `/api`. |

To revoke access, delete the key in Settings. The server gets an "invalid or expired key" error from the next call on.

## Tools

| Tool | What it does |
|---|---|
| `whoami` | Shows which account the key belongs to. Useful for checking the setup. |
| `list_notes` | Lists notes, newest first, with id, title, status, duration and date. Paged with `limit`/`offset`. |
| `get_note` | Shows a note's summary, key points, action items, decisions and topics. The transcript is left out unless `include_transcript=true`, because it can be very long. |
| `wait_for_note` | Waits for a processing note to finish, then returns its summary. |
| `upload_audio` | Uploads a local file (MP3, WAV, M4A, AAC, OGG, FLAC, WEBM, MP4; at least 2 minutes, at most 200 MB). By default waits for the summary. |
| `create_note_from_text` | Saves text you already have as a note and summarizes it. No audio needed. |
| `retry_note` | Re-runs processing for a failed note. |
| `delete_note` | Permanently deletes a note and its audio. Marked destructive, so clients ask before running it. |

## Local development

```bash
cd mcp-server
uv sync
```

Run the backend locally, create a key in the local frontend's Settings page, then try the tools in the MCP Inspector:

```bash
AUDIONOTES_API_URL=http://localhost:8000 AUDIONOTES_API_KEY=an_... \
  npx @modelcontextprotocol/inspector uv run audionotes-mcp
```

(PowerShell: `$env:AUDIONOTES_API_URL="http://localhost:8000"; $env:AUDIONOTES_API_KEY="an_..."; npx @modelcontextprotocol/inspector uv run audionotes-mcp`)

To point Claude Code at your working copy instead of the GitHub version:

```bash
claude mcp add audionotes-dev -e AUDIONOTES_API_URL=http://localhost:8000 -e AUDIONOTES_API_KEY=an_... \
  -- uv run --directory /path/to/mcp-server audionotes-mcp
```

### Layout

```
src/audionotes_mcp/
  client.py   async httpx wrapper around the REST API; every failure becomes a readable ToolError
  server.py   the MCP server and its tools (output is compact markdown, not raw JSON)
```

Notes for contributors:

- This is a stdio server, so never `print()`: stdout is the protocol channel. Log to stderr.
- Raise `ToolError` for anything Claude should see. Any other exception reaches the client only as a generic "Error executing tool".
- It uses the MCP Python SDK v2, where the server class is `MCPServer` (`from mcp.server.mcpserver import MCPServer`), not v1's `FastMCP`.
