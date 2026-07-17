from fastapi import FastAPI, APIRouter, Request, HTTPException, Header, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import base64
import math
import json as _json

from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
load_dotenv(ROOT_DIR.parent / '.env')  # chaves de IA no .env da raiz do repo

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Amparai API")
api_router = APIRouter(prefix="/api")

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---------- Push (Emergent-managed) ----------
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
_push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)



# ---------- Models ----------
class SessionRequest(BaseModel):
    session_token: str

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

async def get_user_from_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now_utc():
            return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

async def require_user(authorization: Optional[str]) -> dict:
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # Ensure the care family is always seeded for this user
    await seed_family_for_user(user["user_id"])
    return user

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
@api_router.post("/auth/session")
async def create_session(payload: SessionRequest):
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": payload.session_token})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()
    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": now_utc(),
        })

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    })

    await seed_family_for_user(user_id)

    return {
        "session_token": session_token,
        "user": {"user_id": user_id, "email": email, "name": name, "picture": picture},
    }

@api_router.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture")}

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}

# ---------- Amparai domain ----------
@api_router.get("/hoje")
async def get_hoje(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    uid = user["user_id"]
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
    med = await db.medications.find_one({"id": med_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not med:
        raise HTTPException(status_code=404, detail="Not found")
    new_taken = not med.get("taken", False)
    await db.medications.update_one({"id": med_id, "owner_id": user["user_id"]}, {"$set": {"taken": new_taken}})
    return {"id": med_id, "taken": new_taken}

@api_router.get("/escala")
async def get_escala(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    shifts = await db.shifts.find({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
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
    events = await db.health_events.find({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
    meds = await db.medications.find({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}).to_list(50)
    return {"events": events, "medications": meds}

@api_router.get("/custos")
async def get_custos(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    expenses = await db.expenses.find({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
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
    uid = user["user_id"]
    events = await db.health_events.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(20)
    meds = await db.medications.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(20)

    context = "\n".join([f"- {e['when']}: {e['title']} — {e['detail']}" for e in events])
    med_ctx = "\n".join([f"- {m['name']} {m['dosage']} às {m['time']} — {'tomado' if m['taken'] else 'ainda não tomado'}" for m in meds])

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise RuntimeError("no key")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"summary_{uid}",
            system_message=(
                "Você é a melhor amiga enfermeira da família — carinhosa, precisa, calma. "
                "Fale sobre a Dona Maria (a mãe do usuário) em português do Brasil, no tom da melhor amiga. "
                "NUNCA diagnostique. NUNCA use as palavras: 'paciente', 'idoso', 'monitorar', 'rastrear', 'vigiar', 'ALERTA', 'anomalia'. "
                "Use: 'sua mãe', 'Dona Maria', 'círculo de cuidado'. "
                "Escreva no máximo 4 frases curtas. Termine sugerindo uma ação humana simples e gentil, se fizer sentido."
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        user_msg = UserMessage(text=f"Aqui está o que aconteceu esta semana com a Dona Maria:\n\nRegistros de saúde:\n{context}\n\nMedicação:\n{med_ctx}\n\nEscreva um resumo acolhedor da semana, começando com 'Esta semana...'")
        text = await chat.send_message(user_msg)
        text = (text or "").strip()
        if not text:
            raise RuntimeError("empty")
    except Exception as e:
        logging.warning(f"AI summary fallback: {e}")
        text = (
            "Esta semana a Dona Maria seguiu bem a rotina — comeu, dormiu e conversou. "
            "A pressão apareceu um pouco acima em dois dias, nada urgente. "
            "Vale levar esse histórico na consulta de quinta com o Dr. Ricardo. "
            "Você está fazendo um trabalho lindo."
        )
    return {"summary": text}

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
    doc = await db.clinical.find_one({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0})
    if not doc:
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
    return doc

@api_router.put("/clinico")
async def update_clinico(data: ClinicalData, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    payload = data.model_dump()
    await db.clinical.update_one(
        {"owner_id": user["user_id"]},
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

@api_router.put("/elder")
async def update_elder(data: ElderUpdate, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")
    await db.elders.update_one({"owner_id": user["user_id"]}, {"$set": payload}, upsert=True)
    elder = await db.elders.find_one({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0})
    return elder

@api_router.get("/onboarding/status")
async def onboarding_status(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    uid = user["user_id"]
    elder = await db.elders.find_one({"owner_id": uid}, {"_id": 0})
    clinical = await db.clinical.find_one({"owner_id": uid}, {"_id": 0})
    members = await db.members.count_documents({"owner_id": uid})
    steps = {
        "consent": bool(elder and elder.get("consent_given")),
        "clinical": bool(clinical),
        "circle": members > 0,
    }
    completed = sum(1 for v in steps.values() if v)
    return {"steps": steps, "completed": completed, "total": 3}

# ---------- Círculo (members + invitations) ----------
class MemberIn(BaseModel):
    name: str
    role: str  # "coordenador" | "irmao" | "cuidador" | "profissional"
    phone: Optional[str] = None
    email: Optional[str] = None

@api_router.get("/members")
async def list_members(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    docs = await db.members.find({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}).to_list(100)
    return {"members": docs}

@api_router.post("/members")
async def add_member(data: MemberIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    mid = f"mem_{uuid.uuid4().hex[:10]}"
    avatar = (data.name.strip()[:1] or "?").upper()
    doc = {
        "owner_id": user["user_id"],
        "id": mid,
        "name": data.name,
        "role": data.role,
        "phone": data.phone,
        "email": data.email,
        "avatar": avatar,
        "created_at": now_utc(),
    }
    await db.members.insert_one(doc)
    return {
        "id": mid, "name": data.name, "role": data.role,
        "phone": data.phone, "email": data.email, "avatar": avatar,
    }

@api_router.delete("/members/{member_id}")
async def del_member(member_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    await db.members.delete_one({"owner_id": user["user_id"], "id": member_id})
    return {"ok": True}

class InviteIn(BaseModel):
    name: str
    role: str

@api_router.post("/invitations")
async def create_invitation(data: InviteIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    code = uuid.uuid4().hex[:8].upper()
    inv = {
        "owner_id": user["user_id"],
        "owner_name": user["name"],
        "code": code,
        "name": data.name,
        "role": data.role,
        "accepted": False,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    }
    await db.invitations.insert_one(inv)
    return {"code": code, "name": data.name, "role": data.role, "invite_url": f"/convite/{code}"}

@api_router.get("/invitations/{code}")
async def get_invitation(code: str):
    inv = await db.invitations.find_one({"code": code}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    elder = await db.elders.find_one({"owner_id": inv["owner_id"]}, {"_id": 0, "owner_id": 0})
    inv.pop("owner_id", None)
    return {"invitation": inv, "elder_name": elder["name"] if elder else "sua família"}

# ---------- WhatsApp gentle nudge (deep-link, no Meta API) ----------
class NudgeIn(BaseModel):
    to_name: str
    to_phone: Optional[str] = None
    amount: float
    expense_title: str

@api_router.post("/whatsapp/nudge")
async def whatsapp_nudge(data: NudgeIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
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
    user = await require_user(authorization)
    img = payload.image_base64
    if img.startswith("data:"):
        img = img.split(",", 1)[1]
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ocr_{user['user_id']}_{uuid.uuid4().hex[:6]}",
            system_message=(
                "Você extrai dados de recibos brasileiros. "
                "Responda SOMENTE JSON no formato: "
                '{"title": "...", "amount": 0.00, "category": "Medicamentos|Consultas|Cuidadora|Transporte|Alimentação|Outros", "date": "DD/MM"}. '
                "Sem texto extra. Se algum campo não estiver claro, use '' ou 0."
            ),
        ).with_model("openai", "gpt-4o")
        image = ImageContent(image_base64=img)
        um = UserMessage(text="Extraia os dados deste recibo em JSON.", file_contents=[image])
        text = (await chat.send_message(um) or "").strip()
        # strip markdown fences if any
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
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
    exp_id = f"exp_{uuid.uuid4().hex[:8]}"
    doc = {"owner_id": user["user_id"], "id": exp_id, **data.model_dump()}
    await db.expenses.insert_one(doc)
    return {"id": exp_id, **data.model_dump()}

# ---------- Pulseira QR (público) + SOS scans ----------
class ScanIn(BaseModel):
    finder_name: Optional[str] = None
    finder_phone: Optional[str] = None
    note: Optional[str] = None
    coords: Optional[str] = None
    address: Optional[str] = None

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
    }

@api_router.post("/pulseira/{elder_id}/scan")
async def public_scan(elder_id: str, data: ScanIn):
    elder = await db.elders.find_one({"id": elder_id}, {"_id": 0})
    if not elder:
        raise HTTPException(status_code=404, detail="Não encontrado")
    scan = {
        "id": f"scan_{uuid.uuid4().hex[:8]}",
        "elder_id": elder_id,
        "owner_id": elder["owner_id"],
        "finder_name": data.finder_name,
        "finder_phone": data.finder_phone,
        "note": data.note,
        "coords": data.coords,
        "address": data.address,
        "when": now_utc(),
    }
    await db.wristband_scans.insert_one(scan)
    return {"ok": True, "message": "Obrigado! Avisamos a família."}

@api_router.get("/pulseira/{elder_id}/scans")
async def list_scans(elder_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    elder = await db.elders.find_one({"id": elder_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not elder:
        raise HTTPException(status_code=404, detail="Não encontrado")
    scans = await db.wristband_scans.find({"elder_id": elder_id}, {"_id": 0, "owner_id": 0}).sort("when", -1).to_list(50)
    for s in scans:
        if isinstance(s.get("when"), datetime):
            s["when"] = s["when"].isoformat()
    return {"scans": scans}

# ---------- Push register + send_push helper ----------
class RegisterPushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str

@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    try:
        resp = await _push_client.post("/api/v1/push/users/register", json=body.model_dump())
        if resp.status_code == 401:
            raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
        if resp.status_code >= 500:
            raise HTTPException(502, "Push provider unavailable")
        resp.raise_for_status()
    except HTTPException:
        raise
    except Exception as e:
        logging.warning(f"register_push failed (non-blocking): {e}")
    return {"status": "registered"}

async def send_push(recipients: List[str], data: Dict[str, Any], idempotency_key: Optional[str] = None) -> None:
    if not recipients:
        return
    if len(recipients) > 100:
        raise ValueError("max 100 recipients per /trigger call")
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    payload: Dict[str, Any] = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _push_client.post("/api/v1/push/trigger", json=payload)
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()

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
    s = await db.location_settings.find_one({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0})
    if not s:
        s = {
            "home_address": "Rua das Acácias, 210 — Bairro Jardim",
            "home_lat": -23.5610,
            "home_lng": -46.6560,
            "radius_m": 150,
            "quiet_start": "22:00",
            "quiet_end": "06:00",
        }
        await db.location_settings.insert_one({"owner_id": user["user_id"], **s})
    return s

@api_router.put("/location/settings")
async def update_location_settings(body: LocationSettings, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.location_settings.update_one({"owner_id": user["user_id"]}, {"$set": payload}, upsert=True)
    return {"ok": True}

@api_router.get("/location/current")
async def location_current(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    settings = await db.location_settings.find_one({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}) or {}
    latest = await db.location_pings.find_one({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}, sort=[("when", -1)])
    trail_cursor = db.location_pings.find({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}).sort("when", -1).limit(30)
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
    doc = {
        "owner_id": user["user_id"],
        "id": f"ping_{uuid.uuid4().hex[:10]}",
        "lat": body.lat,
        "lng": body.lng,
        "address": body.address,
        "source": body.source,
        "when": now_utc(),
    }
    await db.location_pings.insert_one(doc)

    # Proactive check: outside geofence?
    settings = await db.location_settings.find_one({"owner_id": user["user_id"]}, {"_id": 0}) or {}
    home_lat = settings.get("home_lat"); home_lng = settings.get("home_lng")
    if home_lat is not None and home_lng is not None:
        dist = _haversine_m(body.lat, body.lng, home_lat, home_lng)
        radius = settings.get("radius_m", 150)
        if dist > radius:
            try:
                await send_push(
                    recipients=[user["user_id"]],
                    data={
                        "title": "Dona Maria saiu de casa",
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
    await db.location_pings.delete_many({"owner_id": user["user_id"]})
    return {"ok": True}

# ---------- Medication reminder (mock: sends a push now) ----------
@api_router.post("/medications/{med_id}/remind")
async def remind_medication(med_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    med = await db.medications.find_one({"id": med_id, "owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0})
    if not med:
        raise HTTPException(404, "Not found")
    try:
        await send_push(
            recipients=[user["user_id"]],
            data={
                "title": f"Hora do {med['name']}",
                "message": f"{med['dosage']} — dá uma passadinha na mamãe 💛",
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
    elder = await db.elders.find_one({"owner_id": user["user_id"]}, {"_id": 0})
    scans_cursor = db.wristband_scans.find({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}).sort("when", -1).limit(5)
    scans = await scans_cursor.to_list(5)
    for s in scans:
        if isinstance(s.get("when"), datetime):
            s["when"] = s["when"].isoformat()
    # latest ping for real map
    latest_ping = await db.location_pings.find_one({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}, sort=[("when", -1)])
    if latest_ping and isinstance(latest_ping.get("when"), datetime):
        latest_ping["when"] = latest_ping["when"].isoformat()
    settings = await db.location_settings.find_one({"owner_id": user["user_id"]}, {"_id": 0, "owner_id": 0}) or {}
    # notify circle
    try:
        await send_push(
            recipients=[user["user_id"]],
            data={
                "title": "SOS acionado",
                "message": f"Modo busca em {elder.get('name') if elder else 'Dona Maria'} — todos avisados.",
                "action_url": "/sos",
            },
            idempotency_key=f"sos_{user['user_id']}_{now_utc().isoformat()}",
        )
    except Exception as e:
        logging.warning(f"Push (sos) failed: {e}")
    return {
        "status": "acionado",
        "elder_id": elder.get("id") if elder else None,
        "elder_name": elder.get("name") if elder else "Dona Maria",
        "last_location": (latest_ping or {}).get("address") or (scans[0]["address"] if scans and scans[0].get("address") else settings.get("home_address", "Rua das Acácias, 210 — Bairro Jardim")),
        "last_seen": "há 4 minutos",
        "circle_notified": ["Ana", "Carla", "Bruno", "Dona Rita"],
        "call_number": "192",
        "recent_scans": scans,
        "current_position": latest_ping,
        "home": {"lat": settings.get("home_lat"), "lng": settings.get("home_lng"), "address": settings.get("home_address")},
    }

@api_router.get("/")
async def root():
    return {"message": "Amparai API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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
    client.close()
