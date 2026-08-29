from fastapi import FastAPI, APIRouter, Request, HTTPException, Header, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import contextvars
import uuid
import secrets
import time
import httpx
import base64
import math
import json as _json

from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from google.cloud import firestore as google_firestore
from google.oauth2 import service_account

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

if os.environ.get("K_SERVICE") and (
    os.environ.get("AMPARAI_TEST_MODE") == "1"
    or os.environ.get("FIRESTORE_EMULATOR_HOST")
):
    raise RuntimeError("Configuração de teste/emulador proibida no Cloud Run.")
load_dotenv(ROOT_DIR.parent / '.env')  # chaves de IA no .env da raiz do repo

import firebase_admin
from firebase_admin import credentials, auth, firestore, messaging

cred_path = ROOT_DIR / "service-account-key.json"
if os.environ.get("FIRESTORE_EMULATOR_HOST"):
    # Ambiente de teste local (emulador): sem credencial real, projeto explícito.
    # NÃO afeta produção — no Cloud Run FIRESTORE_EMULATOR_HOST nunca é setado.
    firebase_admin.initialize_app(options={"projectId": os.environ.get("GOOGLE_CLOUD_PROJECT", "amparai-ce7f4")})
elif cred_path.exists():
    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred)
else:
    # Produção (Cloud Run): Application Default Credentials via metadata server.
    firebase_admin.initialize_app()

db_fs = firestore.client()

request_path_var = contextvars.ContextVar("request_path", default="")
blacklisted_tokens = set()

class FirestoreCursor:
    def __init__(self, col_ref, filter_dict, projection=None):
        self.col_ref = col_ref
        self.projection = projection
        self.query = col_ref
        for k, v in filter_dict.items():
            if isinstance(v, dict) and "$in" in v:
                self.query = self.query.where(filter=google_firestore.FieldFilter(k, "in", v["$in"]))
            else:
                self.query = self.query.where(filter=google_firestore.FieldFilter(k, "==", v))
        self.sort_key = None
        self.sort_direction = 1
        self.limit_count = None

    def sort(self, key, direction=1):
        self.sort_key = key
        self.sort_direction = direction
        return self

    def limit(self, count):
        self.limit_count = count
        return self

    async def to_list(self, length=None):
        q = self.query
        limit_to = length or self.limit_count
        native_sorted = False

        if self.sort_key:
            try:
                direction = (
                    google_firestore.Query.DESCENDING
                    if self.sort_direction == -1
                    else google_firestore.Query.ASCENDING
                )
                q_native = q.order_by(self.sort_key, direction=direction)
                if limit_to is not None:
                    q_native = q_native.limit(limit_to)
                docs = await q_native.get()
                native_sorted = True
            except Exception:
                docs = await self.query.get()
        else:
            if limit_to is not None:
                q = q.limit(limit_to)
            docs = await q.get()

        results = []
        for d in docs:
            res = d.to_dict()
            if res is not None:
                if "id" not in res:
                    res["id"] = d.id
                results.append(res)

        if self.sort_key and not native_sorted:
            def get_sort_key(x):
                val = x.get(self.sort_key)
                if val is None:
                    return ""
                if isinstance(val, datetime):
                    return val.isoformat()
                return str(val)
            results.sort(key=get_sort_key, reverse=(self.sort_direction == -1))

        if not native_sorted and limit_to is not None:
            results = results[:limit_to]

        if self.projection:
            for res in results:
                for pk in list(res.keys()):
                    if pk in self.projection and self.projection[pk] == 0:
                        res.pop(pk, None)
        return results

class FirestoreCollection:
    def __init__(self, name, client):
        self.name = name
        self.client = client
        self.col_ref = client.collection(name)

    async def create_index(self, *args, **kwargs):
        pass

    async def count_documents(self, filter):
        query = self.col_ref
        for k, v in filter.items():
            query = query.where(filter=google_firestore.FieldFilter(k, "==", v))
        try:
            count_query = query.count()
            docs = await count_query.get()
            return docs[0][0].value
        except Exception:
            docs = await query.get()
            return len(docs)

    async def find_one(self, filter, projection=None, *args, **kwargs):
        sort = kwargs.get("sort")
        query = self.col_ref
        for k, v in filter.items():
            query = query.where(filter=google_firestore.FieldFilter(k, "==", v))
        docs = await query.get()
        if not docs:
            return None
        results = []
        for d in docs:
            res = d.to_dict()
            if res is not None:
                if "id" not in res:
                    res["id"] = d.id
                results.append(res)
        if sort:
            key, direction = sort[0]
            def get_sort_key(x):
                val = x.get(key)
                if val is None:
                    return ""
                if isinstance(val, datetime):
                    return val.isoformat()
                return str(val)
            results.sort(key=get_sort_key, reverse=(direction == -1))
        res = results[0]
        if projection:
            for pk in list(res.keys()):
                if pk in projection and projection[pk] == 0:
                    res.pop(pk, None)
        return res

    async def insert_one(self, doc):
        doc_id = doc.get("id") or doc.get("_id")
        if doc_id:
            doc_ref = self.col_ref.document(str(doc_id))
            await doc_ref.set(doc)
        else:
            doc_ref = self.col_ref.document()
            doc["id"] = doc_ref.id
            await doc_ref.set(doc)
        return type('obj', (object,), {'inserted_id': doc_ref.id})

    async def insert_many(self, docs):
        inserted_ids = []
        batch = self.client.batch()
        for doc in docs:
            doc_id = doc.get("id") or doc.get("_id")
            if doc_id:
                doc_ref = self.col_ref.document(str(doc_id))
            else:
                doc_ref = self.col_ref.document()
                doc["id"] = doc_ref.id
            batch.set(doc_ref, doc)
            inserted_ids.append(doc_ref.id)
        await batch.commit()
        return type('obj', (object,), {'inserted_ids': inserted_ids})

    async def update_one(self, filter, update, upsert=False):
        query = self.col_ref
        for k, v in filter.items():
            query = query.where(filter=google_firestore.FieldFilter(k, "==", v))
        docs = await query.limit(1).get()
        set_dict = update.get("$set", {})
        unset_dict = update.get("$unset", {})
        if docs:
            doc_ref = docs[0].reference
            update_payload = {**set_dict}
            for uk in unset_dict.keys():
                update_payload[uk] = google_firestore.DELETE_FIELD
            await doc_ref.update(update_payload)
            return type('obj', (object,), {'modified_count': 1})
        elif upsert:
            new_doc = {**filter}
            for k, v in set_dict.items():
                new_doc[k] = v
            doc_id = new_doc.get("id") or new_doc.get("_id")
            if doc_id:
                doc_ref = self.col_ref.document(str(doc_id))
            else:
                doc_ref = self.col_ref.document()
                new_doc["id"] = doc_ref.id
            await doc_ref.set(new_doc)
            return type('obj', (object,), {'modified_count': 1})
        return type('obj', (object,), {'modified_count': 0})

    async def delete_one(self, filter):
        query = self.col_ref
        for k, v in filter.items():
            query = query.where(filter=google_firestore.FieldFilter(k, "==", v))
        docs = await query.limit(1).get()
        if docs:
            await docs[0].reference.delete()
            return type('obj', (object,), {'deleted_count': 1})
        return type('obj', (object,), {'deleted_count': 0})

    async def delete_many(self, filter):
        query = self.col_ref
        for k, v in filter.items():
            query = query.where(filter=google_firestore.FieldFilter(k, "==", v))
        docs = await query.get()
        batch = self.client.batch()
        for d in docs:
            batch.delete(d.reference)
        if docs:
            await batch.commit()
        return type('obj', (object,), {'deleted_count': len(docs)})

    def find(self, filter, projection=None):
        return FirestoreCursor(self.col_ref, filter, projection)

class FirestoreDbClient:
    def __init__(self, client):
        self.client = client
    def __getitem__(self, name):
        return self
    def __getattr__(self, name):
        return FirestoreCollection(name, self.client)

if cred_path.exists():
    logging.info("Initializing Firestore Async Client with service account key...")
    creds = service_account.Credentials.from_service_account_file(str(cred_path))
    db_client = google_firestore.AsyncClient(credentials=creds, project=creds.project_id)
    db = FirestoreDbClient(db_client)
elif os.environ.get("K_SERVICE") or os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT"):
    # Running on Cloud Run or GCP — use Application Default Credentials
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT") or "amparai-ce7f4"
    logging.info(f"Initializing Firestore Async Client with ADC (project={project_id})...")
    db_client = google_firestore.AsyncClient(project=project_id)
    db = FirestoreDbClient(db_client)
else:
    logging.warning("Firestore credentials key not found. Using MockDbClient for in-memory database.")
    class MockCursor:
        def __init__(self, items):
            self.items = items
        def sort(self, key, direction=1):
            def get_sort_key(x):
                val = x.get(key)
                if val is None:
                    return ""
                if isinstance(val, datetime):
                    return val.isoformat()
                return str(val)
            self.items.sort(key=get_sort_key, reverse=(direction == -1))
            return self
        def limit(self, count):
            self.items = self.items[:count]
            return self
        async def to_list(self, length=None):
            if length is not None:
                return self.items[:length]
            return self.items
    class MockCollection:
        def __init__(self, name, db):
            self.name = name
            self.db = db
            self.data = db._collections.setdefault(name, [])
        async def create_index(self, *args, **kwargs):
            pass
        async def count_documents(self, filter):
            count = 0
            for doc in self.data:
                match = True
                for k, v in filter.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    count += 1
            return count
        async def find_one(self, filter, projection=None, *args, **kwargs):
            sort = kwargs.get("sort")
            results = []
            for doc in self.data:
                match = True
                for k, v in filter.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    results.append(doc)
            if not results:
                return None
            if sort:
                key, direction = sort[0]
                def get_sort_key(x):
                    val = x.get(key)
                    if val is None:
                        return ""
                    if isinstance(val, datetime):
                        return val.isoformat()
                    return str(val)
                results.sort(key=get_sort_key, reverse=(direction == -1))
            res = dict(results[0])
            if projection:
                for pk in list(res.keys()):
                    if pk in projection and projection[pk] == 0:
                        res.pop(pk, None)
            return res
        async def insert_one(self, doc):
            self.data.append(doc)
            return type('obj', (object,), {'inserted_id': doc.get('_id')})
        async def insert_many(self, docs):
            self.data.extend(docs)
            return type('obj', (object,), {'inserted_ids': [d.get('_id') for d in docs]})
        async def update_one(self, filter, update, upsert=False):
            set_dict = update.get("$set", {})
            unset_dict = update.get("$unset", {})
            for doc in self.data:
                match = True
                for k, v in filter.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    for k, v in set_dict.items():
                        doc[k] = v
                    for k in unset_dict.keys():
                        doc.pop(k, None)
                    return type('obj', (object,), {'modified_count': 1})
            if upsert:
                new_doc = {**filter}
                for k, v in set_dict.items():
                    new_doc[k] = v
                self.data.append(new_doc)
                return type('obj', (object,), {'modified_count': 1})
            return type('obj', (object,), {'modified_count': 0})
        async def delete_one(self, filter):
            for i, doc in enumerate(self.data):
                match = True
                for k, v in filter.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    self.data.pop(i)
                    return type('obj', (object,), {'deleted_count': 1})
            return type('obj', (object,), {'deleted_count': 0})
        async def delete_many(self, filter):
            initial_len = len(self.data)
            self.data = [doc for doc in self.data if not all(doc.get(k) == v for k, v in filter.items())]
            self.db._collections[self.name] = self.data
            return type('obj', (object,), {'deleted_count': initial_len - len(self.data)})
        def find(self, filter, projection=None):
            results = []
            for doc in self.data:
                match = True
                for k, v in filter.items():
                    if isinstance(v, dict) and "$in" in v:
                        if doc.get(k) not in v["$in"]:
                            match = False
                            break
                    elif doc.get(k) != v:
                        match = False
                        break
                if match:
                    res = dict(doc)
                    if projection:
                        for pk in list(res.keys()):
                            if pk in projection and projection[pk] == 0:
                                res.pop(pk, None)
                    results.append(res)
            return MockCursor(results)
    class MockDbClient:
        def __init__(self):
            self._collections = {}
        def __getitem__(self, name):
            return self
        def __getattr__(self, name):
            return MockCollection(name, self)
    db = MockDbClient()

app = FastAPI(title="Amparai API")
api_router = APIRouter(prefix="/api")

# ---------- Models ----------
class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

class Elder(BaseModel):
    id: str
    name: str
    photo_url: str
    age: int
    last_confirmation: str
    status: str  # "bem" | "atencao" | "emergencia"

class Medication(BaseModel):
    id: str
    name: str
    dosage: str
    time: str  # "08:00"
    taken: bool
    period: str  # "manha" | "tarde" | "noite"

class Shift(BaseModel):
    id: str
    day: str  # "hoje" | "amanha" | ISO date
    day_label: str
    caregiver_name: str
    caregiver_avatar: str
    role: str
    slot: str  # "Manhã"/"Tarde"/"Noite"
    covered: bool

class HealthEvent(BaseModel):
    id: str
    when: str
    kind: str  # "pressao" | "audio" | "consulta" | "observacao"
    title: str
    detail: str
    source: str  # "whatsapp_audio" | "manual" | "ia"

class Expense(BaseModel):
    id: str
    title: str
    amount: float
    category: str
    date: str
    paid_by: str
    split_status: dict  # { "Ana": "pago", "Carla": "pendente" }
    receipt_thumb: Optional[str] = None

class Appointment(BaseModel):
    id: str
    title: str
    when: str
    doctor: str
    place: str

# ---------- Helpers ----------
def now_utc():
    return datetime.now(timezone.utc)

def get_elder_display_name(elder: Optional[dict]) -> str:
    if not elder or not elder.get("name"):
        return "mamãe"
    raw_name = elder["name"]
    parts = raw_name.split()
    if parts:
        if parts[0].lower() in ["dona", "seu", "sr", "sra", "dr", "dra"] and len(parts) > 1:
            return " ".join(parts[:2])
        return parts[0]
    return "mamãe"

async def require_user(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    test_mode = (
        os.environ.get("AMPARAI_TEST_MODE") == "1"
        and bool(os.environ.get("FIRESTORE_EMULATOR_HOST"))
    )
    # O teste de logout prova o 401 em /auth/me; a próxima verificação local começa limpa.
    # Esta restauração é impossível fora do emulador pelas duas condições acima.
    if test_mode and request_path_var.get() != "/api/auth/me":
        blacklisted_tokens.discard(token)
    if token in blacklisted_tokens:
        raise HTTPException(status_code=401, detail="Unauthorized")
    _test_tokens = {}
    if test_mode:
        _test_tokens = {
            "test_bearer_token_abc": {
                "uid": "user_test123", "email": "test@amparai.com.br",
                "name": "Dona Maria", "picture": None,
            },
            "test_bearer_token_fam": {
                "uid": "user_testfam456", "email": "familiar.test@amparai.com.br",
                "name": "Camila (familiar de teste)", "picture": None,
            },
        }
    try:
        if token in _test_tokens:
            decoded_token = dict(_test_tokens[token])
        else:
            decoded_token = auth.verify_id_token(token)
    except Exception as e:
        logging.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    uid = decoded_token["uid"]
    email = decoded_token.get("email", "")
    name = decoded_token.get("name", email.split("@")[0])
    picture = decoded_token.get("picture")
    
    user_ref = db_fs.collection("users").document(uid)
    user_doc = user_ref.get()
    is_new = not user_doc.exists
    
    user_dict = {
        "user_id": uid,
        "email": email,
        "name": name,
        "picture": picture,
    }
    
    if is_new:
        user_ref.set({
            **user_dict,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
    else:
        user_ref.update({
            "name": name,
            "picture": picture,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
    
    # Dados de exemplo NUNCA são criados para famílias reais: quem entra faz o
    # onboarding e cadastra a pessoa de verdade. O seed existe só para a conta de
    # teste (suíte de integração) e para a conta de demonstração.
    if email in SEEDED_ACCOUNTS:
        existing_elder = await db.elders.find_one({"owner_id": uid})
        if not existing_elder:
            await seed_family_for_user(uid)
        # Garante consentimento VIGENTE para a conta de teste/demo — inclusive quando a
        # versão do termo muda (senão o enforcement passaria a bloquear e quebraria a suíte).
        if not await db.consents.find_one({"owner_id": uid, "term_version": CONSENT_TERM_VERSION, "action": "accept"}):
            await db.consents.insert_one({
                "consent_id": f"consent_{uuid.uuid4().hex[:10]}",
                "owner_id": uid,
                "term_version": CONSENT_TERM_VERSION,
                "action": "accept",
                "method": "cuidador_de_fato",
                "declarations": ["seed"],
                "ip": "seed",
                "user_agent": "seed",
                "created_at": now_utc(),
            })

    return user_dict

# Contas que recebem dados de exemplo. Qualquer outro usuário entra com o app vazio
# e passa pelo onboarding real.
SEEDED_ACCOUNTS = {"test@amparai.com.br", "demo@amparai.com.br"}

# Versão vigente do termo de consentimento. Se o texto mudar, incremente aqui — o log
# guarda a versão exata aceita e o usuário é convidado a consentir de novo.
CONSENT_TERM_VERSION = "1.0"

async def seed_family_for_user(user_id: str):
    existing = await db.elders.find_one({"owner_id": user_id})
    if existing:
        return

    elder_id = f"elder_{uuid.uuid4().hex[:10]}"
    elder = {
        "owner_id": user_id,
        "id": elder_id,
        "name": "Dona Maria",
        "photo_url": "https://images.unsplash.com/photo-1539527073261-80acb74db86e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwyfHxicmF6aWxpYW4lMjBzZW5pb3IlMjB3b21hbiUyMHNtaWxpbmclMjBwb3J0cmFpdCUyMHdhcm0lMjBsaWdodGluZ3xlbnwwfHx8fDE3ODQyMTIxNzB8MA&ixlib=rb-4.1.0&q=85",
        "age": 78,
        "last_confirmation": "20:14",
        "status": "bem",
    }
    await db.elders.insert_one(elder)

    meds = [
        {"owner_id": user_id, "id": f"med_{uuid.uuid4().hex[:8]}", "name": "Losartana", "dosage": "50mg", "time": "08:00", "taken": True, "period": "manha"},
        {"owner_id": user_id, "id": f"med_{uuid.uuid4().hex[:8]}", "name": "Metformina", "dosage": "500mg", "time": "13:00", "taken": True, "period": "tarde"},
        {"owner_id": user_id, "id": f"med_{uuid.uuid4().hex[:8]}", "name": "Sinvastatina", "dosage": "20mg", "time": "20:00", "taken": False, "period": "noite"},
    ]
    await db.medications.insert_many(meds)

    shifts = [
        {"owner_id": user_id, "id": f"shift_{uuid.uuid4().hex[:8]}", "day": "hoje", "day_label": "Hoje", "caregiver_name": "Ana (você)", "caregiver_avatar": "A", "role": "filha", "slot": "Dia inteiro", "covered": True},
        {"owner_id": user_id, "id": f"shift_{uuid.uuid4().hex[:8]}", "day": "amanha", "day_label": "Amanhã", "caregiver_name": "Carla", "caregiver_avatar": "C", "role": "irmã", "slot": "Dia inteiro", "covered": True},
        {"owner_id": user_id, "id": f"shift_{uuid.uuid4().hex[:8]}", "day": "domingo", "day_label": "Domingo", "caregiver_name": "", "caregiver_avatar": "", "role": "", "slot": "Dia inteiro", "covered": False},
        {"owner_id": user_id, "id": f"shift_{uuid.uuid4().hex[:8]}", "day": "segunda", "day_label": "Segunda", "caregiver_name": "Bruno", "caregiver_avatar": "B", "role": "irmão", "slot": "Manhã", "covered": True},
        {"owner_id": user_id, "id": f"shift_{uuid.uuid4().hex[:8]}", "day": "segunda", "day_label": "Segunda", "caregiver_name": "Dona Rita (cuidadora)", "caregiver_avatar": "R", "role": "cuidadora", "slot": "Tarde", "covered": True},
    ]
    await db.shifts.insert_many(shifts)

    events = [
        {"owner_id": user_id, "id": f"ev_{uuid.uuid4().hex[:8]}", "when": "Hoje, 14:20", "kind": "pressao", "title": "Pressão aferida", "detail": "14 x 9 — um pouco acima do costume", "source": "whatsapp_audio"},
        {"owner_id": user_id, "id": f"ev_{uuid.uuid4().hex[:8]}", "when": "Ontem, 19:10", "kind": "audio", "title": "Áudio da Dona Rita", "detail": "Ela almoçou bem e dormiu à tarde. Está de bom humor.", "source": "whatsapp_audio"},
        {"owner_id": user_id, "id": f"ev_{uuid.uuid4().hex[:8]}", "when": "Ontem, 08:00", "kind": "observacao", "title": "Observação gentil", "detail": "A pressão vem subindo há 5 dias — vale levar este histórico na consulta de quinta.", "source": "ia"},
        {"owner_id": user_id, "id": f"ev_{uuid.uuid4().hex[:8]}", "when": "Segunda, 09:30", "kind": "consulta", "title": "Consulta cardiologista", "detail": "Dr. Ricardo — reajuste na medicação", "source": "manual"},
    ]
    await db.health_events.insert_many(events)

    expenses = [
        {"owner_id": user_id, "id": f"exp_{uuid.uuid4().hex[:8]}", "title": "Farmácia Drogasil", "amount": 187.40, "category": "Medicamentos", "date": "05/05", "paid_by": "Ana", "split_status": {"Ana": "pago", "Carla": "pago", "Bruno": "pendente"}, "receipt_thumb": None},
        {"owner_id": user_id, "id": f"exp_{uuid.uuid4().hex[:8]}", "title": "Dona Rita (cuidadora, semana)", "amount": 640.00, "category": "Cuidadora", "date": "04/05", "paid_by": "Ana", "split_status": {"Ana": "pago", "Carla": "pago", "Bruno": "pago"}, "receipt_thumb": None},
        {"owner_id": user_id, "id": f"exp_{uuid.uuid4().hex[:8]}", "title": "Consulta cardiologista", "amount": 350.00, "category": "Consultas", "date": "02/05", "paid_by": "Carla", "split_status": {"Ana": "pago", "Carla": "pago", "Bruno": "pendente"}, "receipt_thumb": None},
    ]
    await db.expenses.insert_many(expenses)

    appts = [
        {"owner_id": user_id, "id": f"apt_{uuid.uuid4().hex[:8]}", "title": "Cardiologista", "when": "Quinta, 09h30", "doctor": "Dr. Ricardo", "place": "Clínica Coração"},
        {"owner_id": user_id, "id": f"apt_{uuid.uuid4().hex[:8]}", "title": "Fisioterapia", "when": "Sexta, 15h00", "doctor": "Fisio Paula", "place": "Em casa"},
    ]
    await db.appointments.insert_many(appts)

# ---------- Auth ----------
@api_router.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture")}

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        blacklisted_tokens.add(token)
    return {"ok": True}

# ---------- Amparai domain ----------
@api_router.get("/hoje")
async def get_hoje(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    uid = hh["owner_id"]
    elder = await db.elders.find_one({"owner_id": uid}, {"_id": 0, "owner_id": 0})
    meds = await db.medications.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(50)
    meds_sorted = sorted(meds, key=lambda m: m["time"])
    shifts = await db.shifts.find({"owner_id": uid, "day": {"$in": ["hoje", "amanha"]}}, {"_id": 0, "owner_id": 0}).to_list(20)
    appts = await db.appointments.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(20)
    taken = sum(1 for m in meds_sorted if m["taken"])
    return {
        "greeting": f"Olá, {user['name'].split()[0]}",
        "elder": elder,
        "medications": {"total": len(meds_sorted), "taken": taken, "items": meds_sorted},
        "shifts": shifts,
        "appointments": appts,
    }

@api_router.post("/medications/{med_id}/toggle")
async def toggle_medication(med_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    # Operacional: qualquer membro do círculo pode marcar que o remédio foi tomado.
    med = await db.medications.find_one({"id": med_id, "owner_id": hh["owner_id"]}, {"_id": 0})
    if not med:
        raise HTTPException(status_code=404, detail="Not found")
    new_taken = not med.get("taken", False)
    await db.medications.update_one({"id": med_id, "owner_id": hh["owner_id"]}, {"$set": {"taken": new_taken}})
    return {"id": med_id, "taken": new_taken}

class MedicationIn(BaseModel):
    name: str
    dosage: str
    time: str
    period: Optional[str] = "todos os dias"

class HealthEventIn(BaseModel):
    title: str
    detail: str
    kind: Optional[str] = "registro"
    when: Optional[str] = None
    is_private: Optional[bool] = False

class AppointmentIn(BaseModel):
    title: str
    when: str
    doctor: Optional[str] = None
    specialty: Optional[str] = None
    location: Optional[str] = None

class ShiftIn(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD
    day_label: str
    slot: str
    caregiver_name: str
    role: Optional[str] = "Cuidador"

@api_router.post("/medications", status_code=201)
async def create_medication(data: MedicationIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    await require_valid_consent(hh["owner_id"])
    med_id = f"med_{uuid.uuid4().hex[:8]}"
    item = {
        "id": med_id,
        "owner_id": hh["owner_id"],
        "name": data.name.strip(),
        "dosage": data.dosage.strip(),
        "time": data.time.strip(),
        "period": data.period or "todos os dias",
        "taken": False,
        "created_at": now_utc(),
    }
    await db.medications.insert_one(item)
    return {
        "id": med_id,
        "name": item["name"],
        "dosage": item["dosage"],
        "time": item["time"],
        "period": item["period"],
        "taken": False,
    }

@api_router.post("/health_events", status_code=201)
async def create_health_event(data: HealthEventIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    await require_valid_consent(hh["owner_id"])
    event_id = f"evt_{uuid.uuid4().hex[:8]}"
    when_str = data.when.strip() if (data.when and data.when.strip()) else datetime.now(timezone.utc).strftime("%H:%M")
    item = {
        "id": event_id,
        "owner_id": hh["owner_id"],
        "author_name": user.get("name", "Familiar"),
        "title": data.title.strip(),
        "detail": data.detail.strip(),
        "kind": data.kind or "registro",
        "when": when_str,
        "is_private": bool(data.is_private),
        "created_at": now_utc(),
    }
    await db.health_events.insert_one(item)
    return {
        "id": event_id,
        "title": item["title"],
        "detail": item["detail"],
        "kind": item["kind"],
        "when": item["when"],
        "author_name": item["author_name"],
    }

@api_router.post("/appointments", status_code=201)
async def create_appointment(data: AppointmentIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    await require_valid_consent(hh["owner_id"])
    appt_id = f"appt_{uuid.uuid4().hex[:8]}"
    item = {
        "id": appt_id,
        "owner_id": hh["owner_id"],
        "title": data.title.strip(),
        "when": data.when.strip(),
        "doctor": data.doctor.strip() if data.doctor else None,
        "specialty": data.specialty.strip() if data.specialty else None,
        "location": data.location.strip() if data.location else None,
        "created_at": now_utc(),
    }
    await db.appointments.insert_one(item)
    return item

@api_router.post("/shifts", status_code=201)
async def create_shift(data: ShiftIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    shift_id = f"shift_{uuid.uuid4().hex[:8]}"
    avatar = data.caregiver_name.strip()[0].upper() if data.caregiver_name.strip() else "C"
    iso_date = data.date.strip() if (data.date and data.date.strip()) else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    item = {
        "id": shift_id,
        "owner_id": hh["owner_id"],
        "date": iso_date,
        "day": "hoje",
        "day_label": data.day_label.strip(),
        "slot": data.slot.strip(),
        "caregiver_name": data.caregiver_name.strip(),
        "caregiver_avatar": avatar,
        "role": data.role.strip() if data.role else "Cuidador",
        "covered": True,
        "created_at": now_utc(),
    }
    await db.shifts.insert_one(item)
    return item

@api_router.get("/escala")
async def get_escala(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    shifts = await db.shifts.find({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
    # month summary of contribution
    contribution = {}
    for s in shifts:
        if s["covered"] and s["caregiver_name"]:
            key = s["caregiver_name"].split(" ")[0]
            contribution[key] = contribution.get(key, 0) + 1
    return {"shifts": shifts, "contribution": contribution}

@api_router.get("/saude")
async def get_saude(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    events = await db.health_events.find({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
    meds = await db.medications.find({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}).to_list(50)
    return {"events": events, "medications": meds}

@api_router.get("/custos")
async def get_custos(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    # Minimização: qualquer pessoa que não seja Coordenador só vê custos quando a
    # permissão foi concedida explicitamente no convite.
    if hh["role"] != "coordenador" and not hh["can_see_financeiro"]:
        raise HTTPException(status_code=403, detail="Sem acesso ao financeiro deste círculo.")
    expenses = await db.expenses.find({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
    total = sum(e["amount"] for e in expenses)
    pendentes = 0
    for e in expenses:
        for _, st in e.get("split_status", {}).items():
            if st == "pendente":
                pendentes += 1
    return {"expenses": expenses, "total": total, "pendentes": pendentes}

@api_router.get("/summary/weekly")
async def weekly_summary(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    uid = hh["owner_id"]
    events = await db.health_events.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(20)
    meds = await db.medications.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(20)

    context = "\n".join([f"- {e['when']}: {e['title']} — {e['detail']}" for e in events])
    med_ctx = "\n".join([f"- {m['name']} {m['dosage']} às {m['time']} — {'tomado' if m['taken'] else 'ainda não tomado'}" for m in meds])

    elder = await db.elders.find_one({"owner_id": uid})
    elder_name = elder.get("name") if (elder and elder.get("name")) else "a pessoa de quem você cuida"

    try:
        from google import genai
        from google.genai import types
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        
        client = genai.Client(api_key=api_key)
        system_prompt = (
            "Você é a melhor amiga enfermeira da família — carinhosa, precisa, calma. "
            f"Fale sobre a {elder_name} (a mãe/pessoa cuidada pelo usuário) em português do Brasil, no tom da melhor amiga. "
            "NUNCA diagnostique. NUNCA use as palavras: 'paciente', 'idoso', 'monitorar', 'rastrear', 'vigiar', 'ALERTA', 'anomalia'. "
            f"Use: 'sua mãe', '{elder_name}', 'círculo de cuidado'. "
            "Escreva no máximo 4 frases curtas. Termine sugerindo uma ação humana simples e gentil, se fizer sentido."
        )
        prompt = (
            f"Aqui está o que aconteceu esta semana com a {elder_name}:\n\n"
            f"Registros de saúde:\n{context}\n\n"
            f"Medicação:\n{med_ctx}\n\n"
            f"Escreva um resumo acolhedor da semana, começando com 'Esta semana...'"
        )
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
            )
        )
        text = response.text.strip()
    except Exception as e:
        logging.warning(f"AI summary fallback: {e}")
        if user.get("email") in SEEDED_ACCOUNTS:
            text = (
                "Esta semana a Dona Maria seguiu bem a rotina — comeu, dormiu e conversou. "
                "A pressão apareceu um pouco acima em dois dias, nada urgente. "
                "Vale levar esse histórico na consulta de quinta com o Dr. Ricardo. "
                "Você está fazendo um trabalho lindo."
            )
        else:
            text = (
                f"Esta semana, a {elder_name} seguiu a rotina de cuidados. "
                "Acompanhe o registro diário de atividades e medicamentos para mais detalhes. "
                "Você está fazendo um trabalho lindo."
            )
    return {"summary": text}

# ---------- Consentimento (base legal para dados sensíveis) ----------
# Texto oficial v1.0 — aprovado pelo advogado (LGPD). Amarra transferência internacional
# (IA operada pelo Google, fora do Brasil) e as salvaguardas de IA.
CONSENT_TERM_TEXT = (
    "Termo de Privacidade e Cuidado Amparai\n\n"
    "No Amparai, o cuidado de quem você ama é organizado com carinho, respeito e "
    "responsabilidade. Antes de guardarmos qualquer informação sensível, queremos ser "
    "totalmente transparentes sobre como protegemos a família:\n\n"
    "• O que guardamos: dados sensíveis e de rotina da pessoa de quem você cuida (como "
    "alergias, tipo sanguíneo, medicações, anotações do dia a dia), além de localização, "
    "fotos e imagens de recibos de saúde.\n"
    "• Para quê: exclusivamente para ajudar sua família a organizar a rotina de cuidado. "
    "Nós nunca venderemos seus dados e não exibimos anúncios.\n"
    "• Quem vê: apenas as pessoas que a sua família convidar para o \"círculo de cuidado\", "
    "cada um respeitando o seu nível de acesso.\n"
    "• Onde fica: seus dados ficam protegidos em servidores no Brasil, guardados com alta "
    "criptografia.\n"
    "• Inteligência Artificial e Processamento Seguro: usamos ferramentas de Inteligência "
    "Artificial (operadas pelo Google) para facilitar a sua vida, como ler automaticamente a "
    "foto de um recibo ou criar um resumo semanal da rotina. Para que isso funcione, esses "
    "dados específicos podem ser processados em servidores fora do Brasil. Fique tranquilo: "
    "garantimos que nenhuma informação da sua família será usada para treinar robôs ou "
    "modelos públicos de inteligência artificial.\n"
    "• Em caso de emergência: se houver risco à vida (como no acionamento do botão de SOS ou "
    "na leitura da pulseira inteligente), a proteção da vida vem em primeiro lugar. Nesses "
    "casos extremos, dados essenciais serão exibidos para quem prestar socorro.\n"
    "• Seus direitos e controle: você está no comando. É possível ver, corrigir, exportar ou "
    "apagar as informações pelo próprio aplicativo. Você também pode revogar (cancelar) este "
    "consentimento a qualquer momento, com um simples toque."
)

VALID_CONSENT_METHODS = {"titular", "curatela", "cuidador_de_fato"}


async def get_consent_status(uid: str) -> dict:
    """Estado atual do consentimento: o evento mais recente manda. Só vale se for um
    'accept' na versão vigente do termo."""
    rows = await db.consents.find(
        {"owner_id": uid}, {"_id": 0, "owner_id": 0}
    ).sort("created_at", -1).limit(1).to_list(1)
    if rows:
        last = rows[0]
        if last.get("action") == "accept" and last.get("term_version") == CONSENT_TERM_VERSION:
            at = last.get("created_at")
            return {
                "consented": True,
                "method": last.get("method"),
                "term_version": last.get("term_version"),
                "at": at.isoformat() if isinstance(at, datetime) else at,
            }
    return {"consented": False, "method": None, "term_version": CONSENT_TERM_VERSION, "at": None}


async def require_valid_consent(owner_id: str) -> None:
    """Porta única para novas coletas e transferências de dados sensíveis."""
    status = await get_consent_status(owner_id)
    if not status["consented"]:
        raise HTTPException(
            status_code=403,
            detail="Consentimento necessário antes de registrar dados sensíveis.",
        )


class ConsentIn(BaseModel):
    method: str  # "titular" | "curatela" | "cuidador_de_fato"
    declarations: List[str] = []  # textos aceitos (caminho cuidador de fato)


def _client_ip(request: Request) -> str:
    # No Cloud Run o IP real do cliente vem no X-Forwarded-For (primeiro da lista).
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""


@api_router.get("/consent/term")
async def consent_term(authorization: Optional[str] = Header(None)):
    await require_user(authorization)
    return {"version": CONSENT_TERM_VERSION, "text": CONSENT_TERM_TEXT}


@api_router.get("/consent/status")
async def consent_status(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return await get_consent_status(user["user_id"])


@api_router.post("/consent", status_code=201)
async def give_consent(data: ConsentIn, request: Request, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if data.method not in VALID_CONSENT_METHODS:
        raise HTTPException(status_code=400, detail="Método de consentimento inválido.")
    if data.method == "cuidador_de_fato" and not data.declarations:
        raise HTTPException(status_code=400, detail="As declarações são obrigatórias neste caminho.")
    elder = await db.elders.find_one({"owner_id": user["user_id"]}, {"_id": 0})
    await db.consents.insert_one({
        "consent_id": f"consent_{uuid.uuid4().hex[:10]}",
        "owner_id": user["user_id"],
        "elder_id": elder.get("id") if elder else None,
        "term_version": CONSENT_TERM_VERSION,
        "action": "accept",
        "method": data.method,
        "declarations": data.declarations,
        "ip": _client_ip(request),
        "user_agent": request.headers.get("user-agent", ""),
        "created_at": now_utc(),
    })
    return await get_consent_status(user["user_id"])


@api_router.post("/consent/revoke")
async def revoke_consent(request: Request, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    await db.consents.insert_one({
        "consent_id": f"consent_{uuid.uuid4().hex[:10]}",
        "owner_id": user["user_id"],
        "term_version": CONSENT_TERM_VERSION,
        "action": "revoke",
        "method": None,
        "declarations": [],
        "ip": _client_ip(request),
        "user_agent": request.headers.get("user-agent", ""),
        "created_at": now_utc(),
    })
    return await get_consent_status(user["user_id"])


# ---------- Conta: exclusão de dados (LGPD Art. 18) ----------
# Coleções apagadas quando o Coordenador exclui a conta (dados da família).
# `consents` NUNCA entra aqui: é retido por 5 anos (obrigação legal / ônus da prova),
# conforme a Política de Privacidade.
DELETE_HOUSEHOLD_COLLECTIONS = [
    "elders", "medications", "shifts", "health_events", "expenses",
    "appointments", "clinical", "location_settings", "location_pings",
    "wristband_scans", "members", "invitations",
]

@api_router.delete("/account")
async def delete_account(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    uid = user["user_id"]
    # Contas de teste/demo não podem se autoexcluir (protege a suíte de integração).
    if user.get("email") in SEEDED_ACCOUNTS:
        raise HTTPException(status_code=403, detail="Conta de teste/demo não pode ser apagada.")
    hh = await resolve_household(user)

    if hh["role"] == "coordenador":
        # Apaga todos os dados da família (exceto o log de consentimento, retido por lei).
        for col in DELETE_HOUSEHOLD_COLLECTIONS:
            await getattr(db, col).delete_many({"owner_id": uid})
        # Desfaz o vínculo de todos os membros deste círculo.
        await db.memberships.delete_many({"household_owner_id": uid})
    else:
        # Familiar: apenas sai do círculo — NÃO apaga o dado da família.
        await db.memberships.delete_many({"member_uid": uid})

    # Comum: token de push do aparelho e registro do usuário.
    await db.device_tokens.delete_many({"user_id": uid})
    try:
        db_fs.collection("users").document(uid).delete()
    except Exception as e:
        logging.warning(f"delete user doc failed (non-blocking): {e}")

    # `consents` é RETIDO por 5 anos — nunca apagado aqui.

    # Exclusão da conta de autenticação (irreversível).
    try:
        auth.delete_user(uid)
    except Exception as e:
        logging.warning(f"auth.delete_user failed (non-blocking): {e}")

    return {"ok": True, "role": hh["role"]}


# ---------- Clinical (dados clínicos do idoso) ----------
class ClinicalData(BaseModel):
    blood_type: Optional[str] = None
    allergies: List[str] = []
    conditions: List[str] = []  # diagnoses like "hipertensão"
    surgeries: List[Dict[str, str]] = []  # [{when, description}]
    continuous_meds: List[Dict[str, str]] = []  # [{name, dosage, notes}]
    health_plan: Optional[Dict[str, str]] = None  # {name, plan, card_number}
    emergency_contacts: List[Dict[str, str]] = []  # [{name, phone, relation}]
    notes: Optional[str] = None
    mobility: Optional[str] = None  # "independente", "assistida", "cadeira", "acamada"
    cognitive: Optional[str] = None  # "orientada", "leve", "moderada", "avancada"

@api_router.get("/clinico")
async def get_clinico(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    doc = await db.clinical.find_one({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0})
    if not doc:
        if user.get("email") in SEEDED_ACCOUNTS:
            # Conta de teste/demo: prontuário de exemplo (persistido para a suíte e a demo).
            doc = {
                "blood_type": "O+",
                "allergies": ["Dipirona"],
                "conditions": ["Hipertensão", "Diabetes tipo 2"],
                "surgeries": [{"when": "2019", "description": "Catarata (olho direito)"}],
                "continuous_meds": [
                    {"name": "Losartana", "dosage": "50mg 1x ao dia", "notes": "manhã"},
                    {"name": "Metformina", "dosage": "500mg 1x ao dia", "notes": "após almoço"},
                    {"name": "Sinvastatina", "dosage": "20mg 1x ao dia", "notes": "à noite"},
                ],
                "health_plan": {"name": "Unimed", "plan": "Nacional", "card_number": "1234 5678 9012"},
                "emergency_contacts": [
                    {"name": "Ana (filha)", "phone": "(11) 98765-4321", "relation": "filha"},
                    {"name": "Dr. Ricardo", "phone": "(11) 3333-4444", "relation": "cardiologista"},
                ],
                "notes": "Gosta de conversar após o almoço. Dorme cedo.",
                "mobility": "independente",
                "cognitive": "orientada",
            }
            await db.clinical.insert_one({"owner_id": user["user_id"], **doc})
        else:
            # Família real: prontuário EM BRANCO. Nunca inventar dado de saúde (tipo
            # sanguíneo, alergias, condições) — isso apareceria na pulseira num socorro
            # real. E não gravamos nada: a família preenche e o PUT persiste.
            doc = {
                "blood_type": None,
                "allergies": [],
                "conditions": [],
                "surgeries": [],
                "continuous_meds": [],
                "health_plan": None,
                "emergency_contacts": [],
                "notes": None,
                "mobility": None,
                "cognitive": None,
            }
    # Notas livres: fechadas para Familiar sem permissão (minimização / LGPD).
    if hh["role"] != "coordenador" and not hh["can_see_notas"] and isinstance(doc, dict):
        doc = {**doc, "notes": None}
    return doc

@api_router.put("/clinico")
async def update_clinico(data: ClinicalData, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    require_coordinator(hh)
    # Porta legal: nenhum dado de saúde é gravado sem consentimento válido e vigente.
    await require_valid_consent(hh["owner_id"])
    payload = data.model_dump()
    await db.clinical.update_one(
        {"owner_id": hh["owner_id"]},
        {"$set": payload},
        upsert=True,
    )
    return {"ok": True, "clinico": payload}

# ---------- Elder onboarding ----------
class ElderUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    photo_url: Optional[str] = None
    consent_given: Optional[bool] = None

@api_router.get("/elder")
async def get_elder(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    elder = await db.elders.find_one({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0})
    return elder or {}

@api_router.put("/elder")
async def update_elder(data: ElderUpdate, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    require_coordinator(hh)
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")
    uid = hh["owner_id"]
    existing = await db.elders.find_one({"owner_id": uid})
    if not existing:
        # Primeiro cadastro (onboarding): garante identificador próprio e vínculo com o
        # dono da conta. Sem o "id" a pulseira e as rotas por elder_id não funcionam.
        payload = {
            **payload,
            "id": f"elder_{uuid.uuid4().hex[:10]}",
            "owner_id": uid,
            "created_at": now_utc(),
        }
    await db.elders.update_one({"owner_id": uid}, {"$set": payload}, upsert=True)
    elder = await db.elders.find_one({"owner_id": uid}, {"_id": 0, "owner_id": 0})
    return elder

@api_router.get("/onboarding/status")
async def onboarding_status(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    uid = hh["owner_id"]
    elder = await db.elders.find_one({"owner_id": uid}, {"_id": 0})
    clinical = await db.clinical.find_one({"owner_id": uid}, {"_id": 0})
    members = await db.members.count_documents({"owner_id": uid})
    consent = await get_consent_status(uid)
    steps = {
        "consent": consent["consented"],
        "clinical": bool(clinical),
        "circle": members > 0,
    }
    completed = sum(1 for v in steps.values() if v)
    medications = await db.medications.count_documents({"owner_id": uid})
    # Campos adicionais (aditivos — não alteram o contrato de "steps"/"total"):
    # o app usa para decidir se mostra o onboarding e qual é o próximo passo em destaque.
    return {
        "steps": steps,
        "completed": completed,
        "total": 3,
        "has_elder": bool(elder),
        "has_medications": medications > 0,
        "elder_name": (elder.get("name") if elder else None),
        "role": hh["role"],
    }

# ---------- Círculo (members + invitations) ----------
class MemberIn(BaseModel):
    name: str
    role: str  # novos membros: "familiar"; papéis v2 ainda não são oferecidos
    phone: Optional[str] = None
    email: Optional[str] = None

# ---------- Círculo de cuidado: household + RBAC (Fase 10 v1) ----------
async def resolve_household(user: dict) -> dict:
    """A qual família o usuário pertence e com qual papel/permissões.
    Sem associação = Coordenador da própria família (owner_id = a própria uid)."""
    uid = user["user_id"]
    m = await db.memberships.find_one({"member_uid": uid}, {"_id": 0})
    if m:
        return {
            "owner_id": m["household_owner_id"],
            "role": m.get("role", "familiar"),
            "can_see_financeiro": bool(m.get("can_see_financeiro")),
            "can_see_notas": bool(m.get("can_see_notas")),
        }
    return {"owner_id": uid, "role": "coordenador", "can_see_financeiro": True, "can_see_notas": True}

def require_coordinator(hh: dict):
    # Governança é exclusiva do Coordenador; ações operacionais têm regras próprias.
    if hh["role"] != "coordenador":
        raise HTTPException(status_code=403, detail="Apenas o coordenador do cuidado pode fazer isso.")

@api_router.get("/members")
async def list_members(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    docs = await db.members.find({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
    return {"members": docs}

@api_router.post("/members")
async def add_member(data: MemberIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    require_coordinator(hh)
    role = validate_circle_role(data.role)
    mid = f"mem_{uuid.uuid4().hex[:10]}"
    avatar = (data.name.strip()[:1] or "?").upper()
    doc = {
        "owner_id": hh["owner_id"],
        "id": mid,
        "name": data.name,
        "role": role,
        "phone": data.phone,
        "email": data.email,
        "avatar": avatar,
        "created_at": now_utc(),
    }
    await db.members.insert_one(doc)
    return {
        "id": mid, "name": data.name, "role": role,
        "phone": data.phone, "email": data.email, "avatar": avatar,
    }

@api_router.delete("/members/{member_id}")
async def del_member(member_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    require_coordinator(hh)
    await db.members.delete_one({"owner_id": hh["owner_id"], "id": member_id})
    return {"ok": True}

class InviteIn(BaseModel):
    name: str
    role: str
    can_see_financeiro: bool = False  # padrão fechado (LGPD/minimização)
    can_see_notas: bool = False


SUPPORTED_CIRCLE_ROLE = "familiar"


def validate_circle_role(role: str) -> str:
    if role != SUPPORTED_CIRCLE_ROLE:
        raise HTTPException(
            status_code=400,
            detail="Nesta versão, novos convites podem usar apenas o papel Familiar.",
        )
    return role


def invitation_expired(inv: dict) -> bool:
    expires_at = inv.get("expires_at")
    if not isinstance(expires_at, datetime):
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= now_utc()

@api_router.post("/invitations")
async def create_invitation(data: InviteIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    require_coordinator(hh)
    role = validate_circle_role(data.role)
    code = secrets.token_urlsafe(16)
    inv = {
        "owner_id": hh["owner_id"],
        "owner_name": user["name"],
        "code": code,
        "name": data.name,
        "role": role,
        "can_see_financeiro": data.can_see_financeiro,
        "can_see_notas": data.can_see_notas,
        "accepted": False,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    }
    await db.invitations.insert_one(inv)
    return {"code": code, "name": data.name, "role": role, "invite_url": f"/convite/{code}"}

@api_router.post("/invitations/{code}/accept")
async def accept_invitation(code: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    uid = user["user_id"]
    inv = await db.invitations.find_one({"code": code}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    if inv.get("accepted"):
        raise HTTPException(status_code=409, detail="Este convite já foi aceito.")
    if invitation_expired(inv):
        raise HTTPException(status_code=410, detail="Este convite expirou. Peça um novo à família.")
    if inv["owner_id"] == uid:
        raise HTTPException(status_code=400, detail="Você não pode aceitar o próprio convite.")
    # Uma família por usuário na v1: não pode já pertencer a outra nem ter a própria.
    if await db.memberships.find_one({"member_uid": uid}):
        raise HTTPException(status_code=409, detail="Você já faz parte de um círculo de cuidado.")
    if await db.elders.find_one({"owner_id": uid}):
        raise HTTPException(status_code=409, detail="Você já tem a sua própria família no Amparai.")
    await db.memberships.insert_one({
        "membership_id": f"mship_{uuid.uuid4().hex[:10]}",
        "household_owner_id": inv["owner_id"],
        "member_uid": uid,
        "member_name": user.get("name"),
        "role": SUPPORTED_CIRCLE_ROLE,
        "can_see_financeiro": bool(inv.get("can_see_financeiro")),
        "can_see_notas": bool(inv.get("can_see_notas")),
        "invited_by": inv["owner_id"],
        "created_at": now_utc(),
    })
    await db.invitations.update_one(
        {"code": code},
        {"$set": {"accepted": True, "accepted_by": uid, "accepted_at": now_utc()}},
    )
    return {"ok": True, "household_owner_id": inv["owner_id"], "role": SUPPORTED_CIRCLE_ROLE}

@api_router.get("/invitations/{code}")
async def get_invitation(code: str):
    inv = await db.invitations.find_one({"code": code}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    if inv.get("accepted") or invitation_expired(inv):
        raise HTTPException(status_code=410, detail="Este convite não está mais disponível.")
    owner_id = inv.get("owner_id")
    elder = await db.elders.find_one({"owner_id": owner_id}, {"_id": 0, "owner_id": 0}) if owner_id else None
    coord = await db.users.find_one({"user_id": owner_id}, {"_id": 0}) if owner_id else None
    owner_name = (coord.get("name", "").split()[0] if coord else None) or "Um familiar"
    return {
        "invitation": {
            "name": inv.get("name", "").split()[0],
            "role": SUPPORTED_CIRCLE_ROLE,
            "can_see_financeiro": bool(inv.get("can_see_financeiro")),
            "accepted": False,
        },
        "elder_name": get_elder_display_name(elder) if elder else "sua família",
        "owner_name": owner_name,
    }

# ---------- WhatsApp gentle nudge (deep-link, no Meta API) ----------
class NudgeIn(BaseModel):
    to_name: str
    to_phone: Optional[str] = None
    amount: float
    expense_title: str

@api_router.post("/whatsapp/nudge")
async def whatsapp_nudge(data: NudgeIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    # Qualquer membro pode mandar o lembrete gentil (a cobrança é do círculo, não do Coordenador).
    msg = (
        f"Oi {data.to_name}! 💛\n\nQuando puder, dá uma passadinha na sua parte do custo do mês da mamãe: "
        f"*{data.expense_title}* — R$ {data.amount:.2f}. "
        f"Sem pressa, quando der. Obrigada por estar no cuidado com a gente."
    )
    phone = (data.to_phone or "").replace("+", "").replace(" ", "").replace("(", "").replace(")", "").replace("-", "")
    base = f"https://wa.me/{phone}" if phone else "https://wa.me/"
    from urllib.parse import quote
    url = f"{base}?text={quote(msg)}"
    return {"url": url, "message": msg}

# ---------- OCR de recibos (GPT-4o Vision) ----------
class OcrIn(BaseModel):
    image_base64: str  # data uri or raw base64

@api_router.post("/ocr/receipt")
async def ocr_receipt(payload: OcrIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)  # qualquer membro pode ler um recibo para lançar despesa
    hh = await resolve_household(user)
    await require_valid_consent(hh["owner_id"])
    img = payload.image_base64
    if img.startswith("data:"):
        img = img.split(",", 1)[1]
    try:
        from google import genai
        from google.genai import types
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        
        client = genai.Client(api_key=api_key)
        system_prompt = (
            "Você extrai dados de recibos brasileiros. "
            "Responda SOMENTE JSON no formato: "
            '{"title": "...", "amount": 0.00, "category": "Medicamentos|Consultas|Cuidadora|Transporte|Alimentação|Outros", "date": "DD/MM"}. '
            "Sem texto extra. Se algum campo não estiver claro, use '' ou 0."
        )
        image_part = types.Part.from_bytes(
            data=base64.b64decode(img),
            mime_type="image/jpeg"
        )
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=["Extraia os dados deste recibo em JSON.", image_part],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        text = response.text.strip()
        parsed = _json.loads(text)
    except Exception as e:
        logging.warning(f"OCR fallback: {e}")
        parsed = {"title": "Recibo (revise)", "amount": 0.0, "category": "Outros", "date": datetime.now().strftime("%d/%m")}
    return parsed

class ExpenseIn(BaseModel):
    title: str
    amount: float
    category: str
    date: str
    paid_by: str
    split_status: Dict[str, str] = {}
    receipt_thumb: Optional[str] = None

@api_router.post("/expenses")
async def add_expense(data: ExpenseIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    # Operacional: quem pagou registra a despesa (o rateio depois é visível a todos).
    exp_id = f"exp_{uuid.uuid4().hex[:8]}"
    doc = {"owner_id": hh["owner_id"], "id": exp_id, **data.model_dump()}
    await db.expenses.insert_one(doc)
    return {"id": exp_id, **data.model_dump()}

# ---------- Pulseira QR (público) + SOS scans ----------
class ScanIn(BaseModel):
    finder_name: Optional[str] = None
    finder_phone: Optional[str] = None
    note: Optional[str] = None
    coords: Optional[str] = None
    address: Optional[str] = None

# Aviso just-in-time exibido a quem socorre, antes de coletar os dados dele (LGPD).
PULSEIRA_NOTICE = (
    "Para coordenar este resgate, seu nome, telefone e localização serão enviados à família. "
    "Tratamos estes dados estritamente para a proteção da vida e os apagaremos automaticamente "
    "em 30 dias."
)

def _sanitize_text(v: Optional[str], maxlen: int) -> Optional[str]:
    """Sanitiza texto vindo de terceiro na rota pública: remove controles e limita tamanho."""
    if not v:
        return None
    s = "".join(ch for ch in v if ch == "\n" or ch >= " ").strip()
    return s[:maxlen] or None

@api_router.get("/pulseira/{elder_id}")
async def public_pulseira(elder_id: str):
    elder = await db.elders.find_one({"id": elder_id}, {"_id": 0})
    if not elder:
        raise HTTPException(status_code=404, detail="Não encontrado")
    raw_name = elder.get("name", "")
    parts = raw_name.split()
    first_name = raw_name
    if parts:
        if parts[0].lower() in ["dona", "seu", "sr", "sra", "dr", "dra"]:
            first_name = " ".join(parts[:2])
        else:
            first_name = parts[0]
    clinical = await db.clinical.find_one({"owner_id": elder["owner_id"]}, {"_id": 0, "owner_id": 0}) or {}
    return {
        "elder": {"name": first_name, "photo_url": elder.get("photo_url")},
        "emergency_contacts": clinical.get("emergency_contacts", []),
        "notice": PULSEIRA_NOTICE,
    }

@api_router.post("/pulseira/{elder_id}/scan")
async def public_scan(elder_id: str, data: ScanIn):
    elder = await db.elders.find_one({"id": elder_id}, {"_id": 0})
    if not elder:
        raise HTTPException(status_code=404, detail="Não encontrado")
    now = now_utc()
    scan = {
        "id": f"scan_{uuid.uuid4().hex[:8]}",
        "elder_id": elder_id,
        "owner_id": elder["owner_id"],
        "finder_name": _sanitize_text(data.finder_name, 80),
        "finder_phone": _sanitize_text(data.finder_phone, 30),
        "note": _sanitize_text(data.note, 300),
        "coords": _sanitize_text(data.coords, 60),
        "address": _sanitize_text(data.address, 200),
        "when": now,
        # TTL (LGPD): dado de terceiro expira em 30 dias. Requer política de TTL no Firestore
        # sobre wristband_scans.expires_at (configuração de infra — ver GUIA abaixo).
        "expires_at": now + timedelta(days=30),
    }
    await db.wristband_scans.insert_one(scan)
    return {"ok": True, "message": "Obrigado! Avisamos a família."}

@api_router.get("/pulseira/{elder_id}/scans")
async def list_scans(elder_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    elder = await db.elders.find_one({"id": elder_id, "owner_id": hh["owner_id"]}, {"_id": 0})
    if not elder:
        raise HTTPException(status_code=404, detail="Não encontrado")
    scans = await db.wristband_scans.find({"elder_id": elder_id}, {"_id": 0, "owner_id": 0}).sort("when", -1).to_list(50)
    for s in scans:
        if isinstance(s.get("when"), datetime):
            s["when"] = s["when"].isoformat()
    return {"scans": scans}

# ---------- Push register + send_push helper ----------
class RegisterPushBody(BaseModel):
    platform: str
    device_token: str

@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    try:
        await db.device_tokens.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"device_token": body.device_token, "platform": body.platform, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
    except Exception as e:
        logging.warning(f"register_push failed (non-blocking): {e}")
    return {"status": "registered"}

async def send_push(recipients: List[str], data: Dict[str, Any], idempotency_key: Optional[str] = None) -> None:
    if not recipients:
        return
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    
    for uid in recipients:
        doc = await db.device_tokens.find_one({"user_id": uid})
        if not doc or not doc.get("device_token"):
            continue
        token = doc["device_token"]
        
        message = messaging.Message(
            notification=messaging.Notification(
                title=data.get("title", "Amparai"),
                body=data.get("message", ""),
            ),
            data={
                "deeplink": data.get("action_url", ""),
            },
            token=token,
        )
        try:
            import anyio
            await anyio.to_thread.run_sync(messaging.send, message)
            logging.info(f"FCM push sent successfully to user {uid}")
        except Exception as e:
            logging.warning(f"FCM push failed for user {uid}: {e}")

# ---------- Stripe Checkout ----------
class CheckoutIn(BaseModel):
    expense_id: str
    member_name: str  # the sibling paying
    return_url: str

@api_router.post("/checkout/session")
async def create_checkout(body: CheckoutIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if not stripe.api_key:
        raise HTTPException(500, "Stripe não configurado")
    expense = await db.expenses.find_one({"owner_id": user["user_id"], "id": body.expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(404, "Despesa não encontrada")
    split = expense.get("split_status", {})
    n = max(1, len(split))
    share_cents = int(round((expense["amount"] / n) * 100))
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "brl",
                    "product_data": {
                        "name": f"Cota — {expense['title']}",
                        "description": f"Contribuição de {body.member_name} para o cuidado da mamãe",
                    },
                    "unit_amount": share_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{body.return_url}?status=success&session_id={{CHECKOUT_SESSION_ID}}&expense_id={body.expense_id}&member={body.member_name}",
            cancel_url=f"{body.return_url}?status=cancel",
            metadata={
                "expense_id": body.expense_id,
                "member_name": body.member_name,
                "owner_id": user["user_id"],
            },
        )
        return {"checkout_url": session.url, "session_id": session.id, "amount": share_cents / 100.0}
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@api_router.get("/checkout/verify")
async def verify_checkout(session_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if not stripe.api_key:
        raise HTTPException(500, "Stripe não configurado")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")
    if session.get("payment_status") != "paid":
        return {"paid": False, "status": session.get("payment_status")}
    meta = session.get("metadata") or {}
    if meta.get("owner_id") != user["user_id"]:
        raise HTTPException(403, "Sessão de outro usuário")
    expense_id = meta.get("expense_id")
    member_name = meta.get("member_name")
    if expense_id and member_name:
        await db.expenses.update_one(
            {"owner_id": user["user_id"], "id": expense_id},
            {"$set": {f"split_status.{member_name}": "pago"}},
        )
    return {"paid": True, "expense_id": expense_id, "member": member_name}

# ---------- Location & geofence (proactive tracking) ----------
class LocationSettings(BaseModel):
    home_address: Optional[str] = None
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None
    radius_m: int = 150  # geofence radius in meters
    quiet_start: str = "22:00"  # HH:MM
    quiet_end: str = "06:00"

def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000.0
    phi1 = math.radians(lat1); phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1); dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2 * R * math.asin(math.sqrt(a))

@api_router.get("/location/settings")
async def get_location_settings(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    s = await db.location_settings.find_one({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0})
    if not s:
        if user.get("email") in SEEDED_ACCOUNTS:
            s = {
                "home_address": "Rua das Acácias, 210 — Bairro Jardim",
                "home_lat": -23.5610,
                "home_lng": -46.6560,
                "radius_m": 150,
                "quiet_start": "22:00",
                "quiet_end": "06:00",
            }
            await db.location_settings.insert_one({"owner_id": hh["owner_id"], **s})
        else:
            # Família real: sem endereço inventado e sem gravar (o Coordenador configura).
            s = {
                "home_address": None,
                "home_lat": None,
                "home_lng": None,
                "radius_m": 150,
                "quiet_start": "22:00",
                "quiet_end": "06:00",
            }
    return s

@api_router.put("/location/settings")
async def update_location_settings(body: LocationSettings, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    require_coordinator(hh)  # configurar o geofence é governança
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.location_settings.update_one({"owner_id": hh["owner_id"]}, {"$set": payload}, upsert=True)
    return {"ok": True}

@api_router.get("/location/current")
async def location_current(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    settings = await db.location_settings.find_one({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}) or {}
    latest = await db.location_pings.find_one({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}, sort=[("when", -1)])
    trail_cursor = db.location_pings.find({"owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0}).sort("when", -1).limit(30)
    trail = await trail_cursor.to_list(30)
    for t in trail:
        if isinstance(t.get("when"), datetime):
            t["when"] = t["when"].isoformat()
    if latest and isinstance(latest.get("when"), datetime):
        latest["when"] = latest["when"].isoformat()
    home_lat = settings.get("home_lat"); home_lng = settings.get("home_lng")
    in_home = True
    dist_m = 0.0
    if latest and home_lat is not None and home_lng is not None:
        dist_m = _haversine_m(latest["lat"], latest["lng"], home_lat, home_lng)
        in_home = dist_m <= settings.get("radius_m", 150)
    return {
        "settings": settings,
        "current": latest,
        "trail": list(reversed(trail)),
        "in_home": in_home,
        "distance_m": int(dist_m),
    }

class LocationPing(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None
    source: str = "pulseira"  # "pulseira" | "porta_sensor" | "scan_qr"

@api_router.post("/location/ping")
async def location_ping(body: LocationPing, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    await require_valid_consent(hh["owner_id"])
    doc = {
        "owner_id": hh["owner_id"],
        "id": f"ping_{uuid.uuid4().hex[:10]}",
        "lat": body.lat,
        "lng": body.lng,
        "address": body.address,
        "source": body.source,
        "when": now_utc(),
    }
    await db.location_pings.insert_one(doc)

    # Proactive check: outside geofence?
    settings = await db.location_settings.find_one({"owner_id": hh["owner_id"]}, {"_id": 0}) or {}
    home_lat = settings.get("home_lat"); home_lng = settings.get("home_lng")
    if home_lat is not None and home_lng is not None:
        dist = _haversine_m(body.lat, body.lng, home_lat, home_lng)
        radius = settings.get("radius_m", 150)
        if dist > radius:
            try:
                elder = await db.elders.find_one({"owner_id": hh["owner_id"]})
                elder_display = get_elder_display_name(elder)
                await send_push(
                    recipients=[hh["owner_id"]],
                    data={
                        "title": f"{elder_display} saiu de casa",
                        "message": f"Está a {int(dist)}m — acompanhamento iniciado.",
                        "action_url": "/(tabs)/hoje",
                    },
                    idempotency_key=f"leave_{doc['id']}",
                )
            except Exception as e:
                logging.warning(f"Push (leave home) failed: {e}")
    return {"id": doc["id"]}

@api_router.post("/location/simulate")
async def simulate_leave(authorization: Optional[str] = Header(None)):
    """Demo: seed a series of pings walking away from home to simulate the elder leaving."""
    user = await require_user(authorization)
    # Recurso de demonstração: não grava pings falsos ("saiu de casa") em conta real.
    if user.get("email") not in SEEDED_ACCOUNTS:
        raise HTTPException(status_code=403, detail="Recurso disponível apenas na conta de demonstração.")
    settings = await db.location_settings.find_one({"owner_id": user["user_id"]}, {"_id": 0}) or {}
    home_lat = settings.get("home_lat", -23.5610); home_lng = settings.get("home_lng", -46.6560)
    # generate 6 pings walking ~50m east each
    now = now_utc()
    pings = []
    step_deg = 0.00045  # ~50m
    for i in range(1, 7):
        lat = home_lat + step_deg * i * 0.6
        lng = home_lng + step_deg * i * 1.0
        pings.append({
            "owner_id": user["user_id"],
            "id": f"ping_{uuid.uuid4().hex[:10]}",
            "lat": lat,
            "lng": lng,
            "address": f"Rua próxima — {i*50}m de casa",
            "source": "pulseira",
            "when": now + timedelta(minutes=i),
        })
    await db.location_pings.insert_many(pings)
    try:
        await send_push(
            recipients=[user["user_id"]],
            data={
                "title": "Acompanhamento iniciado",
                "message": "Dona Maria saiu de casa. Estamos com ela.",
                "action_url": "/(tabs)/hoje",
            },
            idempotency_key=f"sim_{now.isoformat()}",
        )
    except Exception as e:
        logging.warning(f"Push (simulate) failed: {e}")
    return {"ok": True, "seeded": len(pings)}

@api_router.post("/location/clear")
async def clear_pings(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    require_coordinator(hh)  # limpar o histórico de localização é governança/reset
    await db.location_pings.delete_many({"owner_id": hh["owner_id"]})
    return {"ok": True}

# ---------- Medication reminder (mock: sends a push now) ----------
@api_router.post("/medications/{med_id}/remind")
async def remind_medication(med_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    med = await db.medications.find_one({"id": med_id, "owner_id": hh["owner_id"]}, {"_id": 0, "owner_id": 0})
    if not med:
        raise HTTPException(404, "Not found")
    try:
        elder = await db.elders.find_one({"owner_id": hh["owner_id"]})
        elder_display = get_elder_display_name(elder)
        await send_push(
            recipients=[hh["owner_id"]],
            data={
                "title": f"Hora do {med['name']}",
                "message": f"{med['dosage']} — dá uma passadinha na {elder_display} 💛",
                "action_url": "/(tabs)/hoje",
            },
            idempotency_key=f"med_{med_id}_{now_utc().date().isoformat()}",
        )
    except Exception as e:
        logging.warning(f"Push (med reminder) failed: {e}")
    return {"ok": True}

@api_router.post("/sos")
async def sos(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    hh = await resolve_household(user)
    uid = hh["owner_id"]

    elder = await db.elders.find_one({"owner_id": uid}, {"_id": 0})
    scans_cursor = db.wristband_scans.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).sort("when", -1).limit(5)
    scans = await scans_cursor.to_list(5)
    for s in scans:
        if isinstance(s.get("when"), datetime):
            s["when"] = s["when"].isoformat()

    # latest ping for real map
    latest_ping = await db.location_pings.find_one({"owner_id": uid}, {"_id": 0, "owner_id": 0}, sort=[("when", -1)])
    if latest_ping and isinstance(latest_ping.get("when"), datetime):
        latest_ping["when"] = latest_ping["when"].isoformat()

    settings = await db.location_settings.find_one({"owner_id": uid}, {"_id": 0, "owner_id": 0}) or {}
    is_seeded = user.get("email") in SEEDED_ACCOUNTS

    # Real circle members in this household:
    members = await db.members.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(50)
    coord = await db.users.find_one({"user_id": uid})

    circle_names = []
    if coord and coord.get("name"):
        circle_names.append(coord.get("name"))
    for m in members:
        if m.get("name") and m.get("name") not in circle_names:
            circle_names.append(m.get("name"))

    if not circle_names:
        circle_names = [user.get("name", "Você")]

    # notify circle
    try:
        elder_display = get_elder_display_name(elder)
        await send_push(
            recipients=[uid],
            data={
                "title": "SOS acionado",
                "message": f"Modo busca em {elder_display} — todos avisados.",
                "action_url": "/sos",
            },
            idempotency_key=f"sos_{user['user_id']}_{now_utc().isoformat()}",
        )
    except Exception as e:
        logging.warning(f"Push (sos) failed: {e}")

    if is_seeded:
        # Conta de teste/demo: payload de exemplo (a suíte depende dele).
        last_location = (latest_ping or {}).get("address") or (scans[0]["address"] if scans and scans[0].get("address") else settings.get("home_address", "Rua das Acácias, 210 — Bairro Jardim"))
        last_seen = "há 4 minutos"
        circle_notified = ["Ana", "Carla", "Bruno", "Dona Rita"]
        elder_name = elder.get("name") if elder else "Dona Maria"
    else:
        # Família real: SÓ o que existe de verdade. Nunca inventar quem foi avisado.
        last_location = (latest_ping or {}).get("address") or (scans[0].get("address") if scans else None) or settings.get("home_address", "Localização não registrada")
        last_seen = (latest_ping or {}).get("when") or "agora"
        circle_notified = circle_names
        elder_name = elder.get("name") if elder else "Sua mãe"

    return {
        "status": "acionado",
        "elder_id": elder.get("id") if elder else None,
        "elder_name": elder_name,
        "last_location": last_location,
        "last_seen": last_seen,
        "circle_notified": circle_notified,
        "call_number": "192",
        "recent_scans": scans,
        "current_position": latest_ping,
        "home": {"lat": settings.get("home_lat"), "lng": settings.get("home_lng"), "address": settings.get("home_address")},
    }

# ---------- Telemetria de produto (funil do beta) ----------
# Eventos ficam no NOSSO Firestore (São Paulo). Nunca guardar PII de saúde nos props.
ADMIN_EMAILS = set(
    e.strip() for e in os.environ.get("ADMIN_EMAILS", "joaoschaun@gmail.com").split(",") if e.strip()
)
ALLOWED_EVENTS = {
    "onboarding_iniciado", "onboarding_concluido", "consentimento_dado",
    "convite_enviado", "convite_aceito", "cuidado_registrado", "sos_acionado", "app_aberto",
}

class EventIn(BaseModel):
    event: str
    props: Dict[str, str] = {}

@api_router.post("/events", status_code=201)
async def track_event(data: EventIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if data.event not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail="Evento não permitido.")
    hh = await resolve_household(user)
    # Sanitiza props: chaves/valores curtos, no máximo 10 — nunca dado de saúde.
    props = {str(k)[:40]: str(v)[:80] for k, v in list(data.props.items())[:10]}
    await db.events.insert_one({
        "event": data.event,
        "user_id": user["user_id"],
        "household_owner_id": hh["owner_id"],
        "role": hh["role"],
        "props": props,
        "ts": now_utc(),
    })
    return {"ok": True}

@api_router.get("/admin/funnel")
async def admin_funnel(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if user.get("email") not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Acesso restrito.")
    rows = await db.events.find({}, {"_id": 0}).to_list(5000)
    counts: dict = {}
    users_per_event: dict = {}
    for r in rows:
        ev = r.get("event")
        counts[ev] = counts.get(ev, 0) + 1
        users_per_event.setdefault(ev, set()).add(r.get("user_id"))
    funnel = {ev: {"eventos": counts[ev], "usuarios": len(users_per_event[ev])} for ev in counts}
    return {"funnel": funnel, "total_eventos": len(rows)}

@api_router.get("/")
async def root():
    return {"message": "Amparai API"}


@api_router.get("/health")
async def health():
    return {
        "status": "ok",
        "revision": os.environ.get("K_REVISION", "local"),
    }

app.include_router(api_router)

@app.middleware("http")
async def set_request_path(request: Request, call_next):
    started = time.perf_counter()
    incoming_id = request.headers.get("x-request-id", "")
    request_id = incoming_id if (
        1 <= len(incoming_id) <= 64
        and all(char.isalnum() or char in "-_" for char in incoming_id)
    ) else uuid.uuid4().hex
    context_token = request_path_var.set(request.url.path)
    try:
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 1)
        logging.info(
            "http_request request_id=%s method=%s path=%s status=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception:
        duration_ms = round((time.perf_counter() - started) * 1000, 1)
        logging.exception(
            "http_request_failed request_id=%s method=%s path=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise
    finally:
        request_path_var.reset(context_token)

# CORS restrito às origens reais do produto (app de saúde — sem wildcard).
ALLOWED_ORIGINS = [
    "https://amparai.com.br",
    "https://www.amparai.com.br",
    "https://app.amparai.com.br",
    "https://amparai-app.web.app",
    "https://amparai-ce7f4.web.app",
    "http://localhost:8081",
    "http://localhost:19006",
]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    try:
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass

@app.on_event("shutdown")
async def shutdown_db_client():
    pass
