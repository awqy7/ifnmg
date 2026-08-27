"""
Extração de conteúdo textual dos materiais do Moodle.
Baixa arquivos via webservice/pluginfile.php e extrai texto
(PDF via pdfplumber/PyPDF2, HTML limpo, texto puro) para alimentar a IA.
"""
import io
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_PDF_PAGES = 25
MAX_TEXT_CHARS = 15000


def _clean_html(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _pdf_text(data: bytes) -> str:
    # Tenta pdfplumber (melhor qualidade), cai para PyPDF2
    try:
        import pdfplumber
        chunks = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for i, page in enumerate(pdf.pages):
                if i >= MAX_PDF_PAGES:
                    break
                t = page.extract_text() or ""
                if t:
                    chunks.append(t)
        text = "\n".join(chunks)
        if text.strip():
            return text
    except Exception as e:
        logger.warning(f"pdfplumber falhou: {e}")

    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(data))
        chunks = []
        for i, page in enumerate(reader.pages[:MAX_PDF_PAGES]):
            try:
                chunks.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(chunks)
    except Exception as e:
        logger.warning(f"PyPDF2 falhou: {e}")
        return ""


def extract_text_from_bytes(filename: str, mimetype: str, data: bytes) -> str:
    """Extrai texto de um arquivo conforme seu tipo."""
    name = (filename or "").lower()
    mime = (mimetype or "").lower()

    if not data:
        return ""
    if len(data) > MAX_FILE_BYTES:
        logger.info(f"Arquivo grande ignorado ({len(data)} bytes): {filename}")
        return ""

    if name.endswith(".pdf") or "pdf" in mime:
        return _pdf_text(data)

    if any(name.endswith(ext) for ext in (".txt", ".md", ".csv", ".log")) or mime.startswith("text/"):
        try:
            return data.decode("utf-8", errors="ignore")
        except Exception:
            return ""

    if any(name.endswith(ext) for ext in (".html", ".htm")) or "html" in mime:
        return _clean_html(data.decode("utf-8", errors="ignore"))

    # pptx/docx/xlsx: extração leve de XML compartilhado
    if name.endswith(".docx") or "wordprocessingml" in mime:
        try:
            from PyPDF2 import PdfReader  # noqa: F401 (mantém import estável)
            import zipfile
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
                paras = re.findall(r"<w:p[\s>][\s\S]*?</w:p>", xml)
                out = []
                for p in paras:
                    texts = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)
                    if texts:
                        out.append("".join(texts))
                return "\n".join(out)
        except Exception as e:
            logger.debug(f"docx extract falhou: {e}")
        return ""

    return ""


async def download_file_limited(client, fileurl: str, max_bytes: int = MAX_FILE_BYTES) -> tuple[bytes, str]:
    """Baixa um arquivo autenticado sem armazenar respostas arbitrariamente grandes.

    O ``client.get`` comum só descobre o tamanho depois de carregar tudo na
    memória. Arquivos do Moodle podem ser grandes, então validamos
    ``Content-Length`` quando disponível e interrompemos o stream ao atingir o
    limite. O segundo valor retornado é o Content-Type informado pelo servidor.
    """
    if not client or not fileurl:
        return b"", ""

    try:
        async with client.stream("GET", fileurl) as response:
            if response.status_code != 200:
                return b"", ""
            declared_size = response.headers.get("content-length")
            if declared_size and int(declared_size) > max_bytes:
                logger.info("Arquivo ignorado por tamanho declarado: %s", fileurl[:80])
                return b"", ""

            chunks = bytearray()
            async for chunk in response.aiter_bytes():
                chunks.extend(chunk)
                if len(chunks) > max_bytes:
                    logger.info("Arquivo interrompido por exceder limite: %s", fileurl[:80])
                    return b"", ""
            return bytes(chunks), response.headers.get("content-type", "")
    except (ValueError, OSError, RuntimeError) as exc:
        logger.warning("Download de arquivo falhou (%s): %s", fileurl[:80], exc)
        return b"", ""


async def extract_material_content(
    ws,
    client,
    fileurl: str,
    filename: str = "",
    mimetype: str = "",
) -> str:
    """
    Baixa um arquivo do Moodle e extrai o texto.
    `ws` é MoodleWebService (para URL com token) ou None (usa cookies do client).
    """
    data: Optional[bytes] = None

    if ws and fileurl and "/webservice/pluginfile.php/" in fileurl:
        data = await ws.download_file(fileurl)
    elif client and fileurl:
        data, detected_mimetype = await download_file_limited(client, fileurl)
        mimetype = mimetype or detected_mimetype

    if not data:
        return ""

    return extract_text_from_bytes(filename, mimetype, data)[:MAX_TEXT_CHARS]
