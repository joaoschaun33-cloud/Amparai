import os
import pytest
import requests
from urllib.parse import urlparse

_configured_url = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
_parsed_url = urlparse(_configured_url)
if not _configured_url or _parsed_url.hostname not in {"localhost", "127.0.0.1", "::1"}:
    raise RuntimeError(
        "Testes bloqueados: defina EXPO_PUBLIC_BACKEND_URL para um backend local "
        "conectado ao Firestore Emulator."
    )
if os.environ.get("AMPARAI_TEST_MODE") != "1" or not os.environ.get("FIRESTORE_EMULATOR_HOST"):
    raise RuntimeError(
        "Testes bloqueados: AMPARAI_TEST_MODE=1 e FIRESTORE_EMULATOR_HOST são obrigatórios."
    )

BASE_URL = _configured_url
TEST_BEARER = "test_bearer_token_abc"
# 2º usuário de teste (Familiar). Só funciona quando o backend roda com AMPARAI_TEST_MODE=1
# (emulador/local). Ver GUIA_STAGING.md.
FAM_BEARER = "test_bearer_token_fam"

# Os testes do fluxo Familiar exigem o ambiente de teste local (emulador). Contra produção
# eles são pulados de propósito — não existe (e não deve existir) token de Familiar em prod.
FAMILIAR_TESTS_ENABLED = os.environ.get("AMPARAI_TEST_MODE") == "1"
requires_test_mode = pytest.mark.skipif(
    not FAMILIAR_TESTS_ENABLED,
    reason="fluxo Familiar exige AMPARAI_TEST_MODE=1 (emulador local); ver GUIA_STAGING.md",
)


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def auth_client():
    """Coordenadora (Dona Maria) — dono do household semeado."""
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TEST_BEARER}",
    })
    return s


@pytest.fixture
def familiar_client():
    """Familiar (Camila) — entra no círculo via convite. Só no ambiente de teste local."""
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {FAM_BEARER}",
    })
    return s
