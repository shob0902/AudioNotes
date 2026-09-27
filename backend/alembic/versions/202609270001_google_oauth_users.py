# Switches accounts to Google sign-in: adds the Google subject id, name and avatar, and drops password hashes.
# Existing rows keep their id (and notes); they are linked to Google on first sign-in with the same email.
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
revision: str = "202609270001"
down_revision: Union[str, None] = "202608251200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
# Adds the Google profile columns and removes the password column.
def upgrade() -> None:
    op.add_column("users", sa.Column("google_sub", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=1024), nullable=True))
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
    op.drop_column("users", "hashed_password")
# Restores the password column (empty for Google-only accounts, which can't log in with a password) and drops the Google columns.
def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("hashed_password", sa.String(length=255), nullable=False, server_default=""),
    )
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "name")
    op.drop_column("users", "google_sub")
