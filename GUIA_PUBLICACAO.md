# Guia — Publicar landing + app (Firebase Hosting multi-site)

Arquitetura escolhida:
- **`amparai.com.br`** (apex) → **landing** (marketing + Política + Termos). Site: `amparai-ce7f4` (o default, onde o apex já está conectado).
- **`app.amparai.com.br`** → **web app** (Expo export). Site novo: `amparai-app`.

A parte de repo já está pronta (`firebase.json` multi-site, `.firebaserc` com os targets,
CTA da landing apontando para `app.amparai.com.br`). Abaixo, os passos de console/DNS/deploy.

---

## Passo 1 — Criar o site do app

Firebase Console → **Hosting** → **Adicionar outro site** → ID: `amparai-app`.
(A landing usa o site que já existe, `amparai-ce7f4`.)

## Passo 2 — Conferir o mapeamento dos targets

No `frontend/`... não — a partir da **raiz do repo**:

```bash
firebase target:apply hosting landing amparai-ce7f4
firebase target:apply hosting app amparai-app
```

(O `.firebaserc` já traz esse mapeamento; os comandos acima só garantem que o CLI local o
reconheça. Se reclamar que o site não existe, faça o Passo 1 primeiro.)

## Passo 3 — Build do web app e deploy dos dois sites

```bash
cd frontend && npm run export:web && cd ..
firebase deploy --only hosting:landing,hosting:app
```

- `hosting:landing` publica a pasta `landing/` no site `amparai-ce7f4` (→ apex).
- `hosting:app` publica `frontend/dist` no site `amparai-app`.

Teste nas URLs `.web.app` antes do domínio:
- landing: `https://amparai-ce7f4.web.app` (deve mostrar a landing + `/privacidade.html`).
- app: `https://amparai-app.web.app`.

## Passo 4 — Domínios customizados

No Console → Hosting:

- **Site `amparai-ce7f4`**: o domínio `amparai.com.br` já está (ou está sendo) conectado.
  Confirme que o status vira **Conectado** com SSL. (Se ainda não conectou, use os registros
  A/TXT que o Firebase mostrar — ver `GUIA_DOMINIO_WEB.md`.)
- **Site `amparai-app`**: **Adicionar domínio personalizado** → `app.amparai.com.br`.
  O Firebase dará um **CNAME** (ou registros A). No **Registro.br (Modo avançado)**, adicione:
  - **TIPO** CNAME · **NOME** `app.amparai.com.br` · **DADOS** = o alvo que o Firebase mostrar.

## Passo 5 — Domínios autorizados no Firebase Auth (login web)

Console → Authentication → Configurações → **Domínios autorizados**: confirme que constam
`amparai.com.br` e `app.amparai.com.br`. Sem isso, o login Google no web falha nesses domínios.

## Passo 6 — Verificação final

- [ ] `amparai.com.br` mostra a landing, com cadeado (SSL).
- [ ] `amparai.com.br/privacidade.html` e `/termos.html` abrem — **isso conserta os links de
  Política/Termos dentro do app**.
- [ ] `app.amparai.com.br` abre o web app, com SSL.
- [ ] Botão "Pedir acesso ao beta" na landing leva a `app.amparai.com.br`.
- [ ] Login Google funciona no web app pelo domínio próprio.

---

## Redeploy futuro

```bash
# só a landing (ex.: mudou um texto):
firebase deploy --only hosting:landing

# só o app:
cd frontend && npm run export:web && cd .. && firebase deploy --only hosting:app
```
