"""
Rota de notificações e grade de horários.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Notification, Schedule
from app.routers.auth import get_current_user

notifications_router = APIRouter(prefix="/api/notifications", tags=["Notificações"])
schedule_router = APIRouter(prefix="/api/schedule", tags=["Horários"])


# ─── Notificações ────────────────────────────────────────────────────────────

@notifications_router.get("")
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
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
            "related_url": n.related_url,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
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


@notifications_router.post("/push-subscribe")
async def subscribe_push(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Salva subscription do Web Push."""
    import json
    current_user.push_subscription = json.dumps(data.get("subscription"))
    db.commit()
    return {"message": "Push subscription salva!"}


@notifications_router.put("/settings")
async def update_notification_settings(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza preferências de notificação."""
    current_settings = current_user.notification_settings or {}
    current_settings.update(data)
    current_user.notification_settings = current_settings
    db.commit()
    return {"message": "Configurações atualizadas", "settings": current_settings}


# ─── Grade de Horários ───────────────────────────────────────────────────────

class ScheduleSlot(BaseModel):
    day_of_week: int  # 0=Seg, 5=Sab
    start_time: str   # "07:00"
    end_time: str     # "08:40"
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    room: Optional[str] = None
    color: Optional[str] = "#6366f1"


@schedule_router.get("")
async def get_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna grade de horários do aluno."""
    slots = db.query(Schedule).filter(Schedule.user_id == current_user.id).all()

    # Organiza por dia da semana
    week = {i: [] for i in range(6)}
    for slot in slots:
        week[slot.day_of_week].append({
            "id": slot.id,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "course_id": slot.course_id,
            "course_name": slot.course_name,
            "room": slot.room,
            "color": slot.color,
        })

    days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    return [
        {
            "day": days[i],
            "day_index": i,
            "slots": sorted(week[i], key=lambda x: x["start_time"]),
        }
        for i in range(6)
    ]


@schedule_router.post("")
async def add_schedule_slot(
    data: ScheduleSlot,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Adiciona um slot à grade de horários."""
    if data.day_of_week < 0 or data.day_of_week > 5:
        raise HTTPException(status_code=400, detail="Dia inválido (0=Seg, 5=Sab)")

    # Se course_id fornecido, busca nome
    course_name = data.course_name
    color = data.color
    if data.course_id:
        from app.models import Course
        course = db.query(Course).filter(
            Course.id == data.course_id,
            Course.user_id == current_user.id,
        ).first()
        if course:
            course_name = course.name
            color = course.color

    slot = Schedule(
        user_id=current_user.id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        course_id=data.course_id,
        course_name=course_name,
        room=data.room,
        color=color or "#6366f1",
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return {"id": slot.id, "message": "Horário adicionado!"}


@schedule_router.delete("/{slot_id}")
async def delete_schedule_slot(
    slot_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slot = db.query(Schedule).filter(
        Schedule.id == slot_id,
        Schedule.user_id == current_user.id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot não encontrado")
    db.delete(slot)
    db.commit()
    return {"message": "Horário removido"}


@schedule_router.get("/today")
async def get_today_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna os horários de hoje."""
    from datetime import datetime
    today = datetime.now().weekday()  # 0=Seg, 6=Dom
    if today > 5:
        return {"day": "Domingo", "slots": []}

    slots = db.query(Schedule).filter(
        Schedule.user_id == current_user.id,
        Schedule.day_of_week == today,
    ).order_by(Schedule.start_time).all()

    days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    return {
        "day": days[today],
        "slots": [
            {
                "id": s.id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "course_id": s.course_id,
                "course_name": s.course_name,
                "room": s.room,
                "color": s.color,
            }
            for s in slots
        ],
    }
