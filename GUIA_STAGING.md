# Guia de Staging — Ambiente de Teste Local (Firestore Emulator)

> **Objetivo:** parar de testar contra produção. Este guia sobe um ambiente 100% isolado,
> grátis e offline, onde a suíte inteira — incluindo o **fluxo Familiar** — roda sem tocar
> em nenhum dado real. Nada aqui é setado no Cloud Run.

## Por que este ambiente

Hoje a suíte de integração bate na URL de produção usando um token de teste hardcoded
(`test_bearer_token_abc`). Isso funciona, mas: (1) polui o Firestore real com estado de
teste; (2) exige internet e o serviço de pé; (3) mantém um backdoor permanente em prod.

O emulador resolve os três: um Firestore em memória na sua máquina, o backend apontado
para ele, e os tokens de teste liberados **só** neste modo.

## Visão geral

```
pytest  ──▶  FastAPI local (uvicorn)  ──▶  Firestore Emulator (localhost:8080)
             AMPARAI_TEST_MODE=1            (em memória, some ao desligar)
             FIRESTORE_EMULATOR_HOST=…
```

Duas identidades de teste convivem neste modo:

| Token | uid | e-mail | Papel |
|---|---|---|---|
| `test_bearer_token_abc` | `user_test123` | test@amparai.com.br | Coordenadora (household semeado) |
| `test_bearer_token_fam` | `user_testfam456` | familiar.test@amparai.com.br | Familiar (entra por convite) |

> Os dois tokens só existem quando `AMPARAI_TEST_MODE=1` **e** `FIRESTORE_EMULATOR_HOST`
> estão definidos. O backend falha ao iniciar se essas variáveis aparecerem no Cloud Run.

## Pré-requisitos

- **Node.js 18+** (para o `firebase-tools`).
- **Java 21+** (exigido pelo `firebase-tools` atual para iniciar o Firestore Emulator).
- **Python 3.10+** com as dependências do backend.

## Passo 1 — Adicionar o bloco `emulators` ao `firebase.json`

Inclua (uma vez) dentro do objeto raiz do `firebase.json`:

```json
  "emulators": {
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 }
  }
```

## Passo 2 — Instalar o firebase-tools

```bash
npm install -g firebase-tools
firebase --version   # confirma a instalação
```

## Passo 3 — Instalar as dependências do backend

```bash
cd backend
pip install -r requirements.txt
pip install pytest requests           # ferramentas da suíte
```

## Passo 4 — Rodar tudo (script único)

O emulador e o backend precisam ficar de pé enquanto o `pytest` roda. O script abaixo
sobe os dois em background, roda a suíte e derruba tudo no fim. Rode a partir da **raiz** do repo:

```bash
#!/usr/bin/env bash
set -e
export GOOGLE_CLOUD_PROJECT=amparai-ce7f4
export FIRESTORE_EMULATOR_HOST=localhost:8080
export AMPARAI_TEST_MODE=1
export EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# 1) Emulador do Firestore (usa demo- prefix p/ garantir que é projeto de teste)
firebase emulators:start --only firestore --project demo-amparai &
EMU_PID=$!
sleep 8   # espera a JVM subir

# 2) Backend local (sem service-account-key.json → init emulator-aware)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000 &
API_PID=$!
sleep 5

# 3) Suíte completa
python3 -m pytest tests/ -v

# 4) Encerrar
kill $API_PID $EMU_PID
```

> **Importante:** quando `FIRESTORE_EMULATOR_HOST` está definido, o backend prioriza o
> emulador e não carrega `backend/service-account-key.json`, mesmo que o arquivo exista.

## O que os testes do fluxo Familiar provam

Arquivo: `backend/tests/test_amparai_familiar.py`. Eles cristalizam a regra do produto —
o Amparai é para **dividir** o cuidado:

- **Entra por convite:** a coordenadora cria o convite, a Familiar aceita, o acesso liga.
  O convite é de uso único (segunda tentativa → 409).
- **Enxerga o household:** a Familiar vê a pessoa cuidada e a rotina, não um app vazio.
- **Registra cuidado (operacional, PODE):** marcar remédio tomado e lançar evento de saúde.
- **Não gere a estrutura (governança, 403):** editar prontuário, convidar gente, editar
  o cadastro da pessoa cuidada.

Setup e teardown são idempotentes (a Familiar sai do círculo no fim), então a suíte pode
rodar repetidamente sem sujar estado.

## Proteção contra execução em produção

A suíte não possui URL remota padrão. A coleta falha imediatamente se a URL não for local,
se o modo de teste estiver desligado ou se o Firestore Emulator não estiver configurado.
Assim, um comando incompleto não pode cair silenciosamente no Cloud Run de produção.

## Segurança (invariantes)

- `AMPARAI_TEST_MODE` **nunca** é setado no Cloud Run — validar no deploy.
- `FIRESTORE_EMULATOR_HOST` **nunca** em produção — o init emulator-aware só muda o
  comportamento quando essa variável existe.
- O emulador é em memória: nenhum dado de teste sobrevive ao desligamento.

## Uso no CI

O workflow oficial usa `scripts/run_backend_integration.sh` dentro de
`firebase emulators:exec`. O script aguarda `/api/health`, executa a suíte e sempre encerra
o backend, inclusive quando um teste falha. Ver `GUIA_CI.md`.
