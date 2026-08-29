# Guia de CI — proteção de release

O workflow `.github/workflows/ci.yml` roda em todo pull request e em cada push para `main`.
Ele não possui credenciais de produção e não faz deploy.

## Gates obrigatórios

1. **Frontend** — instalação reproduzível, TypeScript, lint e export web.
2. **Backend unitário e segurança** — dependências Python 3.11, compilação, testes unitários,
   invariantes de segredos/produção e build do contêiner.
3. **Backend integração** — Java 21 + Firestore Emulator em projeto `demo-amparai`, backend
   local e toda a suíte HTTP. Nenhuma URL remota é aceita pelos testes.

## Proteção recomendada da branch `main`

No GitHub, habilitar a regra para exigir pull request e os três checks antes do merge:

- `frontend`
- `backend-unit-and-security`
- `backend-integration`

Até essa regra ser habilitada, o workflow detecta regressões, mas um administrador ainda
consegue enviar código diretamente para `main`.

## Execução local equivalente

Com Firestore Emulator já iniciado no projeto `demo-amparai`:

```bash
bash scripts/run_backend_integration.sh
```

Outros gates:

```bash
python scripts/security_checks.py
PYTHONPATH=backend python -m pytest backend/tests_unit -q
cd frontend && npm ci && npx tsc --noEmit && npm run lint && npm run export:web
docker build --tag amparai-backend:ci backend
```

## Publicação

Deploy continua manual. Esta separação é intencional: CI tem acesso somente ao código e não
recebe permissões do GCP/Firebase enquanto não existir staging remoto com promoção controlada.
