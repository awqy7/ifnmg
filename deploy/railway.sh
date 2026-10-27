#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════════
# DEPLOY: IFNMG Assistente no Railway + Neon.tech
# ════════════════════════════════════════════════════════════════════════════════
# Uso: ./deploy/railway.sh
# Pré-requisitos:
#   - Railway CLI instalado (npm install -g @railway/cli)
#   - Neon.tech criado e connection string em backend/.env.neon
#   - Conta Railway criada e login feito
# ════════════════════════════════════════════════════════════════════════════════

set -e

# ─── Cores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Funções ─────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Validações ──────────────────────────────────────────────────────────────
log_info "Validando pré-requisitos..."

# Verificar se Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    log_error "Railway CLI não encontrado. Instale com: npm install -g @railway/cli"
    exit 1
fi

# Verificar se está logado
if ! railway whoami &> /dev/null; then
    log_error "Não está logado no Railway. Execute: railway login"
    exit 1
fi

# Verificar se .env.neon existe
if [ ! -f "backend/.env.neon" ]; then
    log_error "Arquivo backend/.env.neon não encontrado. Crie com a connection string do Neon."
    exit 1
fi

# ─── Backup do estado atual ──────────────────────────────────────────────────
log_info "Fazendo backup do estado atual..."

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup do SQLite local
if [ -f "backend/ifnmg_assistente.db" ]; then
    cp backend/ifnmg_assistente.db "$BACKUP_DIR/sqlite_backup.db"
    log_success "Backup SQLite: $BACKUP_DIR/sqlite_backup.db"
fi

# Backup do .env
cp backend/.env "$BACKUP_DIR/.env.backup" 2>/dev/null || true
log_success "Backup .env: $BACKUP_DIR/.env.backup"

# ─── Configurar Neon ─────────────────────────────────────────────────────────
log_info "Configurando Neon.tech..."

# Verificar se DATABASE_URL está definida no .env.neon
if ! grep -q "DATABASE_URL=" backend/.env.neon; then
    log_error "DATABASE_URL não encontrada em backend/.env.neon"
    exit 1
fi

# Extrair connection string do Neon
NEON_URL=$(grep "DATABASE_URL=" backend/.env.neon | cut -d'=' -f2-)
log_info "Connection string: ${NEON_URL:0:50}..."

# ─── Configurar Railway ──────────────────────────────────────────────────────
log_info "Configurando Railway..."

# Inicializar Railway se necessário
if [ ! -f ".railway/state.json" ]; then
    railway init
fi

# Configurar variáveis de ambiente
log_info "Configurando variáveis de ambiente..."

# Extrair valores do .env.neon
export $(grep -v '^#' backend/.env.neon | xargs)

# Configurar no Railway
railway variables set \
    APP_ENV=production \
    DEBUG=false \
    DATABASE_URL="$DATABASE_URL" \
    ALLOWED_ORIGINS="https://ifnmg.vercel.app,http://localhost:3000,http://127.0.0.1:3000" \
    DEFAULT_AI_PROVIDER=groq \
    GROQ_API_KEY="$GROQ_API_KEY" \
    SECRET_KEY="$SECRET_KEY" \
    ENCRYPTION_KEY="$ENCRYPTION_KEY" \
    MOODLE_BASE_URL=https://virtual2.ifnmg.edu.br \
    SCRAPER_INTERVAL_MINUTES=30 \
    ENABLE_PLAYWRIGHT_FALLBACK=false \
    BCRYPT_ROUNDS=12 \
    RATE_LIMIT_LOGIN_PER_MINUTE=5 \
    RATE_LIMIT_SYNC_PER_HOUR=10 \
    AI_REQUESTS_PER_DAY=200

log_success "Variáveis configuradas"

# ─── Deploy ──────────────────────────────────────────────────────────────────
log_info "Fazendo deploy no Railway..."

# Deploy do backend
cd backend
railway up

log_success "Deploy concluído!"

# ─── Verificação ─────────────────────────────────────────────────────────────
log_info "Verificando deploy..."

# Aguardar o deploy
sleep 10

# Verificar health
HEALTH_URL="https://ifnmg-assistente-production.up.railway.app/api/health"
if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    log_success "Health check OK: $HEALTH_URL"
else
    log_warning "Health check falhou. Verifique os logs:"
    railway logs
fi

# ─── Resumo ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  ✅ DEPLOY CONCLUÍDO"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  📊 Neon Dashboard: https://console.neon.tech"
echo "  🚀 Railway Dashboard: https://railway.app"
echo "  🏥 Health Check: $HEALTH_URL"
echo "  📝 Logs: railway logs"
echo ""
echo "  💡 Próximos passos:"
echo "     1. Configurar domínio customizado no Railway"
echo "     2. Configurar SSL/HTTPS"
echo "     3. Testar o sistema com login real"
echo ""