#!/bin/bash

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}🎓 IFNMG Assistente — Inicializador Unificado${NC}"
echo -e "${BLUE}==========================================================${NC}"

# Diretório base
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Libera portas 8000 e 3000 se já estiverem ocupadas
echo -e "${YELLOW}🔍 Verificando processos anteriores...${NC}"
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# Função de limpeza ao fechar (Ctrl+C)
cleanup() {
    echo -e "\n${RED}🛑 Encerrando IFNMG Assistente...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}👋 Tudo encerrado com sucesso.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Inicia backend
echo -e "${GREEN}🚀 Iniciando Backend FastAPI (Porta 8000)...${NC}"
cd "$BASE_DIR/backend"
source "$BASE_DIR/backend/venv/bin/activate"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Inicia frontend
echo -e "${GREEN}💻 Iniciando Frontend Next.js (Porta 3000)...${NC}"
cd "$BASE_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 3
echo ""
echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}🎉 IFNMG Assistente iniciado com sucesso!${NC}"
echo -e "${GREEN}👉 Acesse o Sistema:   ${BLUE}http://localhost:3000${NC}"
echo -e "${GREEN}👉 Documentação API:   ${BLUE}http://localhost:8000/api/docs${NC}"
echo -e "${YELLOW}👉 Pressione Ctrl + C para parar ambos os serviços${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo ""

wait
