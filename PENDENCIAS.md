# Pendências e Tarefas — Amparai Roadmap

Este documento lista as pendências técnicas, blockers de release e tarefas mapeadas para as próximas etapas de desenvolvimento do Amparai.

---

## 🛑 Blockers de Release (Críticos)

### 1. Google Sign-In Nativo para Produção Mobile
* **Problema**: O fluxo de login em mobile está protegido pelo gate `__DEV__` e lança um erro em builds de produção. Atualmente, o login do Google no dispositivo móvel em produção não está funcional.
* **Ação Necessária**:
  1. Criar Client IDs de OAuth para iOS e Android no console do Google Cloud e associar as chaves hash SHA-1 do aplicativo.
  2. Adicionar as chaves no console do Firebase Authentication (provedor Google).
  3. Instalar e configurar as dependências de login nativo (ex: `@react-native-google-signin/google-signin` ou `expo-auth-session/providers/google`).
  4. Atualizar a lógica do `AuthContext.tsx` para disparar o login social nativo em ambiente de release.

---

## 📋 Pendências Técnicas e de Arquitetura

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
