"""
Serviço de criptografia para credenciais sensíveis.
Usa Fernet (AES-128-CBC) para criptografar dados em repouso.
"""
import json
from typing import Any
from app.config import settings


class CryptoService:
    def __init__(self):
        self._fernet = None

    @property
    def fernet(self):
        if self._fernet is None:
            self._fernet = settings.get_fernet()
        return self._fernet

    def encrypt(self, data: str) -> str:
        """Criptografa uma string e retorna base64 URL-safe."""
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, token: str) -> str:
        """Descriptografa um token Fernet."""
        return self.fernet.decrypt(token.encode()).decode()

    def encrypt_json(self, data: Any) -> str:
        """Serializa para JSON e criptografa."""
        return self.encrypt(json.dumps(data, default=str))

    def decrypt_json(self, token: str) -> Any:
        """Descriptografa e desserializa JSON."""
        return json.loads(self.decrypt(token))


crypto_service = CryptoService()
