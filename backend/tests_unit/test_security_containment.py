import asyncio
from types import SimpleNamespace
from datetime import timedelta

import pytest
from fastapi import HTTPException

import server


def test_synthetic_token_is_rejected_without_local_test_environment(monkeypatch):
    monkeypatch.delenv("AMPARAI_TEST_MODE", raising=False)
    monkeypatch.delenv("FIRESTORE_EMULATOR_HOST", raising=False)
    monkeypatch.setattr(
        server.auth,
        "verify_id_token",
        lambda _token: (_ for _ in ()).throw(ValueError("invalid token")),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(server.require_user("Bearer test_bearer_token_abc"))

    assert exc.value.status_code == 401


def test_register_push_uses_authenticated_uid(monkeypatch):
    captured = {}

    async def fake_require_user(_authorization):
        return {"user_id": "uid_from_verified_token"}

    async def fake_update_one(query, update, upsert=False):
        captured.update({"query": query, "update": update, "upsert": upsert})

    monkeypatch.setattr(server, "require_user", fake_require_user)
    monkeypatch.setattr(
        server,
        "db",
        SimpleNamespace(device_tokens=SimpleNamespace(update_one=fake_update_one)),
    )

    body = server.RegisterPushBody(platform="android", device_token="device-token")
    result = asyncio.run(server.register_push(body, "Bearer firebase-token"))

    assert result == {"status": "registered"}
    assert captured["query"] == {"user_id": "uid_from_verified_token"}
    assert captured["upsert"] is True


def test_sensitive_write_requires_current_consent(monkeypatch):
    async def no_consent(_owner_id):
        return {"consented": False}

    monkeypatch.setattr(server, "get_consent_status", no_consent)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(server.require_valid_consent("household-owner"))

    assert exc.value.status_code == 403


def test_invitation_expiration_is_enforced():
    assert server.invitation_expired({"expires_at": server.now_utc() - timedelta(seconds=1)})
    assert not server.invitation_expired({"expires_at": server.now_utc() + timedelta(days=1)})


def test_unimplemented_circle_roles_are_rejected():
    with pytest.raises(HTTPException) as exc:
        server.validate_circle_role("cuidador")
    assert exc.value.status_code == 400
