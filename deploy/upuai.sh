#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
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
#   5. backend/.env.supabase.bak com SECRET_KEY/ENCRYPTION_KEY (já está)
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

test -f "$BACKEND_DIR/.env.supabase.bak" || {
  echo "❌ Falta $BACKEND_DIR/.env.supabase.bak (veja o README)."
  exit 1
}
set -a
# shellcheck disable=SC1091
source "$BACKEND_DIR/.env.supabase.bak"
set +a

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
  DEFAULT_AI_PROVIDER="$DEFAULT_AI_PROVIDER" \
  GROQ_API_KEY="$GROQ_API_KEY"

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