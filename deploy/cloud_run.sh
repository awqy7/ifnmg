#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# IFNMG Assistente — Deploy do BACKEND no Google Cloud Run (São Paulo)
# ═══════════════════════════════════════════════════════════════════════════
# REQUISITOS:
#   1. Conta Google Cloud + projeto (free tier Cloud Run Sul-América não precisa cartão)
#   2. gcloud instalado e autenticado: gcloud auth login
#   3. gcloud config set project SEU_PROJETO_ID
#   4. Variáveis de ambiente definidas no shell ou .env.local (NÃO commite .env)
#      - DATABASE_URL (PostgreSQL gerenciado, ex: Supabase/Cloud SQL)
#      - SECRET_KEY (python3 -c "import secrets; print(secrets.token_hex(32))")
#      - ENCRYPTION_KEY (python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
#      - GROQ_API_KEY (https://console.groq.com)
#      - ALLOWED_ORIGINS (ex: https://ifnmg.vercel.app,http://localhost:3000)
#
# IMPORTANTE: este projeto mantém sincronização e lembretes no APScheduler.
# Por isso o deploy abaixo mantém uma instância com CPU sempre alocada. Isso
# evita que os jobs parem durante períodos sem requisições, mas pode gerar custo.
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

# Carrega variáveis de .env.local se existir (para desenvolvimento local)
# Em CI/CD, defina as variáveis diretamente no ambiente
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
  --min-instances 1 \
  --max-instances 1 \
  --no-cpu-throttling \
  --cpu 1 \
  --memory 1Gi \
  --timeout 120 \
  --set-env-vars APP_ENV=production \
  --set-env-vars DEBUG=false \
  --set-env-vars DATABASE_URL="$DATABASE_URL" \
  --set-env-vars ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  --set-env-vars SECRET_KEY="$SECRET_KEY" \
  --set-env-vars ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  --set-env-vars DEFAULT_AI_PROVIDER="${DEFAULT_AI_PROVIDER:-groq}" \
  --set-env-vars GROQ_API_KEY="$GROQ_API_KEY" \
  --set-env-vars BCRYPT_ROUNDS="${BCRYPT_ROUNDS:-12}" \
  --set-env-vars RATE_LIMIT_LOGIN_PER_MINUTE="${RATE_LIMIT_LOGIN_PER_MINUTE:-5}" \
  --set-env-vars JWT_ALGORITHM="${JWT_ALGORITHM:-HS256}"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" \
  --project "$PROJECT_ID" --format 'value(status.url)')"

echo
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Backend no ar:  $URL"
echo
echo "ÚLTIMO PASSO (Vercel):"
echo "  1) Painel da Vercel → projeto ifnmg → Settings → Environment Variables"
echo "  2) Altere NEXT_PUBLIC_API_URL para:  ${URL}"
echo "  3) Deploy (reproduzir o deploy / Redeploy)."
echo "════════════════════════════════════════════════════════════════"

echo
echo "▶ Validando (aguarde ~30s pro cold start)..."
sleep 20
curl -fsS -o /dev/null -w "health: HTTP %{http_code}\n" "$URL/api/health" || echo "⚠️ health ainda frio; tente de novo em instantes"
