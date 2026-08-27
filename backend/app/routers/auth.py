"""
Rotas de autenticação direta via Virtual2 IFNMG (Moodle).
Sem necessidade de criar conta separada: o login do Virtual2 é a única credencial.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.services.moodle_auth import moodle_auth_service
from app.services.crypto_service import crypto_service
from app.services.scheduler import sync_moodle_for_user

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/moodle-login")
ALGORITHM = "HS256"


# ─── Schemas ────────────────────────────────────────────────────────────────

class MoodleDirectLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    moodle_connected: bool
    moodle_last_sync: Optional[datetime]
    ai_provider: str
    theme: str
    created_at: datetime


# ─── Helpers ────────────────────────────────────────────────────────────────

def hash_secret(secret: str) -> str:
    """Hash SHA-256 seguro sem dependências externas problemáticas."""
    salt = settings.SECRET_KEY[:16]
    return hashlib.sha256(f"{salt}{secret}".encode()).hexdigest()


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão expirada. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise credentials_exception
    return user


# ─── Rotas de Login Direto ──────────────────────────────────────────────────

@router.post("/moodle-login", response_model=Token)
async def moodle_login(
    data: MoodleDirectLogin,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Login direto com as credenciais do Virtual2 IFNMG.
    Não requer cadastro prévio: autentica no Moodle e cria a sessão local automaticamente.
    """
    username = data.username.strip()
    password = data.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Informe usuário e senha do Virtual2")

    # Autentica no Moodle
    session_data = await moodle_auth_service.login(username, password)
    if not session_data:
        raise HTTPException(
            status_code=400,
            detail="Credenciais inválidas no Virtual2 IFNMG. Verifique seu login e senha.",
        )

    # Nome do aluno extraído do Moodle ou fallback
    student_name = session_data.get("user_name") or f"Aluno {username}"
    user_email = f"{username}@virtual2.ifnmg.edu.br"

    # Busca usuário existente ou cria novo
    user = db.query(User).filter(User.email == user_email, User.is_active == True).first()

    if not user:
        # Cria conta local automaticamente
        user = User(
            name=student_name,
            email=user_email,
            hashed_password=hash_secret(password),
            moodle_username_enc=crypto_service.encrypt(username),
            moodle_password_enc=crypto_service.encrypt(password),
            moodle_session_cookies=crypto_service.encrypt_json(session_data),
            moodle_connected=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Atualiza credenciais e sessão
        user.name = student_name
        user.hashed_password = hash_secret(password)
        user.moodle_username_enc = crypto_service.encrypt(username)
        user.moodle_password_enc = crypto_service.encrypt(password)
        user.moodle_session_cookies = crypto_service.encrypt_json(session_data)
        user.moodle_connected = True
        db.commit()

    # Tenta obter token da API REST (via sessão do login ou novo request)
    moodle_token = session_data.get("moodle_token") or await moodle_auth_service.get_moodle_token(username, password)
    if moodle_token:
        existing_keys = {}
        if user.ai_api_keys_enc:
            try:
                existing_keys = crypto_service.decrypt_json(user.ai_api_keys_enc)
            except Exception:
                pass
        existing_keys["moodle_token"] = moodle_token
        user.ai_api_keys_enc = crypto_service.encrypt_json(existing_keys)
        db.commit()

    # Dispara sincronização completa em background
    background_tasks.add_task(sync_moodle_for_user, user.id)

    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "username": username,
            "moodle_connected": True,
        },
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retorna dados do usuário atualmente logado."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "moodle_connected": current_user.moodle_connected,
        "moodle_last_sync": current_user.moodle_last_sync,
        "ai_provider": current_user.ai_provider or "groq",
        "theme": current_user.theme or "dark",
        "created_at": current_user.created_at,
    }


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza preferências do usuário (tema, ai_provider, etc)."""
    if "theme" in data and data["theme"] in ("dark", "light"):
        current_user.theme = data["theme"]
    if "ai_provider" in data and data["ai_provider"] in ("groq", "gemini", "openai", "anthropic", "ollama"):
        current_user.ai_provider = data["ai_provider"]
    if "name" in data and data["name"]:
        current_user.name = data["name"]

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "moodle_connected": current_user.moodle_connected,
        "moodle_last_sync": current_user.moodle_last_sync,
        "ai_provider": current_user.ai_provider or "groq",
        "theme": current_user.theme or "dark",
        "created_at": current_user.created_at,
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Desconecta a sessão do Virtual2."""
    current_user.moodle_connected = False
    current_user.moodle_session_cookies = None
    db.commit()
    return {"message": "Sessão encerrada com sucesso"}
