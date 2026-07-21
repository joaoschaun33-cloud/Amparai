# Pendências e Tarefas — Amparai Roadmap

Este documento lista as pendências técnicas, blockers de release e tarefas mapeadas para as próximas etapas de desenvolvimento do Amparai.

---

## 🛑 Blockers de Release (Críticos)

*Nenhum blocker ativo.*

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

### L1. Consentimento não existe de fato — [JURÍDICO] 🔴
* **Problema**: não há tela de consentimento. O item "Registrar o consentimento" em
  `hoje.tsx:144` apenas navega para a tela clínica (mesmo destino do passo seguinte).
  O campo `consent_given` existe no backend, mas nada o coleta. Hoje o consentimento é
  **teatro de checklist** — inaceitável para dado sensível de titular hipervulnerável.
* **Desenho aprovado pelo advogado**: dois caminhos ("titular pode consentir" / "não pode"),
  com curatela quando houver e, na ausência, **declaração de cuidador de fato** (checkbox duplo).
* **Log obrigatório (ônus da prova, art. 8º §2º)**: `timestamp`, `IP`, `user_id`,
  **versão exata do termo aceito** e ação realizada. Revogação tão fácil quanto o consentimento.
* **Bloqueado por**: confirmação das perguntas 1, 2 e 3 enviadas ao advogado.

### L2. Coleta de dados de terceiros na pulseira — [JURÍDICO] 🔴
* **Problema**: `POST /api/pulseira/{id}/scan` grava **nome, telefone, observação e
  localização de quem socorre** a pessoa idosa. Esse terceiro não tem conta, não aceitou
  termo e não é informado do tratamento.
* **Ação**: definir base legal + aviso mínimo antes da coleta.

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
