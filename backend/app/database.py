from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine_options = {
    "connect_args": {"check_same_thread": False, "timeout": 30} if "sqlite" in settings.DATABASE_URL else {},
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}
if "sqlite" not in settings.DATABASE_URL:
    engine_options.update({"pool_recycle": 900, "pool_size": 5, "max_overflow": 10})

engine = create_engine(settings.DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    # Garante que todos os modelos registraram suas tabelas no metadata mesmo
    # quando este módulo é usado por scripts/migrações fora do FastAPI.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _upgrade_existing_schema()
    _stamp_and_apply_migrations()
    # Índices idempotentes também são aplicados em bancos existentes, onde
    # create_all não altera tabelas já criadas.
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_courses_user_moodle ON courses (user_id, moodle_id)",
        "CREATE INDEX IF NOT EXISTS ix_activities_user_status_due ON activities (user_id, status, due_date)",
        "CREATE INDEX IF NOT EXISTS ix_activities_course_moodle ON activities (course_id, moodle_id)",
        "CREATE INDEX IF NOT EXISTS ix_materials_user_course ON materials (user_id, course_id)",
        "CREATE INDEX IF NOT EXISTS ix_materials_user_moodle ON materials (user_id, moodle_id)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_read_created ON notifications (user_id, is_read, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_briefings_user_date ON daily_briefings (user_id, date)",
        "CREATE INDEX IF NOT EXISTS ix_schedules_user_day ON schedules (user_id, day_of_week)",
    ]
    with engine.begin() as connection:
        for statement in indexes:
            connection.execute(text(statement))


def _stamp_and_apply_migrations():
    """Registra/aplica a linha de migrações no mesmo banco da aplicação."""
    try:
        from alembic import command
        from alembic.config import Config
    except ImportError:
        # Ambientes antigos ainda ficam seguros pela migração aditiva acima.
        return

    backend_dir = Path(__file__).resolve().parent.parent
    config_path = backend_dir / "alembic.ini"
    migrations_path = backend_dir / "migrations"
    if not config_path.exists() or not migrations_path.exists():
        return
    config = Config(str(config_path))
    config.set_main_option("script_location", str(migrations_path))
    command.upgrade(config, "head")


def _upgrade_existing_schema():
    """Aplica somente colunas aditivas necessárias em instalações existentes.

    O projeto ainda inicia em provedores que executam apenas Uvicorn. Por isso,
    esta migração compatível roda antes dos índices e não recria dados/tabelas.
    """
    inspector = inspect(engine)
    if "activities" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("activities")}
    definitions = {
        "moodle_status": "VARCHAR(30) DEFAULT 'unknown'",
        "moodle_submission_at": "TIMESTAMP NULL",
        "manual_completed_at": "TIMESTAMP NULL",
        "manual_completion_reason": "VARCHAR(50) NULL",
        "manual_completion_note": "VARCHAR(500) NULL",
        "is_group_activity": "BOOLEAN DEFAULT FALSE",
        "last_seen_at": "TIMESTAMP NULL",
        "removed_at": "TIMESTAMP NULL",
    }
    with engine.begin() as connection:
        for column, definition in definitions.items():
            if column not in existing:
                connection.execute(text(f"ALTER TABLE activities ADD COLUMN {column} {definition}"))

        # Preserva instalações anteriores: um `submitted` legado continua
        # concluído, mas novos registros passam a guardar a origem corretamente.
        connection.execute(text(
            "UPDATE activities SET moodle_status = 'submitted' "
            "WHERE status IN ('submitted', 'graded') "
            "AND (moodle_status IS NULL OR moodle_status = 'unknown')"
        ))
        connection.execute(text(
            "UPDATE activities SET last_seen_at = COALESCE(last_seen_at, updated_at, first_seen)"
        ))

    material_existing = {column["name"] for column in inspector.get_columns("materials")}
    material_definitions = {
        "is_active": "BOOLEAN DEFAULT TRUE",
        "updated_at": "TIMESTAMP NULL",
    }
    with engine.begin() as connection:
        for column, definition in material_definitions.items():
            if column not in material_existing:
                connection.execute(text(f"ALTER TABLE materials ADD COLUMN {column} {definition}"))
        connection.execute(text(
            "UPDATE materials SET is_active = TRUE WHERE is_active IS NULL"
        ))
        connection.execute(text(
            "UPDATE materials SET updated_at = COALESCE(updated_at, created_at)"
        ))

    user_existing = {column["name"] for column in inspector.get_columns("users")}
    if "session_version" not in user_existing:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE users ADD COLUMN session_version INTEGER DEFAULT 0 NOT NULL"
            ))
    if "moodle_token_enc" not in user_existing:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE users ADD COLUMN moodle_token_enc TEXT NULL"
            ))
