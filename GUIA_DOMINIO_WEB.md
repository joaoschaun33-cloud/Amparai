# Guia — Publicar o app web e apontar `amparai.com.br`

Passo a passo para publicar o app web (Expo) no **Firebase Hosting** e apontar o domínio
**`amparai.com.br` + `www.amparai.com.br`**, com DNS no **Registro.br**.

- **Projeto Firebase:** `amparai-ce7f4`
- **Host:** Firebase Hosting (`public: frontend/dist`, SPA rewrites) — já configurado no `firebase.json` e `.firebaserc`.
- **DNS:** Registro.br

> A parte de repo já está pronta. Aqui são os passos de build/deploy (seus) e de console/DNS.

---

## Passo 1 — Login e verificação do CLI

```bash
npm install -g firebase-tools
firebase login
firebase projects:list   # confirmar que amparai-ce7f4 aparece
```

---

## Passo 2 — Build do web

Gera o bundle estático em `frontend/dist`:

```bash
cd frontend
npm run export:web        # = expo export --platform web
```

Confirme que criou `frontend/dist/index.html`.

---

## Passo 3 — Primeiro deploy

Da **raiz do repositório** (onde está o `firebase.json`):

```bash
cd ..
firebase deploy --only hosting
```

No fim, o Firebase mostra a URL padrão (ex.: `https://amparai-ce7f4.web.app`). **Teste o
login "Entrar com Google" nessa URL primeiro** — se funcionar aqui, o domínio custom é só
DNS.

---

## Passo 4 — Adicionar o domínio customizado no Firebase

No **Console → Hosting → Adicionar domínio personalizado**:

1. Digite `amparai.com.br` → **Continuar**.
2. O Firebase pede uma **verificação** (registro **TXT**) e depois fornece **2 registros A**
   (dois IPs). Anote os dois.
3. Repita **Adicionar domínio** para `www.amparai.com.br` e escolha **redirecionar para
   `amparai.com.br`** (recomendado) — o Firebase dá um alvo para o `www`.

> Não feche essa tela — os valores exatos (TXT e IPs A) são gerados por domínio e você vai
> colá-los no Registro.br no próximo passo.

---

## Passo 5 — DNS no Registro.br

Acesse **registro.br → Painel → seu domínio → DNS (Editar Zona)**. Use a zona DNS do
próprio Registro.br (não delegue para outro provedor, a menos que já use).

**5a. Verificação (TXT):**
- Tipo `TXT`, nome `@` (ou vazio, = raiz), valor = o texto que o Firebase mostrou.
- Salve e volte ao Firebase → **Verificar**. Pode levar alguns minutos.

**5b. Apex `amparai.com.br` (registros A):**
- Dois registros `A`, nome `@`, apontando para cada IP que o Firebase forneceu.

**5c. `www` (CNAME ou A):**
- Se o Firebase deu um alvo CNAME para o `www`: registro `CNAME`, nome `www`, valor = alvo
  fornecido.
- Se o fluxo de `www` também pediu registros A: repita os A com nome `www`.

Propagação + emissão do certificado SSL pelo Firebase levam de minutos a ~24h. O status
fica visível no Console → Hosting até virar **"Conectado"** com SSL ativo.

---

## Passo 6 — Domínios autorizados no Firebase Auth (login web)

O Firebase costuma **adicionar sozinho** os domínios de Hosting aos autorizados. Confirme em
**Console → Authentication → Configurações → Domínios autorizados** que constam:
- `amparai.com.br`
- `www.amparai.com.br`

Se faltar algum, **adicione manualmente** — sem isso, o `signInWithPopup` do Google falha no
domínio próprio.

---

## Passo 7 — CORS do backend (⚠️ recomendado antes de produção)

Hoje o backend está com `allow_origins=["*"]` **e** `allow_credentials=True`
(`server.py:1310`). Essa combinação é contraditória pela spec de CORS e é permissiva demais
para um app de saúde. Como agora temos a origem definida, o correto é restringir:

```python
allow_origins=[
    "https://amparai.com.br",
    "https://www.amparai.com.br",
    "http://localhost:8081",   # Expo web dev
],
```

Requer editar `server.py`, rodar os testes e **re-deploy no Cloud Run**. As chamadas atuais
(token no header `Authorization`) continuam funcionando; isso é endurecimento de segurança,
não correção de quebra. *(Posso fazer essa mudança quando você autorizar.)*

---

## Passo 8 — Verificação final

- [ ] `https://amparai-ce7f4.web.app` carrega e o login Google funciona.
- [ ] `https://amparai.com.br` e `https://www.amparai.com.br` carregam com **cadeado (SSL)**.
- [ ] `www` redireciona para o apex.
- [ ] Login Google funciona no domínio próprio (domínios autorizados ok).
- [ ] (Recomendado) CORS restrito às origens reais e backend redeployado.

---

## Redeploys futuros do web

```bash
cd frontend && npm run export:web && cd .. && firebase deploy --only hosting
```
