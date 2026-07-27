# Auditoria Técnica e de Produto — Amparai

> Data: 2026-07-27. Feita sobre o código atual (HEAD `469f884`, server.py 1837 linhas / 45
> endpoints, ~4.100 linhas de telas). **Ancorada no código real**, não em memória — o projeto
> avançou muito (Fases 8–11, Design System) desde a última análise.
>
> **Não refatorar antes da aprovação do fundador neste plano.** Cada item traz: [1] o que
> está errado, [2] por que muda (impacto), [3] ação técnica exata. Priorizado P0 → P2.

---

## Estado do app — o que está saudável (para calibrar)

Vale reconhecer a fundação, porque ela é sólida: login Google nativo validado em device;
backend em Cloud Run + Firestore (ADC) em São Paulo; consentimento com log imutável e
enforcement (9a); RBAC household + aceite de convite (10); registro de cuidado operacional
(11: remédios, diário, consultas, plantão); Design System documentado (`DESIGN.md` + `theme.ts`
+ `SkeletonLoaders`); onboarding real sem dados falsos; landing + Política/Termos no ar. A base
está boa. Os itens abaixo são o que separa "funciona pra mim" de "confio nisso pra minha mãe".

---

## P0 — Crítico (trava um beta em que dá pra confiar)

### 1. UI por papel: Familiar registra o cuidado, mas não gere a estrutura — ✅ FEITO (2026-07-27) — [Lógica + UI/UX]
- **Enquadramento correto (revisado com o fundador):** o Familiar **NÃO é leitor** — o app é
  sobre *dividir* o cuidado. Ele faz tudo que é **operacional** (marcar remédio, assumir plantão,
  registrar no diário, lançar despesa, ver o rateio). O que ele não faz é **governança**
  (editar o prontuário estrutural, editar a identidade da pessoa, convidar/remover membros,
  definir a escala-base).
- **Problema que existia:** o backend já distinguia os papéis, mas nenhuma tela consumia o
  `role` → o Familiar via os botões de governança e levava **403 cru**.
- **Feito:** backend confirmado exato (`require_coordinator` só em PUT /clinico, PUT /elder,
  POST/DELETE members, POST /invitations; todo o operacional é livre). Frontend:
  `AuthContext` expõe `role`/`isCoordinator`; o **clínico** vira read-only para o Familiar
  (esconde "Adicionar"/"×", banner explicativo, `save()` guardado); o **círculo** esconde
  "Convidar" e "remover membro"; o **Hoje** esconde o checklist de onboarding (ações de
  coordenador). O Familiar mantém todas as ações operacionais.

### 2. Direitos LGPD prometidos e não entregues: apagar dados + revogar consentimento — [Lógica/Legal]
- **Problema:** a Política de Privacidade **publicada** promete exclusão imediata dos dados
  (Art. 18). Na prática: não há endpoint de exclusão de conta; o `POST /consent/revoke` existe
  mas **sem botão no app**; não há rotina de retenção. Só existe o script de admin
  `reset_account_data.py`.
- **Impacto:** descumprir uma promessa da própria política é **exposição legal direta** perante
  a ANPD — e mina a confiança que é o ativo do produto.
- **Ação:** `DELETE /account/data` (apaga tudo do titular, **retém `consents` por 5 anos**
  conforme o parecer) + botões "Apagar meus dados" e "Revogar consentimento" no app, com
  confirmação dupla.

### 3. Termo de consentimento ainda em `1.0-draft` — [Legal]
- **Problema:** `CONSENT_TERM_VERSION = "1.0-draft"` — rascunho, sem revisão do advogado
  (transferência internacional do Gemini + salvaguardas de IA não amarradas).
- **Impacto:** **blocker de beta amplo.** Famílias reais consentindo sob rascunho.
- **Ação:** advogado fecha o texto → bump `1.0` (força reconsentimento) → deploy.

### 4. Testes rodam contra o Firestore de PRODUÇÃO e o caminho Familiar não tem teste — [Arquitetura/Qualidade]
- **Problema:** os 43 testes de integração batem na URL de produção → **poluem a base real** a
  cada rodada. E cobrem só o Coordenador (conta de teste): o **caminho multi-usuário (RBAC,
  aceite, Familiar)** — que é o que mais mudou — **não tem nenhum teste**.
- **Impacto:** um buraco de RBAC (ex.: Familiar escrevendo onde não devia) passaria despercebido;
  e cada CI suja produção com dados de teste.
- **Ação:** projeto Firestore de **staging** separado; testes do fluxo Familiar (convida →
  aceita → tenta escrever governança → 403; tenta operacional → 200).

---

## P1 — Importante (qualidade, segurança, confiança)

### 5. CORS `allow_origins=["*"]` com `allow_credentials=True` — [Arquitetura/Segurança]
- **Problema:** `server.py:1816-1817` — combinação contraditória pela spec de CORS e permissiva
  demais para um app de saúde. Já temos as origens reais.
- **Impacto:** superfície desnecessária; postura fraca de segurança num produto sensível.
- **Ação:** `allow_origins=["https://amparai.com.br","https://app.amparai.com.br","https://amparai-app.web.app","http://localhost:8081"]`.

### 6. `location/current` e `location/ping` ainda em `owner_id` próprio, não household — [Lógica]
- **Problema:** o SOS foi corrigido para `resolve_household`, mas os endpoints de localização
  não (`server.py:1588,1620`). O Familiar não vê a localização da família; seus pings vão pro
  próprio espaço vazio. Inconsistente com o resto do RBAC.
- **Impacto:** localização/segurança — funcionalidade central — quebrada para o convidado.
- **Ação:** aplicar `resolve_household` nos endpoints de localização (leitura no household;
  gravação de config = Coordenador).

### 7. RBAC "governança × operacional" nos writes novos não é deliberado — [Lógica]
- **Problema:** `POST /medications`, `/shifts`, `/health_events`, `/appointments` gravam no
  household (correto), mas **não aplicam papel**. Qualquer membro cria/edita. Registrar cuidado
  (marcar tomado, assumir plantão) ser de todos é o que decidimos — **mas adicionar uma
  medicação contínua** (que aparece na pulseira num socorro) é estrutural.
- **Impacto:** um Familiar pode alterar o regime clínico que a emergência lê. Zona cinzenta não
  decidida.
- **Ação:** classificar cada write como operacional (todos) ou estrutural (Coordenador) e
  aplicar `require_coordinator` nos estruturais; considerar o fluxo "sugerir → Coordenador
  aprova" para o resto.

### 8. Varredura de dados falsos (F5) oficialmente incompleta — [Lógica]
- **Problema:** a maioria dos fallbacks fictícios está gated em `SEEDED_ACCOUNTS`, mas o sweep
  definitivo nunca foi fechado. O **"plantação"** que você viu **não está no código-fonte**
  (confirmado por `git grep`) → é dado no banco da conta testada.
- **Impacto:** risco residual de nome/dado errado aparecer para uma família real.
- **Ação:** sweep final linha a linha das rotas de leitura + me dizer **em qual tela** o
  "plantação" apareceu para rastrear o registro no Firestore.

### 9. Sem instrumentação/analytics — [Produto]
- **Problema:** nenhum evento é medido. Não sabemos onde o usuário desiste no onboarding nem se
  volta.
- **Impacto:** onboarding e retenção decididos no achismo — não dá pra melhorar o que não se mede.
- **Ação:** eventos mínimos (onboarding iniciado/concluído, consentimento dado, convite
  enviado/aceito, **primeiro registro de cuidado** = aha-moment). Um provedor leve, sem PII.

### 10. Pulseira: terceiro sem aviso + rota pública sem token — [Legal]
- **Problema:** `POST /pulseira/{id}/scan` grava nome/telefone/localização de quem socorre, sem
  aviso; a rota pública expõe foto+nome+contatos protegida só pelo `elder_id` não-óbvio.
- **Impacto:** coleta de terceiro sem base/aviso; risco de scraping.
- **Ação:** aviso just-in-time + TTL 30 dias (já redigido pelo advogado); token rotativo/expiração
  na rota pública.

---

## P2 — Dívida técnica e escala

### 11. Sem CI/CD nem ambiente de staging — [Arquitetura]
- Deploy manual, testes contra prod. **Ação:** pipeline (build → testes em staging → deploy) e
  projeto de staging. Reduz risco de regressão a cada fase.

### 12. Wrapper "Mongo-shaped" sobre o Firestore — [Arquitetura]
- A abstração `FirestoreDbClient` replica a API do Mongo e faz **ordenação/limite em memória**
  (D-002). Funciona, mas esconde o custo real das queries e convida a N+1 conforme o histórico
  cresce. **Ação:** monitorar; migrar consultas quentes para índices compostos quando o volume
  justificar.

### 13. Modelo de dados FHIR-shaped (MedBag) não começou — [Arquitetura/Produto]
- **Problema:** exames/saúde ainda não são modelados como `Observation`/`DocumentReference`.
- **Impacto:** quanto mais tarde, mais caro o spin-off MedBag e a portabilidade (RNDS).
- **Ação:** ao construir o registro de saúde/documentos (9b), já nascer FHIR-shaped.

### 14. `app.amparai.com.br` pendente de DNS/SSL — [Infra]
- O CTA da landing e o link do convite dependem dele. **Ação:** concluir a conexão do subdomínio
  ou manter o `.web.app` no `EXPO_PUBLIC_APP_URL` até lá.

### 15. `PENDENCIAS.md` desatualizado — [Processo]
- Lista P1/P2 (onboarding, aceite de convite) como 🔴 quando já foram entregues (Fases 8/10). A
  memória do projeto está em drift. **Ação:** reconciliar o documento com o estado real.

---

## Ordem de execução proposta (para sua aprovação)

1. **Sprint 1 (destrava o beta):** #1 modo-leitura do Familiar · #6 localização household · #7
   decidir RBAC dos writes · #5 CORS. → o Círculo passa a funcionar de ponta a ponta e seguro.
2. **Sprint 2 (compliance de verdade):** #2 apagar/revogar (LGPD) · #10 pulseira/terceiros · #3
   termo com o advogado. → pronto para famílias reais.
3. **Sprint 3 (higiene + visão):** #4 staging + testes Familiar · #8 sweep final · #9 analytics ·
   #15 reconciliar PENDENCIAS.
4. **Contínuo:** #11 CI/CD · #12 queries · #13 FHIR-shaped · #14 DNS.

**Aguardo sua aprovação (ou ajuste de prioridade) antes de refatorar qualquer código.**
