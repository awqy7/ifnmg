#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# IFNMG Assistente — Deploy do BACKEND na Upuai Cloud (PaaS brasileira)
# ═══════════════════════════════════════════════════════════════════════════
# Por quê: IP brasileiro (datacenter no BR) → passa no bloqueio do Moodle
# do Virtual2, que recusa autenticação vinda de IPs estrangeiros (Render/EUA).
#
# PRÉ-REQUISITOS (uma vez só, na sua máquina):
#   1. Criar conta grátis (sem cartão): https://upuai.com.br
#   2. Instalar CLI:
#        brew install saiph-ti/upuai-cli/upuai        (macOS/Linux)
#        baixar binário: github.com/saiph-ti/upuai-cli/releases
#   3. upuai login          (browser OAuth — rodar você mesmo)
#   4. Autorizar o GitHub App quando o init pedir
#      (ou já em https://app.upuai.com.br/projects/new)
#   5. Variáveis de ambiente definidas no shell ou .env.local (NÃO commite .env)
#      - DATABASE_URL (PostgreSQL gerenciado)
#      - SECRET_KEY (python3 -c "import secrets; print(secrets.token_hex(32))")
#      - ENCRYPTION_KEY (python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
#      - GROQ_API_KEY (https://console.groq.com)
#      - ALLOWED_ORIGINS (ex: https://ifnmg.vercel.app,http://localhost:3000)
#
# Uso:  ./deploy/upuai.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"
SERVICE="${SERVICE:-ifnmg-backend}"
BRANCH="${BRANCH:-main}"

command -v upuai >/dev/null 2>&1 || {
  echo "❌ CLI ausente. Instale: brew install saiph-ti/upuai-cli/upuai" \
    "ou veja github.com/saiph-ti/upuai-cli/releases"
  exit 1
}

echo "▶ Conferindo sessão (upuai whoami)..."
upuai whoami >/dev/null 2>&1 || {
  echo "❌ Rode 'upuai login' primeiro (browser OAuth, na sua máquina)."
  exit 1
}

# Carrega variáveis de .env.local se existir
if [ -f "$BACKEND_DIR/.env.local" ]; then
  set -a
  source "$BACKEND_DIR/.env.local"
  set +a
fi

# Verifica variáveis obrigatórias
required_vars=("DATABASE_URL" "SECRET_KEY" "ENCRYPTION_KEY" "GROQ_API_KEY" "ALLOWED_ORIGINS")
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "❌ Variável obrigatória não definida: $var"
    echo "   Defina no shell ou em $BACKEND_DIR/.env.local"
    exit 1
  fi
done

# ────────────── 1) Projeto + fonte ──────────────
if ! upuai ls -o json 2>/dev/null | grep -q "$SERVICE"; then
  echo "▶ Inicializando projeto $SERVICE (autorize o GitHub App se pedir)..."
  upuai init --name "$SERVICE" \
    --repo awqy7/ifnmg \
    --branch "$BRANCH" \
    --framework "Python" \
    --root-dir backend \
    --yes
fi

# ────────────── 2) Variáveis de produção ──────────────
echo "▶ Aplicando variáveis de ambiente..."
upuai vars set APP_ENV=production \
  DEBUG=false \
  DATABASE_URL="$DATABASE_URL" \
  ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  SECRET_KEY="$SECRET_KEY" \
  ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  DEFAULT_AI_PROVIDER="${DEFAULT_AI_PROVIDER:-groq}" \
  GROQ_API_KEY="$GROQ_API_KEY" \
  GROQ_MODEL="${GROQ_MODEL:-openai/gpt-oss-20b}" \
  GROQ_FALLBACK_MODEL="${GROQ_FALLBACK_MODEL:-openai/gpt-oss-120b}" \
  BCRYPT_ROUNDS="${BCRYPT_ROUNDS:-12}" \
  RATE_LIMIT_LOGIN_PER_MINUTE="${RATE_LIMIT_LOGIN_PER_MINUTE:-5}" \
  JWT_ALGORITHM="${JWT_ALGORITHM:-HS256}"

# ────────────── 3) Deploy ──────────────
echo "▶ Deploy (pode levar alguns minutos)..."
upuai deploy --wait --yes -o json

echo
echo "══════════════════════════════════════════════════════════════"
echo "✅ Backend no ar. Passe a URL *.upuai.com.br (último campo do"
echo "   JSON acima) para o próximo passo — apontar a Vercel."
echo
echo "Próximos passos:"
echo "  1) curl -s URL/api/health   → deve responder {\"status\":\"ok\"}"
echo "  2) Vercel → Settings → Env Vars → NEXT_PUBLIC_API_URL=URL → Deploy"
echo "══════════════════════════════════════════════════════════════"
