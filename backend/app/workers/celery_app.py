"""
Celery application instance.

Started with:
    celery -A app.workers.celery_app worker --loglevel=info

Redis backs both the broker (task queue) and the result backend. Results
aren't actually relied on by the API (status is read from Postgres, which is
the single source of truth clients poll) — the result backend is kept mainly
for task introspection/debugging.
"""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "audio_notes",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # A note can legitimately take minutes to process (multiple Gnani chunk
    # calls + a Groq call). Give tasks generous headroom rather than letting
    # Celery kill them mid-pipeline.
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    # Avoid one long-running note starving others: don't prefetch a big batch.
    worker_prefetch_multiplier=1,
    # If a worker is killed mid-task, don't silently drop the note forever —
    # let it be picked up again rather than acknowledged-and-lost.
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)
