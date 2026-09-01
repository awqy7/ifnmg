"""
Serviço de autenticação no Moodle IFNMG.
Usa requisições HTTP seguras e diretas como método principal (rápido e confiável),
com fallback inteligente para Playwright headless se necessário.
"""
import json
import asyncio
import logging
import re
from typing import Optional, Dict
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from app.config import settings

logger = logging.getLogger(__name__)

MOODLE_BASE = settings.MOODLE_BASE_URL.rstrip("/")
LOGIN_URL = f"{MOODLE_BASE}/login/index.php"

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": LOGIN_URL,
}


class MoodleAuthService:
    def __init__(self):
        self._sessions: Dict[str, dict] = {}

    async def login(self, username: str, password: str) -> Optional[Dict]:
        """
        Autentica no Moodle Virtual2 IFNMG.
        1. Login via REST API oficial (login/token.php) — o mesmo usado pelo
           app móvel do Moodle. Rápido e confiável, não passa pela verificação
           anti-bot do formulário HTML de login (que pode bloquear/estranglar
           IPs de servidores/datacenter).
        2. Login direto via HTTP (cookie/sessão) — útil para scraping HTML.
        3. Fallback Playwright headless.
        """
        username = username.strip()
        password = password.strip()

        # Método 1: REST API oficial (token)
        try:
            logger.info("Tentando login via REST API (token.php)...")
            session = await self._token_login(username, password)
            if session:
                logger.info("✅ Login via REST API realizado com sucesso!")
                return session
        except Exception as e:
            logger.warning(f"Login REST falhou: {e}. Tentando login HTTP direto...")

        # Método 2: Login HTTP Direto
        try:
            logger.info("Tentando login HTTP direto no Moodle")
            session = await self._http_login(username, password)
            if session:
                logger.info("✅ Login HTTP direto realizado com sucesso!")
                return session
        except Exception as e:
            logger.warning(f"Login HTTP direto falhou: {e}. Tentando fallback Playwright...")

        # Método 3: Fallback Playwright
        try:
            logger.info("Tentando login via Playwright headless...")
            session = await self._playwright_login(username, password)
            if session:
                logger.info("✅ Login Playwright realizado com sucesso!")
                return session
        except Exception as e:
            logger.error(f"Fallback Playwright também falhou: {e}", exc_info=True)

        return None

    async def _token_login(self, username: str, password: str) -> Optional[Dict]:
        """
        Login via REST API oficial do Moodle (login/token.php + webservice
        moodle_mobile_app). Retorna um token válido em JSON rápido e sem
        verificação anti-bot do formulário HTML.
        """
        async with httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=20.0) as client:
            try:
                resp = await client.post(
                    f"{MOODLE_BASE}/login/token.php",
                    data={
                        "username": username,
                        "password": password,
                        "service": "moodle_mobile_app",
                    },
                )
            except Exception as e:
                logger.warning(f"token.php: erro de conexão: {e}")
                return None

            if resp.status_code != 200:
                logger.warning(f"token.php retornou status {resp.status_code}")
                return None

            try:
                data = resp.json()
            except Exception:
                logger.warning("token.php não retornou JSON válido")
                return None

        token = data.get("token")
        if not token:
            logger.warning(f"token.php sem token: {data.get('error') or data}")
            return None

        # Nome completo do aluno via web service (best-effort, não bloqueia login)
        student_name = None
        moodle_user_id = None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                info = await client.post(
                    f"{MOODLE_BASE}/webservice/rest/server.php",
                    data={
                        "wstoken": token,
                        "wsfunction": "core_webservice_get_site_info",
                        "moodlewsrestformat": "json",
                    },
                )
                info_data = info.json()
                if not (isinstance(info_data, dict) and info_data.get("exception")):
                    student_name = info_data.get("fullname")
                    moodle_user_id = info_data.get("userid")
        except Exception:
            pass

        return {
            "moodle_token": token,
            "privatetoken": data.get("privatetoken"),
            "user_name": student_name or f"Aluno {username}",
            "moodle_user_id": moodle_user_id,
            "logged_at": datetime.utcnow().isoformat(),
            "base_url": MOODLE_BASE,
        }

    async def _http_login(self, username: str, password: str) -> Optional[Dict]:
        """Login direto via HTTP Session."""
        async with httpx.AsyncClient(
            follow_redirects=True,
            headers=DEFAULT_HEADERS,
            timeout=25.0,
        ) as client:
            # 1. GET na página de login para iniciar sessão Moodle e pegar tokens
            resp = await client.get(LOGIN_URL)
            if resp.status_code != 200:
                logger.warning(f"Página de login retornou status {resp.status_code}")
                return None

            soup = BeautifulSoup(resp.text, "html.parser")

            # Coleta campos do formulário (incluindo logintoken se houver)
            form_data = {
                "username": username,
                "password": password,
                "rememberusername": 1,
            }

            for inp in soup.find_all("input"):
                name = inp.get("name")
                val = inp.get("value", "")
                if name and name not in form_data:
                    form_data[name] = val

            # 2. POST com credenciais
            post_resp = await client.post(LOGIN_URL, data=form_data)
            final_url = str(post_resp.url)
            post_soup = BeautifulSoup(post_resp.text, "html.parser")

            # Verifica erros de login
            error_el = post_soup.select_one(".alert-danger, #loginerrormessage, .loginerrors, [role='alert']")
            if error_el:
                error_msg = error_el.get_text(strip=True)
                logger.warning(f"Moodle rejeitou credenciais: {error_msg}")
                return None

            # Se permaneceu na tela de login sem redirecionar
            if "login/index.php" in final_url and "testsession" not in final_url:
                # Checa se há input de senha (indica que continua na tela de login)
                if post_soup.find("input", {"type": "password"}):
                    logger.warning("Permaneceu na tela de login - credenciais incorretas")
                    return None

            # Converte cookies do httpx para dict
            cookies_dict = {k: v for k, v in client.cookies.items()}
            if "MoodleSession" not in cookies_dict:
                logger.warning("Cookie MoodleSession não encontrado na resposta")
                return None

            # 3. Extrai nome do aluno
            student_name = self._extract_student_name(post_soup)
            if not student_name:
                # Tenta acessar dashboard /my/ para extrair o nome
                try:
                    my_resp = await client.get(f"{MOODLE_BASE}/my/")
                    my_soup = BeautifulSoup(my_resp.text, "html.parser")
                    student_name = self._extract_student_name(my_soup)
                except Exception:
                    pass

            return {
                "cookies": cookies_dict,
                "user_name": student_name or f"Aluno {username}",
                "logged_at": datetime.utcnow().isoformat(),
                "base_url": MOODLE_BASE,
            }

    def _extract_student_name(self, soup: BeautifulSoup) -> Optional[str]:
        """Extrai o nome do aluno da barra superior do Moodle."""
        selectors = [
            ".usermenu .usertext",
            ".userbutton .usertext",
            ".userbutton .avatar + span",
            ".userinfo .fullname",
            "[data-region='user-menu'] .usertext",
            ".page-header-headings h1",
        ]
        for sel in selectors:
            el = soup.select_one(sel)
            if el:
                text = el.get_text(strip=True)
                if text and len(text) > 2 and "acessar" not in text.lower() and "entrar" not in text.lower():
                    return text
        return None

    async def _playwright_login(self, username: str, password: str) -> Optional[Dict]:
        """Fallback via Playwright headless browser."""
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            )
            context = await browser.new_context(
                user_agent=DEFAULT_HEADERS["User-Agent"],
                locale="pt-BR",
            )

            try:
                page = await context.new_page()
                await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=25000)

                # Preenche usuário e senha
                await page.fill('[name="username"]', username)
                await page.fill('[name="password"]', password)

                # Submete o formulário
                await page.click('[type="submit"]')
                await page.wait_for_timeout(3000)

                current_url = page.url
                if "login/index.php" in current_url and "testsession" not in current_url:
                    error_el = await page.query_selector(".alert-danger, #loginerrormessage, .loginerrors, [role='alert']")
                    if error_el:
                        error_text = await error_el.inner_text()
                        logger.warning(f"Playwright: login falhou: {error_text}")
                        return None

                cookies = await context.cookies()
                cookies_dict = {c["name"]: c["value"] for c in cookies}

                if "MoodleSession" not in cookies_dict:
                    return None

                # Extrai nome do aluno
                user_name = None
                try:
                    name_el = await page.query_selector(".usermenu .usertext, .userbutton .usertext, .userinfo .fullname")
                    if name_el:
                        user_name = await name_el.inner_text()
                except Exception:
                    pass

                return {
                    "cookies": cookies_dict,
                    "all_cookies": cookies,
                    "user_name": user_name or f"Aluno {username}",
                    "logged_at": datetime.utcnow().isoformat(),
                    "base_url": MOODLE_BASE,
                }

            finally:
                await browser.close()

    def build_httpx_client(self, session_data: dict) -> httpx.AsyncClient:
        """Cria um cliente httpx autenticado com os cookies da sessão Moodle."""
        cookies = httpx.Cookies()
        for name, value in session_data.get("cookies", {}).items():
            cookies.set(
                name,
                value,
                domain=MOODLE_BASE.replace("https://", "").replace("http://", ""),
            )

        return httpx.AsyncClient(
            cookies=cookies,
            headers=DEFAULT_HEADERS,
            follow_redirects=True,
            timeout=30.0,
        )

    async def validate_session(self, session_data: dict) -> bool:
        """Verifica se a sessão Moodle ainda está ativa."""
        try:
            token = session_data.get("moodle_token")
            if token:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        f"{MOODLE_BASE}/webservice/rest/server.php",
                        data={
                            "wstoken": token,
                            "wsfunction": "core_webservice_get_site_info",
                            "moodlewsrestformat": "json",
                        },
                    )
                    data = response.json()
                    valid = response.status_code == 200 and not data.get("exception") and bool(data.get("userid"))
                    if valid:
                        session_data["moodle_user_id"] = data.get("userid")
                    return valid
            async with self.build_httpx_client(session_data) as client:
                resp = await client.get(f"{MOODLE_BASE}/my/")
                if "login" in str(resp.url):
                    return False
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Erro ao validar sessão: {e}")
            return False

    async def get_moodle_token(self, username: str, password: str) -> Optional[str]:
        """Tenta obter token da API REST do Moodle se disponível."""
        try:
            async with httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=10.0) as client:
                resp = await client.post(
                    f"{MOODLE_BASE}/login/token.php",
                    data={
                        "username": username,
                        "password": password,
                        "service": "moodle_mobile_app",
                    },
                )
                data = resp.json()
                if "token" in data:
                    return data["token"]
        except Exception:
            pass
        return None


moodle_auth_service = MoodleAuthService()
