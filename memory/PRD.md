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

## MVP scope (this iteration)
- **Auth**: Emergent-managed Google OAuth. First login auto-seeds Dona Maria + care circle for the user.
- **Hoje**: greeting, calm status card (verde-oliva) with Dona Maria's photo, medications with tap-to-toggle, plantão today/tomorrow, upcoming appointments, weekly AI summary (Claude Sonnet 4.5 via Emergent LLM Key).
- **Escala**: full shift list, âmbar (not red) for gaps with "Assumir" CTA, monthly recognition of each family member.
- **Saúde**: chronological timeline of health events including WhatsApp audios and gentle IA observations, "Gerar PDF" CTA.
- **Custos**: total, per-expense split by member with Pago/Pendente (Pix status).
- **SOS**: full-screen red modal with last location, circle notified, QR wristband status, ligar 192.

## Non-goals (deferred)
- Real Pix/OCR integration (mocked in UI)
- Real WhatsApp audio ingestion (mocked events)
- Sensor/tag hardware integration
- Multi-member care circle sync (single-user with mocked members for MVP)
- Consent onboarding flow

## Backend endpoints
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
