# PRD — Amparai (MVP)

## Vision
Amparai is the operating system of family elderly care in Brazil. It transforms a family into a team that organizes and protects the care they already give. The elder never uses the app — this is the family's control room.

## Persona
Ana, 40–55, exhausted, opens the app at night with one question: *"Is my mom okay?"* The Home answers in 3 seconds without a tap.

## Design principles
- Calm by default (verde-oliva "tudo bem" state, no red anywhere except SOS)
- Invisible technology (AI only speaks when useful, never diagnoses)
- Automation absorbs emotional friction (gentle Pix reminders, no accusatory red)
- Emergency at one tap (permanent central SOS button)
- Accessible (≥16px, AA contrast, big targets)

## Brand
- Cream `#F7F0E6` (never hospital white), Terracota `#C4633F`, Verde-Oliva `#5C6E49`, Marrom-Café `#3E2F25` (never black), Âmbar `#E8A854`, Vermelho-Barro `#A9402E` (SOS only)
- Fonts: serif (Fraunces fallback) for headings, sans (Nunito Sans fallback) for body
- Voice: "melhor amiga enfermeira" — "sua mãe", "Dona Maria", "círculo de cuidado". Never "paciente", "monitorar", "vigiar", "ALERTA".

## MVP scope (iteration 2 — Onboarding + Círculo + Dados clínicos + OCR + Pulseira pública)
- **Auth**: Emergent-managed Google OAuth. First login auto-seeds Dona Maria demo data.
- **Hoje**: greeting + calm status card + **onboarding checklist card** ("Primeiros passos": consent / clinical / circle) + shortcuts to Clínico and Círculo + medications toggle + plantão today/tomorrow + upcoming appointments + weekly AI summary (Claude Sonnet 4.5).
- **Escala**: shifts + âmbar (not red) gaps + monthly recognition.
- **Saúde**: chronological timeline + gentle IA observations + "Gerar PDF" CTA.
- **Custos**: total + expenses with per-member split. NEW: **OCR de recibos** via GPT-4o Vision (photo → title/amount/category/date auto-fill) + **cobrança gentil por WhatsApp** (deep-link `wa.me` with a warm message, no Meta API needed).
- **SOS**: full-screen red modal + last location + circle notified + QR wristband status + call 192 + **recent QR scans**.
- **Clínico** (novo): full clinical management — blood type, allergies, conditions, continuous meds, surgeries, health plan, emergency contacts, mobility, cognitive state, free notes. All editable inline with bottom sheets.
- **Círculo** (novo): list of care circle members + role-based invites (Coordenador, Irmão, Cuidador, Profissional de saúde) + 8-char invite code + share via native Share API + public accept page `/convite/[code]`.
- **Pulseira pública** (novo): public route `/pulseira/[id]` — any bom samaritano who scans the QR sees elder's photo, blood type, allergies, conditions, emergency contacts to call, and a form to notify the family with current location — **no login needed**.

## Non-goals (still deferred / roadmap)
- Real Pix API integration (currently WhatsApp deep-link — user chose this pragmatic path)
- **Sistema próprio de mensageria alternativo ao WhatsApp Business** (roadmap: build our own transcription bridge without going through Meta — user requested this as a roadmap item)
- Real hardware: door sensor, QR wristband physical tag, GPS tracker
- Emergent-managed push notifications (needs deployed build to test)

## Backend endpoints (added in iteration 2)
- `GET /api/onboarding/status`
- `GET/PUT /api/clinico`
- `PUT /api/elder` (partial update, e.g., consent_given)
- `GET/POST /api/members`, `DELETE /api/members/{id}`
- `POST /api/invitations`, `GET /api/invitations/{code}` (public)
- `POST /api/whatsapp/nudge`
- `POST /api/ocr/receipt` (GPT-4o Vision via emergentintegrations)
- `POST /api/expenses`
- `GET /api/pulseira/{elder_id}` (public), `POST /api/pulseira/{elder_id}/scan` (public), `GET /api/pulseira/{elder_id}/scans` (auth)
- Enriched `POST /api/sos` with recent_scans

## Backend endpoints (iteration 1)
- `POST /api/auth/session`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/hoje`, `POST /api/medications/{id}/toggle`
- `GET /api/escala`, `GET /api/saude`, `GET /api/custos`
- `GET /api/summary/weekly` (Claude Sonnet 4.5, fallback to static empathic text)
- `POST /api/sos`

## Integrations
- Emergent Google OAuth (frontend: `expo-web-browser`, `expo-linking`, `expo-secure-store`)
- Claude Sonnet 4.5 via `emergentintegrations` (`EMERGENT_LLM_KEY` in backend `.env`)

## Business enhancement idea
Add a subtle **"convidar irmão"** flow in Escala that, when the schedule has a gap, offers to send a Pix-like gentle nudge to the missing sibling via WhatsApp deep-link — turning a family friction point into a self-serve resolution and driving viral acquisition (each gap becomes a new user).
