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

# Não encerra processos de outros projetos que possam usar as mesmas portas.
echo -e "${YELLOW}🔍 Verificando portas...${NC}"
for PORT in 8000 3000; do
    if fuser "${PORT}/tcp" >/dev/null 2>&1; then
        echo -e "${RED}❌ A porta ${PORT} já está em uso. Encerre o processo correto ou use outra porta.${NC}"
        exit 1
    fi
done

if [ ! -x "$BASE_DIR/backend/venv/bin/python" ]; then
    echo -e "${RED}❌ Ambiente Python ausente em backend/venv. Crie-o e instale backend/requirements.txt.${NC}"
    exit 1
fi

if [ ! -f "$BASE_DIR/backend/.env" ]; then
    echo -e "${RED}❌ backend/.env ausente. Copie backend/.env.example e preencha as variáveis obrigatórias.${NC}"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}❌ npm não encontrado. Instale o Node.js antes de iniciar.${NC}"
    exit 1
fi

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
