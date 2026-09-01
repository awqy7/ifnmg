"""
Extração de conteúdo textual dos materiais do Moodle.
Baixa arquivos via webservice/pluginfile.php e extrai texto
(PDF via pdfplumber/PyPDF2, HTML limpo, texto puro) para alimentar a IA.
"""
import asyncio
import io
import ipaddress
import logging
import re
import socket
import zipfile
from html import unescape
from typing import Optional
from urllib.parse import unquote, urlparse, urljoin

import httpx

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_PDF_PAGES = 25
MAX_OCR_PAGES = 12
MAX_TEXT_CHARS = 15000

# Domínios permitidos para download (Moodle IFNMG + YouTube)
ALLOWED_DOMAINS = {
    "virtual2.ifnmg.edu.br",
    "www.youtube.com",
    "youtube.com",
    "youtu.be",
    "m.youtube.com",
    "www.youtube-nocookie.com",
    "youtube-nocookie.com",
}

# IPs privados/bloqueados (RFC1918 + loopback + link-local + metadata cloud)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # link-local
    ipaddress.ip_network("::1/128"),         # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),        # IPv6 ULA
    ipaddress.ip_network("fe80::/10"),       # IPv6 link-local
]

# Endpoints de metadata conhecidos
BLOCKED_HOSTS = {
    "169.254.169.254",      # AWS/GCP/Azure metadata
    "metadata.google.internal",
    "metadata.azure.com",
    "metadata.aliyuncs.com",
    "100.100.100.200",      # Alibaba Cloud metadata
}


def _is_url_allowed(url: str) -> bool:
    """Valida se a URL é segura para acesso (SSRF protection)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        
        hostname = parsed.hostname or ""
        if not hostname:
            return False
        
        # Bloqueia hosts conhecidos de metadata
        if hostname.lower() in BLOCKED_HOSTS:
            logger.warning("Bloqueado acesso a host de metadata: %s", hostname)
            return False
        
        # Resolve IP e verifica redes privadas
        try:
            # Resolve apenas A/AAAA records
            for family in (socket.AF_INET, socket.AF_INET6):
                try:
                    infos = socket.getaddrinfo(hostname, None, family, socket.SOCK_STREAM)
                    for info in infos:
                        ip_str = info[4][0]
                        ip = ipaddress.ip_address(ip_str)
                        for net in BLOCKED_NETWORKS:
                            if ip in net:
                                logger.warning("Bloqueado IP privado/interno: %s (%s)", ip_str, hostname)
                                return False
                except socket.gaierror:
                    continue
        except Exception as e:
            logger.warning("Erro ao resolver hostname %s: %s", hostname, e)
            return False
        
        # Verifica se domínio é permitido (para URLs externas não-Moodle)
        if not _is_moodle_domain(hostname):
            # Permite apenas domínios explicitamente permitidos (YouTube)
            host = hostname.lower().rstrip(".")
            allowed = any(
                host == domain or host.endswith(f".{domain}")
                for domain in ALLOWED_DOMAINS
                if domain != "virtual2.ifnmg.edu.br"
            )
            if not allowed:
                logger.warning("Domínio não permitido para download: %s", hostname)
                return False
        
        return True
    except Exception as e:
        logger.warning("Erro ao validar URL %s: %s", url, e)
        return False


def _is_moodle_domain(hostname: str) -> bool:
    """Verifica se o hostname é do Moodle IFNMG."""
    host = hostname.lower().rstrip(".")
    return host == "virtual2.ifnmg.edu.br" or host.endswith(".virtual2.ifnmg.edu.br")


def _clean_html(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _sanitize_for_llm(text: str) -> str:
    """Sanitiza texto que vai para o LLM para prevenir prompt injection."""
    if not text:
        return ""
    # Remove possíveis delimitadores de instrução
    text = re.sub(r"<\s*(dados_atividade|dados_virtual2|atividade|instrução|instruction|system|user|assistant)\s*>", "", text, flags=re.I)
    text = re.sub(r"<\s*/\s*(dados_atividade|dados_virtual2|atividade|instrução|instruction|system|user|assistant)\s*>", "", text, flags=re.I)
    # Remove tentativas de injection comuns
    text = re.sub(r"(?i)ignore\s+(?:previous|prior|above|all)\s+(?:instructions?|prompts?|rules?)", "[FILTERED]", text)
    text = re.sub(r"(?i)disregard\s+(?:previous|prior|above|all)\s+(?:instructions?|prompts?|rules?)", "[FILTERED]", text)
    text = re.sub(r"(?i)you\s+are\s+now\s+(?:a|an|the)\s+\w+", "[FILTERED]", text)
    text = re.sub(r"(?i)act\s+as\s+(?:a|an|the)\s+\w+", "[FILTERED]", text)
    text = re.sub(r"(?i)pretend\s+to\s+be\s+(?:a|an|the)\s+\w+", "[FILTERED]", text)
    # Limita tamanho
    return text[:MAX_TEXT_CHARS]


def _pdf_text(data: bytes) -> str:
    """Extrai texto selecionável e usa OCR quando o PDF é digitalizado."""
    extracted = ""

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
        extracted = "\n".join(chunks).strip()
        if len(extracted) >= 100:
            return _sanitize_for_llm(extracted)
    except Exception as e:
        logger.warning("pdfplumber falhou: %s", e)

    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(data))
        chunks = []
        for i, page in enumerate(reader.pages[:MAX_PDF_PAGES]):
            try:
                chunks.append(page.extract_text() or "")
            except Exception:
                continue
        fallback_text = "\n".join(chunks).strip()
        if len(fallback_text) > len(extracted):
            extracted = fallback_text
        if len(extracted) >= 100:
            return _sanitize_for_llm(extracted)
    except Exception as e:
        logger.warning("PyPDF2 falhou: %s", e)

    try:
        import pypdfium2 as pdfium
        import pytesseract

        pdf = pdfium.PdfDocument(data)
        chunks = []
        for page_index in range(min(len(pdf), MAX_OCR_PAGES)):
            page = pdf[page_index]
            image = page.render(scale=2).to_pil()
            text = pytesseract.image_to_string(image, lang="por+eng").strip()
            if text:
                chunks.append(f"Página {page_index + 1}:\n{text}")
        ocr_text = "\n\n".join(chunks).strip()
        if ocr_text:
            combined = "\n\n".join(part for part in (extracted, ocr_text) if part)
            return _sanitize_for_llm(combined)
    except Exception as e:
        logger.info("OCR indisponível ou falhou: %s", e)

    return _sanitize_for_llm(extracted)


def extract_youtube_video_id(url: str) -> str:
    """Aceita URLs youtube.com, youtu.be, shorts e embed."""
    match = re.search(
        r"(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:watch\?(?:[^#]*&)?v=|embed/|shorts/|live/))"
        r"([A-Za-z0-9_-]{11})",
        url or "",
        flags=re.I,
    )
    return match.group(1) if match else ""


async def extract_youtube_transcript(url: str) -> str:
    """Obtém legendas públicas do YouTube, priorizando português."""
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return ""

    def fetch() -> str:
        from youtube_transcript_api import YouTubeTranscriptApi

        transcript = YouTubeTranscriptApi().fetch(
            video_id,
            languages=["pt-BR", "pt", "en"],
        )
        return " ".join(snippet.text.strip() for snippet in transcript if snippet.text.strip())

    try:
        text = await asyncio.to_thread(fetch)
        return _sanitize_for_llm(f"Transcrição do vídeo do YouTube ({video_id}):\n{text}")
    except Exception as exc:
        logger.info("Legenda do YouTube indisponível para %s: %s", video_id, exc)
        return ""


async def extract_url_content(client: httpx.AsyncClient, url: str) -> str:
    """Lê links postados pelo professor, incluindo redirecionamentos do Moodle."""
    if not client or not url:
        return ""

    if not _is_url_allowed(url):
        return ""

    youtube_text = await extract_youtube_transcript(url)
    if youtube_text:
        return youtube_text

    try:
        current_url = url
        response = None
        for _ in range(6):
            if not _is_url_allowed(current_url):
                return ""
            response = await client.get(current_url, follow_redirects=False)
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    return ""
                current_url = urljoin(current_url, location)
                continue
            break
        if response is None or response.is_redirect:
            return ""
        if response.status_code != 200 or len(response.content) > MAX_FILE_BYTES:
            return ""
        
        final_url = str(response.url)
        if not _is_url_allowed(final_url):
            logger.warning("Redirect para URL não permitida: %s", final_url)
            return ""
        
        youtube_text = await extract_youtube_transcript(final_url)
        if youtube_text:
            return youtube_text
        
        content_type = response.headers.get("content-type", "").lower()
        if "html" in content_type:
            return _sanitize_for_llm(_clean_html(response.text))
        
        filename = unquote(urlparse(final_url).path.rsplit("/", 1)[-1])
        extracted = await asyncio.to_thread(
            extract_text_from_bytes, filename, content_type, response.content
        )
        if extracted:
            return extracted
    except Exception as exc:
        logger.info("Leitura de link falhou (%s): %s", url[:80], exc)
    return ""


def extract_text_from_bytes(filename: str, mimetype: str, data: bytes) -> str:
    """Extrai texto de um arquivo conforme seu tipo."""
    name = (filename or "").lower()
    mime = (mimetype or "").lower()

    if not data:
        return ""
    if len(data) > MAX_FILE_BYTES:
        logger.info("Arquivo grande ignorado (%d bytes): %s", len(data), filename)
        return ""

    if name.endswith(".pdf") or "pdf" in mime:
        return _pdf_text(data)

    if any(name.endswith(ext) for ext in (".txt", ".md", ".csv", ".log")) or mime.startswith("text/"):
        try:
            return _sanitize_for_llm(data.decode("utf-8", errors="ignore"))
        except Exception:
            return ""

    if any(name.endswith(ext) for ext in (".html", ".htm")) or "html" in mime:
        return _sanitize_for_llm(_clean_html(data.decode("utf-8", errors="ignore")))

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
                return _sanitize_for_llm("\n".join(out))
        except Exception as e:
            logger.debug("docx extract falhou: %s", e)
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
                return _sanitize_for_llm("\n".join(slides))
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
                return _sanitize_for_llm("\n".join(rows))
        except Exception as e:
            logger.debug("xlsx extract falhou: %s", e)
        return ""

    if name.endswith((".odt", ".ods", ".odp")) or "opendocument" in mime:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                return _sanitize_for_llm(_clean_html(z.read("content.xml").decode("utf-8", errors="ignore")))
        except Exception as e:
            logger.debug("OpenDocument extract falhou: %s", e)
        return ""

    return ""


async def download_file_limited(client: httpx.AsyncClient, fileurl: str, max_bytes: int = MAX_FILE_BYTES) -> tuple[bytes, str]:
    """Baixa um arquivo autenticado sem armazenar respostas arbitrariamente grandes."""
    if not client or not fileurl:
        return b"", ""

    if not _is_url_allowed(fileurl):
        return b"", ""

    try:
        current_url = fileurl
        for _ in range(6):
            if not _is_url_allowed(current_url):
                return b"", ""
            async with client.stream("GET", current_url, follow_redirects=False) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        return b"", ""
                    current_url = urljoin(current_url, location)
                    continue
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
        return b"", ""
    except (ValueError, OSError, RuntimeError, httpx.HTTPError) as exc:
        logger.warning("Download de arquivo falhou (%s): %s", fileurl[:80], exc)
        return b"", ""


async def extract_material_content(
    ws,
    client: httpx.AsyncClient,
    fileurl: str,
    filename: str = "",
    mimetype: str = "",
) -> str:
    """
    Baixa um arquivo do Moodle e extrai o texto.
    `ws` é MoodleWebService (para URL com token) ou None (usa cookies do client).
    """
    data: Optional[bytes] = None

    if ws and fileurl:
        data = await ws.download_file(fileurl)
    elif client and fileurl:
        data, detected_mimetype = await download_file_limited(client, fileurl)
        mimetype = mimetype or detected_mimetype

    if not data:
        return ""

    # PDF/OCR e leitura de documentos são CPU-bound. Executar fora do event
    # loop mantém login, dashboard e polling responsivos durante a sincronização.
    return await asyncio.to_thread(extract_text_from_bytes, filename, mimetype, data)
