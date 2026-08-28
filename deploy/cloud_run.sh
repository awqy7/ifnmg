#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# IFNMG Assistente — Deploy do BACKEND no Google Cloud Run (São Paulo)
# ═══════════════════════════════════════════════════════════════════════════
# GTINÁTIA
#   • Região southamerica-east1 == IP brasileiro → passa no bloqueio do Moodle.
#   • Cloud Run free tier: escala a zero (min-instances=0) → $$0.
#   • O frontend fica na Vercel (grátis) e aponta para a URL .run.app.
#
# PRÉ-REQUISITOS (uma vez só):
#   1. Criar conta Google Cloud e projeto (sem cartão para o free tier do
#      Cloud Run Sul-América; cartão só é pedido se ativar faturamento).
#   2. Instalar gcloud:  https://cloud.google.com/sdk/docs/install
#   3. gcloud auth login
#   4. gcloud config set project SEU_PROJETO_ID
#   5. Conferir backend/.env.supabase.bak (SECRET_KEY/ENCRYPTION_KEY já lá)
#
# Uso:  ./deploy/cloud_run.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"
REGION="${REGION:-southamerica-east1}"
SERVICE="${SERVICE:-ifnmg-backend}"
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-}"

if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null | tr -d '\n')"
fi
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "❌ Defina o projeto:  gcloud config set project SEU_PROJETO_ID"
  exit 1
fi

test -f "$BACKEND_DIR/.env.supabase.bak" || {
  echo "❌ Falta $BACKEND_DIR/.env.supabase.bak (veja o README)"; exit 1; }

# Carrega as variáveis de produção (DATABASE_URL, SECRET_KEY, ENCRYPTION_KEY, ...)
set -a
source "$BACKEND_DIR/.env.supabase.bak"
set +a

echo "▶ Projeto: $PROJECT_ID | Região: $REGION | Serviço: $SERVICE"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  --project "$PROJECT_ID" >/dev/null

echo "▶ Build + deploy (isso leva alguns minutos)..."
gcloud run deploy "$SERVICE" \
  --source "$BACKEND_DIR" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --platform managed \
  --min-instances 0 \
  --max-instances 1 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 120 \
  --set-env-vars APP_ENV=production \
  --set-env-vars DEBUG=false \
  --set-env-vars DATABASE_URL="$DATABASE_URL" \
  --set-env-vars ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  --set-env-vars SECRET_KEY="$SECRET_KEY" \
  --set-env-vars ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  --set-env-vars DEFAULT_AI_PROVIDER="${DEFAULT_AI_PROVIDER:-groq}" \
  --set-env-vars GROQ_API_KEY="${GROQ_API_KEY:-}"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" \
  --project "$PROJECT_ID" --format 'value(status.url)')"

echo
echo "════════════════════════════════════════════════════════════════"
echo "✅ Backend no ar:  $URL"
echo
echo "ÚLTIMO PASSO (Vercel):"
echo "  1) Painel da Vercel → projeto ifnmg → Settings → Environment Variables"
echo "  2) Altere NEXT_PUBLIC_API_URL para:  ${URL}"
echo "  3) Deploy (reproduzir o deploy / Redeploy)."
echo "════════════════════════════════════════════════════════════════"

# Opcional: validação automática
echo
echo "▶ Validando (aguarde ~30s pro cold start)..."
sleep 20
curl -fsS -o /dev/null -w "health: HTTP %{http_code}\n" "$URL/api/health" || echo "⚠️ health ainda frio; tente de novo em instantes"