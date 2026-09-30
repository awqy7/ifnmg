"""
Rotas de autenticação direta via Virtual2 IFNMG (Moodle).
Sem necessidade de criar conta separada: o login do Virtual2 é a única credencial.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Response
from fastapi.security import OAuth2PasswordBearer, HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.services.moodle_auth import moodle_auth_service
from app.services.crypto_service import crypto_service
from app.services.scheduler import sync_moodle_for_user, get_sync_status, mark_sync_queued
from app.services.datetime_utils import utc_iso, utc_now_naive

# ─── Schemas (definidos ANTES das rotas que os usam) ──────────────────────────

class MoodleDirectLogin(BaseModel):
    username: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=1, max_length=1024)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    theme: Optional[str] = Field(default=None, max_length=10)
    ai_provider: Optional[str] = Field(default=None, max_length=50)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    moodle_connected: bool
    moodle_last_sync: Optional[datetime]
    ai_provider: str
    theme: str
    created_at: datetime


router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/moodle-login", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)
ALGORITHM = settings.JWT_ALGORITHM

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=settings.BCRYPT_ROUNDS)

login_attempts: dict[str, list[datetime]] = {}
_last_login_cleanup = utc_now_naive()


def check_rate_limit(ip: str, limit: int, window_seconds: int = 60) -> bool:
    global _last_login_cleanup
    now = utc_now_naive()
    if (now - _last_login_cleanup).total_seconds() >= window_seconds:
        for key, attempts in list(login_attempts.items()):
            fresh = [t for t in attempts if (now - t).total_seconds() < window_seconds]
            if fresh:
                login_attempts[key] = fresh
            else:
                login_attempts.pop(key, None)
        _last_login_cleanup = now
    if ip not in login_attempts:
        login_attempts[ip] = []
    login_attempts[ip] = [t for t in login_attempts[ip] if (now - t).total_seconds() < window_seconds]
    if len(login_attempts[ip]) >= limit:
        return False
    login_attempts[ip].append(now)
    return True


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, session_version: int = 0) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {
            "sub": user_id,
            "sv": session_version,
            "exp": expire,
            "iat": now,
            "jti": secrets.token_hex(16),
        },
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def set_auth_cookie(response: Response, token: str):
    """Define o cookie httpOnly com o token JWT."""
    is_production = settings.APP_ENV == "production"
    # Em desenvolvimento HTTP, Secure impediria o navegador de salvar o cookie.
    response.set_cookie(
        key="ifnmg_token",
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(response: Response):
    """Remove o cookie de autenticação."""
    response.set_cookie(
        key="ifnmg_token",
        value="",
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=0,
        path="/",
    )


async def get_current_user(
    request: Request,
    response: Response,
    token: Optional[str] = Depends(oauth2_scheme),
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão expirada. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_str = token or (bearer.credentials if bearer else None)
    # Fallback: tenta ler do cookie
    if not token_str:
        token_str = request.cookies.get("ifnmg_token")
    
    if not token_str:
        raise credentials_exception

    try:
        payload = jwt.decode(token_str, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        session_version = int(payload.get("sv", 0))
        if not user_id:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user or int(user.session_version or 0) != session_version:
        raise credentials_exception
    return user


# ─── Rotas de Login Direto ──────────────────────────────────────────────────

@router.post("/moodle-login", response_model=dict)
async def moodle_login(
    request: Request,
    response: Response,
    data: MoodleDirectLogin,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Login direto com as credenciais do Virtual2 IFNMG.
    Não requer cadastro prévio: autentica no Moodle e cria a sessão local automaticamente.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, settings.RATE_LIMIT_LOGIN_PER_MINUTE, 60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Aguarde um minuto.",
        )

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

    student_name = session_data.get("user_name") or f"Aluno {username}"
    user_email = f"{username}@virtual2.ifnmg.edu.br"

    user = db.query(User).filter(User.email == user_email, User.is_active == True).first()

    if not user:
        user = User(
            name=student_name,
            email=user_email,
            # Não existe login por senha local. Mantemos um hash aleatório para
            # compatibilidade com o schema sem criar um verificador da senha Moodle.
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            moodle_username_enc=crypto_service.encrypt(username),
            moodle_password_enc=crypto_service.encrypt(password),
            moodle_session_cookies=crypto_service.encrypt_json(session_data),
            moodle_connected=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.name = student_name
        user.moodle_username_enc = crypto_service.encrypt(username)
        user.moodle_password_enc = crypto_service.encrypt(password)
        user.moodle_session_cookies = crypto_service.encrypt_json(session_data)
        user.moodle_connected = True
        db.commit()

    moodle_token = session_data.get("moodle_token") or await moodle_auth_service.get_moodle_token(username, password)
    if moodle_token:
        user.moodle_token_enc = crypto_service.encrypt(moodle_token)
        db.commit()

    sync_status = get_sync_status(user.id, db)
    if not (sync_status.get("running") or sync_status.get("enrichment_running")):
        mark_sync_queued(db, user.id)
        background_tasks.add_task(sync_moodle_for_user, user.id)

    token = create_access_token(user.id, int(user.session_version or 0))
    set_auth_cookie(response, token)

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "username": username,
            "moodle_connected": True,
        },
    }


@router.get("/me", response_model=dict)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retorna dados do usuário atualmente logado."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "moodle_connected": current_user.moodle_connected,
        "moodle_last_sync": utc_iso(current_user.moodle_last_sync),
        "ai_provider": current_user.ai_provider or "groq",
        "theme": current_user.theme or "dark",
        "notification_settings": current_user.notification_settings or {},
        "created_at": utc_iso(current_user.created_at),
    }


@router.post("/websocket-ticket", response_model=dict)
async def create_websocket_ticket(current_user: User = Depends(get_current_user)):
    """Emite credencial curta e de uso exclusivo para abrir o WebSocket."""
    now = datetime.now(timezone.utc)
    ticket = jwt.encode(
        {
            "sub": current_user.id,
            "iat": now,
            "exp": now + timedelta(seconds=60),
            "aud": "websocket",
            "scope": "notifications:read",
            "sv": int(current_user.session_version or 0),
            "jti": secrets.token_hex(16),
        },
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"ticket": ticket, "expires_in": 60}


@router.put("/me", response_model=dict)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza preferências do usuário (tema, ai_provider, etc)."""
    if data.theme in ("dark", "light"):
        current_user.theme = data.theme
    if data.ai_provider in ("groq", "gemini", "openai", "anthropic", "ollama"):
        current_user.ai_provider = data.ai_provider
    if data.name:
        current_user.name = data.name.strip()

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "moodle_connected": current_user.moodle_connected,
        "moodle_last_sync": utc_iso(current_user.moodle_last_sync),
        "ai_provider": current_user.ai_provider or "groq",
        "theme": current_user.theme or "dark",
        "notification_settings": current_user.notification_settings or {},
        "created_at": utc_iso(current_user.created_at),
    }


@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Encerra apenas a sessão do aplicativo, preservando a conexão ao Virtual2."""
    current_user.session_version = int(current_user.session_version or 0) + 1
    db.commit()
    clear_auth_cookie(response)
    return {"message": "Sessão encerrada com sucesso"}
