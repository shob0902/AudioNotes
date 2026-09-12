# First migration: creates the note_status enum and the notes table with its indexes.
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
revision: str = "202608250001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
note_status_enum = postgresql.ENUM(
    "uploaded",
    "queued",
    "processing",
    "transcribing",
    "summarizing",
    "completed",
    "failed",
    name="note_status",
)
# Creates the status enum, then the notes table and the two indexes it is queried by.
def upgrade() -> None:
    note_status_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("storage_key", sa.String(length=1024), nullable=False),
        sa.Column("storage_url", sa.String(length=2048), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "uploaded",
                "queued",
                "processing",
                "transcribing",
                "summarizing",
                "completed",
                "failed",
                name="note_status",
                create_type=False,
            ),
            nullable=False,
            server_default="uploaded",
        ),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("summary", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_notes_status", "notes", ["status"])
    op.create_index("ix_notes_created_at", "notes", ["created_at"])
# Drops the indexes, the notes table and the status enum again.
def downgrade() -> None:
    op.drop_index("ix_notes_created_at", table_name="notes")
    op.drop_index("ix_notes_status", table_name="notes")
    op.drop_table("notes")
    note_status_enum.drop(op.get_bind(), checkfirst=True)
