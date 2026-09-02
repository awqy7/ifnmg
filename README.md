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

3. 🌅 **Briefing Matinal Diário com IA**:
   - Analisa tarefas pendentes, disciplinas e materiais recentes.
   - Exibe foco principal, métricas, urgências e um plano de estudo acionável.
   - Abre instantaneamente com o último snapshot local enquanto atualiza em segundo plano.

4. 💬 **Tutor IA Especialista por Disciplina**:
   - Chat com contexto real das suas disciplinas e materiais postados pelos professores.
   - Suporte nativo gratuito via **Google Gemini 1.5 Flash** e multi-provedor (Groq, OpenAI, Anthropic, Ollama).

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
- **IA**: Google Gemini 1.5 Flash (Gratuito por padrão), Groq, OpenAI GPT-4o Mini, Claude 3, Ollama

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

### 2. Deploy (Vercel + Supabase + Upuai)

O sistema usa **3 serviços**:

| Serviço | O que roda | Host |
|---|---|---|
| Frontend (Next.js) | Interface web (porta 3000) | **Vercel** |
| Backend (FastAPI/Python) | API, IA, sincronização e WebSocket | **Upuai Cloud (Brasil)** |
| Banco de dados | PostgreSQL | **Supabase** |

> ⚠️ **O backend precisa rodar com IP brasileiro.** O Moodle do Virtual2 (`virtual2.ifnmg.edu.br`) bloqueia autenticação vinda de IPs estrangeiros/datacenters fora do Brasil — por isso o **Render (EUA) não funciona** para o login. Soluções com IP no Brasil: **Upuai Cloud** (PaaS BR, recomendado), Brasa Cloud (beta) ou Google Cloud Run em `southamerica-east1`.
> ⚠️ O backend **não roda na Vercel** (é um servidor Python persistente). A Vercel hospeda apenas o Next.js em `frontend/`.

#### a) Supabase (banco)

1. Crie o projeto (região `us-east-2`).
2. Em **Project Settings → Database → Connection string**, copie a string do **Pooler** (não a "Direct connection" — ela é IPv6-only).
3. Use o formato:
   `postgresql+psycopg://postgres.<PROJECT_REF>:<SENHA>@aws-0-<REGIAO>.pooler.supabase.com:5432/postgres?sslmode=require`

#### b) Upuai Cloud (backend — recomendado)

PaaS brasileira (datacenter no Brasil → IP brasileiro → passa no Moodle). Igual ao Railway/Render: `git push`, CLI amigável, plano FREE sem cartão.

1. Crie a conta grátis (sem cartão) em `upuai.com.br`.
2. Instale a CLI: `brew install saiph-ti/upuai-cli/upuai` (ou binário em `github.com/saiph-ti/upuai-cli/releases`).
3. `upuai login` (browser OAuth).
4. Execute:
   ```bash
   ./deploy/upuai.sh
   ```
   (o script conecta o repo, injeta as env vars do `backend/.env.supabase.bak` e faz o deploy).
5. O script imprime a URL `*.upuai.com.br` — valide com `curl URL/api/health` e depois aponte a Vercel.

> O deploy usa `backend/upuai.toml` (build por detecção de FastAPI + health check `/api/health`).

#### c) Google Cloud Run (backend — alternativa)

Roda em São Paulo (IP brasileiro) e usa o **free tier do Cloud Run**.

1. Crie uma conta Google Cloud e um projeto (`gcloud config set project SEU_PROJETO_ID`).
2. Execute `./deploy/cloud_run.sh` (usa o `backend/Dockerfile`).
3. Aponte a Vercel para a URL `https://ifnmg-backend-....run.app`.

#### d) Render (backend — NÃO recomendado)

> ⚠️ Bloqueado pelo Moodle (IP nos EUA não autentica no Virtual2). Mantido só como referência.

1. GitHub → **New Web Service** → repo `awqy7/ifnmg`.
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Adicione as env vars:
   - `APP_ENV=production`
   - `DATABASE_URL` (string do pooler acima — troque SENHA pela senha real do banco)
   - `ALLOWED_ORIGINS=https://SEU-DOMINIO.vercel.app` (inclua cada domínio de produção/preview explicitamente)
   - `GROQ_API_KEY`, `SECRET_KEY`, `ENCRYPTION_KEY` etc. conforme necessário

#### e) Vercel (frontend)

1. Importe o repo `awqy7/ifnmg`.
2. **Root Directory**: `frontend` ← **importante, senão dá erro 404**
3. Adicione a env var de build:
   - `NEXT_PUBLIC_API_URL=https://SEU-BACKEND.upuai.com.br` (URL do Upuai)
4. **Deploy**. 

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
# Backend (testes unitários)
cd backend && ./venv/bin/python -m unittest discover -s tests -v

# Frontend (qualidade, tipos e build de produção)
cd frontend && npm run lint && npm run build
```

O smoke test responsivo em `frontend/tests/mobile_viewport_smoke.py` valida as
larguras 320, 375 e 430 px e um telefone em paisagem contra um `next start`
local. O teste integrado `backend/tests/live_virtual2_smoke.py` usa somente as
credenciais já criptografadas no banco e imprime apenas contagens agregadas.
