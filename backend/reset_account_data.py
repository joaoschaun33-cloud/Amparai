#!/usr/bin/env python3
"""
Apaga TODOS os dados de cuidado de uma conta, pelo e-mail.

Uso (a partir de backend/):
    python reset_account_data.py joaoschaun@gmail.com

Para deixar a conta pronta para um teste limpo de onboarding: apaga elder, remédios,
escala, saúde, custos, consultas, clínico, consentimentos, localização, pulseira, membros
e convites do dono. Mantém o registro do usuário (users) para você continuar logado — no
próximo acesso o app dispara o onboarding do zero.

Requer credenciais do Firebase: o arquivo backend/service-account-key.json (mesmo usado
pelo servidor) ou Application Default Credentials.

⚠️  Ferramenta administrativa/de teste. NÃO é o fluxo de exclusão do usuário (LGPD) —
esse será um endpoint no app que mantém os logs de consentimento por 5 anos.
"""
import sys
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, auth, firestore

# Coleções indexadas por owner_id que compõem os dados de cuidado de uma conta.
OWNER_COLLECTIONS = [
    "elders",
    "medications",
    "shifts",
    "health_events",
    "expenses",
    "appointments",
    "clinical",
    "consents",
    "location_settings",
    "location_pings",
    "wristband_scans",
    "device_tokens",
    "members",
    "invitations",
]


def init():
    cred_path = Path(__file__).with_name("service-account-key.json")
    if cred_path.exists():
        firebase_admin.initialize_app(credentials.Certificate(str(cred_path)))
    else:
        # Application Default Credentials (gcloud auth application-default login)
        firebase_admin.initialize_app()
    return firestore.client()


def delete_owner_docs(db, collection: str, uid: str) -> int:
    docs = db.collection(collection).where("owner_id", "==", uid).stream()
    count = 0
    batch = db.batch()
    for i, doc in enumerate(docs, 1):
        batch.delete(doc.reference)
        count += 1
        if i % 400 == 0:  # limite de operações por batch do Firestore
            batch.commit()
            batch = db.batch()
    if count % 400 != 0:
        batch.commit()
    return count


def main():
    if len(sys.argv) != 2:
        print("Uso: python reset_account_data.py <email>")
        sys.exit(1)
    email = sys.argv[1].strip()

    db = init()
    try:
        user = auth.get_user_by_email(email)
    except Exception as e:
        print(f"Não encontrei usuário com e-mail {email}: {e}")
        sys.exit(1)

    uid = user.uid
    print(f"Conta: {email}  (uid={uid})")
    print("Apagando dados de cuidado...\n")

    total = 0
    for col in OWNER_COLLECTIONS:
        n = delete_owner_docs(db, col, uid)
        total += n
        print(f"  {col:20s} {n} doc(s)")

    print(f"\nPronto. {total} documento(s) apagado(s). O registro do usuário foi mantido.")
    print("No próximo acesso ao app, a conta cai no onboarding limpo.")


if __name__ == "__main__":
    main()
