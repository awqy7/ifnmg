# 🚀 MIGRAÇÃO: Supabase → Neon.tech

## 📋 Visão Geral

Migração completa do IFNMG Assistente do Supabase para o Neon.tech, mantendo o sistema 100% gratuito e com melhor dashboard.

## ✅ Benefícios do Neon.tech

| Característica | Supabase | Neon.tech |
|----------------|----------|-----------|
| Preço | Grátis (500MB) | Grátis (10GB) |
| Região BR | AWS us-east-2 | AWS us-east-1 (São Paulo) |
| Dashboard | Básico | Moderno + SQL Editor |
| Conexões | 50.000 | Ilimitadas |
| Backups | Automático | Automático |
| API REST | Sim | Não (usamos SQLAlchemy) |
| Storage | 100GB | 10GB |

## 🔄 Passo a Passo

### 1. Criar conta no Neon.tech

1. Acesse [https://neon.tech](https://neon.tech)
2. Clique em "Sign Up"
3. Use email e senha
4. Verifique o email

### 2. Criar um banco de dados

1. No dashboard do Neon, clique em "New Project"
2. Nome: `ifnmg-assistente`
3. Região: `us-east-1` (São Paulo, Brazil)
4. Versão PostgreSQL: `15` ou superior
5. Clique em "Create Project"

### 3. Obter Connection String

1. No dashboard do Neon, clique em "Connect"
2. Copie a connection string:
```
postgresql://postgres.ROLE:SENHA@aws-us-east-1.neon.tech:5432/DBNAME?sslmode=require
```

### 4. Configurar .env.neon

```bash
# Copie .env.neon para .env
cp backend/.env.neon backend/.env

# Edite o .env com a connection string do Neon
DATABASE_URL=postgresql+psycopg://postgres.ROLE:SENHA@aws-us-east-1.neon.tech:5432/DBNAME?sslmode=require
```

### 5. Migrar o Schema

```bash
# No backend, execute as migrações
cd backend
python -m alembic upgrade head

# Ou use o script de migração automática
python migrate_supabase_to_neon.py
```

### 6. Migrar Dados (se houver)

```bash
# Exportar do Supabase
pg_dump -h aws-0-us-east-2.pooler.supabase.com -U postgres.jajybokjcjzzbimdbdpa -d postgres > supabase_dump.sql

# Importar no Neon
psql "postgresql://postgres.ROLE:SENHA@aws-us-east-1.neon.tech:5432/DBNAME" -f supabase_dump.sql
```

### 7. Deploy no Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer login
railway login

# Inicializar
cd /home/awqy/Projetos/01-ifnmg-academico/ifnmg-assistente
railway init

# Fazer deploy
railway up
```

### 8. Configurar Variáveis de Ambiente

No dashboard do Railway, adicione:

```
APP_ENV=production
DEBUG=false
DATABASE_URL=postgresql+psycopg://postgres.ROLE:SENHA@aws-us-east-1.neon.tech:5432/DBNAME?sslmode=require
ALLOWED_ORIGINS=https://ifnmg.vercel.app,http://localhost:3000,http://127.0.0.1:3000
DEFAULT_AI_PROVIDER=groq
GROQ_API_KEY=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
SECRET_KEY=97a958f1a74a614d16ee927d3fffb31b203d6edc875afb71ef1037f155a20d70
ENCRYPTION_KEY=nb7dl0QcFezUUxWOaBC2kb8ctZ8i6USoDwMinbx3Vck=
```

## 🧪 Verificação

```bash
# Testar conexão
python -c "from app.database import engine; from sqlalchemy import text; print(engine.connect().execute(text('SELECT 1')).scalar())"

# Iniciar o backend
./start.sh

# Verificar health
curl http://localhost:8000/api/health
```

## 📊 Monitoramento

### Neon Dashboard
- Acesse: https://console.neon.tech
- Monitore:
  - Conexões ativas
  - Armazenamento
  - Latência
  - Queries lentas

### Railway Dashboard
- Acesse: https://railway.app
- Monitore:
  - Logs em tempo real
  - Deployment status
  - Uso de recursos

## 🔄 Rollback

Se precisar de voltar para o Supabase:

```bash
# Restaurar .env.supabase.bak
cp backend/.env.supabase.bak backend/.env

# Fazer deploy no Railway
railway up
```

## 📞 Suporte

- Neon: https://neon.tech/docs
- Railway: https://docs.railway.app
- IFNMG Assistente: README.md