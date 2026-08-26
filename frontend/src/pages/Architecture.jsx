import ArchitectureDiagram from "../components/ArchitectureDiagram.jsx";
import Card from "../components/ui/Card.jsx";
import HorizontalScrollGallery from "../components/HorizontalScrollGallery.jsx";

const GITHUB_REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL || "https://github.com/<your-username>/audio-notes";

const SECTIONS = [
  {
    number: 1,
    title: "High-Level Architecture",
    content: <ArchitectureDiagram />,
  },
  {
    number: 2,
    title: "Upload-to-Transcript Flow",
    content: (
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Browser uploads audio via a multipart POST to FastAPI.</li>
        <li>
          FastAPI sanitizes the filename, validates size/format, and decodes it with ffmpeg to confirm it's real,
          playable audio and to read its true duration.
        </li>
        <li>The raw audio bytes are uploaded to object storage; only a storage key/URL is kept in Postgres.</li>
        <li>
          A <code>notes</code> row is created with status <code>uploaded</code>, then <code>queued</code>, and a
          background task is scheduled via FastAPI's <code>BackgroundTasks</code>.
        </li>
        <li>
          FastAPI responds immediately with <code>{'{ id, status: "queued" }'}</code> — the HTTP request never waits
          on transcription.
        </li>
        <li>
          After the response is sent, the background task downloads the audio, splits it into Gnani-sized chunks,
          transcribes each in order, concatenates the results, then sends the combined transcript to Groq for a
          structured summary.
        </li>
        <li>
          Each stage transition (<code>processing → transcribing → summarizing → completed</code>) is committed to
          Postgres immediately, which is what the frontend's status polling reflects in real time.
        </li>
      </ol>
    ),
  },
  {
    number: 3,
    title: "File Storage Strategy",
    content: (
      <>
        <p>
          Audio files are never stored in PostgreSQL — only metadata (a storage key, a cached URL, size, duration,
          MIME type) lives in the database. The actual bytes live in an S3-compatible object store (Cloudflare R2,
          Supabase Storage, MinIO, or AWS S3 all work identically).
        </p>
        <p>
          The application never talks to the storage provider's SDK directly outside of one file:{" "}
          <code>StorageService</code> (<code>upload_file</code>, <code>download_file</code>, <code>delete_file</code>
          , <code>get_file_url</code>). Swapping providers means changing environment variables and this one file —
          not the routes, the background task, or any business logic.
        </p>
      </>
    ),
  },
  {
    number: 4,
    title: "Background Processing (FastAPI BackgroundTasks)",
    content: (
      <p>
        Anything slower than "validate and save a file" runs as a FastAPI <code>BackgroundTasks</code> callback,
        scheduled from the upload/retry routes and executed after the HTTP response is already sent — in the same
        process as the API, with no separate worker process or task queue. That keeps the deployment to a single
        free-tier-friendly web service: no Redis broker, no independently-scaled worker, at the cost of processing
        sharing CPU/memory with request handling and no independent retry-on-crash if the process restarts mid-task
        (see "Future Improvements" for when a real queue would earn its keep back).
      </p>
    ),
  },
  {
    number: 5,
    title: "Long-Audio Handling",
    content: (
      <>
        <p>
          Gnani's Speech-to-Text API caps a single request at <strong>60 seconds of audio</strong> (ideally ≤30s) —
          this is a hard constraint from Gnani's own documentation, not a design preference. Since this application
          targets 2+ minute recordings, chunking is mandatory rather than optional.
        </p>
        <p>The background task's transcription step:</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Decodes the full audio with ffmpeg (using the original extension as a decoding hint).</li>
          <li>
            Splits it into sequential, non-overlapping WAV chunks of <code>GNANI_CHUNK_SECONDS</code> (default 30s).
          </li>
          <li>
            Sends each chunk to Gnani in chronological order. Each chunk retries independently (exponential backoff)
            on transient failures (429/5xx/timeout) without needing to redo the whole file.
          </li>
          <li>Concatenates the returned transcripts in original order into one combined transcript.</li>
        </ol>
        <p>
          This is intentionally the simplest chunking strategy that satisfies Gnani's constraint — no overlapping
          windows or cross-chunk stitching heuristics, since Gnani's per-request cap is the only reason chunking
          exists at all. If Gnani's limits change, only <code>GNANI_CHUNK_SECONDS</code> needs to change.
        </p>
      </>
    ),
  },
  {
    number: 6,
    title: "Synchronous vs. Background Operations",
    content: (
      <>
        <p className="font-medium text-ink">Synchronous (inside the HTTP request/response):</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Upload validation (format, size, empty-file, real ffmpeg decode)</li>
          <li>Audio storage (object storage upload)</li>
          <li>Database record creation</li>
          <li>Background task scheduled (FastAPI <code>BackgroundTasks</code>)</li>
        </ul>
        <p className="mt-3 font-medium text-ink">Background (in-process task, off the request path):</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Audio chunking and transcription (Gnani)</li>
          <li>Retries with backoff for transient failures</li>
          <li>Summarization, including chunked map-reduce for long transcripts (Groq)</li>
        </ul>
        <p>
          This split exists because Gnani's per-chunk cap means a 2+ minute file needs multiple sequential API calls
          plus an LLM call — easily tens of seconds to a few minutes of total latency. Holding an HTTP connection
          open that long is fragile (browser/proxy timeouts, no per-chunk retry granularity, ties up a server
          worker) with no benefit to the user, who is shown live progress via polling instead.
        </p>
      </>
    ),
  },
  {
    number: 7,
    title: "Failure Handling",
    content: (
      <>
        <p>
          Every external call (Gnani, Groq, storage) raises one of two typed exceptions:{" "}
          <code>TransientServiceError</code> (timeouts, 429, 5xx — retried with exponential backoff, capped) or{" "}
          <code>PermanentServiceError</code> (invalid auth, malformed request, unsupported audio — never retried
          automatically). Whatever reaches the background task always resolves to a terminal status — a note is never
          left stuck in <code>processing</code>/<code>transcribing</code>/<code>summarizing</code> forever.
        </p>
        <p>
          On failure, <code>status</code> becomes <code>failed</code> and a short, human-readable{" "}
          <code>error_message</code> is stored (e.g. "Transcription timed out. Please try again.") — never a raw
          stack trace or internal URL. The frontend surfaces this directly and offers a Retry button, which re-queues
          the same note from scratch.
        </p>
      </>
    ),
  },
  {
    number: 8,
    title: "Database Design",
    content: (
      <>
        <p>
          A <code>users</code> table (UUID primary key, unique email, bcrypt-hashed password) backs simple
          email/password auth — JWT bearer tokens, no OAuth, no server-side sessions. Every <code>notes</code> row
          has a required <code>user_id</code> foreign key (<code>ON DELETE CASCADE</code>), so each account only
          ever sees, lists, or can act on its own notes — every note route checks ownership and returns a plain 404
          (not 403) for another user's note, so its existence isn't leaked.
        </p>
        <p>
          The <code>notes</code> table itself (UUID primary key) tracks a note through its entire lifecycle: identity
          and file metadata (title, filename, storage key/URL, size, duration, MIME type), a <code>status</code>{" "}
          enum (<code>uploaded → queued → processing → transcribing → summarizing → completed</code>, or{" "}
          <code>failed</code>), the resulting <code>transcript</code> (text) and <code>summary</code> (JSONB,
          matching the structured schema below), an optional <code>error_message</code>, and timestamps. Alembic
          manages schema migrations from a clean initial migration onward.
        </p>
      </>
    ),
  },
  {
    number: 9,
    title: "AI Integrations",
    content: (
      <>
        <p>
          <strong>Gnani Speech-to-Text</strong> — <code>GnaniService</code> is the only code that calls Gnani's API
          (multipart POST, <code>X-API-Key-ID</code> auth, <code>language_code</code> required). It owns chunking,
          per-chunk retry, and translating Gnani's error shapes into the app's typed exceptions.
        </p>
        <p>
          <strong>Groq LLM</strong> — <code>GroqService</code> sends the transcript to a configurable{" "}
          <code>GROQ_MODEL</code> via Groq's OpenAI-compatible chat completions API with JSON-mode responses,
          producing <code>{"{ summary, key_points[], action_items[], decisions[], topics[] }"}</code>. Transcripts
          under the configured character budget are summarized in one call; longer transcripts go through a
          map-reduce pass (condense each piece, then combine condensed notes into one final structured summary) so
          arbitrarily long recordings never get truncated or blow past context limits.
        </p>
      </>
    ),
  },
  {
    number: 10,
    title: "Deployment Architecture (Render)",
    content: (
      <>
        <p>Four independently deployable pieces, all configured purely through environment variables:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>PostgreSQL — Neon (permanently-free tier), external to Render</li>
          <li>
            Backend API — Docker web service on Render's free plan, running Uvicorn; runs{" "}
            <code>alembic upgrade head</code> on boot and also runs background processing in-process (no separate
            worker/queue)
          </li>
          <li>Frontend — static site build served by Render's static hosting, also free</li>
          <li>Object storage — Cloudflare R2 (or any S3-compatible provider), external to Render</li>
        </ul>
        <p>See the README for exact build/start commands and environment variables for each service.</p>
      </>
    ),
  },
  {
    number: 11,
    title: "Future Improvements",
    content: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Password reset and email verification — signup/login is intentionally minimal today (no email sent
          anywhere), which is fine for this project's scope but not for a real product.
        </li>
        <li>
          Favorites and checked-off action items are still stored in the browser's localStorage rather than the
          database, from before accounts existed — moving them onto the User/Note models would make them sync across
          devices.
        </li>
        <li>Streaming/chunked upload for very large files instead of buffering the whole file in memory.</li>
        <li>WebSocket or Server-Sent Events push instead of polling, if note volume/latency ever justified it.</li>
        <li>Per-chunk parallelism for Gnani transcription (currently sequential, to keep ordering simple).</li>
        <li>Speaker diarization and timestamped transcripts, if Gnani's API exposes them.</li>
        <li>Soft-delete / audit trail instead of hard-deleting notes.</li>
        <li>
          A real task queue (e.g. Celery + Redis) instead of in-process <code>BackgroundTasks</code>, if load ever
          outgrows a single instance — would restore independent worker scaling and crash-safe retry/requeue, at the
          cost of a paid always-on worker.
        </li>
      </ul>
    ),
  },
];

export default function Architecture() {
  return (
    <div className="space-y-6">
      <Card variant="elevated-lg" className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">System Architecture</h1>
            <p className="mt-1 text-sm text-muted">
              How Audio Notes turns an uploaded recording into a transcript and structured summary — scroll down to
              move through each stage.
            </p>
          </div>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-elevated px-4 py-2 text-sm font-semibold text-ink shadow-soft transition-all duration-300 ease-bouncy hover:-translate-y-1 hover:bg-surface-hover hover:shadow-soft-hover"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.42.36.78 1.08.78 2.18v3.24c0 .3.21.66.79.55A10.52 10.52 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5Z" />
            </svg>
            GitHub Repository
          </a>
        </div>
      </Card>

      <HorizontalScrollGallery items={SECTIONS} />
    </div>
  );
}
