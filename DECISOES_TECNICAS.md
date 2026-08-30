# Decisões Técnicas — Migração GCP / Firebase

Este documento registra as decisões de arquitetura e decisões de projeto tomadas durante a migração do Amparai do ambiente Emergent para a infraestrutura Google Cloud / Firebase.

---

## 1. Migração para o Firestore AsyncClient
* **Contexto**: A D-005 exige que os dados de saúde fiquem na região de São Paulo (`southamerica-east1`) e que toda leitura/escrita do app mobile passe obrigatoriamente pela API FastAPI (via Admin SDK/Service Account), bloqueando acesso direto de clientes.
* **Decisão**: Substituímos o driver MongoDB (Motor) pelo Firestore AsyncClient (`AsyncClient` do pacote `google-cloud-firestore`). Criamos uma classe de abstração leve (`FirestoreDbClient` e `FirestoreCollection`) que replica a API de consultas assíncronas assinaladas por `await` do MongoDB.
* **Impacto**: Migração limpa do banco de dados sem alterar a assinatura dos controladores e rotas existentes do FastAPI.

## 2. Ordenação e Limitação em Memória (Bypass de Índices Compostos)
* **Contexto**: Consultas no Firestore que filtram por uma propriedade (ex: `owner_id`) e ordenam por outra (ex: `when` descendente) exigem a criação prévia de índices compostos, disparando erros de `FAILED_PRECONDITION` até que o índice seja ativado na nuvem.
* **Decisão**: Implementamos a ordenação (`results.sort()`) e limitação (`[:limit]`) em memória no wrapper Python, aplicando-a após recuperar o stream de documentos do Firestore.
* **Impacto**: Elimina o gargalo de provisionar índices compostos manuais no Firebase Console, permitindo que a suíte de testes de integração e o app funcionem imediatamente out-of-the-box em qualquer nova instância do Firestore.

## 3. Substituição do Serviço de Push para Firebase Cloud Messaging (FCM)
* **Contexto**: As notificações por push dependiam anteriormente da API proprietária do Emergent e da chave `EMERGENT_PUSH_KEY`. A migração para a suíte Google requer o uso de tecnologia independente (FCM).
* **Decisão**: Implementamos o FCM utilizando o módulo `firebase_admin.messaging`. A rota `/api/register-push` agora persiste os tokens dos aparelhos em uma coleção `device_tokens` no Firestore, e o helper `send_push` despacha as mensagens diretamente através dos servidores globais do Firebase Cloud Messaging.
* **Impacto**: Desacoplamento total dos serviços externos. Faturamento e infraestrutura unificados na nuvem da Google.

## 4. Gating de Credenciais de Desenvolvimento (Gatilho `__DEV__`)
* **Contexto**: O aplicativo Expo Go nativo requer um atalho para carregar e avaliar o fluxo sem ter de configurar certificados de assinatura do Google Sign-In localmente. Porém, embutir credenciais de teste fixas no bundle de produção representa um risco grave de segurança.
* **Decisão**: Enclausuramos a chamada de login do usuário demo (`signInWithEmailAndPassword`) dentro da verificação global `__DEV__`. Se o app for compilado em produção, a chamada levanta uma exceção indicando que o OAuth nativo deve ser utilizado.
* **Impacto**: Mantém o fluxo de teste ágil no simulador e Expo Go local sem comprometer a segurança da release de produção.

## 5. Autenticação Stateless por JWT no Backend
* **Contexto**: Anteriormente o backend mantinha tokens com controle de sessão.
* **Decisão**: Implementamos a validação stateless dos ID tokens de JWT do Firebase Auth. O backend decodifica o cabeçalho `Authorization: Bearer <TOKEN>` utilizando a assinatura pública do Firebase Admin SDK, sincronizando os dados do usuário a cada requisição.
* **Impacto**: Escalabilidade horizontal aprimorada no Cloud Run e compatibilidade com padrões modernos de segurança.

## 6. Transição para o Google GenAI (Gemini 2.5 Flash)
* **Contexto**: Os resumos semanais e OCR de recibos usavam modelos Claude (Anthropic) e GPT-4o (OpenAI).
* **Decisão**: Migramos as chamadas para o modelo multimodal **Gemini 2.5 Flash** utilizando o SDK oficial `google-genai` com autenticação via `GEMINI_API_KEY`. No OCR, passamos o parâmetro `response_mime_type="application/json"` para receber o JSON do recibo estruturado de forma nativa e livre de formatações markdown.
* **Impacto**: Economia expressiva de custo de inferência, latência reduzida e exclusão de dependências de terceiros.

## 7. Google Sign-In Nativo via Credencial Firebase (Fase 7)
* **Contexto**: Builds nativos de produção não tinham login funcional (o ramo nativo do `loginWithGoogle` só lançava erro fora de `__DEV__`). O backend confia exclusivamente no Firebase ID token (`onAuthStateChanged → getIdToken → /api/auth/me`), então o login nativo precisa terminar num usuário autenticado no Firebase — sem tocar o backend.
* **Alternativas avaliadas**:
  * *`expo-auth-session` (Google)*: 100% managed, roda em Expo Go, mas UX inferior (navegador em vez do seletor nativo de conta) e provider em depreciação. Descartada por fricção — usuário final é a família.
  * *`@react-native-firebase`*: substituiria o Firebase JS SDK inteiro; mudança de stack grande e desnecessária. Descartada.
  * *`@react-native-google-signin/google-signin` (16.1.2) + `signInWithCredential`* ✅ escolhida: seletor nativo de conta, lib recomendada pela doc do Expo, alinhada ao `PENDENCIAS.md` (SHA-1/Client IDs). O `idToken` do Google vira `GoogleAuthProvider.credential(idToken)` → `signInWithCredential(auth, cred)`.
* **Decisões de infra (aprovadas pelo fundador em 2026-07-17)**:
  * **Pipeline**: EAS Build (managed). Tier grátis; plano pago US$99/mês só se escalar — a acompanhar antes de virar custo recorrente.
  * **Identidade do app**: `bundleIdentifier`/`package` renomeados de `com.emergent.mamatoday.ew5nda` para `com.amparai.app` antes da 1ª publicação (mudar após publicar criaria app novo na store).
  * **Segredos**: `google-services.json` / `GoogleService-Info.plist` tratados como EAS Secret e adicionados ao `.gitignore` (nunca versionados), mesmo o Expo os considerando não sensíveis — postura conservadora coerente com os guarda-corpos de app de saúde.
* **Impacto / consequências**: O app **deixa de rodar em Expo Go** (passa a exigir development build). O fluxo **web** (`signInWithPopup`) e o **backend** permanecem intactos. O login demo (`signInWithEmailAndPassword`) fica apenas como fallback `__DEV__` quando o módulo nativo não está presente. `webClientId` (tipo Web) injetado via `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

## 8. Hospedagem do App Web no Firebase Hosting
* **Contexto**: O app web (export estático do Expo, `output: "single"`) não estava publicado em lugar nenhum — só rodava local. Para servir em `amparai.com.br` era preciso escolher um host.
* **Alternativas avaliadas**:
  * *Cloud Run (container estático)*: já usado no backend, mas overkill para SPA — mantém serviço rodando e exige gerir SSL/domínio e domínio autorizado do Auth manualmente. Descartada.
  * *Vercel/Netlify*: ótima DX, mas adiciona fornecedor fora da stack Google. Descartada por fragmentação.
  * *Firebase Hosting* ✅ escolhida: mesmo projeto `amparai-ce7f4`, SSL automático, CDN, tier grátis, e o domínio customizado entra automaticamente nos **domínios autorizados do Firebase Auth** (login web funciona sem passo extra).
* **Decisão**: `firebase.json` ganhou bloco `hosting` (`public: frontend/dist`, rewrites SPA → `/index.html`); criado `.firebaserc` (projeto default `amparai-ce7f4`) e script `export:web`. Domínio: **apex + www** (`amparai.com.br` e `www.amparai.com.br`), DNS no **Registro.br**.
* **Impacto**: Deploy do web com `expo export --platform web` + `firebase deploy --only hosting`. Sem custo recorrente relevante (tier grátis). Backend e mobile intocados.

## 9. Isolamento obrigatório de autenticação e testes locais
* **Contexto**: A suíte aceitava um bearer sintético em qualquer ambiente e usava o Cloud Run de produção como destino padrão, permitindo acesso indevido e escrita acidental em dados reais.
* **Alternativas avaliadas**: manter a flag única `AMPARAI_TEST_MODE` (mudança menor, mas vulnerável a erro de configuração); substituir autenticação por dependency override nos testes (isolamento melhor, refatoração maior); exigir simultaneamente modo de teste + Firestore Emulator e bloquear Cloud Run (escolhida para contenção imediata).
* **Decisão**: Bearers sintéticos só são reconhecidos quando `AMPARAI_TEST_MODE=1` e `FIRESTORE_EMULATOR_HOST` estão presentes. O backend falha ao iniciar com essas flags no Cloud Run. A suíte exige URL local explícita e falha antes da coleta em qualquer destino remoto.
* **Impacto**: Nenhum teste legado pode mais usar produção. A suíte de integração passa a depender obrigatoriamente do ambiente local isolado descrito em `GUIA_STAGING.md`.

## 10. Identidade confiável no cadastro de notificações
* **Contexto**: O endpoint de push era público e aceitava `user_id` arbitrário no corpo, permitindo sobrescrever o destino de notificações de outra conta.
* **Decisão**: O endpoint exige Firebase bearer válido e deriva o UID exclusivamente da identidade autenticada; o aplicativo não envia mais `user_id`.
* **Impacto**: Fecha o IDOR sem alterar o fluxo visível para a família. Evolução para múltiplos dispositivos por usuário permanece fora desta fase.

## 11. Evidência de contenção antes do piloto
* **Data**: 24/08/2026.
* **Decisão**: A contenção só foi considerada concluída após a suíte completa no Firestore Emulator (`50/50`), TypeScript e lint limpos, auditoria somente leitura da conta afetada e validação negativa na revisão Cloud Run `amparai-backend-00027-q8v`.
* **Evidência**: tokens sintéticos e cadastro de push sem autenticação retornam 401 em produção; nenhuma flag de teste/emulador está configurada; rota raiz responde 200.
* **Impacto**: A Fase 3 pode começar sobre uma base cuja barreira entre teste e produção foi demonstrada localmente e no serviço publicado.

## 12. RBAC v1 — Familiar colaborativo com financeiro fechado
* **Data**: 24/08/2026.
* **Contexto**: A proposta original da Fase 10 sugeria Familiar somente leitura; a decisão posterior do fundador definiu que dividir o cuidado exige permitir ações operacionais. Ao mesmo tempo, custos e notas são dados familiares sensíveis e a matriz jurídica exige minimização.
* **Alternativas avaliadas**: Familiar somente leitura (mais simples, enfraquece a promessa de colaboração); financeiro aberto para todos (menos fricção, expõe dados sem escolha); Familiar operacional com financeiro opt-in (escolhida, preserva colaboração e minimização).
* **Decisão**: Novos convites oferecem apenas o papel implementado `familiar`. Ele pode registrar cuidado operacional, não executa governança e só acessa custos quando o Coordenador concede a permissão explicitamente, desativada por padrão. Cuidador e Profissional ficam fora da UI até o RBAC v2.
* **Segurança do convite**: token aleatório de aproximadamente 128 bits, validade de 7 dias, uso único e resposta pública minimizada. Convite expirado ou aceito retorna indisponível sem revelar seus dados.
* **Impacto**: A interface deixa de prometer papéis inexistentes e cada convite descreve fielmente o acesso concedido.
* **Evidência de publicação**: revisão Cloud Run `amparai-backend-00028-r2s`; Firebase Hosting `amparai-app`; URLs oficial e `.web.app` respondendo 200.

## 13. CI sem credenciais de produção e observabilidade minimizada
* **Data**: 28/08/2026.
* **Contexto**: Publicações manuais sem gates permitiam regressões; dar acesso de deploy ao primeiro pipeline criaria uma superfície de produção antes de existir staging remoto.
* **Alternativas avaliadas**: CI com deploy direto (rápido, privilégio excessivo); apenas checks leves (barato, não prova integração); três gates isolados sem credenciais e deploy manual (escolhida).
* **Decisão**: GitHub Actions valida frontend, unidade/segurança/container e integração completa no Firestore Emulator. O projeto de teste usa prefixo `demo-`, os testes rejeitam URL remota e o workflow recebe apenas `contents: read`.
* **Observabilidade**: cada resposta recebe `X-Request-ID`; logs registram somente método, caminho, status e latência. Corpo, query string, token e conteúdo familiar não são registrados.
* **Trade-off**: publicação continua manual até staging remoto existir; em troca, o CI não possui qualquer autoridade sobre GCP/Firebase.
* **Evidência (29/08/2026)**: execução GitHub Actions `33285462353` aprovada nos três gates;
  integração com Java 21 e 52 testes, 5 testes unitários, invariantes de segurança, frontend
  e build Docker. O Firebase Admin usa `AnonymousCredentials` somente quando
  `FIRESTORE_EMULATOR_HOST` está definido; Cloud Run continua bloqueando essa configuração.
