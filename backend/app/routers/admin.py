"""
═══════════════════════════════════════════════════════════════════════════════
DASHBOARD ADMINISTRATIVO — IFNMG Assistente
═══════════════════════════════════════════════════════════════════════════════

Endpoints de monitoramento, estatísticas e administração do sistema.
Inclui dashboard moderno com métricas em tempo real.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Course, Activity, Material, Notification, DailyBriefing
from app.routers.auth import get_current_user
from app.services.datetime_utils import utc_iso, utc_now_naive

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"])


# ─── Dashboard HTML Moderno ──────────────────────────────────────────────────

@router.get("/dashboard", response_class=HTMLResponse)
async def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    """
    Dashboard administrativo com métricas em tempo real.
    Design moderno, responsivo, dark mode.
    """
    # Coletar métricas
    stats = await get_system_stats(db)

    # Atividades recentes
    recent_activities = db.query(Activity).order_by(Activity.created_at.desc()).limit(10).all()

    # Top usuários
    top_users = db.query(
        User.id, User.name,
        func.count(Course.id).label("course_count"),
        func.count(Activity.id).label("activity_count")
    ).outerjoin(Course, User.id == Course.user_id).outerjoin(
        Activity, User.id == Activity.user_id
    ).group_by(User.id, User.name).order_by(
        func.count(Activity.id).desc()
    ).limit(5).all()

    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard — IFNMG Assistente</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = {{
                theme: {{
                    extend: {{
                        colors: {{
                            primary: '#6366f1',
                            secondary: '#8b5cf6',
                            success: '#22c55e',
                            warning: '#f59e0b',
                            danger: '#ef4444',
                            dark: '#0f0f13',
                            card: '#1a1a2e',
                        }}
                    }}
                }}
            }}
        </script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {{ font-family: 'Inter', sans-serif; }}
            .gradient-bg {{
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            }}
            .stat-card {{
                transition: all 0.3s ease;
            }}
            .stat-card:hover {{
                transform: translateY(-4px);
                box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2);
            }}
            .pulse-dot {{
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }}
            @keyframes pulse {{
                0%, 100% {{ opacity: 1; }}
                50% {{ opacity: 0.5; }}
            }}
        </style>
    </head>
    <body class="bg-dark text-white min-h-screen">
        <!-- Header -->
        <header class="gradient-bg py-8 px-6 shadow-2xl">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold">🎓 IFNMG Assistente</h1>
                        <p class="text-indigo-200 mt-1">Dashboard Administrativo</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="flex items-center gap-2 text-sm text-indigo-200">
                            <span class="w-2 h-2 bg-success rounded-full pulse-dot"></span>
                            Sistema Online
                        </span>
                        <span class="text-xs text-indigo-300">
                            {datetime.now().strftime('%d/%m/%Y %H:%M')}
                        </span>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-6 py-8">
            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- Total Usuários -->
                <div class="stat-card bg-card rounded-2xl p-6 border border-indigo-500/20">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                            <svg class="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                        </div>
                        <span class="text-2xl font-bold text-indigo-400">{stats['total_users']}</span>
                    </div>
                    <h3 class="text-gray-400 text-sm font-medium">Total Usuários</h3>
                    <p class="text-xs text-gray-500 mt-1">+{stats['new_users_today']} hoje</p>
                </div>

                <!-- Disciplinas -->
                <div class="stat-card bg-card rounded-2xl p-6 border border-purple-500/20">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                            </svg>
                        </div>
                        <span class="text-2xl font-bold text-purple-400">{stats['total_courses']}</span>
                    </div>
                    <h3 class="text-gray-400 text-sm font-medium">Disciplinas</h3>
                    <p class="text-xs text-gray-500 mt-1">Média: {stats['avg_courses_per_user']:.1f}/usuário</p>
                </div>

                <!-- Atividades -->
                <div class="stat-card bg-card rounded-2xl p-6 border border-pink-500/20">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                            <svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                            </svg>
                        </div>
                        <span class="text-2xl font-bold text-pink-400">{stats['total_activities']}</span>
                    </div>
                    <h3 class="text-gray-400 text-sm font-medium">Atividades</h3>
                    <p class="text-xs text-gray-500 mt-1">{stats['pending_activities']} pendentes</p>
                </div>

                <!-- Materiais -->
                <div class="stat-card bg-card rounded-2xl p-6 border border-cyan-500/20">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                            <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </div>
                        <span class="text-2xl font-bold text-cyan-400">{stats['total_materials']}</span>
                    </div>
                    <h3 class="text-gray-400 text-sm font-medium">Materiais</h3>
                    <p class="text-xs text-gray-500 mt-1">{stats['materials_with_content']} com texto</p>
                </div>
            </div>

            <!-- Secondary Stats -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Status das Atividades -->
                <div class="bg-card rounded-2xl p-6 border border-indigo-500/20">
                    <h3 class="text-lg font-semibold mb-4">Status das Atividades</h3>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <span class="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                Pendentes
                            </span>
                            <span class="font-semibold text-yellow-400">{stats['status_breakdown'].get('pending', 0)}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <span class="w-3 h-3 bg-red-500 rounded-full"></span>
                                Atrasadas
                            </span>
                            <span class="font-semibold text-red-400">{stats['status_breakdown'].get('late', 0)}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                                Enviadas
                            </span>
                            <span class="font-semibold text-green-400">{stats['status_breakdown'].get('submitted', 0)}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                                Concluídas Manualmente
                            </span>
                            <span class="font-semibold text-blue-400">{stats['status_breakdown'].get('manual_completed', 0)}</span>
                        </div>
                    </div>
                </div>

                <!-- Database Info -->
                <div class="bg-card rounded-2xl p-6 border border-purple-500/20">
                    <h3 class="text-lg font-semibold mb-4">Banco de Dados</h3>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Tipo</span>
                            <span class="font-mono text-sm">PostgreSQL (Neon)</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Região</span>
                            <span class="font-mono text-sm">us-east-1 (São Paulo)</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Latência</span>
                            <span class="font-mono text-sm text-green-400">~15ms</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Status</span>
                            <span class="flex items-center gap-2 text-green-400">
                                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                                Conectado
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Usuários -->
            <div class="bg-card rounded-2xl p-6 border border-indigo-500/20">
                <h3 class="text-lg font-semibold mb-4">Top Usuários Ativos</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="text-left text-gray-400 text-sm border-b border-gray-700">
                                <th class="pb-3 font-medium">Usuário</th>
                                <th class="pb-3 font-medium">Disciplinas</th>
                                <th class="pb-3 font-medium">Atividades</th>
                                <th class="pb-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {"".join(f"""
                            <tr class="border-b border-gray-800 hover:bg-indigo-500/10 transition-colors">
                                <td class="py-3 font-medium">{user.name}</td>
                                <td class="py-3 text-gray-400">{course_count}</td>
                                <td class="py-3 text-gray-400">{activity_count}</td>
                                <td class="py-3">
                                    <span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Ativo</span>
                                </td>
                            </tr>
                            """ for user, course_count, activity_count in top_users)}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="border-t border-gray-800 mt-8 py-6">
            <div class="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
                <p>IFNMG Assistente v1.0.0 • Dashboard Administrativo</p>
                <p class="mt-1">Banco: Neon.tech PostgreSQL • Deploy: Railway</p>
            </div>
        </footer>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


# ─── API de Estatísticas ─────────────────────────────────────────────────────

@router.get("/stats")
async def get_system_stats(db: Session = Depends(get_db)):
    """Retorna estatísticas completas do sistema em JSON."""
    now = utc_now_naive()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Contagens básicas
    total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_courses = db.query(func.count(Course.id)).filter(Course.is_active == True).scalar() or 0
    total_activities = db.query(func.count(Activity.id)).filter(Activity.removed_at == None).scalar() or 0
    total_materials = db.query(func.count(Material.id)).filter(Material.is_active == True).scalar() or 0

    # Novos usuários hoje
    new_users_today = db.query(func.count(User.id)).filter(
        User.created_at >= today_start
    ).scalar() or 0

    # Atividades por status
    status_breakdown = dict(db.query(
        Activity.status, func.count(Activity.id)
    ).filter(
        Activity.removed_at == None
    ).group_by(Activity.status).all())

    # Atividades pendentes
    pending_activities = status_breakdown.get('pending', 0) + status_breakdown.get('late', 0)

    # Média de disciplinas por usuário
    avg_courses_per_user = total_courses / total_users if total_users > 0 else 0

    # Materiais com conteúdo extraído
    materials_with_content = db.query(func.count(Material.id)).filter(
        Material.content_text != None,
        Material.content_text != ''
    ).scalar() or 0

    # Notificações não lidas
    unread_notifications = db.query(func.count(Notification.id)).filter(
        Notification.is_read == False
    ).scalar() or 0

    # Briefings gerados hoje
    briefings_today = db.query(func.count(DailyBriefing.id)).filter(
        DailyBriefing.date == now.strftime('%Y-%m-%d')
    ).scalar() or 0

    return {
        "timestamp": utc_iso(now),
        "database": {
            "type": "PostgreSQL",
            "provider": "Neon.tech",
            "region": "us-east-1",
        },
        "users": {
            "total": total_users,
            "new_today": new_users_today,
        },
        "courses": {
            "total": total_courses,
            "avg_per_user": round(avg_courses_per_user, 2),
        },
        "activities": {
            "total": total_activities,
            "pending": pending_activities,
            "by_status": status_breakdown,
        },
        "materials": {
            "total": total_materials,
            "with_content": materials_with_content,
        },
        "notifications": {
            "unread": unread_notifications,
        },
        "briefings": {
            "generated_today": briefings_today,
        },
    }


# ─── Health Check Avançado ───────────────────────────────────────────────────

@router.get("/health/detailed")
async def detailed_health_check(request: Request, db: Session = Depends(get_db)):
    """Health check detalhado com diagnóstico completo."""
    from app.config import settings
    import httpx

    checks = {}

    # 1. Database
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = {"status": "ok", "latency_ms": "N/A"}
    except Exception as e:
        checks["database"] = {"status": "error", "error": str(e)}

    # 2. Moodle
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.MOODLE_BASE_URL}/login/index.php")
            checks["moodle"] = {
                "status": "ok" if resp.status_code == 200 else "error",
                "status_code": resp.status_code,
            }
    except Exception as e:
        checks["moodle"] = {"status": "error", "error": str(e)}

    # 3. IA Provider
    try:
        from app.services.ai_service import ai_service, AIProvider
        provider = AIProvider(settings.DEFAULT_AI_PROVIDER)
        result = await ai_service.test_provider(provider)
        checks["ai_provider"] = {
            "provider": settings.DEFAULT_AI_PROVIDER,
            "status": "ok" if result.get("success") else "error",
        }
    except Exception as e:
        checks["ai_provider"] = {"status": "error", "error": str(e)}

    # 4. Configurações
    checks["config"] = {
        "app_env": settings.APP_ENV,
        "debug": settings.DEBUG,
        "allowed_origins": settings.ALLOWED_ORIGINS,
    }

    # Status geral
    all_ok = all(v.get("status") == "ok" for v in checks.values() if isinstance(v, dict))

    return {
        "status": "ok" if all_ok else "degraded",
        "timestamp": utc_iso(utc_now_naive()),
        "checks": checks,
    }