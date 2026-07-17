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
