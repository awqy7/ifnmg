#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
MIGRAÇÃO: Supabase → Neon.tech
═══════════════════════════════════════════════════════════════════════════════

Migra todos os dados do Supabase para o Neon.tech PostgreSQL.

Uso:
  python migrate_supabase_to_neon.py

Pré-requisitos:
  - Banco Neon.tech criado e connection string em .env.neon
  - Banco Supabase com dados atuais
  - pip install psycopg[binary] sqlalchemy

═══════════════════════════════════════════════════════════════════════════════
"""
import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ─── Configurações ───────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
SUPABASE_URL = os.environ.get("SUPABASE_DATABASE_URL", "")
NEON_URL = os.environ.get("NEON_DATABASE_URL", "")

# ─── Tabelas a migrar ────────────────────────────────────────────────────────

TABLES = [
    "users",
    "courses",
    "activities",
    "materials",
    "notifications",
    "chat_sessions",
    "chat_messages",
    "daily_briefings",
    "flashcard_decks",
    "ai_request_logs",
    "sync_state",
    "material_sync_meta",
    "push_subscriptions",
]


def get_supabase_connection():
    """Conecta ao Supabase PostgreSQL."""
    if not SUPABASE_URL:
        logger.error("SUPABASE_DATABASE_URL não definida")
        sys.exit(1)
    from sqlalchemy import create_engine
    engine = create_engine(SUPABASE_URL)
    logger.info("✅ Conectado ao Supabase")
    return engine


def get_neon_connection():
    """Conecta ao Neon PostgreSQL."""
    if not NEON_URL:
        logger.error("NEON_DATABASE_URL não definida")
        sys.exit(1)
    from sqlalchemy import create_engine
    engine = create_engine(NEON_URL)
    logger.info("✅ Conectado ao Neon")
    return engine


def check_tables_exist(engine, table_name: str) -> bool:
    """Verifica se a tabela existe no banco."""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def migrate_table(src_engine, dst_engine, table_name: str) -> int:
    """Migra uma tabela inteira do src para o dst."""
    from sqlalchemy import text

    # Conectar
    src_conn = src_engine.connect()
    dst_conn = dst_engine.connect()

    # Buscar dados do Supabase
    result = src_conn.execute(text(f"SELECT * FROM {table_name}"))
    rows = result.fetchall()
    columns = list(result.keys())

    if not rows:
        logger.warning(f"⚠️  Tabela {table_name}: 0 registros")
        return 0

    # Preparar inserts para o Neon
    placeholders = ", ".join([f":{col}" for col in columns])
    col_names = ", ".join(columns)
    sql = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})"

    # Limpar tabela de destino (cuidado!)
    dst_conn.execute(text(f"DELETE FROM {table_name}"))

    # Inserção em lotes de 1000
    batch_size = 1000
    total_inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        data = [dict(zip(columns, row)) for row in batch]
        dst_conn.execute(text(sql), data)
        total_inserted += len(batch)
        logger.info(f"  📦 {table_name}: {total_inserted}/{len(rows)}")

    dst_conn.commit()
    logger.info(f"✅ {table_name}: {total_inserted} registros migrados")

    src_conn.close()
    dst_conn.close()
    return total_inserted


def main():
    """Função principal."""
    logger.info("=" * 70)
    logger.info("  MIGRAÇÃO Supabase → Neon.tech")
    logger.info("=" * 70)
    logger.info(f"  Data/Hora: {datetime.now().isoformat()}")
    logger.info("")

    # Conectar
    src_engine = get_supabase_connection()
    dst_engine = get_neon_connection()

    # Verificar tabelas
    logger.info("🔍 Verificando tabelas...")
    missing_src = []
    missing_dst = []
    for table in TABLES:
        if not check_tables_exist(src_engine, table):
            missing_src.append(table)
        if not check_tables_exist(dst_engine, table):
            missing_dst.append(table)

    if missing_src:
        logger.error(f"❌ Tabelas ausentes no Supabase: {missing_src}")
        sys.exit(1)
    if missing_dst:
        logger.error(f"❌ Tabelas ausentes no Neon: {missing_dst}")
        logger.error("   Execute as migrações do Alembic no Neon primeiro!")
        sys.exit(1)

    # Migrar cada tabela
    logger.info("📦 Iniciando migração...")
    total_records = 0
    for table in TABLES:
        try:
            count = migrate_table(src_engine, dst_engine, table)
            total_records += count
        except Exception as e:
            logger.error(f"❌ Erro ao migrar {table}: {e}")

    logger.info("")
    logger.info("=" * 70)
    logger.info(f"  ✅ MIGRAÇÃO CONCLUÍDA: {total_records} registros")
    logger.info("=" * 70)

    # Fechar conexões
    src_engine.dispose()
    dst_engine.dispose()


if __name__ == "__main__":
    main()