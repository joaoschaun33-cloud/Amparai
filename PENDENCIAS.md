# Pendências e Tarefas — Amparai Roadmap

Este documento lista as pendências técnicas, blockers de release e tarefas mapeadas para as próximas etapas de desenvolvimento do Amparai.

---

## 🛑 Blockers de Release (Críticos)

*Nenhum blocker ativo.*

---

## 📋 Pendências Técnicas e de Arquitetura

### 1. Google Sign-In Nativo para Produção Mobile — ✅ CONCLUÍDO E VALIDADO (Fase 7)
* **Status**: O build na EAS compilou e gerou o executável (`.apk`) com sucesso, validando a integração dos pacotes nativos, plugins e injeção do arquivo `google-services.json`.
* **Evidência**: Build ID `eb006f8d-5449-4619-94db-cb039bef1834` concluído com sucesso nos servidores da EAS.
* **Próximas etapas pós-distribuição**: Monitorar logs de login em produção no Firebase Auth e logs de backend.

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
