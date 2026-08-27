"""
FastAPI — Aplicação principal do IFNMG Assistente Backend.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.database import create_tables

# Configura logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle do app: startup e shutdown."""
    logger.info("🚀 Iniciando IFNMG Assistente Backend...")

    # Cria tabelas do banco de dados
    create_tables()
    logger.info("✅ Banco de dados inicializado")

    # Instala browsers do Playwright (se necessário)
    try:
        import subprocess
        subprocess.run(["playwright", "install", "chromium"], capture_output=True, timeout=15)
        logger.info("✅ Playwright Chromium verificado")
    except Exception as e:
        logger.warning(f"Playwright: {e}")

    # Inicia scheduler de jobs
    from app.services.scheduler import start_scheduler
    start_scheduler()

    yield  # App rodando

    # Shutdown
    from app.services.scheduler import scheduler
    if scheduler.running:
        scheduler.shutdown()
    logger.info("👋 Backend encerrado")


# ─── Cria a aplicação ────────────────────────────────────────────────────────
app = FastAPI(
    title="IFNMG Assistente API",
    description="Backend do sistema de assistência acadêmica com IA para o IFNMG",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── Middlewares ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Routers ─────────────────────────────────────────────────────────────────

from app.routers.auth import router as auth_router
from app.routers.moodle import router as moodle_router
from app.routers.courses import router as courses_router
from app.routers.activities import router as activities_router
from app.routers.grades import router as grades_router
from app.routers.calendar import router as calendar_router
from app.routers.briefing import router as briefing_router
from app.routers.chat import router as chat_router
from app.routers.notifications import notifications_router, schedule_router
from app.routers.websocket import router as ws_router

app.include_router(auth_router)
app.include_router(moodle_router)
app.include_router(courses_router)
app.include_router(activities_router)
app.include_router(grades_router)
app.include_router(calendar_router)
app.include_router(briefing_router)
app.include_router(chat_router)
app.include_router(notifications_router)
app.include_router(schedule_router)
app.include_router(ws_router)


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "app": "IFNMG Assistente",
    }


@app.get("/")
async def root():
    return {"message": "IFNMG Assistente API v1.0.0 — Acesse /api/docs"}
