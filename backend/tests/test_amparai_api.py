"""Amparai backend regression tests.
Uses pre-seeded Bearer test_bearer_token_abc for protected endpoints.
Order matters: logout test runs LAST.
"""
import pytest
import os

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
TEST_BEARER = "test_bearer_token_abc"

PROTECTED = [
    ("GET", "/api/hoje"),
    ("GET", "/api/escala"),
    ("GET", "/api/saude"),
    ("GET", "/api/custos"),
    ("GET", "/api/summary/weekly"),
    ("GET", "/api/auth/me"),
    ("POST", "/api/sos"),
]

FORBIDDEN_WORDS = ["paciente", "idoso", "monitorar", "rastrear", "vigiar", "ALERTA", "anomalia"]


# ---- Health/root ----
class TestRoot:
    def test_root_ok(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        body = r.json()
        assert "Amparai" in body.get("message", "")

    def test_health_and_request_id(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/health",
            headers={"X-Request-ID": "ci-health-123"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.headers["X-Request-ID"] == "ci-health-123"

        sanitized = api_client.get(
            f"{BASE_URL}/api/health",
            headers={"X-Request-ID": "invalid id with spaces"},
        )
        assert sanitized.status_code == 200
        assert sanitized.headers["X-Request-ID"] != "invalid id with spaces"


# ---- Auth guards ----
class TestAuthGuards:
    @pytest.mark.parametrize("method,path", PROTECTED)
    def test_no_header_returns_401(self, api_client, method, path):
        r = api_client.request(method, f"{BASE_URL}{path}")
        assert r.status_code == 401, f"{method} {path} => {r.status_code}"

    @pytest.mark.parametrize("method,path", PROTECTED)
    def test_invalid_token_returns_401(self, api_client, method, path):
        r = api_client.request(method, f"{BASE_URL}{path}",
                               headers={"Authorization": "Bearer totally_bogus_token_xyz"})
        assert r.status_code == 401, f"{method} {path} => {r.status_code}"

    def test_toggle_no_auth_401(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/medications/some_id/toggle")
        assert r.status_code == 401


# ---- Hoje ----
class TestHoje:
    def test_hoje_shape(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/hoje")
        assert r.status_code == 200
        d = r.json()
        assert "greeting" in d and d["greeting"].startswith("Olá")
        assert d["elder"]["name"] == "Dona Maria"
        assert d["elder"]["age"] == 78
        meds = d["medications"]
        assert meds["total"] == 3
        assert meds["taken"] == 2
        assert len(meds["items"]) == 3
        # shifts include hoje + amanha
        days = {s["day"] for s in d["shifts"]}
        assert "hoje" in days and "amanha" in days
        assert len(d["appointments"]) >= 1


# ---- Toggle medication ----
class TestToggle:
    def test_toggle_flips_twice(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/hoje")
        assert r.status_code == 200
        med = r.json()["medications"]["items"][0]
        original = med["taken"]
        mid = med["id"]

        r1 = auth_client.post(f"{BASE_URL}/api/medications/{mid}/toggle")
        assert r1.status_code == 200
        assert r1.json()["taken"] == (not original)

        r2 = auth_client.post(f"{BASE_URL}/api/medications/{mid}/toggle")
        assert r2.status_code == 200
        assert r2.json()["taken"] == original

        # verify persistence
        r3 = auth_client.get(f"{BASE_URL}/api/hoje")
        after = [m for m in r3.json()["medications"]["items"] if m["id"] == mid][0]
        assert after["taken"] == original


# ---- Escala ----
class TestEscala:
    def test_escala_has_gap_and_contribution(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/escala")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["shifts"], list) and len(d["shifts"]) > 0
        assert any(s["covered"] is False for s in d["shifts"]), "expected at least one gap"
        assert isinstance(d["contribution"], dict) and len(d["contribution"]) > 0


# ---- Saude ----
class TestSaude:
    def test_saude_sources(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/saude")
        assert r.status_code == 200
        d = r.json()
        sources = {e["source"] for e in d["events"]}
        assert "whatsapp_audio" in sources
        assert "ia" in sources
        assert isinstance(d["medications"], list) and len(d["medications"]) == 3


# ---- Custos ----
class TestCustos:
    def test_custos_totals_and_split(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/custos")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["expenses"], list) and len(d["expenses"]) > 0
        assert isinstance(d["total"], (int, float)) and d["total"] > 0
        for e in d["expenses"]:
            assert isinstance(e["split_status"], dict) and len(e["split_status"]) > 0


# ---- Weekly summary ----
class TestSummary:
    def test_summary_pt_and_no_forbidden(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/summary/weekly", timeout=60)
        assert r.status_code == 200
        text = r.json().get("summary", "")
        assert isinstance(text, str) and len(text.strip()) > 0
        low = text.lower()
        for w in FORBIDDEN_WORDS:
            assert w.lower() not in low, f"forbidden word '{w}' found in summary: {text}"


# ---- SOS ----
class TestSOS:
    def test_sos_payload(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/sos")
        assert r.status_code == 200
        d = r.json()
        assert d.get("status")
        assert d.get("last_location")
        assert isinstance(d.get("circle_notified"), list) and len(d["circle_notified"]) > 0
        assert d.get("call_number")


# ---- Logout MUST run last ----
class TestZLogout:
    def test_logout_invalidates_token(self, auth_client, api_client):
        r = auth_client.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        assert r.json().get("ok") is True

        r2 = api_client.get(f"{BASE_URL}/api/auth/me",
                            headers={"Authorization": f"Bearer {TEST_BEARER}"})
        assert r2.status_code == 401
