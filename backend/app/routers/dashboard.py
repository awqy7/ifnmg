"""Snapshot agregado e rápido da página inicial."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Course, Activity, Notification
from app.routers.auth import get_current_user
from app.routers.briefing import _load_context, build_briefing_snapshot
from app.services.datetime_utils import utc_iso

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("")
async def dashboard_snapshot(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna tudo que a home precisa em uma viagem ao backend.

    A resposta sempre vem do banco local. Nenhuma chamada ao Moodle ou à IA é
    feita aqui, então a primeira pintura não depende da sincronização externa.
    """
    context = _load_context(db, current_user)
    briefing = build_briefing_snapshot(db, current_user, context=context)

    pending_counts = db.query(
        Activity.course_id.label("course_id"),
        func.count(Activity.id).label("pending_count"),
    ).filter(
        Activity.user_id == current_user.id,
        Activity.status.in_(["pending", "late"]),
    ).group_by(Activity.course_id).subquery()

    course_rows = db.query(
        Course,
        func.coalesce(pending_counts.c.pending_count, 0),
    ).outerjoin(
        pending_counts, pending_counts.c.course_id == Course.id,
    ).filter(
        Course.user_id == current_user.id,
        Course.is_active == True,
    ).order_by(Course.name).limit(12).all()

    courses = [
        {
            "id": course.id,
            "moodle_id": course.moodle_id,
            "name": course.name,
            "short_name": course.short_name or "",
            "teacher": course.teacher or "Docente IFNMG",
            "color": course.color or "#34d399",
            "progress": course.progress or 0,
            "pending_activities": int(pending_count or 0),
        }
        for course, pending_count in course_rows
    ]

    pending_activities = [
        {
            "id": item["id"],
            "course_id": item["course_id"],
            "course_name": item["course_name"],
            "title": item["title"],
            "type": item["type"],
            "due_date": item["due_date"],
            "status": item["status"],
        }
        for item in briefing["urgent_activities"]
    ]

    unread_count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).scalar() or 0

    return {
        "briefing": briefing,
        "pending_activities": pending_activities,
        "courses": courses,
        "unread_notifications": int(unread_count),
        "last_sync": utc_iso(current_user.moodle_last_sync),
    }
