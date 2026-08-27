"""
Rotas de integração com o Moodle Virtual2 IFNMG.
"""
import json
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.services.moodle_auth import moodle_auth_service
from app.services.crypto_service import crypto_service
from app.services.scheduler import sync_moodle_for_user

router = APIRouter(prefix="/api/moodle", tags=["Moodle"])


class MoodleCredentials(BaseModel):
    username: str
    password: str


@router.post("/credentials")
async def save_credentials(
    data: MoodleCredentials,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Salva as credenciais do Moodle criptografadas e faz o primeiro login.
    """
    # Testa login antes de salvar
    session_data = await moodle_auth_service.login(data.username, data.password)
    if not session_data:
        raise HTTPException(
            status_code=400,
            detail="Login no Virtual2 falhou. Verifique seu usuário e senha."
        )

    # Tenta obter token REST
    moodle_token = await moodle_auth_service.get_moodle_token(data.username, data.password)

    # Salva tudo criptografado
    current_user.moodle_username_enc = crypto_service.encrypt(data.username)
    current_user.moodle_password_enc = crypto_service.encrypt(data.password)
    current_user.moodle_session_cookies = crypto_service.encrypt_json(session_data)
    current_user.moodle_connected = True

    if moodle_token:
        # Salva token REST se disponível
        existing_keys = {}
        if current_user.ai_api_keys_enc:
            try:
                existing_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
            except Exception:
                pass
        existing_keys["moodle_token"] = moodle_token
        current_user.ai_api_keys_enc = crypto_service.encrypt_json(existing_keys)

    db.commit()

    # Dispara sync em background imediatamente
    background_tasks.add_task(sync_moodle_for_user, current_user.id)

    return {
        "message": "Conectado ao Virtual2 com sucesso! 🎉",
        "user_name": session_data.get("user_name"),
        "moodle_token_available": moodle_token is not None,
    }


@router.get("/status")
async def get_status(current_user: User = Depends(get_current_user)):
    """Retorna status da conexão com o Moodle."""
    return {
        "connected": current_user.moodle_connected,
        "last_sync": current_user.moodle_last_sync,
        "has_credentials": bool(current_user.moodle_username_enc),
    }


@router.post("/sync")
async def force_sync(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Força uma sincronização imediata com o Moodle."""
    from app.services.scheduler import _sync_status

    if not current_user.moodle_username_enc:
        raise HTTPException(status_code=400, detail="Credenciais do Moodle não configuradas")

    already = _sync_status.get(current_user.id, {}).get("running", False)
    if not already:
        background_tasks.add_task(sync_moodle_for_user, current_user.id)
    return {"message": "Sincronização iniciada em background"}


@router.get("/sync/status")
async def sync_status(current_user: User = Depends(get_current_user)):
    """Status da sincronização em tempo real (para feedback no frontend)."""
    from app.services.scheduler import get_sync_status

    status = get_sync_status(current_user.id)
    return {
        "running": status.get("running", False),
        "courses_done": status.get("courses_done", 0),
        "activities": status.get("activities", 0),
        "materials": status.get("materials", 0),
        "source": status.get("source"),
        "error": status.get("error"),
        "started_at": status.get("started_at"),
        "finished_at": status.get("finished_at"),
        "last_sync": current_user.moodle_last_sync.isoformat() if current_user.moodle_last_sync else None,
    }


@router.post("/reconnect")
async def reconnect(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Força reconexão ao Moodle."""
    if not current_user.moodle_username_enc:
        raise HTTPException(status_code=400, detail="Configure as credenciais primeiro")

    username = crypto_service.decrypt(current_user.moodle_username_enc)
    password = crypto_service.decrypt(current_user.moodle_password_enc)

    session_data = await moodle_auth_service.login(username, password)
    if not session_data:
        current_user.moodle_connected = False
        db.commit()
        raise HTTPException(status_code=400, detail="Falha ao reconectar. Verifique suas credenciais.")

    current_user.moodle_session_cookies = crypto_service.encrypt_json(session_data)
    current_user.moodle_connected = True
    db.commit()

    background_tasks.add_task(sync_moodle_for_user, current_user.id)
    return {"message": "Reconectado com sucesso!"}


@router.delete("/credentials")
async def remove_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove as credenciais do Moodle."""
    current_user.moodle_username_enc = None
    current_user.moodle_password_enc = None
    current_user.moodle_session_cookies = None
    current_user.moodle_connected = False
    db.commit()
    return {"message": "Credenciais removidas com sucesso"}
