"""
Rotas para Briefing Diário Matinal com IA.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, DailyBriefing, Schedule, Activity, Course, Material
from app.routers.auth import get_current_user
from app.services.ai_service import ai_service, AIProvider
from app.services.crypto_service import crypto_service

router = APIRouter(prefix="/api/briefing", tags=["Briefing Diário"])


async def _generate_user_briefing(db: Session, current_user: User) -> DailyBriefing:
    """Gera o briefing do dia para o usuário atual via IA."""
    today = datetime.now()
    day_of_week = today.weekday()
    date_str = today.strftime("%Y-%m-%d")

    schedules = db.query(Schedule).filter(
        Schedule.user_id == current_user.id,
        Schedule.day_of_week == day_of_week,
    ).order_by(Schedule.start_time).all()

    today_courses = [
        {"name": s.course_name or "Disciplina", "start_time": s.start_time, "end_time": s.end_time}
        for s in schedules
    ]

    pending = db.query(Activity, Course.name.label("course_name")).outerjoin(
        Course, Activity.course_id == Course.id
    ).filter(
        Activity.user_id == current_user.id,
        Activity.status.in_(["pending", "late"]),
    ).order_by(Activity.due_date.asc().nullslast()).limit(10).all()

    pending_data = [
        {
            "title": a[0].title,
            "course_name": a[1] or "Disciplina",
            "description": a[0].description[:300] if a[0].description else None,
            "due_date": a[0].due_date.strftime("%d/%m/%Y %H:%M") if a[0].due_date else None,
            "status": a[0].status,
        }
        for a in pending
    ]

    recent_materials = db.query(Material, Course.name.label("course_name")).join(
        Course, Material.course_id == Course.id
    ).filter(
        Material.user_id == current_user.id,
    ).order_by(Material.created_at.desc()).limit(5).all()

    materials_data = [
        {"title": m[0].title, "course_name": m[1]}
        for m in recent_materials
    ]

    provider_str = current_user.ai_provider or "groq"
    try:
        provider = AIProvider(provider_str)
    except ValueError:
        provider = AIProvider.GROQ

    custom_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            custom_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
        except Exception:
            pass

    content = await ai_service.generate_daily_briefing(
        user_name=current_user.name.split()[0] if current_user.name else "Aluno",
        today_courses=today_courses,
        pending_activities=pending_data,
        recent_materials=materials_data,
        provider=provider,
        custom_api_keys=custom_keys,
    )

    briefing = db.query(DailyBriefing).filter(
        DailyBriefing.user_id == current_user.id,
        DailyBriefing.date == date_str,
    ).first()

    if not briefing:
        briefing = DailyBriefing(
            user_id=current_user.id,
            date=date_str,
            content=content,
            courses_today=today_courses,
        )
        db.add(briefing)
    else:
        briefing.content = content
        briefing.courses_today = today_courses

    db.commit()
    db.refresh(briefing)
    return briefing


@router.get("/today")
async def get_today_briefing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna o briefing matinal do dia de hoje (ou gera se não existir)."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    briefing = db.query(DailyBriefing).filter(
        DailyBriefing.user_id == current_user.id,
        DailyBriefing.date == date_str,
    ).first()

    if not briefing:
        try:
            briefing = await _generate_user_briefing(db, current_user)
        except Exception as e:
            return {
                "date": date_str,
                "content": f"Olá, {current_user.name.split()[0]}! Seu painel está pronto. Consulte suas atividades e horários abaixo.",
                "courses_today": [],
            }

    return {
        "id": briefing.id,
        "date": briefing.date,
        "content": briefing.content,
        "courses_today": briefing.courses_today or [],
        "created_at": briefing.created_at.isoformat() if briefing.created_at else None,
    }


@router.post("/generate")
async def generate_briefing_now(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Força geração/atualização imediata do briefing do dia."""
    briefing = await _generate_user_briefing(db, current_user)
    return {
        "id": briefing.id,
        "date": briefing.date,
        "content": briefing.content,
        "message": "Briefing gerado com sucesso!",
    }
