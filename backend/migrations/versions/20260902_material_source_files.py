"""Store Moodle material file metadata for direct downloads."""
from alembic import op
import sqlalchemy as sa

revision = "20260902_material_files"
down_revision = "20260902_ai_request_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("materials")}
    if "source_files" not in columns:
        op.add_column("materials", sa.Column("source_files", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("materials")}
    if "source_files" in columns:
        op.drop_column("materials", "source_files")
