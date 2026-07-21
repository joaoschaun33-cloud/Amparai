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
