"""Amparai backend iteration 2 regression tests.

Coverage:
- Onboarding status (auth guard + progression)
- Clinical data GET/PUT (idempotency + update reflection)
- Elder PUT (consent_given → onboarding reflects)
- Members CRUD + Invitations (create + PUBLIC get)
- WhatsApp nudge deep-link
- Expense create + reflection in /custos
- Public pulseira page + scan endpoint + list_scans (auth)
- SOS enriched with recent_scans
- OCR /api/ocr/receipt returns 200 with expected keys (fallback acceptable)
- Weekly summary guardrails re-check

The Bearer test_bearer_token_abc is pre-seeded in MongoDB.
Order matters: onboarding_status is asserted before/after other steps so we
call the auth flow tests first, then modify state.
"""
import os
import base64
import pytest

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL", "https://mama-today.preview.emergentagent.com"
).rstrip("/")
TEST_BEARER = "test_bearer_token_abc"
FORBIDDEN_WORDS = ["paciente", "idoso", "monitorar", "rastrear", "vigiar", "ALERTA", "anomalia"]

# tiny 1x1 transparent PNG
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4"
    "2mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
)


# ---------- Onboarding ----------
class TestOnboarding:
    def test_status_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/onboarding/status")
        assert r.status_code == 401

    def test_status_shape(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/onboarding/status")
        assert r.status_code == 200
        d = r.json()
        assert set(d.keys()) >= {"steps", "completed", "total"}
        assert d["total"] == 3
        assert set(d["steps"].keys()) == {"consent", "clinical", "circle"}
        assert 0 <= d["completed"] <= 3
        # each step must be boolean
        for k, v in d["steps"].items():
            assert isinstance(v, bool), f"{k} must be bool"


# ---------- Clinical ----------
class TestClinical:
    def test_get_seeds_default(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/clinico")
        assert r.status_code == 200
        d = r.json()
        assert "blood_type" in d
        assert isinstance(d.get("allergies", []), list)
        assert isinstance(d.get("conditions", []), list)
        assert isinstance(d.get("continuous_meds", []), list)
        assert isinstance(d.get("emergency_contacts", []), list)
        assert "mobility" in d
        assert "cognitive" in d

    def test_get_is_idempotent(self, auth_client):
        r1 = auth_client.get(f"{BASE_URL}/api/clinico")
        r2 = auth_client.get(f"{BASE_URL}/api/clinico")
        assert r1.status_code == 200 and r2.status_code == 200
        # Compare stable-ish subset (order of lists preserved on idempotent seed)
        d1, d2 = r1.json(), r2.json()
        assert d1.get("blood_type") == d2.get("blood_type")
        assert d1.get("allergies") == d2.get("allergies")
        assert d1.get("conditions") == d2.get("conditions")

    def test_put_reflects_in_get(self, auth_client):
        # fetch current to preserve arrays
        current = auth_client.get(f"{BASE_URL}/api/clinico").json()
        payload = {
            "blood_type": "A+",
            "allergies": current.get("allergies", []),
            "conditions": current.get("conditions", []),
            "surgeries": current.get("surgeries", []),
            "continuous_meds": current.get("continuous_meds", []),
            "health_plan": current.get("health_plan"),
            "emergency_contacts": current.get("emergency_contacts", []),
            "notes": current.get("notes"),
            "mobility": "assistida",
            "cognitive": current.get("cognitive"),
        }
        r = auth_client.put(f"{BASE_URL}/api/clinico", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True

        r2 = auth_client.get(f"{BASE_URL}/api/clinico")
        d = r2.json()
        assert d["blood_type"] == "A+"
        assert d["mobility"] == "assistida"


# ---------- Elder update ----------
class TestElderUpdate:
    def test_put_consent_and_onboarding_reflects(self, auth_client):
        r = auth_client.put(f"{BASE_URL}/api/elder", json={"consent_given": True})
        assert r.status_code == 200
        # onboarding_status should now show consent=true
        s = auth_client.get(f"{BASE_URL}/api/onboarding/status").json()
        assert s["steps"]["consent"] is True
        assert s["steps"]["clinical"] is True  # seeded in TestClinical
        assert s["completed"] >= 2


# ---------- Members CRUD ----------
class TestMembers:
    def test_list_returns_list(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/members")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("members"), list)

    def test_add_and_delete_member(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/members",
            json={"name": "TEST_Bruno", "role": "irmao"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["id"].startswith("mem_")
        assert d["name"] == "TEST_Bruno"
        assert d["role"] == "irmao"
        mem_id = d["id"]

        # Verify present
        listing = auth_client.get(f"{BASE_URL}/api/members").json()["members"]
        assert any(m["id"] == mem_id for m in listing)

        # onboarding reflects circle>=1
        s = auth_client.get(f"{BASE_URL}/api/onboarding/status").json()
        assert s["steps"]["circle"] is True

        # Delete
        r2 = auth_client.delete(f"{BASE_URL}/api/members/{mem_id}")
        assert r2.status_code == 200
        listing2 = auth_client.get(f"{BASE_URL}/api/members").json()["members"]
        assert all(m["id"] != mem_id for m in listing2)


# ---------- Invitations ----------
class TestInvitations:
    def test_create_and_public_fetch(self, auth_client, api_client):
        r = auth_client.post(
            f"{BASE_URL}/api/invitations",
            json={"name": "TEST_Bruno", "role": "irmao"},
        )
        assert r.status_code == 200
        d = r.json()
        code = d["code"]
        assert isinstance(code, str) and len(code) == 8
        # Must be uppercase hex
        assert all(c in "0123456789ABCDEF" for c in code), f"invalid hex code: {code}"
        assert d["invite_url"].endswith(f"/convite/{code}")

        # Public GET (no auth header)
        r2 = api_client.get(f"{BASE_URL}/api/invitations/{code}")
        assert r2.status_code == 200
        d2 = r2.json()
        assert "invitation" in d2
        assert d2["invitation"]["code"] == code
        assert d2.get("elder_name")  # non-empty

    def test_public_fetch_unknown_returns_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/invitations/NOEXIST0")
        assert r.status_code == 404


# ---------- WhatsApp nudge ----------
class TestWhatsappNudge:
    def test_nudge_url_and_message(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/whatsapp/nudge",
            json={
                "to_name": "Carla",
                "to_phone": "+55 (11) 91234-5678",
                "amount": 187.4,
                "expense_title": "Farmácia",
            },
        )
        assert r.status_code == 200
        d = r.json()
        assert d["url"].startswith("https://wa.me/")
        # URL-encoded "quando puder" — space => %20 (quote default). Case-insensitive
        # because the message capitalizes "Quando" as sentence start.
        assert "quando%20puder" in d["url"].lower()
        assert "quando puder" in d["message"].lower()
        assert "Carla" in d["message"]


# ---------- Expense create ----------
class TestExpenseCreate:
    def test_create_and_get(self, auth_client):
        payload = {
            "title": "TEST_Farmacia",
            "amount": 42.5,
            "category": "Medicamentos",
            "date": "10/01",
            "paid_by": "Ana",
            "split_status": {"Ana": "pago", "Carla": "pendente"},
        }
        r = auth_client.post(f"{BASE_URL}/api/expenses", json=payload)
        assert r.status_code == 200
        d = r.json()
        exp_id = d["id"]
        assert exp_id.startswith("exp_")
        assert d["title"] == "TEST_Farmacia"

        listing = auth_client.get(f"{BASE_URL}/api/custos").json()["expenses"]
        assert any(e["id"] == exp_id for e in listing)


# ---------- Pulseira (public) + scans ----------
class TestPulseira:
    def _get_elder_id(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/hoje")
        return r.json()["elder"]["id"]

    def test_public_pulseira(self, auth_client, api_client):
        elder_id = self._get_elder_id(auth_client)
        r = api_client.get(f"{BASE_URL}/api/pulseira/{elder_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["elder"]["name"] == "Dona Maria"
        assert "age" not in d["elder"]
        assert "photo_url" in d["elder"]
        assert "blood_type" not in d
        assert "allergies" not in d
        assert "conditions" not in d
        assert isinstance(d.get("emergency_contacts"), list)

    def test_public_pulseira_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/pulseira/elder_no_exist_xxx")
        assert r.status_code == 404

    def test_scan_public_and_authed_list(self, auth_client, api_client):
        elder_id = self._get_elder_id(auth_client)
        r = api_client.post(
            f"{BASE_URL}/api/pulseira/{elder_id}/scan",
            json={
                "finder_name": "TEST_Passante",
                "finder_phone": "11999999999",
                "note": "encontrada na praça",
                "address": "Praça da Sé, 100",
            },
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Listing requires auth
        r_unauth = api_client.get(f"{BASE_URL}/api/pulseira/{elder_id}/scans")
        assert r_unauth.status_code == 401

        r2 = auth_client.get(f"{BASE_URL}/api/pulseira/{elder_id}/scans")
        assert r2.status_code == 200
        scans = r2.json()["scans"]
        assert isinstance(scans, list) and len(scans) >= 1
        assert any(s.get("finder_name") == "TEST_Passante" for s in scans)


# ---------- SOS enriched ----------
class TestSOS:
    def test_sos_has_recent_scans_elder_info(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/sos")
        assert r.status_code == 200
        d = r.json()
        assert d.get("elder_id")
        assert d.get("elder_name") == "Dona Maria"
        assert isinstance(d.get("recent_scans"), list)
        # After TestPulseira ran, at least one scan should exist
        assert len(d["recent_scans"]) >= 1


# ---------- OCR ----------
class TestOCR:
    def test_ocr_receipt_no_500(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/ocr/receipt",
            json={"image_base64": TINY_PNG_B64},
            timeout=60,
        )
        assert r.status_code == 200, f"OCR returned {r.status_code}: {r.text[:200]}"
        d = r.json()
        for key in ("title", "amount", "category", "date"):
            assert key in d, f"missing key {key} in OCR response: {d}"

    def test_ocr_with_data_uri_prefix(self, auth_client):
        data_uri = f"data:image/png;base64,{TINY_PNG_B64}"
        r = auth_client.post(
            f"{BASE_URL}/api/ocr/receipt",
            json={"image_base64": data_uri},
            timeout=60,
        )
        assert r.status_code == 200


# ---------- Guardrails re-check ----------
class TestGuardrails:
    def test_weekly_summary_no_forbidden(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/summary/weekly", timeout=60)
        assert r.status_code == 200
        text = (r.json().get("summary") or "").lower()
        assert len(text.strip()) > 0
        for w in FORBIDDEN_WORDS:
            assert w.lower() not in text, f"forbidden word '{w}' present"
