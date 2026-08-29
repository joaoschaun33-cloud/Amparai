#!/usr/bin/env python3
"""Invariantes de segurança verificáveis sem credenciais ou acesso externo."""

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"SECURITY CHECK FAILED: {message}")


tracked = subprocess.check_output(
    ["git", "ls-files"], cwd=ROOT, text=True, encoding="utf-8"
).splitlines()
forbidden_names = {
    ".env",
    "service-account-key.json",
    "google-services.json",
    "GoogleService-Info.plist",
}
for path in tracked:
    require(Path(path).name not in forbidden_names, f"segredo/config móvel rastreado: {path}")
    require(not path.lower().endswith(".jks"), f"keystore rastreado: {path}")

server = (ROOT / "backend" / "server.py").read_text(encoding="utf-8")
require('os.environ.get("AMPARAI_TEST_MODE") == "1"' in server, "token de teste sem flag")
require('bool(os.environ.get("FIRESTORE_EMULATOR_HOST"))' in server, "token de teste sem emulador")
require('os.environ.get("K_SERVICE")' in server, "Cloud Run sem fail-fast de flags de teste")

tests_text = "\n".join(
    path.read_text(encoding="utf-8")
    for path in (ROOT / "backend" / "tests").glob("*.py")
)
require(".run.app" not in tests_text, "suíte contém URL do Cloud Run")

rules = (ROOT / "firestore.rules").read_text(encoding="utf-8")
require("allow read, write: if false;" in rules, "Firestore não está deny-all para clientes")

print("Security invariants: OK")
