from fastapi import FastAPI, APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Amparai API")
api_router = APIRouter(prefix="/api")

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

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

@api_router.post("/sos")
async def sos(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return {
        "status": "acionado",
        "last_location": "Rua das Acácias, 210 — Bairro Jardim",
        "last_seen": "há 4 minutos",
        "circle_notified": ["Ana", "Carla", "Bruno", "Dona Rita"],
        "call_number": "192",
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
