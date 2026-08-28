"""Smoke test responsivo contra o build local com API simulada.

Uso: python tests/mobile_viewport_smoke.py
Requer `next start` em http://127.0.0.1:3000 e Playwright Python.
"""
import json

from playwright.sync_api import sync_playwright


def api_response(url: str):
    if url.endswith("/api/auth/me"):
        return {
            "id": "mobile-test",
            "name": "Estudante Teste",
            "email": "teste@virtual2.ifnmg.edu.br",
            "moodle_connected": True,
            "moodle_last_sync": None,
            "ai_provider": "groq",
            "theme": "dark",
        }
    if "/api/briefing/today" in url:
        return {"content": "Tudo pronto para estudar hoje."}
    if "/api/schedule/today" in url:
        return {"day": "Hoje", "slots": []}
    if "/api/notifications/unread-count" in url:
        return {"count": 0}
    if "/api/activities/summary" in url:
        return {}
    return []


def main():
    viewports = [(320, 568), (375, 667), (430, 932), (844, 390)]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for width, height in viewports:
                print(f"Testando {width}x{height}...", flush=True)
                page = browser.new_page(viewport={"width": width, "height": height})
                page.add_init_script("localStorage.setItem('ifnmg_token', 'mobile-smoke-token')")

                def route_api(route):
                    route.fulfill(
                        status=200,
                        content_type="application/json",
                        body=json.dumps(api_response(route.request.url)),
                    )

                page.route("**/api/**", route_api)
                page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded")
                page.get_by_role("navigation", name="Navegação principal").wait_for(state="visible")

                overflow = page.evaluate(
                    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
                )
                assert not overflow, f"overflow horizontal em {width}x{height}"

                page.locator("nav.mobile-bottom-nav button").filter(has_text="Tarefas").click()
                page.get_by_role("heading", name="Atividades & Tarefas").wait_for(state="visible")
                page.get_by_role("button", name="Abrir todas as opções").click()
                page.wait_for_timeout(400)
                aside = page.locator("aside").bounding_box()
                assert aside and aside["x"] >= 0, f"drawer não abriu em {width}x{height}"
                page.close()
        finally:
            browser.close()

    print(f"OK: {len(viewports)} viewports móveis sem overflow e com navegação funcional")


if __name__ == "__main__":
    main()
