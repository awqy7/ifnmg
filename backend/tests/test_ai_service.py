import unittest
from unittest.mock import AsyncMock, patch

from app.services.ai_service import AIProvider, AIService


class AIServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_groq_uses_current_model_and_low_reasoning(self):
        service = AIService()

        with patch("app.config.settings.GROQ_MODEL", "openai/gpt-oss-20b"):
            kwargs = service._build_litellm_kwargs(AIProvider.GROQ, api_key="test-key")

        self.assertEqual(kwargs["model"], "groq/openai/gpt-oss-20b")
        self.assertEqual(kwargs["reasoning_effort"], "low")
        self.assertFalse(kwargs["include_reasoning"])

    async def test_provider_rejects_empty_response(self):
        service = AIService()
        service.chat = AsyncMock(return_value="")

        result = await service.test_provider(AIProvider.GROQ, "test-key")

        self.assertFalse(result["success"])
        self.assertIn("sem conteúdo", result["error"])


if __name__ == "__main__":
    unittest.main()
