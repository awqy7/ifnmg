"""Separate Moodle and manual activity completion states."""
from alembic import op
import sqlalchemy as sa

revision = "20260901_activity_delivery"
down_revision = None
branch_labels = None
depends_on = None


def _columns(inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "activities" in tables:
        existing = _columns(inspector, "activities")
        additions = {
            "moodle_status": sa.Column("moodle_status", sa.String(30), server_default="unknown"),
            "moodle_submission_at": sa.Column("moodle_submission_at", sa.DateTime(), nullable=True),
            "manual_completed_at": sa.Column("manual_completed_at", sa.DateTime(), nullable=True),
            "manual_completion_reason": sa.Column("manual_completion_reason", sa.String(50), nullable=True),
            "manual_completion_note": sa.Column("manual_completion_note", sa.String(500), nullable=True),
            "is_group_activity": sa.Column("is_group_activity", sa.Boolean(), server_default=sa.false()),
            "last_seen_at": sa.Column("last_seen_at", sa.DateTime(), nullable=True),
            "removed_at": sa.Column("removed_at", sa.DateTime(), nullable=True),
        }
        for name, column in additions.items():
            if name not in existing:
                op.add_column("activities", column)

    if "materials" in tables:
        existing = _columns(inspector, "materials")
        if "is_active" not in existing:
            op.add_column("materials", sa.Column("is_active", sa.Boolean(), server_default=sa.true()))
        if "updated_at" not in existing:
            op.add_column("materials", sa.Column("updated_at", sa.DateTime(), nullable=True))

    if "users" in tables:
        existing = _columns(inspector, "users")
        if "session_version" not in existing:
            op.add_column("users", sa.Column("session_version", sa.Integer(), server_default="0", nullable=False))
        if "moodle_token_enc" not in existing:
            op.add_column("users", sa.Column("moodle_token_enc", sa.Text(), nullable=True))


def downgrade() -> None:
    # A reversão destruiria confirmações manuais e histórico de sincronização.
    # Mantemos a migração deliberadamente aditiva.
    pass
