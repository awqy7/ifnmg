# 🎓 IFNMG Assistente — Sistema de Apoio Acadêmico com IA

O **IFNMG Assistente** é uma plataforma moderna e inteligente desenvolvida para transformar a experiência dos estudantes do **Instituto Federal do Norte de Minas Gerais (IFNMG)**. Ele funciona como uma camada inteligente sobre o ambiente virtual **Virtual2 (Moodle)**, organizando prazos, gerando resumos diários personalizados com IA, oferecendo tutor virtual por disciplina e ferramentas ativas de estudo.

---

## ✨ Funcionalidades Principais

1. 🔐 **Login Automático & Seguro no Virtual2**:
   - Integração com `https://virtual2.ifnmg.edu.br/` via Playwright headless e Moodle REST API.
   - Suas credenciais são criptografadas em repouso com **Fernet (AES-128)**.

2. 📋 **Central Unificada de Atividades & Prazos**:
   - Lista todas as tarefas, questionários e fóruns de todas as disciplinas.
   - Indicadores visuais de status (*Pendente*, *Entregue*, *Atrasado*).
   - Links diretos para as páginas do Moodle.

3. 🌅 **Briefing Matinal Diário com IA**:
   - Analisa sua grade de horários do dia, tarefas pendentes e materiais recentes.
   - Gera um resumo motivador e focado no que você precisa estudar hoje.

4. 💬 **Tutor IA Especialista por Disciplina**:
   - Chat com contexto real das suas disciplinas e materiais postados pelos professores.
   - Suporte nativo gratuito via **Google Gemini 1.5 Flash** e multi-provedor (Groq, OpenAI, Anthropic, Ollama).

5. 🧠 **Ferramentas Ativas de Estudo**:
   - **Gerador de Flashcards**: Criação de baralhos de memorização a partir dos materiais da aula.
   - **Simulado de Provas**: Cria questões de múltipla escolha com correção imediata e justificativas.

6. 📅 **Grade Semanal de Horários & Calendário Integrado**:
   - Configuração visual da grade de aulas.
   - Integração com o calendário acadêmico do IFNMG.

7. 📊 **Boletim & Histórico de Notas**:
   - Acompanhamento das notas e médias ponderadas por disciplina com feedbacks dos professores.

8. 🔔 **Notificações Inteligentes**:
   - Alertas de novas atividades postadas e lembretes de prazos (7 dias, 3 dias, 1 dia e 6 horas antes).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, Date-fns
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, APScheduler, LiteLLM, Playwright, PyWebPush, Passlib/Bcrypt
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

---

## 🔒 Segurança e Privacidade

- **Criptografia ponta a ponta de credenciais**: As senhas do Virtual2 nunca são expostas nem salvas em texto puro.
- **Autenticação JWT**: Sessões seguras com tokens criptografados.
- **Opção de exclusão total**: É possível desvincular as credenciais e apagar todos os dados a qualquer momento na aba Configurações.
