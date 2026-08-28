"""
Extração de conteúdo textual dos materiais do Moodle.
Baixa arquivos via webservice/pluginfile.php e extrai texto
(PDF via pdfplumber/PyPDF2, HTML limpo, texto puro) para alimentar a IA.
"""
import io
import logging
import re
import zipfile
from html import unescape
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

    # Office/OpenDocument: extração leve do XML interno, sem executar macros.
    if name.endswith(".docx") or "wordprocessingml" in mime:
        try:
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

    if name.endswith(".pptx") or "presentationml" in mime:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                slide_names = sorted(
                    (item for item in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", item)),
                    key=lambda item: int(re.search(r"\d+", item).group()),
                )
                slides = []
                for index, item in enumerate(slide_names[:100], start=1):
                    xml = z.read(item).decode("utf-8", errors="ignore")
                    texts = [unescape(value) for value in re.findall(r"<a:t[^>]*>(.*?)</a:t>", xml)]
                    if texts:
                        slides.append(f"Slide {index}: " + " ".join(texts))
                return "\n".join(slides)
        except Exception as e:
            logger.debug("pptx extract falhou: %s", e)
        return ""

    if name.endswith(".xlsx") or "spreadsheetml" in mime:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                shared = []
                if "xl/sharedStrings.xml" in z.namelist():
                    shared_xml = z.read("xl/sharedStrings.xml").decode("utf-8", errors="ignore")
                    for block in re.findall(r"<si[\s>][\s\S]*?</si>", shared_xml):
                        shared.append("".join(re.findall(r"<t[^>]*>(.*?)</t>", block)))
                rows = []
                sheet_names = sorted(item for item in z.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", item))
                for sheet_index, item in enumerate(sheet_names[:30], start=1):
                    xml = z.read(item).decode("utf-8", errors="ignore")
                    rows.append(f"Planilha {sheet_index}:")
                    for row in re.findall(r"<row[\s>][\s\S]*?</row>", xml)[:500]:
                        values = []
                        for cell in re.findall(r"<c[\s>][\s\S]*?</c>", row):
                            raw = re.search(r"<v>(.*?)</v>", cell)
                            if not raw:
                                continue
                            value = raw.group(1)
                            if 't="s"' in cell:
                                try:
                                    value = shared[int(value)]
                                except (ValueError, IndexError):
                                    pass
                            values.append(unescape(value))
                        if values:
                            rows.append(" | ".join(values))
                return "\n".join(rows)
        except Exception as e:
            logger.debug("xlsx extract falhou: %s", e)
        return ""

    if name.endswith((".odt", ".ods", ".odp")) or "opendocument" in mime:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                return _clean_html(z.read("content.xml").decode("utf-8", errors="ignore"))
        except Exception as e:
            logger.debug("OpenDocument extract falhou: %s", e)
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
