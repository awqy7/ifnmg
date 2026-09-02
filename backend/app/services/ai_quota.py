"""Cota durável e compartilhada para chamadas de IA."""
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AIRequestLog, User
from app.services.datetime_utils import utc_now_naive


def consume_ai_request(db: Session, user_id: str, operation: str) -> None:
    now = utc_now_naive()
    cutoff = now - timedelta(days=1)
    # Serializa o consumo por usuário no PostgreSQL para evitar ultrapassar a
    # cota por duas requisições concorrentes.
    db.query(User.id).filter(User.id == user_id).with_for_update().first()
    total = db.query(func.count(AIRequestLog.id)).filter(
        AIRequestLog.user_id == user_id,
        AIRequestLog.created_at >= cutoff,
    ).scalar() or 0
    if total >= settings.AI_REQUESTS_PER_DAY:
        raise HTTPException(status_code=429, detail="Limite diário de consultas à IA atingido")

    db.query(AIRequestLog).filter(
        AIRequestLog.user_id == user_id,
        AIRequestLog.created_at < now - timedelta(days=31),
    ).delete(synchronize_session=False)
    db.add(AIRequestLog(user_id=user_id, operation=operation[:40], created_at=now))
    db.commit()
