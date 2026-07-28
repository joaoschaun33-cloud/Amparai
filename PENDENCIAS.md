# Pendências e Tarefas — Amparai Roadmap

Este documento lista as pendências técnicas, blockers de release e tarefas mapeadas para as próximas etapas de desenvolvimento do Amparai.

---

## 🛑 Blockers de Release (Críticos)

*Nenhum blocker ativo.*

### ✅ Termo de consentimento — aprovado pelo advogado e publicado (Sprint 2 #3)
* Texto oficial **v1.0** no `CONSENT_TERM_TEXT` (com transferência internacional + salvaguardas
  de IA amarradas); `CONSENT_TERM_VERSION = "1.0"`. Declaração de cuidador de fato validada.
* Bump de versão força reconsentimento; a lógica de seed passou a garantir consentimento
  **na versão vigente** (suíte não quebra na virada de versão).
* Bases legais confirmadas: consentimento (app geral) + proteção da vida (SOS/pulseira).

---

## 🧹 Dados falsos em contas reais (auditoria de 22/07/2026)

> Descobertos durante o teste de onboarding em conta nova. Todos são fabricação de dados
> fictícios para famílias reais. Fix aplicado no mesmo padrão do seed: conta real recebe a
> verdade; `test@`/`demo@` (SEEDED_ACCOUNTS) mantêm o exemplo para não quebrar a suíte.

### ✅ F1. `GET /clinico` fabricava prontuário (corrigido, aguardando deploy)
* Fabricava e **gravava** O+, Dipirona, Hipertensão, Losartana, Unimed etc. na conta real.
  Grave: o tipo sanguíneo aparece na pulseira pública num socorro.
* Corrigido: conta real recebe prontuário **em branco**, sem gravar nada.

### ✅ F2. `POST /sos` mentia sobre quem foi avisado (corrigido, aguardando deploy)
* Retornava fixo `circle_notified: ["Ana","Carla","Bruno","Dona Rita"]`, `last_seen: "há 4
  minutos"` e endereço falso — no **fluxo de emergência**.
* Corrigido: `circle_notified` vem dos membros reais (ou vazio); `last_location`/`last_seen`
  só refletem dados reais.

### ✅ F3. `POST /location/simulate` (corrigido, aguardando deploy)
* Endpoint de demo que semeava pings "Dona Maria saiu de casa". Agora responde 403 para
  conta real (só funciona em conta de demonstração).

### 🔴 F4. Limpar resíduo da conta de teste `joaoschaun33@gmail.com`
* Essa conta abriu a tela clínica **antes** do fix F1, então tem o prontuário falso gravado
  no Firestore. **Ação**: apagar o documento dela na coleção `clinical` (e conferir `elders`)
  para um reteste limpo.

### 🟡 F5. Auditoria completa de fabricação de dados
* F1–F3 foram achados por amostragem. Falta uma varredura sistemática de todas as rotas de
  leitura em busca de outros defaults/fallbacks hardcoded (ex.: mensagens de push com "Dona
  Maria", `circle_notified` "todos avisados").

### 🟡 F6. UX de salvamento no perfil clínico
* A tela clínica salva automaticamente ao sair, sem botão nem confirmação. Em dado sensível,
  a família não tem feedback do que gravou. Revisar (confirmação explícita de salvamento).

---

## 📋 Pendências Técnicas e de Arquitetura

### 1. Google Sign-In Nativo para Produção Mobile — ✅ CONCLUÍDO E VALIDADO EM DEVICE (Fase 7, 21/07/2026)
* **Status**: Login nativo com Google funcionando end-to-end em aparelho Android real, contra o backend de produção no Cloud Run.
* **Evidência**:
  - Build EAS `eb006f8d-5449-4619-94db-cb039bef1834` instalado em device físico.
  - Seletor nativo de contas do Google abriu e autenticou com a conta real do fundador (não a conta demo — o fallback `__DEV__` não foi acionado).
  - App carregou a home com o nome real do usuário, confirmando `/api/auth/me` 200.
  - **Firebase Auth registra o login da conta Google em 21/07/2026.**
* **Ressalva conhecida**: a validação foi feita com o build `development` conectado ao Metro. O módulo nativo é o mesmo em qualquer perfil, então o fluxo de auth está provado — mas vale instalar um build `preview`/standalone antes de distribuir para testadores externos.
* **Chaves de API**: rotacionadas após a exposição no build EAS (Secret Manager v3); `.easignore` corrigido para não subir `/.env` nem `backend/`.

### 1b. Build standalone (preview) para testadores — 🟡 PENDENTE
* **Objetivo**: Gerar e validar um APK `preview` (JS embutido, sem depender do Metro) para distribuir a famílias testadoras.
* **Ação Necessária**: `eas build --profile preview --platform android`, desinstalar o build de development do aparelho antes de instalar, e repetir o teste de login.

---

## 🔒 LGPD e Consentimento (auditoria de 21/07/2026)

> Inventário completo de dados e matriz de acesso em `LGPD_INVENTARIO_DADOS.md`.
> Itens marcados **[JURÍDICO]** estão bloqueados aguardando parecer do advogado.

### L1. Consentimento de fato — ✅ FASE 9a IMPLEMENTADA (código, aguarda deploy + termo jurídico)
* **Feito (9a)**: coleção `consents` (log imutável: accept/revoke, timestamp, IP, user_agent,
  versão do termo, método, declarações); endpoints `GET /consent/term`, `GET /consent/status`,
  `POST /consent`, `POST /consent/revoke`; **enforcement** `PUT /clinico` → 403 sem
  consentimento válido; termo mora no servidor (`CONSENT_TERM_VERSION`); tela
  `app/consentimento.tsx` (termo → capacidade → titular / cuidador de fato).
* **Pendente para produção real**: revisão jurídica do termo (ver Blocker no topo) e o
  reteste no device (build preview).
* **9a — polimento pendente**: a tela clínica ainda não trata o 403 com elegância (o
  checklist guia ao consentimento primeiro, então o caminho normal funciona).

### L1b. Consentimento — Fase 9b (exige Firebase Storage) 🟡
* Upload do **Termo de Curatela**; **reforço por selfie/áudio** do consentimento do titular
  (mitiga o não-repúdio do "toque no app"). Bucket em `southamerica-east1`, não indexado,
  nunca exibido no app, retenção de 5 anos, download só por admin (parecer do advogado).

### L2. Coleta de dados de terceiros na pulseira — ✅ FEITO (Sprint 2 #10)
* **Feito**: aviso just-in-time (texto do advogado) exibido no formulário público antes de
  coletar os dados de quem socorre; base = proteção da vida (art. 11, II, "e").
* **TTL 30 dias**: `expires_at` gravado em cada `wristband_scans`. **Ação de infra pendente**:
  habilitar a política de TTL no Firestore sobre `wristband_scans.expires_at` (uma vez):
  `gcloud firestore fields ttls update expires_at --collection-group=wristband_scans --enable-ttl`.
* **Sanitização** rígida dos campos de terceiro (nome/telefone/nota/endereço) aplicada.

### L3. Exposição da rota pública da pulseira — [JURÍDICO] 🟡
* **Situação**: já minimizada (D-004 removeu tipo sanguíneo, alergias e condições).
  Ainda expõe **primeiro nome, foto e contatos de emergência sem autenticação**,
  protegida apenas pelo caráter não-óbvio do `elder_id`.
* **Ação**: avaliar token rotativo, expiração ou exibição parcial.

### L4. Processamento por IA e transferência internacional — [JURÍDICO] 🟡
* Resumo semanal e OCR de recibos são processados pelo **Gemini** (fora do país).
  Regra interna manda nunca enviar identificação completa em prompt — **precisa ser auditado no código**.

### L5. Retenção, eliminação e revogação
* Não existe política de retenção, rotina de eliminação nem botão de revogação de consentimento.

---

## 🧭 Produto — Onboarding e Círculo

### P1. Remover dados demo do primeiro login e criar onboarding real 🔴
* **Problema**: `server.py:504-506` roda `seed_family_for_user()` em todo primeiro login —
  **toda família real recebe uma "Dona Maria" fictícia** no banco de produção. O usuário não
  distingue o falso do real, polui o Firestore e corrói a confiança, que é o ativo do produto.
* **Decisão do fundador**: remover. Substituir por onboarding que cria o registro verdadeiro
  (nome, foto, nascimento), usando os *empty states* já previstos nas design guidelines.
* **Seed permanece** apenas para a conta demo, ou como modo "ver um exemplo" explícito e não persistente.

### P2. Aceite de convite — o círculo é fachada 🔴
* **Problema**: `POST /api/invitations` gera código e `GET /api/invitations/{code}` consulta,
  mas **não existe endpoint de aceite**: `accepted` nunca vira `true` e nenhum usuário é
  vinculado à família de outro. Todo dado é escopado por `owner_id`. Na prática,
  **só o dono da conta vê os dados** — irmãos e cuidadores não compartilham nada.
* **Ação**: implementar o aceite que vincula o usuário convidado à família.
* **Depende de**: matriz de acesso por papel (ver P3).

### P3. Matriz de acesso por papel — [JURÍDICO] 🟡
* Os papéis (`coordenador`, `irmao`, `cuidador`, `profissional`) são **rótulos sem efeito
  de permissão**. Definir o que cada papel vê (ex.: cuidador contratado e profissional de
  saúde provavelmente não devem ver custos nem notas livres) e implementar a autorização.

### P4. Armazenamento de exames e documentos de consulta 🟡
* **Não existe**. Fase própria. Restrições já definidas: bucket em `southamerica-east1`
  (D-005), **nunca em rota pública** (D-004), URLs assinadas de curta duração, acesso por
  papel, criptografia em repouso e política de retenção/eliminação.

---

### 2. Integração com Gateway de IA LiteLLM (D-006)
* **Objetivo**: Substituir as chamadas diretas ao Gemini 2.5 Flash por um proxy unificado (LiteLLM) para gerenciar fallbacks automáticos de modelo e validar termos do vocabulário proibido (ex: proibir termos diagnósticos e médicos para manter a linguagem afetiva).
* **Ação Necessária**:
  - Configurar e subir o contêiner do LiteLLM Proxy.
  - Atualizar os endpoints `/summary/weekly` e `/ocr/receipt` para apontar ao proxy do LiteLLM.
  - Habilitar regras e filtros de filtragem de saída no gateway.

### 3. Integração MedBag e Suporte ao Padrão FHIR (D-008 e D-009)
* **Objetivo**: Preparar a estrutura de dados de saúde do paciente para o modelo FHIR (Fast Healthcare Interoperability Resources) e integrar com a carteira digital MedBag.
* **Ação Necessária**:
  - Mapear a coleção `clinical` no Firestore para recursos FHIR (`Patient`, `Observation`, `MedicationRequest`).
  - Desenvolver endpoints de importação/exportação FHIR JSON.

### 4. Gestão da Conta Demo no Firebase Auth
* **Objetivo**: Garantir a higienização dos dados vinculados ao usuário de testes.
* **Ação Necessária**:
  - Manter a conta `demo@amparai.com.br` limpa de dados privados reais no banco de produção.
  - Implementar um script de limpeza periódica de pings de geolocalização e gastos simulados da conta demo.
