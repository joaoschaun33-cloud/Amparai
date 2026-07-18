# Pendências e Tarefas — Amparai Roadmap

Este documento lista as pendências técnicas, blockers de release e tarefas mapeadas para as próximas etapas de desenvolvimento do Amparai.

---

## 🛑 Blockers de Release (Críticos)

### 🔒 Rotacionar chaves de API expostas no build da EAS
* **Problema**: O `.easignore` da raiz não excluía o `.env` da raiz. Como o EAS empacota a partir da raiz, as chaves `XAI_API_KEY`, `GROQ_API_KEY` e `GEMINI_API_KEY` foram enviadas no pacote do build para os servidores da EAS (build `eb006f8d`).
* **Correção já aplicada no código**: `.easignore` passou a excluir `/.env`, `/.env.*` e o diretório `backend/` inteiro.
* **Ação necessária (fundador)**: **rotacionar as três chaves** (Google AI Studio / xAI / Groq) e atualizar o `.env` / Secret Manager. A `GEMINI_API_KEY` está em uso em produção — prioridade máxima.

---

## 📋 Pendências Técnicas e de Arquitetura

### 1. Google Sign-In Nativo para Produção Mobile — 🟢 BUILD PRONTO / AGUARDANDO VALIDAÇÃO NO DEVICE (Fase 7)
* **Status**: Código, plugins nativos e build na EAS concluídos. O APK compilou com sucesso — mas isso valida o *build*, não o *login*.
* **Evidência de build**: Build ID `eb006f8d-5449-4619-94db-cb039bef1834` (EAS) finalizado com sucesso.
* **Falta para marcar como validado (critério de aceite)**: instalar o APK no aparelho real → tocar em "Entrar com Google" → seletor nativo → `/api/auth/me` retorna 200 → push registra. Evidência: vídeo do fluxo + log do backend. **Só então mover para concluído.**

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
