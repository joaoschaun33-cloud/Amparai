# Plano de migração — Amparai para Google Cloud / Firebase
> Instruções para a IA executora. Decisão registrada em D-005 (DECISOES.md do projeto).
> Regra geral: uma fase por vez, com critério de aceite verificado antes de seguir. Nunca declarar fase concluída sem evidência (teste passando, endpoint respondendo, screenshot).

## Condições inegociáveis do fundador
1. **Região São Paulo** (`southamerica-east1`) para Cloud Run, Firestore e Storage — dados de saúde de brasileiros ficam no Brasil (LGPD).
2. **Firestore só pelo backend.** O app Expo NUNCA acessa Firestore diretamente; toda leitura/escrita passa pela API FastAPI (Admin SDK). Security rules do Firestore: negar tudo para clientes.
3. Segredos no **Secret Manager** (nunca em .env commitado, nunca no bundle do app).
4. O app Expo só guarda o ID token do Firebase Auth; validação sempre no backend via `firebase-admin`.

## Fase 0 — Preparação (fazer ANTES de qualquer código)
- Mover o repositório de `OneDrive\Área de Trabalho\Amparai` para `C:\dev\amparai`. Criar repositório privado no GitHub e fazer push. Confirmar que `.venv`, `node_modules`, `.env*` estão no `.gitignore`.
- Remover resquícios: import `stripe` no server.py (não usamos), URLs `demobackend.emergentagent.com` e `integrations.emergentagent.com` (serão substituídas nas fases 2 e 5).
- **Critério de aceite:** repo no GitHub, `git status` limpo, app ainda roda como está.

## Fase 1 — Projeto GCP/Firebase

### Pré-requisitos HUMANOS (o fundador faz antes; a IA executora não tem como)
1. Criar projeto `amparai-dev` em console.cloud.google.com (conta Google + billing com cartão; usar os US$ 300 de crédito de novo cliente).
2. Criar alerta de orçamento de R$ 50/mês em Billing → Budgets.
3. Criar projeto Firebase sobre o mesmo projeto GCP (console.firebase.google.com): ativar Authentication (Google) e Firestore nativo em `southamerica-east1`.
4. Instalar gcloud CLI e Firebase CLI e autenticar no terminal: `gcloud auth login` · `gcloud auth application-default login` · `gcloud config set project amparai-dev` · `firebase login`.
5. NUNCA baixar chave JSON de service account para a máquina local — a IA executora usa as Application Default Credentials da sessão do fundador (revogável com `gcloud auth revoke`).
- Criar projeto `amparai-prod` (e opcionalmente `amparai-dev`). Ativar: Firestore (modo nativo, southamerica-east1), Firebase Auth (provedor Google), Cloud Run, Secret Manager, Artifact Registry.
- Gerar service account do backend com papéis mínimos (Firestore user, Secret accessor).
- **Critério de aceite:** `gcloud` autenticado; Firestore vazio visível no console; login Google habilitado no Firebase Auth.

## Fase 2 — Autenticação (Firebase Auth substitui Emergent)
- **Frontend (Expo):** instalar SDK Firebase (`firebase` JS SDK — com Expo Go usar signInWithCredential via `expo-auth-session`/Google; se build nativo, `@react-native-firebase/auth`). Fluxo: login Google → obter ID token → enviar em `Authorization: Bearer <idToken>` para a API. Guardar token com `expo-secure-store`; renovar automaticamente (o SDK cuida).
- **Backend (FastAPI):** `firebase-admin`; dependência `get_current_user` que valida o ID token (`auth.verify_id_token`), extrai uid/email/nome/foto e faz upsert do usuário no Firestore. Remover `EMERGENT_AUTH_URL`, `user_sessions` em banco e o endpoint `POST /api/auth/session` (o Firebase elimina sessão própria). Manter `GET /api/auth/me`.
- Preservar o comportamento atual: primeiro login continua semeando os dados demo da Dona Maria.
- **Critério de aceite:** login Google funciona no Expo; `GET /api/auth/me` retorna o usuário; token inválido/expirado recebe 401; testes de auth atualizados e passando.

## Fase 3 — Dados (Firestore substitui MongoDB)
- Modelagem de coleções (espelhar os modelos Pydantic atuais):
  `users/{uid}` · `circles/{circleId}` (elder embutido) · subcoleções de `circles`: `members`, `medications`, `shifts`, `health_events`, `expenses`, `appointments`, `invitations`, `scans`, `clinico` (doc único).
- Todo dado pertence a um `circleId`; membership define acesso (checada no backend em toda rota).
- Substituir Motor por `google-cloud-firestore` (async). Reescrever camada de dados endpoint por endpoint, na ordem: auth/me → hoje → medications/toggle → escala → saude → custos/expenses → clinico → members/invitations → pulseira/scan → sos → summary/weekly → ocr/receipt.
- Migrar o seeding demo para Firestore. Não há dados reais a migrar.
- **Critério de aceite:** TODOS os endpoints atuais respondem igual (contrato JSON preservado — rodar a suíte `backend/tests/` adaptada); app funciona ponta a ponta contra Firestore local (emulador) e contra o projeto dev.

## Fase 4 — Backend no Cloud Run
- `Dockerfile` simples (python slim, uvicorn). Deploy no Cloud Run região São Paulo, min-instances=0 (custo ~zero no piloto), concurrency padrão, porta 8080.
- Segredos via Secret Manager montados como env (ANTHROPIC_API_KEY etc.). CORS restrito aos domínios do app.
- Apontar `EXPO_PUBLIC_BACKEND_URL` para a URL do Cloud Run (depois, domínio `api.amparai.com.br`).
- **Critério de aceite:** API pública no ar; app Expo em dispositivo real funcionando contra o Cloud Run; cold start < 3s.

## Fase 5 — Integrações restantes
- **IA (resumo semanal):** substituir `emergentintegrations`/`EMERGENT_LLM_KEY` por chamada direta à API da Anthropic (modelo Claude atual; manter o fallback de texto empático estático se a API falhar).
- **OCR de recibos:** manter provider atual ou trocar por chamada direta (decisão da IA executora; documentar custo por recibo).
- **Push:** FCM via `expo-notifications` (projeto Firebase já dá o FCM de graça). Registrar token do device por usuário; backend envia via `firebase-admin.messaging`. Substituir o cliente Emergent Push.
- **Critério de aceite:** resumo semanal gerado em produção; push de teste chega no device.

## Fase 6 — Correção obrigatória: pulseira pública (D-004)
- `GET /api/pulseira/{elder_id}` (público) passa a retornar SOMENTE: primeiro nome, foto, e a lista de contatos como `{nome, relação}` com **telefone mascarado** — a ligação acontece via endpoint que retorna o `tel:` só no clique (ou número exibido parcialmente), e o formulário de notificação com geolocalização.
- Tipo sanguíneo, alergias e condições saem da rota pública. Criar rota autenticada separada para socorristas/família.
- Rate-limit no endpoint público de scan.
- **Critério de aceite:** rota pública não expõe nenhum dado de saúde; scan notifica o círculo; teste automatizado cobrindo o contrato público.

## Custos esperados (piloto, 100–1.000 famílias)
Cloud Run min-0 + Firestore free tier + Auth free + FCM free ≈ **< R$ 50/mês** até milhares de usuários. Alertar o fundador se qualquer projeção passar de R$ 300/mês.

## Fora de escopo desta migração
Bot WhatsApp (Etapa 1–2 do playbook), Pix real, hardware. Não tocar.
