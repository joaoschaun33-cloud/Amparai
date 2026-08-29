#!/usr/bin/env python3
"""Inventário somente leitura de marcadores fictícios em uma conta Amparai."""

import json
import sys
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials, firestore

from reset_account_data import OWNER_COLLECTIONS


FAKE_MARKERS = {
    "dona maria",
    "losartana",
    "dipirona",
    "hipertensão",
    "unimed",
    "dr. ricardo",
    "rua das acácias",
}


def init():
    cred_path = Path(__file__).with_name("service-account-key.json")
    if cred_path.exists():
        firebase_admin.initialize_app(credentials.Certificate(str(cred_path)))
    else:
        firebase_admin.initialize_app()
    return firestore.client()


def marker_hits(value, prefix=""):
    hits = []
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else key
            hits.extend(marker_hits(child, path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            hits.extend(marker_hits(child, f"{prefix}[{index}]"))
    elif isinstance(value, str):
        normalized = value.casefold()
        for marker in FAKE_MARKERS:
            if marker in normalized:
                hits.append({"field": prefix, "marker": marker})
    return hits


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python audit_account_data.py <email>")

    email = sys.argv[1].strip()
    db = init()
    user = auth.get_user_by_email(email)
    report = {"email": email, "uid": user.uid, "collections": {}, "flagged": []}

    for collection in OWNER_COLLECTIONS:
        docs = list(db.collection(collection).where("owner_id", "==", user.uid).stream())
        report["collections"][collection] = len(docs)
        for doc in docs:
            hits = marker_hits(doc.to_dict())
            if hits:
                report["flagged"].append({
                    "path": f"{collection}/{doc.id}",
                    "markers": hits,
                })

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
