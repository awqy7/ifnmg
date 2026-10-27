"""
FastAPI — Aplicação principal do IFNMG Assistente Backend.
"""
import logging
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Callable
from urllib.parse import urlsplit

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import create_tables

# Configura logging estruturado
class SanitizingFormatter(logging.Formatter):
    SENSITIVE_PATTERNS = [
        (re.compile(r'gsk_[A-Za-z0-9_-]+'), '***GROQ_KEY_REDACTED***'),
        (re.compile(r'sk-[A-Za-z0-9_-]+'), '***OPENAI_KEY_REDACTED***'),
        (re.compile(r'AIza[\w-]+'), '***GOOGLE_KEY_REDACTED***'),
        (re.compile(r'(?i)(password|senha|token|secret|key|authorization)=[^\s&]+'), r'\1=***REDACTED***'),
        (re.compile(r'Bearer\s+[A-Za-z0-9\-_=.]+'), 'Bearer ***REDACTED***'),
        (re.compile(r'(?i)eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+'), '***JWT_REDACTED***'),
    ]
    
    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            msg = pattern.sub(replacement, msg)
        return msg

handler = logging.StreamHandler()
handler.setFormatter(SanitizingFormatter(
    "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
))
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    handlers=[handler],
)
logger = logging.getLogger(__name__)


# Rate limiting simples em memória (para produção usar Redis)
rate_limit_store: dict[str, list[float]] = {}
_last_rate_limit_cleanup = 0.0


def _origin_is_allowed(origin: str) -> bool:
    if origin in settings.allowed_origins_list:
        return True
    return bool(
        settings.ALLOWED_ORIGIN_REGEX
        and re.fullmatch(settings.ALLOWED_ORIGIN_REGEX, origin)
    )


class CsrfOriginMiddleware(BaseHTTPMiddleware):
    """Bloqueia ações cross-site autenticadas por cookie.

    Clientes nativos/Bearer continuam funcionando sem Origin. Navegadores
    sempre enviam Origin em formulários e fetches mutáveis cross-site.
    """

    async def dispatch(self, request: Request, call_next: Callable):
        if (
            request.method in {"POST", "PUT", "PATCH", "DELETE"}
            and request.url.path.startswith("/api/")
            and request.cookies.get("ifnmg_token")
            and not request.headers.get("authorization")
        ):
            origin = request.headers.get("origin")
            referer = request.headers.get("referer")
            if not origin and referer:
                parsed = urlsplit(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else None
            if not origin or not _origin_is_allowed(origin):
                return Response(
                    content='{"detail":"Origem não autorizada"}',
                    status_code=403,
                    media_type="application/json",
                )
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
    
    async def dispatch(self, request: Request, call_next: Callable):
        global _last_rate_limit_cleanup
        if request.url.path in ("/api/health", "/", "/api/docs", "/api/redoc", "/api/openapi.json"):
            return await call_next(request)
        
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Remove chaves antigas periodicamente para o dicionário não crescer
        # indefinidamente sob tráfego de muitos endereços.
        if now - _last_rate_limit_cleanup >= self.window:
            for key, timestamps in list(rate_limit_store.items()):
                fresh = [value for value in timestamps if now - value < self.window]
                if fresh:
                    rate_limit_store[key] = fresh
                else:
                    rate_limit_store.pop(key, None)
            _last_rate_limit_cleanup = now
        
        if client_ip not in rate_limit_store:
            rate_limit_store[client_ip] = []
        
        rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < self.window]
        
        if len(rate_limit_store[client_ip]) >= self.limit:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window)}
            )
        
        rate_limit_store[client_ip].append(now)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if request.url.path.startswith("/api/") and request.url.path not in {
            "/api/health", "/api/health/ready", "/api/openapi.json", "/api/docs", "/api/redoc"
        }:
            response.headers["Cache-Control"] = "no-store"
        return response


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["Server-Timing"] = f'app;dur={(time.perf_counter() - started) * 1000:.1f}'
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle do app: startup e shutdown."""
    logger.info("Iniciando IFNMG Assistente Backend...")

    create_tables()
    logger.info("Banco de dados inicializado")

    from app.services.scheduler import start_scheduler
    start_scheduler()

    yield

    from app.services.scheduler import scheduler
    if scheduler.running:
        scheduler.shutdown()
    logger.info("Backend encerrado")


# ─── Cria a aplicação ────────────────────────────────────────────────────────
app = FastAPI(
    title="IFNMG Assistente API",
    description="Backend do sistema de assistência acadêmica com IA para o IFNMG",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─── Middlewares ─────────────────────────────────────────────────────────────

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, limit=200, window=60)
app.add_middleware(CsrfOriginMiddleware)
app.add_middleware(RequestContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["X-Content-Type-Options"],
    max_age=3600,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Routers ─────────────────────────────────────────────────────────────────

from app.routers.auth import router as auth_router
from app.routers.moodle import router as moodle_router
from app.routers.courses import router as courses_router
from app.routers.activities import router as activities_router
from app.routers.briefing import router as briefing_router
from app.routers.chat import router as chat_router
from app.routers.notifications import notifications_router
from app.routers.websocket import router as ws_router
from app.routers.dashboard import router as dashboard_router
from app.routers.admin import router as admin_router

app.include_router(auth_router)
app.include_router(moodle_router)
app.include_router(courses_router)
app.include_router(activities_router)
app.include_router(briefing_router)
app.include_router(chat_router)
app.include_router(notifications_router)
app.include_router(ws_router)
app.include_router(dashboard_router)
app.include_router(admin_router)


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "app": "IFNMG Assistente",
    }


@app.get("/api/health/ready")
async def readiness():
    """Readiness real: confirma que o banco está acessível."""
    from sqlalchemy import text
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "ok"}
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "IFNMG Assistente API v1.0.0 — Acesse /api/docs"}
