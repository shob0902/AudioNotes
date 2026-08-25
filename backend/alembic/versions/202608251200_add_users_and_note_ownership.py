"""add users table and notes.user_id

Revision ID: 202608251200
Revises: 202608250001
Create Date: 2026-08-25 12:00:00

IMPORTANT: notes.user_id is NOT NULL, so any existing rows in `notes` must
be deleted before running this migration against a database that predates
user accounts (there's no real owner to backfill them with):

    TRUNCATE notes;

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "202608251200"
down_revision: Union[str, None] = "202608250001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.add_column("notes", sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False))
    op.create_index("ix_notes_user_id", "notes", ["user_id"])
    op.create_foreign_key(
        "fk_notes_user_id_users",
        "notes",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_notes_user_id_users", "notes", type_="foreignkey")
    op.drop_index("ix_notes_user_id", table_name="notes")
    op.drop_column("notes", "user_id")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
