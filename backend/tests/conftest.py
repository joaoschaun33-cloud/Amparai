import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://mama-today.preview.emergentagent.com").rstrip("/")
TEST_BEARER = "test_bearer_token_abc"


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
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TEST_BEARER}",
    })
    return s
