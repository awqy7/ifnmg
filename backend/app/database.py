from sqlalchemy import create_engine, text
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
    Base.metadata.create_all(bind=engine)
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
