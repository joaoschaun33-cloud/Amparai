# Pendências e Tarefas — Amparai Roadmap

Este documento lista as pendências técnicas, blockers de release e tarefas mapeadas para as próximas etapas de desenvolvimento do Amparai.

---

## 🛑 Blockers de Release (Críticos)

### 1. Google Sign-In Nativo para Produção Mobile — 🟡 EM EXECUÇÃO (Fase 7)
* **Problema**: Builds nativos de produção não tinham login funcional. Ver decisão de arquitetura em `DECISOES_TECNICAS.md` §7.
* **Feito no código (commitado)**:
  - [x] Dependência `@react-native-google-signin/google-signin@16.1.2` + config plugin Firebase no `app.json`.
  - [x] `AuthContext.tsx`: login nativo real (`GoogleSignin.signIn()` → `GoogleAuthProvider.credential` → `signInWithCredential`); demo vira fallback `__DEV__`.
  - [x] `bundleIdentifier`/`package` → `com.amparai.app`.
  - [x] `eas.json` (perfil development), `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` no `.env`, `.gitignore` para os arquivos google-services.
* **Pendente (passos de console/build — dependem do fundador)**:
  1. Baixar `google-services.json` (app Android) e `GoogleService-Info.plist` (app iOS) do Firebase e subir como **EAS Secret**.
  2. Registrar o **SHA-1** no Firebase (chave de upload da EAS + chave do Google Play App Signing).
  3. Criar os apps Android/iOS no Firebase com o novo ID `com.amparai.app` (o ID antigo `com.emergent...` fica órfão).
  4. `eas build --profile development`, instalar em device real e executar o teste de aceite.
* **Critério de aceite**: device real → "Entrar com Google" → seletor nativo → `/api/auth/me` 200 → push registra. Evidência: vídeo do device + log do backend.

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
