# Guia — Fase 7: Build nativo com Google Sign-In (EAS)

Passo a passo para gerar o app de desenvolvimento e validar o "Entrar com Google" no
aparelho físico. O **código já está pronto e commitado**; aqui estão só os passos de
console/build, que dependem das suas contas (Firebase, Expo/EAS).

- **Projeto Firebase:** `amparai-ce7f4`
- **App ID (novo):** `com.amparai.app` (iOS e Android)
- **Web Client ID (já configurado no `.env`):** `750186946997-5r2iek8ptqies7h4ss63rr8fj53i8kgq.apps.googleusercontent.com`

> Ordem importa. Faça na sequência. O erro mais comum (`DEVELOPER_ERROR` no Android) é
> quase sempre SHA-1 ausente ou errado — o Passo 3 existe pra evitar isso.

---

## Pré-requisitos

- Conta na Expo (https://expo.dev) — a mesma que será dona do app.
- Node/npm instalados (o projeto agora usa **npm**; um lockfile só).
- EAS CLI:

```bash
npm install -g eas-cli
eas login
```

---

## Passo 1 — Linkar o projeto ao EAS

Dentro de `frontend/`:

```bash
cd frontend
eas init
```

Isso cria o projeto no seu painel Expo e grava o `projectId` em `app.json`
(`expo.extra.eas.projectId`). O `eas.json` (perfil `development`) já está no repo.

---

## Passo 2 — Registrar os apps no Firebase

No **Console do Firebase → projeto `amparai-ce7f4` → Configurações do projeto → Seus apps**:

1. **Adicionar app → Android**
   - *Nome do pacote Android:* `com.amparai.app`
   - Apelido: `Amparai Android`
2. **Adicionar app → iOS**
   - *ID do pacote (Bundle ID):* `com.amparai.app`
   - Apelido: `Amparai iOS`

> O app antigo `com.emergent.mamatoday.ew5nda` fica órfão — pode ignorar ou remover depois.
> O app **Web** existente (usado pelo login web) permanece intocado.

Ainda **não** baixe os arquivos de config — primeiro o SHA-1 (Passo 3), senão o
`google-services.json` sai sem o fingerprint e o login Android falha.

---

## Passo 3 — SHA-1 do certificado (crítico para o Android)

O Google Sign-In no Android valida a assinatura do app. O SHA-1 vem do keystore que a
EAS gera. Rode:

```bash
eas credentials
```

- Escolha **Android** → o perfil **development** → **Keystore**.
- Copie o **SHA-1 Fingerprint** exibido.

No **Firebase → Seus apps → app Android (`com.amparai.app`) → Adicionar impressão digital**,
cole o SHA-1 e salve.

> Quando o app for para a Play Store, adicione **também** o SHA-1 do **Play App Signing**
> (Play Console → Release → Setup → App Integrity). São dois SHA-1 diferentes; os dois
> precisam estar no Firebase.

---

## Passo 4 — Baixar os arquivos de configuração

Agora sim, no Firebase:

- App Android → baixe **`google-services.json`**
- App iOS → baixe **`GoogleService-Info.plist`**

Coloque os dois em `frontend/`. Eles **já estão no `.gitignore`** e **não serão
commitados** (decisão registrada em `DECISOES_TECNICAS.md` §7).

---

## Passo 5 — Disponibilizar os arquivos para o EAS Build

⚠️ **Ponto que engana:** o EAS Build **não sobe arquivos que estão no `.gitignore`**.
Como decidimos manter os `google-services` fora do git, é preciso entregá-los ao build
por outro caminho. Recomendado: **EAS Environment Variables do tipo File (Secret)**.

**5a. Criar as variáveis de arquivo:**

```bash
eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment development --visibility secret
eas env:create --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist --environment development --visibility secret
```

**5b. Fazer o app config ler esses caminhos.** O EAS materializa cada arquivo num caminho
no runner e expõe via `process.env`. Para isso, o config precisa ser dinâmico —
crie `frontend/app.config.js` que estende o `app.json`:

```js
// frontend/app.config.js
import appJson from './app.json';

export default ({ config }) => {
  const base = appJson.expo;
  return {
    ...config,
    ...base,
    android: {
      ...base.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? base.android.googleServicesFile,
    },
    ios: {
      ...base.ios,
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? base.ios.googleServicesFile,
    },
  };
};
```

Localmente (sem as env vars do EAS) ele usa o `./google-services.json` que está em
`frontend/`; no build da nuvem, usa o arquivo injetado pelo Secret. Melhor dos dois mundos.

> **Alternativa mais rápida (menos segura):** criar um `frontend/.easignore` que **não**
> liste os `google-services`, fazendo o EAS subir esses arquivos mesmo estando no
> `.gitignore`. Funciona para um primeiro smoke-test, mas expõe os arquivos no tarball do
> build; prefira o método 5a/5b acima.

---

## Passo 6 — Gerar o build de desenvolvimento

Comece pelo Android (mais rápido de validar):

```bash
cd frontend
eas build --profile development --platform android
```

Ao final, o EAS entrega um link/QR para baixar o **APK**. (Para iOS: `--platform ios` —
exige device registrado no perfil de provisionamento; deixe para depois do Android ok.)

---

## Passo 7 — Instalar e validar (critério de aceite)

1. Instale o APK no aparelho real.
2. Abra o app → toque em **"Entrar com Google"**.
3. Deve abrir o **seletor nativo de conta** do Google.
4. Escolha a conta → o app gera a credencial, autentica no Firebase e o
   `onAuthStateChanged` chama `/api/auth/me`.

**Aceite = todos verdadeiros:**
- Seletor nativo apareceu (não navegador).
- Login concluiu sem erro.
- Tela principal carregou com os dados do usuário (`/api/auth/me` → 200).
- Push registrou (`/api/register-push` gravou o token).

**Evidência a me mandar:** vídeo/print do fluxo no device + trecho do log do backend
mostrando o `/api/auth/me` 200.

---

## Troubleshooting (erros comuns)

| Sintoma | Causa provável | Correção |
|---|---|---|
| `DEVELOPER_ERROR` no Android | SHA-1 ausente/errado no Firebase, ou `google-services.json` desatualizado | Refazer Passos 3–4 (baixar o JSON **depois** de cadastrar o SHA-1) |
| `idToken` volta `null` | `webClientId` errado (precisa ser o tipo **Web**, não Android/iOS) | Conferir `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` no `.env` |
| Login abre navegador em vez do seletor nativo | Rodando em Expo Go (sem módulo nativo) | Usar o **development build**, não Expo Go |
| Build falha por falta de `google-services.json` | Arquivo gitignored não chegou ao EAS | Fazer o Passo 5 (EAS File Secret) |
| iOS não abre o seletor | URL scheme ausente | Confirmar `GoogleService-Info.plist` presente; o config plugin cuida do scheme |

---

## Checklist final

- [ ] `eas login` e `eas init` (projectId no `app.json`)
- [ ] Apps Android e iOS criados no Firebase com `com.amparai.app`
- [ ] SHA-1 (keystore EAS) cadastrado no Firebase Android
- [ ] `google-services.json` e `GoogleService-Info.plist` em `frontend/` (gitignored)
- [ ] EAS File Secrets criados + `app.config.js` lendo os caminhos
- [ ] `eas build --profile development --platform android` verde
- [ ] Login validado no device + evidência coletada
