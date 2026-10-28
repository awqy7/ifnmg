# 🎓 IFNMG Assistente — Sistema de Apoio Acadêmico com IA

O **IFNMG Assistente** é uma plataforma moderna e inteligente desenvolvida para transformar a experiência dos estudantes do **Instituto Federal do Norte de Minas Gerais (IFNMG)**. Ele funciona como uma camada inteligente sobre o ambiente virtual **Virtual2 (Moodle)**, organizando prazos, gerando resumos diários personalizados com IA, oferecendo tutor virtual por disciplina e ferramentas ativas de estudo.

---

## ✨ Funcionalidades Principais

1. 🔐 **Login Automático & Seguro no Virtual2**:
   - Integração com `https://virtual2.ifnmg.edu.br/` via Moodle REST API e sessão HTTP; Playwright é um fallback opcional de desenvolvimento.
   - Suas credenciais são criptografadas em repouso com **Fernet (AES-128)**.

2. 📋 **Central Unificada de Atividades & Prazos**:
   - Lista todas as tarefas, questionários e fóruns de todas as disciplinas.
   - Indicadores visuais de status (*Pendente*, *Entregue*, *Atrasado*).
   - Links diretos para as páginas do Moodle.
   - Envio direto de tarefas do tipo **Atividade**: resposta em texto e/ou anexos,
     sempre com confirmação explícita e status oficial retornado pelo Virtual2.

3. 🌅 **Briefing Matinal Diário com IA**:
   - Analisa tarefas pendentes, disciplinas e materiais recentes.
   - Exibe foco principal, métricas, urgências e um plano de estudo acionável.
   - Abre instantaneamente com o último snapshot local enquanto atualiza em segundo plano.

4. 💬 **Tutor IA Especialista por Disciplina**:
   - Chat com contexto real das suas disciplinas, atividades e textos extraídos de PDFs.
   - Download autenticado direto no aplicativo, sem abrir outra aba ou expor o token do Moodle.
   - Leitura sob demanda e explicação estruturada de PDFs, inclusive OCR de documentos escaneados.
   - Suporte gratuito padrão via **Groq GPT-OSS 20B** e multi-provedor (Gemini, OpenAI, Anthropic, Ollama).

5. 🧠 **Ferramentas Ativas de Estudo**:
   - **Gerador de Flashcards**: Criação de baralhos de memorização a partir dos materiais da aula.
   - **Simulado de Provas**: Cria questões de múltipla escolha com correção imediata e justificativas.

6. 🔔 **Notificações Inteligentes**:
   - Alertas de novas atividades postadas e lembretes de prazos (7 dias, 3 dias, 1 dia e 6 horas antes).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide Icons, Date-fns
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, APScheduler, LiteLLM, PyWebPush e Passlib/Bcrypt
- **Banco de Dados**: SQLite (desenvolvimento) / PostgreSQL (produção)
- **IA**: Groq GPT-OSS 20B (padrão), Gemini, OpenAI GPT-4o Mini, Claude 3 e Ollama

---

## 🚀 Como Executar

### 1. Início Rápido (Local)

Execute o script de inicialização única na raiz do projeto:

```bash
./start.sh
```

Acesse no navegador:
- **Aplicação Web**: `http://localhost:3000`
- **Documentação da API (Swagger)**: `http://localhost:8000/api/docs`

### 2. Deploy (Upuai + Vercel) — **Apenas com IP brasileiro para login no Moodle**

O sistema usa **2 serviços**:

| Serviço | O que roda | Host |
|---|---|---|
| Frontend (Next.js) | Interface web (porta 3000) | **Vercel** |
| Backend (FastAPI/Python) | API, IA, sincronização e WebSocket | **Upuai Cloud (Brasil)** |

> ✅ **Upuai Cloud** fornece IP no Brasil → passa no Moodle Virtual2 sem bloqueios.
> ❌ **Railway/Render** (EUA) → bloqueado pelo Moodle → **NÃO RECOMENDADO**.

#### a) Upuai Cloud (backend — recomendado)

1. Crie a conta grátis (sem cartão) em `upuai.com.br`.
2. Instale a CLI: `brew install saiph-ti/upuai-cli/upuai` (ou binário em `github.com/saiph-ti/upuai-cli/releases`).
3. `upuai login` (browser OAuth).
4. Execute:
   ```bash
   ./deploy/upuai.sh
   ```
   O script lê `backend/.env.local` somente na máquina local, aplica as variáveis
   no painel da Upuai e faz o deploy. Esse arquivo não deve ser versionado.
5. O script imprime a URL `*.upuai.com.br` — valide com `curl URL/api/health` e depois aponte a Vercel.

> O deploy usa `backend/upuai.toml` (build por detecção de FastAPI + health check `/api/health`).

#### b) Vercel (frontend)

1. Importe o repo `awqy7/ifnmg`.
2. **Root Directory**: `frontend` ← **importante, senão dá erro 404**
3. Adicione a env var de build:
   - `NEXT_PUBLIC_API_URL=https://SEU-BACKEND.upuai.com.br` (URL do Upuai)
4. **Deploy**. 

O navegador sempre chama `/api` pela própria URL da Vercel; o rewrite do Next.js
encaminha as requisições ao backend. Isso mantém a sessão em cookie `httpOnly` de
primeira parte e evita salvar JWT no JavaScript. Cadastre em `ALLOWED_ORIGINS` o
domínio de produção e cada domínio de preview que realmente for utilizar.

### 3. Deploy Alternativo (upuai.com.br)

```bash
# Pré-requisitos: upuai login, variáveis em backend/.env.local
./deploy/upuai.sh
```

### 4. Alternativas (considere os riscos)

#### a) Render (backend — NÃO recomendado)
> ⚠️ Bloqueado pelo Moodle (IP nos EUA não autentica no Virtual2). Mantido só como referência.

#### b) Railway (backend — NÃO recomendado)
> ⚠️ Mesma limitação do Render (IP nos EUA).

#### c) Google Cloud Run (backend — alternativo)
> ✅ Roda em São Paulo (`southamerica-east1`) com IP brasileiro.
> 🔴 Custo: precisa de máquina persistente (taxa horária) para agendamento ativo.

#### d) Vercel (frontend) — sempre use o diretório `frontend/`

---

## 🔒 Segurança e Privacidade

- **Criptografia em repouso de credenciais**: As senhas do Virtual2 não são salvas em texto puro e são descriptografadas somente no backend quando uma reconexão é necessária.
- **Autenticação JWT**: Sessões com tokens assinados e cookie `httpOnly` quando suportado pelo navegador.
- **Ticket WebSocket de curta duração**: notificações em tempo real não expõem o token principal da sessão na URL.
- **Proteção de downloads**: arquivos têm limite de tamanho e redirecionamentos são validados contra SSRF.
- **Sincronização coordenada**: estado persistente e lock por usuário evitam processamento duplicado entre workers.
- **Desvinculação de credenciais**: É possível remover a conexão e as credenciais do Virtual2 pela API de Configurações.

## ✅ Validação

```bash
# Backend (testes unitários em banco SQLite temporário)
cd backend
TEST_DB="$(mktemp /tmp/ifnmg-tests.XXXXXX.db)"
DATABASE_URL="sqlite:///$TEST_DB" ./venv/bin/python -m unittest discover -s tests -v
rm -f "$TEST_DB"

# Frontend (qualidade, tipos e build de produção)
cd frontend && npm run lint && npm run build
```

Os smoke tests em `frontend/tests/mobile_viewport_smoke.py` e
`frontend/tests/desktop_viewport_smoke.py` validam, contra um `next start` local,
as larguras 320, 375, 430 px e um telefone em paisagem, além de 1024, 1280 e
1440 px no desktop, cobrindo navegação, modais, notificações e acessibilidade
por teclado. Rode-os com o servidor de produção ativo:

```bash
cd frontend && npm run start
# em outro terminal
cd frontend
python3 tests/mobile_viewport_smoke.py
python3 tests/desktop_viewport_smoke.py
```

O teste integrado `backend/tests/live_virtual2_smoke.py` usa somente as
credenciais já criptografadas no banco e imprime apenas contagens agregadas.

---

## 📂 Lista de Arquivos (raiz)

- `README.md` (este arquivo) — Visão geral do projeto e instruções de deploy
- `start.sh` — Script de inicialização local (SQLite + Next.js)
- `deploy/upuai.sh` — Deploy automatizado para Upuai Cloud
- `deploy/railway.sh` — Deploy para Railway (fallback)
- `backend/.env.example` — Template de variáveis de ambiente para produção
- `backend/.env.local` — **SEGREDO** — variáveis locais para Upuai/Cloud
- `backend/.env.neon` — Template de configuração do Neon.tech (PostgreSQL gratuito)
- `backend/.env.supabase.bak` — String de conexão do Supabase para referência
- `backend/upuai.toml` — Configuração de build/deploy do Upuai Cloud
- `backend/README_NEON.md` — Guia de referência para Neon.tech + Railway
- `NEON_RAILWAY_SETUP.md` — Guia completo de configuração do Neon + Railway
- `backend/.mcp.json` — Configuração do MCP (Model Context Protocol)
- `backend/.upuai.md` — Documentação do Upuai integrada

---

## 🏗️ Estrutura de Diretórios

```
ifnmg-assistente/
├── README.md
├── start.sh
├── deploy/
│   ├── upuai.sh
│   └── railway.sh
├── backend/
│   ├── .env.example
│   ├── .env.local      ← MODIFIQUE ESTE ARQUIVO (CUIDADO!)
│   ├── .env.neon      ← Template Neon
│   ├── .env.supabase.bak
│   ├── .mcp.json
│   ├── upuai.toml
│   ├── README_NEON.md
│   └── .upuai.md
│   ├── app/
│   ├── tests/
│   └── venv/
├── frontend/
│   ├── .env.local
│   ├── src/
│   └── package.json
└── .github/
    └── workflows/
        └── ci.yml
```
avoidar arquivo .env com segredos para commit

## 📡 URLs Principais

| Componente | Preview (última) | Produção (ainda em construção) |
|-------------|------------------|----------------------------|
| **Frontend Vercel** | `https://ifnmg-kjiirqiuv-awqy.vercel.app` | `https://ifnmg.vercel.app` |
| **Backend Upuai** | `https://ifnmg-backend-production.upuai.com.br` | `https://ifnmg-backend-production.upuai.com.br` |
| **API Health Check** | `https://ifnmg-backend-production.upuai.com.br/api/health` | Igual ao backend |
| **Dashboard Admin** | `https://ifnmg-backend-production.upuai.com.br/api/admin/dashboard` | Igual ao backend |

## 🎯 Objetivo

Prover uma experiência de aprendizagem inteligente e personalizada para estudantes do IFNMG, integrando automaticamente o Moodle Virtual2, fornecendo lembretes de tarefas, resumos diários com IA, tutoria especializada por disciplina e ferramentas ativas de estudo — tudo rodando com IP brasileiro para garantir login contínuo no ambiente virtual.

## 🌐 Sobre oIFNMG

O IFNMG (Instituto Federal do Norte de Minas Gerais) é uma instituição pública de ensino superior que oferece cursos técnicos, de graduação e pós-graduação nas áreas de ciência, tecnologia e inovação. O **IFNMG Assistente** é uma plataforma complementar desenvolvida para apoiar estudantes no acompanhamento de atividades acadêmicas, deadlines e materiais das disciplinas oferecidas pelo instituto.

## 📧 Contato

- **GitHub**: https://github.com/awqy7/ifnmg
- **E-mail de contato**: awqy@aluno.ifnmg.edu.br

## 📝 Licença

Este projeto está licenciado sob a licença MIT. Sinta-se à vontade para contribuir, relatar problemas ou usar este código como base para seus próprios projetos acadêmicos.

---

**✨ Feito com ♡ por estudantes e professores do IFNMG**