#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════════
# CONFIGURAÇÃO RÁPIDA: Neon.tech
# ════════════════════════════════════════════════════════════════════════════════
# Este script ajuda a configurar o banco Neon.tech para o IFNMG Assistente.
#
# Uso: ./setup_neon.sh
# ════════════════════════════════════════════════════════════════════════════════

set -e

# ─── Cores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "${MAGENTA}[→]${NC} $1"; }
log_neon() { echo -e "${CYAN}[NEON]${NC} $1"; }

# ─── Header ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  🚀 IFNMG Assistente — Configuração Neon.tech"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# ─── Passo 1: Verificar pré-requisitos ───────────────────────────────────────
log_step "Passo 1: Verificando pré-requisitos..."

if ! command -v python3 &> /dev/null; then
    log_error "Python3 não encontrado. Instale o Python 3.10+."
    exit 1
fi
log_success "Python3 instalado"

if ! python3 -c "import sqlalchemy" &> /dev/null; then
    log_warning "SQLAlchemy não instalado. Executando: pip install -r requirements.txt"
    cd "$(dirname "$0")"
    pip install -r requirements.txt
fi
log_success "Dependências Python OK"

# ─── Passo 2: Instruções do Neon ─────────────────────────────────────────────
log_step "Passo 2: Criar conta no Neon.tech"
echo ""
log_info "Siga estas instruções:"
echo ""
echo "  1. Acesse: https://neon.tech"
echo "  2. Clique em 'Sign Up' (use Google ou email)"
echo "  3. Após login, clique em 'New Project'"
echo "  4. Nome do projeto: ifnmg-assistente"
echo "  5. Região: us-east-1 (AWS - São Paulo)"
echo "  6. Clique em 'Create Project'"
echo ""
read -p "  Pressione ENTER quando concluir..."
log_success "Conta Neon criada"

# ─── Passo 3: Obter Connection String ────────────────────────────────────────
log_step "Passo 3: Obter Connection String"
echo ""
log_neon "No dashboard do Neon:"
echo ""
echo "  1. Clique em 'Connect' no canto superior direito"
echo "  2. Selecione 'Python' ou 'Generic'"
echo "  3. Copie a connection string (parece com:)"
echo "     postgresql://postgres.xxx:senha@aws-us-east-1.neon.tech/neondb?sslmode=require"
echo ""
echo "  DICA: A string tem este formato:"
echo "  postgresql://[usuario]:[senha]@[host]:5432/[dbname]?sslmode=require"
echo ""
read -p "  Pressione ENTER quando tiver a connection string..."

# ─── Passo 4: Configurar .env ────────────────────────────────────────────────
log_step "Passo 4: Configurar arquivo .env"
echo ""

ENV_FILE="backend/.env"
if [ -f "$ENV_FILE" ]; then
    log_warning "Arquivo .env já existe. Criando backup..."
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
fi

# Copiar template
cp backend/.env.neon "$ENV_FILE"
log_success "Arquivo .env criado a partir do template"

# ─── Passo 5: Inserir Connection String ──────────────────────────────────────
log_step "Passo 5: Atualizar DATABASE_URL no .env"
echo ""
read -p "  Cole a connection string do Neon: " NEON_URL

# Validar URL
if [[ ! "$NEON_URL" =~ ^postgresql:// ]]; then
    log_error "Connection string inválida. Deve começar com 'postgresql://'"
    exit 1
fi

# Converter para formato SQLAlchemy
NEON_URL_ALCHEMY="${NEON_URL/postgresql/postgresql+psycopg}"

# Atualizar no .env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${NEON_URL_ALCHEMY}|" "$ENV_FILE"
log_success "DATABASE_URL atualizada"

# ─── Passo 6: Testar Conexão ─────────────────────────────────────────────────
log_step "Passo 6: Testando conexão com o Neon..."
echo ""

cd "$(dirname "$0")"
if python3 -c "
from sqlalchemy import create_engine, text
engine = create_engine('${NEON_URL_ALCHEMY}')
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1')).scalar()
    print(f'Conexão OK: {result}')
" &> /dev/null; then
    log_success "Conexão com Neon funcionando!"
else
    log_error "Falha na conexão. Verifique a connection string."
    exit 1
fi

# ─── Passo 7: Rodar Migrações ────────────────────────────────────────────────
log_step "Passo 7: Rodando migrações do Alembic..."
echo ""

python3 -m alembic upgrade head
log_success "Migrações aplicadas com sucesso"

# ─── Passo 8: Resumo ─────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
log_success "CONFIGURAÇÃO CONCLUÍDA!"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  📊 Dashboard Neon: https://console.neon.tech"
echo "  📊 Dashboard IFNMG: http://localhost:8000/api/admin/dashboard"
echo "  🏥 Health Check: http://localhost:8000/api/health"
echo ""
echo "  💡 Próximos passos:"
echo "     1. Inicie o backend: ./start.sh"
echo "     2. Acesse o dashboard: http://localhost:8000/api/admin/dashboard"
echo "     3. Configure o deploy no Railway (opcional)"
echo ""
echo "  📝 Arquivos criados/modificados:"
echo "     - backend/.env (configurações atuais)"
echo "     - backend/.env.neon (template)"
echo ""