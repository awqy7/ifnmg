"""Add durable AI request quota log."""
from alembic import op
import sqlalchemy as sa

revision = "20260902_ai_request_logs"
down_revision = "20260901_activity_delivery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "ai_request_logs" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "ai_request_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("operation", sa.String(40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_ai_request_logs_user_id", "ai_request_logs", ["user_id"])
    op.create_index("ix_ai_request_logs_created_at", "ai_request_logs", ["created_at"])


def downgrade() -> None:
    # Mantemos o histórico para não enfraquecer a cota durante rollback.
    pass
