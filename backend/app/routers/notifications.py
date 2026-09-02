"""Rotas de notificações."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import AnyHttpUrl, BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Notification
from app.routers.auth import get_current_user
from app.services.datetime_utils import utc_iso

notifications_router = APIRouter(prefix="/api/notifications", tags=["Notificações"])


# ─── Notificações ────────────────────────────────────────────────────────────

@notifications_router.get("")
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.notification_type,
            "related_id": n.related_id,
            "related_url": n.related_url,
            "is_read": n.is_read,
            "created_at": utc_iso(n.created_at),
        }
        for n in notifications
    ]


@notifications_router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"count": count}


@notifications_router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "Todas as notificações marcadas como lidas"}


@notifications_router.put("/{notif_id}/read")
async def mark_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marcado como lido"}


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=512)
    auth: str = Field(min_length=1, max_length=512)


class PushSubscription(BaseModel):
    endpoint: AnyHttpUrl
    expiration_time: Optional[int] = Field(default=None, alias="expirationTime")
    keys: PushKeys


class PushSubscribeBody(BaseModel):
    subscription: PushSubscription


@notifications_router.post("/push-subscribe")
async def subscribe_push(
    data: PushSubscribeBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Salva subscription do Web Push."""
    import json
    current_user.push_subscription = json.dumps(data.subscription.model_dump(mode="json", by_alias=True))
    db.commit()
    return {"message": "Push subscription salva!"}


@notifications_router.get("/push-public-key")
async def get_push_public_key(current_user: User = Depends(get_current_user)):
    from app.config import settings
    return {"public_key": settings.VAPID_PUBLIC_KEY}


class NotificationSettingsBody(BaseModel):
    new_activity: Optional[bool] = None
    deadline_7d: Optional[bool] = None
    deadline_3d: Optional[bool] = None
    deadline_1d: Optional[bool] = None
    deadline_6h: Optional[bool] = None
    daily_briefing: Optional[bool] = None
    quiet_start: Optional[str] = None
    quiet_end: Optional[str] = None

    @field_validator("quiet_start", "quiet_end")
    @classmethod
    def validate_time(cls, value: Optional[str]):
        if value is None:
            return value
        from datetime import datetime
        try:
            datetime.strptime(value, "%H:%M")
        except ValueError as exc:
            raise ValueError("Horário deve usar HH:MM") from exc
        return value


@notifications_router.get("/settings")
async def get_notification_settings(current_user: User = Depends(get_current_user)):
    return current_user.notification_settings or {}


@notifications_router.put("/settings")
async def update_notification_settings(
    data: NotificationSettingsBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza preferências de notificação."""
    current_settings = current_user.notification_settings or {}
    current_settings.update(data.model_dump(exclude_none=True))
    current_user.notification_settings = current_settings
    db.commit()
    return {"message": "Configurações atualizadas", "settings": current_settings}
