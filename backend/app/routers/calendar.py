"""
Rotas para Calendário Acadêmico e Linha do Tempo de Prazos.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, CalendarEvent, Activity, Course
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/calendar", tags=["Calendário"])


@router.get("")
async def list_calendar_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna todos os eventos do calendário mesclados com prazos de entrega das atividades.
    """
    # 1. Eventos do Moodle
    cal_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == current_user.id
    ).all()

    # 2. Prazos das Atividades
    activities = db.query(Activity, Course.name.label("course_name"), Course.color.label("course_color")).join(
        Course, Activity.course_id == Course.id
    ).filter(
        Activity.user_id == current_user.id,
        Activity.due_date != None,
    ).all()

    combined = []

    for ev in cal_events:
        combined.append({
            "id": f"event_{ev.id}",
            "moodle_id": ev.moodle_id,
            "title": ev.title,
            "description": ev.description,
            "type": "event",
            "course_name": ev.course_name or "",
            "start_date": ev.start_date.isoformat() if ev.start_date else None,
            "end_date": ev.end_date.isoformat() if ev.end_date else None,
            "url": ev.url or "",
        })

    for act, course_name, course_color in activities:
        combined.append({
            "id": f"act_{act.id}",
            "moodle_id": act.moodle_id,
            "title": act.title,
            "description": act.description or "",
            "type": "activity_deadline",
            "course_name": course_name or "",
            "course_color": course_color or "#6366f1",
            "start_date": act.due_date.isoformat() if act.due_date else None,
            "end_date": None,
            "url": act.url or "",
            "status": act.status,
            "grade": act.grade,
        })

    # Ordena cronologicamente por start_date
    def sort_key(item):
        d = item.get("start_date")
        if not d:
            return "9999-12-31"
        return d

    combined.sort(key=sort_key)
    return combined
