<div align="center">

# 🎙️ Audio Notes Platform

### Speak it. Upload it. Let AI turn it into a transcript and a structured summary.

<img src="https://img.shields.io/badge/Python-3.11+-0D9B8C?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
<img src="https://img.shields.io/badge/FastAPI-Async%20API-0D9B8C?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
<img src="https://img.shields.io/badge/React-Vite-0D9B8C?style=for-the-badge&logo=react&logoColor=white" alt="React" />
<img src="https://img.shields.io/badge/PostgreSQL-Database-0D9B8C?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
<img src="https://img.shields.io/badge/Groq-LLM%20Summaries-0D9B8C?style=for-the-badge" alt="Groq" />
<img src="https://img.shields.io/badge/Gnani-Speech--to--Text-0D9B8C?style=for-the-badge" alt="Gnani" />
<img src="https://img.shields.io/badge/Deploy-Render-0D9B8C?style=for-the-badge&logo=render&logoColor=white" alt="Render" />

Upload a recording (2+ minutes) → **[Gnani Speech-to-Text](https://gnani.ai/speech-to-text-api)** transcribes it, chunk by chunk → **[Groq](https://groq.com/)**'s LLM distills it into key points, action items, decisions, and topics. Every upload is saved and reopenable at any time.

**A live, diagrammed explanation of how the whole system works is built into the app itself → `/architecture`**

</div>

<br />

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#-architecture)
- [🧰 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [✅ Prerequisites](#-prerequisites)
- [🔑 Environment Variables](#-environment-variables)
- [⚡ Local Setup & Running](#-local-setup--running)
- [🧪 Testing](#-testing)
- [📡 API Endpoints](#-api-endpoints)
- [🛡️ Error Handling](#-error-handling)
- [🎧 Long Audio Handling](#-long-audio-handling)
- [☁️ Deployment](#-deployment)
- [⚠️ Known Limitations](#-known-limitations)
- [🔮 Future Improvements](#-future-improvements)

---

## ✨ Features

- 🔐 Sign in with Google (OAuth 2.0 / OpenID Connect, JWT bearer sessions) — each account only ever sees its own recordings
- 📤 Drag-and-drop audio upload (MP3, WAV, M4A, AAC, OGG, FLAC)
- ✅ Real validation: file size, format, empty files, and actual ffmpeg-decoded corruption checks — never trusts the file extension alone
- ⚡ Non-blocking upload: the HTTP request returns immediately; all transcription/summarization happens in a background task
- 📊 Live, status-based processing progress (no fake percentages) via polling
- 🧩 Chunked transcription to work around Gnani's per-request audio length cap, with independent per-chunk retries
- 🧠 Structured AI summary (summary, key points, action items, decisions, topics) with map-reduce summarization for long transcripts
- 🗂️ Full note history — reopen any past upload, see its transcript and summary, copy either to clipboard
- 💬 Clear, human-readable error messages for every failure mode, with a Retry button when retrying is safe
- 🔒 No secrets in the frontend bundle — only `VITE_`-prefixed variables ever reach the browser

---

## 🏗️ Architecture

See **`/architecture`** in the running app for the full write-up (diagram, sync vs. async boundaries, long-audio chunking strategy, failure handling, database design, deployment topology, future improvements).

Short version:

```
Browser (React) --upload--> FastAPI --validate/store/schedule--> responds immediately
                                 │                        │
                                 ▼                        ▼
                          Object Storage (audio bytes)   Background task
                          PostgreSQL (note metadata)     (same process, off the
                                                          request path)
                                                                 │
                                                     splits audio into <=60s chunks
                                                                 │
                                                                 ▼
                                            Gnani Speech-to-Text (per chunk, ordered, retried)
                                                                 │
                                                        combined transcript
                                                                 │
                                                                 ▼
                                                Groq LLM (structured summary,
                                                map-reduce if transcript is long)
                                                                 │
                                                                 ▼
                                                       PostgreSQL (final result)
```

> The upload endpoint only ever does fast, synchronous work (validate → store → create DB row → schedule). Transcription and summarization always happen in a FastAPI `BackgroundTasks` callback, off the request path — this is **required, not optional**, because Gnani caps a single request at ~60 seconds of audio, so any 2+ minute file needs multiple sequential API calls plus an LLM call, which can take well over what's safe to hold an HTTP connection open for. The background task runs in the same process as the API (no separate worker/queue) — the simplest shape that still keeps processing off the request path, and the one that fits entirely within free hosting tiers.

---

## 🧰 Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + CSS Modules + React Router (JavaScript) |
| Backend | Python + FastAPI + Uvicorn |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| Background processing | FastAPI `BackgroundTasks` (in-process, no separate worker/queue) |
| Speech-to-text | Gnani STT API |
| LLM summarization | Groq API |
| Object storage | Any S3-compatible provider (Cloudflare R2, Supabase Storage, MinIO, AWS S3) |
| Deployment target | Render |

---

## 📁 Project Structure

<details>
<summary><strong>Click to expand the full tree</strong></summary>

```
audio-notes/
├── frontend/                  React + Vite + CSS Modules app
│   ├── src/
│   │   ├── components/        UploadDropzone, NoteCard, StatusChecklist, SummaryView, ...
│   │   ├── pages/              Dashboard, NoteDetail, Architecture, NotFound
│   │   ├── services/api.js    The only file that calls the backend
│   │   ├── hooks/              useNoteStatusPolling
│   │   ├── utils/               format.js, status.js
│   │   └── types/note.js       JSDoc type definitions
│   └── Dockerfile              Dev-only container (Render deploys this as a static site)
│
├── backend/
│   ├── app/
│   │   ├── main.py             FastAPI app, CORS, global exception handlers
│   │   ├── config.py            All environment variables, one place
│   │   ├── database.py          SQLAlchemy engine/session
│   │   ├── models/note.py       Note ORM model + NoteStatus enum
│   │   ├── schemas/note.py      Pydantic request/response schemas
│   │   ├── routes/               notes.py, health.py
│   │   ├── services/             gnani_service.py, groq_service.py, storage_service.py
│   │   ├── workers/              tasks.py (the processing pipeline, run via BackgroundTasks)
│   │   └── utils/                 audio.py (validation/chunking), exceptions.py, logging.py
│   ├── alembic/                  Migrations
│   ├── tests/                    pytest suite (mocked Gnani/Groq, no real API keys needed)
│   ├── requirements.txt
│   └── Dockerfile                 Includes ffmpeg
│
├── docker-compose.yml           Postgres (+ optional backend/frontend)
├── render.yaml                  Optional Render Blueprint
├── .env.example
└── README.md
```

</details>

---

## ✅ Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop (for local Postgres, or run it natively)
- **ffmpeg** installed and on `PATH` — required for audio duration probing, corruption detection, and chunking (`pydub` shells out to it). The backend Docker image installs it automatically; for local (non-Docker) development, install it yourself:
  - Windows: `choco install ffmpeg` (or download a build and add it to `PATH`)
  - macOS: `brew install ffmpeg`
  - Linux: `apt-get install ffmpeg`
- A Gnani Speech-to-Text API key ([sign up](https://gnani.ai/speech-to-text-api))
- A Groq API key
- An S3-compatible object storage bucket (Cloudflare R2, Supabase Storage, etc.)

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` at the repo root and fill in real values. **Never commit `.env`.**

<details>
<summary><strong>Click to expand the full variable reference</strong></summary>

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+psycopg://...`). Render's free Postgres expires after 30 days — [Neon](https://neon.tech) or [Supabase](https://supabase.com) both offer a permanently-free Postgres tier and need no code changes, just this connection string |
| `JWT_SECRET_KEY` | Signs auth tokens. Required, no default. Generate with `openssl rand -hex 32` |
| `JWT_ALGORITHM` | JWT signing algorithm (default `HS256`) |
| `JWT_EXPIRES_MINUTES` | How long a login stays valid (default 10080 = 7 days) |
| `GNANI_API_KEY` | Your Gnani API key (sent as the `X-API-Key-ID` header) |
| `GNANI_API_URL` | Gnani STT endpoint (`https://api.vachana.ai/stt/v3`) |
| `GNANI_LANGUAGE_CODE` | BCP-47 language code Gnani expects, e.g. `en-IN` |
| `GNANI_TRANSCRIPT_FORMAT` | `verbatim` or `transcribe` (inverse-text-normalized) |
| `GNANI_CHUNK_SECONDS` | Max seconds of audio per Gnani request (Gnani caps this at 60) |
| `GNANI_TIMEOUT_SECONDS` / `GNANI_MAX_RETRIES` | HTTP timeout and retry budget for Gnani calls |
| `GROQ_API_KEY` | Your Groq API key |
| `GROQ_API_URL` | Groq chat completions endpoint |
| `GROQ_MODEL` | Groq model id, e.g. `openai/gpt-oss-120b` |
| `GROQ_TIMEOUT_SECONDS` / `GROQ_MAX_RETRIES` | HTTP timeout and retry budget for Groq calls |
| `GROQ_MAX_INPUT_CHARS` | Transcript length threshold before switching to map-reduce summarization |
| `STORAGE_ENDPOINT` | S3-compatible endpoint URL |
| `STORAGE_BUCKET` | Bucket name |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Storage credentials |
| `STORAGE_REGION` | Region (`auto` works for R2) |
| `STORAGE_USE_PATH_STYLE` | `true` for R2/MinIO |
| `STORAGE_PUBLIC_BASE_URL` | Optional: public CDN/base URL if your bucket serves files directly, instead of pre-signed URLs |
| `MAX_UPLOAD_SIZE_MB` | Hard upload size limit |
| `MIN_AUDIO_DURATION_SECONDS` | Recommended minimum duration (files under this are still accepted, just flagged) |
| `FRONTEND_URL` | Comma-separated list of allowed CORS origins |
| `BACKEND_URL` | The backend's own public URL (informational / used in a couple of messages) |
| `VITE_API_BASE_URL` | **Frontend-only.** Base URL the browser calls, e.g. `https://your-backend.onrender.com/api` |
| `VITE_GITHUB_REPO_URL` | **Frontend-only.** Shown as the GitHub link on `/architecture` |

Only variables prefixed `VITE_` are ever bundled into the frontend — every other variable stays server-side.

</details>

---

## ⚡ Local Setup & Running

```bash
git clone <your-repo-url> audio-notes
cd audio-notes
cp .env.example .env
# now edit .env with your real Gnani/Groq/storage credentials
```

**Database**

```bash
docker compose up -d postgres
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
```

<details>
<summary>Other useful Alembic commands</summary>

```bash
# create a new migration after changing a model
alembic revision --autogenerate -m "describe the change"

# roll back one migration
alembic downgrade -1

# roll back everything
alembic downgrade base
```

</details>

**Backend** (terminal 1)

```bash
cd backend
uvicorn app.main:app --reload
# API:  http://localhost:8000
# Docs: http://localhost:8000/docs  (Swagger)  and /redoc (ReDoc)
```

**Frontend** (terminal 2)

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## 🧪 Testing

Backend (mocked Gnani/Groq — no real API keys required; the model/route tests need the local Postgres from docker-compose since `Note` uses Postgres-specific types):

```bash
cd backend
docker compose up -d postgres   # if not already running (run from repo root)
pytest
```

Frontend:

```bash
cd frontend
npm test
```

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/google/url?state=…` | Google consent-screen URL for the browser to redirect to. |
| `POST` | `/api/auth/google` | Swap Google's one-time `code` for a bearer token (creates the account on first sign-in). |
| `GET` | `/api/auth/me` | The logged-in user — used to restore a session. Requires auth. |
| `POST` | `/api/notes` | Upload audio. Returns `202 { id, status: "queued" }` immediately. Requires auth. |
| `GET` | `/api/notes` | List the current user's notes, newest first. Requires auth. |
| `GET` | `/api/notes/{id}` | Full note detail (transcript + summary). Requires auth; 404 for another user's note. |
| `GET` | `/api/notes/{id}/status` | Lightweight status, for polling every 2-3s. Requires auth. |
| `POST` | `/api/notes/{id}/retry` | Re-queue a failed note. Requires auth. |
| `DELETE` | `/api/notes/{id}` | Delete a note and its stored audio. Requires auth. |
| `GET` | `/api/health` | Liveness check. |
| `GET` | `/api/ready` | Readiness check (verifies Postgres connectivity). |

All `/api/notes*` routes require an `Authorization: Bearer <token>` header from `/api/auth/google`.

Interactive docs: `GET /docs` (Swagger UI) and `GET /redoc`.

---

## 🛡️ Error Handling

Every failure mode is caught and translated into a short, human-readable message — never a raw stack trace, internal URL, or secret:

- **Upload errors** (unsupported format, oversized, empty, corrupt/unreadable audio) → `422` with a clear message, before anything is stored.
- **Gnani / Groq errors** — timeouts, auth failures, rate limits, server errors, and malformed responses are each classified as either transient (retried with exponential backoff, capped) or permanent (never retried). Whatever survives always resolves the note to `completed` or `failed` — it's never left stuck mid-pipeline.
- **Storage / database errors** are logged with full technical detail server-side and surfaced to the user as a generic, safe message.

Failed notes show their `error_message` on the note detail page along with a **Retry** button that re-queues the whole note.

---

## 🎧 Long Audio Handling

Gnani's documented API caps a single request at **60 seconds of audio** (ideally ≤30s). Since this app targets 2+ minute recordings, the background task always:

1. Decodes the full upload with ffmpeg.
2. Splits it into sequential `GNANI_CHUNK_SECONDS`-long WAV chunks (default 30s), preserving order.
3. Transcribes each chunk against Gnani, in order, retrying only that chunk on a transient failure.
4. Concatenates the transcripts in original order into one combined transcript.
5. Sends that transcript to Groq — using map-reduce summarization (condense each piece, then combine) if it exceeds `GROQ_MAX_INPUT_CHARS`, so a summary is never silently truncated.

Full rationale and diagrams: see `/architecture` in the running app.

---

## ☁️ Deployment

Render is the target platform. **You deploy this yourself — the AI assistant that built this project does not deploy it for you.** Everything below is written for you to run.

### What you're deploying

Just two Render services plus two free external pieces — no Redis, no separate worker:

1. PostgreSQL — [Neon](https://neon.tech) (not a Render resource; Render's own free Postgres expires after 30 days, Neon's free tier doesn't)
2. Backend API (Docker web service, on Render's **free** plan) — also runs all transcription/summarization in-process via `BackgroundTasks`
3. Frontend (static site, on Render, free)
4. Object storage — set up separately (Cloudflare R2 recommended), not a Render resource

> Render's free web service spins down after periods of inactivity (cold start on the next request) — the trade-off for $0/month. See "Known Limitations."

### 🚀 Option A — Render Blueprint (`render.yaml`) — recommended

1. Push this repo to GitHub.
2. In the Render dashboard: **New → Blueprint** → select your repo → Render reads `render.yaml` and proposes 2 services: the backend and the frontend static site.
3. When prompted, fill in the `sync: false` values: `DATABASE_URL` (your Neon connection string), `GNANI_API_KEY`, `GROQ_API_KEY`, `STORAGE_*`, `FRONTEND_URL`, `BACKEND_URL`, `VITE_API_BASE_URL`, `VITE_GITHUB_REPO_URL`. Some of these (the backend's own URL, the frontend's own URL) aren't known until after the first deploy — deploy once, copy the assigned `.onrender.com` URLs, then update those env vars and trigger a manual redeploy of the backend and frontend services.
4. Click **Apply**.

<details>
<summary><strong>🛠️ Option B — Manual setup (full control)</strong></summary>

**1. PostgreSQL (Neon)**
- [neon.tech](https://neon.tech) → sign up → **Create a project**.
- Dashboard → **Connection Details** → copy the connection string (`postgresql://user:pass@host/db?sslmode=require`).
- Adapt it for this app's driver — swap the `postgresql://` prefix for `postgresql+psycopg://`, keep `?sslmode=require` — and use that as `DATABASE_URL`.

**2. Object storage (Cloudflare R2 example)**
- Create an R2 bucket in the Cloudflare dashboard.
- Create an R2 API token (Account → R2 → Manage API Tokens) with read/write access to that bucket.
- Note the endpoint (`https://<account-id>.r2.cloudflarestorage.com`), bucket name, access key, and secret key.

**3. Backend API (Web Service)**
- New → Web Service → connect your repo.
- **Root Directory:** `backend`
- **Runtime:** Docker
- **Dockerfile Path:** `backend/Dockerfile` (root directory `backend`, so just `Dockerfile`)
- **Instance Type:** Free
- **Build Command:** *(leave blank — Docker builds handle this)*
- **Start Command:** *(leave blank — uses the Dockerfile's `CMD`, which runs `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`)*
- **Health Check Path:** `/api/health`
- **Environment variables:** all of `GNANI_*`, `GROQ_*`, `STORAGE_*`, `MAX_UPLOAD_SIZE_MB`, `MIN_AUDIO_DURATION_SECONDS`, plus:
  - `DATABASE_URL` = the Neon connection string from step 1
  - `FRONTEND_URL` = your frontend's Render URL (set after step 4; comma-separate if you also have a custom domain)
  - `BACKEND_URL` = this service's own Render URL (set after first deploy)
- Render auto-assigns `$PORT` — the Dockerfile already reads it (`--port ${PORT:-8000}`).

**4. Frontend (Static Site)**
- New → Static Site → same repo.
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment variables:**
  - `VITE_API_BASE_URL` = `https://<your-backend-service>.onrender.com/api`
  - `VITE_GITHUB_REPO_URL` = your repo's URL
- **Rewrite rule:** add `/*` → `/index.html` (Rewrites & Redirects tab) so React Router's client-side routes (`/notes/:id`, `/architecture`) work on refresh/direct link.

**5. Wire it all together**
- Once the backend and frontend both have their `.onrender.com` URLs, go back and set:
  - Backend: `FRONTEND_URL` = the frontend's URL (comma-separated with any custom domain)
  - Backend: `BACKEND_URL` = the backend's own URL
  - Frontend: `VITE_API_BASE_URL` = `https://<backend-url>/api`
- Trigger a manual redeploy on both after changing env vars (static sites and Docker services both need a rebuild to pick up new `VITE_*`/runtime vars respectively).

</details>

### 🖥️ Deployment commands — run these yourself

Nothing here is executed for you. These are the exact commands/actions to run, in order, once the services above exist.

```bash
# 1. Push your code
git init                      # only if this repo isn't already a git repo
git add .
git commit -m "Initial commit: Audio Notes Platform"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main

# 2. (Local sanity check before deploying — optional but recommended)
cd backend
pip install -r requirements.txt
alembic upgrade head
pytest

cd ../frontend
npm install
npm run build

# 3. In the Render dashboard, create the services as described above
#    (Option A: Blueprint from render.yaml, or Option B: manual).

# 4. After the backend's first deploy, confirm it's healthy:
curl https://<your-backend>.onrender.com/api/health
curl https://<your-backend>.onrender.com/api/ready

# 5. After the frontend's first deploy, open it in a browser:
#    https://<your-frontend>.onrender.com
#    Upload an audio file and confirm it reaches "completed".

# 6. If you change env vars on an already-deployed service, redeploy it:
#    Render dashboard -> service -> Manual Deploy -> Deploy latest commit
```

### ✔️ Post-Deployment Verification

1. `GET /api/health` returns `{"status": "ok"}`.
2. `GET /api/ready` returns `{"status": "ok", "checks": {"database": "ok"}}`.
3. Open the frontend URL → sign up for an account → the Dashboard loads with an empty notes list.
4. Upload a real 2+ minute audio file → note appears with status `queued`, then progresses through `processing → transcribing → summarizing → completed` (watch the status checklist update every ~2.5s).
5. Open the completed note → transcript and structured summary are both visible and copyable.
6. Return to the dashboard → the note is listed, newest first, and reopens correctly.
7. Upload an unsupported file (e.g. a `.txt` renamed to `.mp3`) → a clear validation error is shown, no note is created.
8. Visit `/architecture` → diagram renders, all 11 sections are present, and the GitHub link points at your repo.

---

## ⚠️ Known Limitations

- Auth is Google-only: there are no passwords to store, reset or leak; accounts are linked by verified Google email.
- Favorites and checked-off action items still live in the browser's `localStorage` rather than the database (a holdover from before accounts existed), so they don't sync across devices for the same account.
- Audio is fully decoded into memory for chunking (`pydub`), which is fine at the enforced `MAX_UPLOAD_SIZE_MB` but wouldn't scale to very large files without a streaming rewrite.
- Gnani chunk transcription is sequential, not parallel, to keep chronological ordering simple — this is the right tradeoff at expected note lengths, but is a throughput ceiling for very long recordings.
- Render's free web service instance spins down on inactivity, which will show up as a slower first request after idle periods. (Neon itself is not affected by this — it's used precisely because it doesn't expire or require a paid plan to stay alive.)
- Background processing runs in-process (FastAPI `BackgroundTasks`) rather than in a separate worker, to fit entirely within free hosting tiers. Trade-offs versus the earlier Celery/Redis design: no independent retry-on-crash/requeue if the instance restarts mid-task, no horizontal worker scaling, and processing shares CPU/memory with the request-serving process instead of an isolated one.

---

## 🔮 Future Improvements

- More sign-in providers alongside Google
- Move favorites/checked-action-items from localStorage onto the User/Note models so they sync across devices
- Streaming upload for very large files
- WebSocket/SSE push instead of polling, if scale ever warranted it
- Parallel chunk transcription
- Speaker diarization / timestamped transcripts (if exposed by Gnani)
- Soft-delete with an audit trail instead of hard deletes

<br />

<div align="center">

Built with 🎙️ + 🧠 — record it once, never re-listen to find the one line that mattered.

</div>
