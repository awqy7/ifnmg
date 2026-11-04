# 🚀 IFNMG Assistente — Guia de Configuração Neon.tech + Railway

## 📋 Visão Geral

Este guia cobre a migração completa do IFNMG Assistente para **Neon.tech** (PostgreSQL gratuito) e **Railway** (deploy gratuito).

---

## 🎯 Por que Neon.tech?

| Característica | Neon.tech | Supabase | SQLite |
|----------------|-----------|----------|--------|
| **Armazenamento** | 10GB grátis | 500MB | Ilimitado (local) |
| **Transferência** | 100MB/dia | 2GB/dia | N/A |
| **Região BR** | ✅ us-east-1 | ✅ us-east-2 | N/A |
| **Dashboard** | Moderno + SQL | Básico | Nenhum |
| **Conexões** | Ilimitadas | 50.000 | 1 |
| **Backups** | Automático | Automático | Manual |
| **Preço** | **Grátis** | Grátis | Grátis |

---

## 🔧 Configuração Rápida

### Opção A: Script Automático (Recomendado)

```bash
cd /home/awqy/Projetos/01-ifnmg-academico/ifnmg-assistente/backend
./setup_neon.sh
```

O script guia você passo a passo:
1. Cria conta no Neon
2. Obtém connection string
3. Configura .env
4. Testa conexão
5. Roda migrações

### Opção B: Manual

#### 1. Criar conta no Neon

1. Acesse [https://neon.tech](https://neon.tech)
2. Clique em "Sign Up"
3. Use Google ou email

#### 2. Criar projeto

1. Dashboard → "New Project"
2. Nome: `ifnmg-assistente`
3. Região: `us-east-1` (São Paulo)
4. Clique em "Create Project"

#### 3. Obter connection string

1. Clique em "Connect" (canto superior direito)
2. Selecione 'Python' ou 'Generic'
3. Copie a connection string (parece com:
   `postgresql://postgres.xxx:senha@aws-us-east-1.neon.tech/neondb?sslmode=require`)

#### 4. Configurar .env

```bash
# Copiar template
cp backend/.env.neon backend/.env

# Editar DATABASE_URL
nano backend/.env

# Substituir:
DATABASE_URL=postgresql+psycopg://postgres.ROLE:SENHA@aws-us-east-1.neon.tech:5432/DBNAME?sslmode=require
```

#### 5. Rodar migrações

```bash
cd backend
python -m alembic upgrade head
```

#### 6. Testar

```bash
./start.sh
curl http://localhost:8000/api/health
```

---

## 📊 Dashboard Administrativo

Após configurar, acesse:

```
http://localhost:8000/api/admin/dashboard
```

**Recursos:**
- 📈 Métricas em tempo real
- 👥 Total de usuários
- 📚 Disciplinas e atividades
- 📝 Status das tarefas
- 💾 Info do banco de dados

**Endpoints relacionados:**
```
GET /api/admin/stats        → Estatísticas em JSON
GET /api/admin/health/detailed → Health check detalhado
```

---

## 🚀 Deploy no Railway

### Pré-requisitos

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer login
railway login
```

### Deploy

```bash
cd /home/awqy/Projetos/01-ifnmg-academico/ifnmg-assistente

# Inicializar projeto
railway init

# Fazer deploy
railway up
```

### Configurar Variáveis de Ambiente

No dashboard do Railway, adicione:

```
APP_ENV=production
DEBUG=false
DATABASE_URL=postgresql+psycopg://...  # Sua URL do Neon
ALLOWED_ORIGINS=https://ifnmg.vercel.app,http://localhost:3000,http://127.0.0.1:3000
DEFAULT_AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
SECRET_KEY=97a958f1a74a614d16ee927d3fffb31b203d6edc875afb71ef1037f155a20d70
ENCRYPTION_KEY=nb7dl0QcFezUUxWOaBC2kb8ctZ8i6USoDwMinbx3Vck=
```

### Deploy Automático

```bash
./deploy/railway.sh
```

---

## 🔄 Migração de Dados (Supabase → Neon)

Se você já tem dados no Supabase:

```bash
# 1. Configurar variáveis
export SUPABASE_DATABASE_URL="postgresql://..."
export NEON_DATABASE_URL="postgresql+psycopg://..."

# 2. Rodar script de migração
cd backend
python migrate_supabase_to_neon.py
```

**O script:**
- Conecta-se ao Supabase
- Conecta-se ao Neon
- Copia todas as tabelas
- Preserva IDs e relacionamentos

---

## 🧪 Verificação

### Testar conexão com Neon

```bash
cd backend
python -c "
from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1')).scalar()
    print(f'✅ Neon conectado: {result}')
"
```

### Testar health check

```bash
curl http://localhost:8000/api/health
# Expected: {"status": "ok", "version": "1.0.0", ...}
```

### Testar dashboard

```bash
curl http://localhost:8000/api/admin/stats
# Expected: JSON com estatísticas
```

---

## 📁 Estrutura de Arquivos

```
ifnmg-assistente/
├── backend/
│   ├── .env.neon              # Template para Neon
│   ├── .env                   # Configuração atual
│   ├── setup_neon.sh          # Script de configuração
│   ├── migrate_supabase_to_neon.py  # Migração de dados
│   ├── README_NEON.md         # Documentação completa
│   └── app/
│       └── routers/
│           └── admin.py       # Dashboard administrativo
├── deploy/
│   └── railway.sh             # Deploy automático
├── railway.json               # Config Railway
└── README.md                  # Este arquivo
```

---

## 🎨 Dashboard Administrativo

### Captura de Tela

O dashboard inclui:

- **Header gradiente** com status do sistema
- **4 cards de métricas** (usuários, disciplinas, atividades, materiais)
- **Gráfico de status** das atividades (pendentes, atrasadas, enviadas)
- **Info do banco** (tipo, região, latência, status)
- **Top usuários** em tabela

### Tecnologias

- **Tailwind CSS** (via CDN)
- **Design responsivo** (mobile-first)
- **Dark mode** nativo
- **Animações** sutis (hover, pulse)

---

## 🔒 Segurança

### Chaves e Segredos

**NUNCA altere estas chaves em produção:**

```
SECRET_KEY=97a958f1a74a614d16ee927d3fffb31b203d6edc875afb71ef1037f155a20d70
ENCRYPTION_KEY=nb7dl0QcFezUUxWOaBC2kb8ctZ8i6USoDwMinbx3Vck=
```

Se alterar, **todas as senhas criptografadas ficam ilegíveis**.

### Backup

Sempre faça backup antes de migrar:

```bash
./backup.sh  # Cria backup em backups/YYYYMMDD_HHMMSS/
```

---

## 📊 Monitoramento

### Neon Dashboard

- Acesse: https://console.neon.tech
- Monitore:
  - Conexões ativas
  - Armazenamento usado
  - Queries lentas
  - Backups automáticos

### Railway Dashboard

- Acesse: https://railway.app
- Monitore:
  - Logs em tempo real
  - Deploy status
  - Uso de CPU/memória
  - Health checks

---

## 🐛 Troubleshooting

### "Connection refused"

```bash
# Verificar se DATABASE_URL está correta
cat backend/.env | grep DATABASE_URL

# Testar conexão manualmente
psql "postgresql://..." -c "SELECT 1"
```

### "Migrations failed"

```bash
# Resetar migrações
python -m alembic downgrade base
python -m alembic upgrade head
```

### "Dashboard não carrega"

```bash
# Verificar logs
tail -f logs/app.log

# Reiniciar backend
./start.sh restart
```

---

## 📞 Suporte

- **Neon Docs:** https://neon.tech/docs
- **Railway Docs:** https://docs.railway.app
- **IFNMG Assistente:** `/backend/README_NEON.md`

---

## ✅ Checklist Final

- [ ] Conta Neon criada
- [ ] Projeto criado (us-east-1)
- [ ] Connection string copiada
- [ ] .env configurado
- [ ] Migrações rodadas
- [ ] Health check OK
- [ ] Dashboard acessível
- [ ] Backup realizado
- [ ] Deploy Railway (opcional)

---

**🎉 Parabéns! Seu IFNMG Assistente está rodando com Neon.tech + Railway!**