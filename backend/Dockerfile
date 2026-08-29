# ═══ IFNMG Assistente — Backend (Google Cloud Run) ═══
# Região: southamerica-east1 (São Paulo) — o Moodle do IFNMG exige IP brasileiro.
# Imagem enxuta: wheels manylinux, sem compiladores e sem navegadores Playwright.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Libs de runtime (lxml/pdf/imagens). Não é necessário build-essential:
# todas as dependências do requirements têm wheels manylinux para 3.12.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libxml2 \
        libxslt1.1 \
        libjpeg62-turbo \
        libpng16-16 \
        zlib1g \
        tesseract-ocr \
        tesseract-ocr-por \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY .python-version ./

# Cloud Run expõe a porta via $PORT (default 8080)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
