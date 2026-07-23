# Especificação — Fase 9: Consentimento e Base Legal

> Proposta técnica e de produto para o fluxo de consentimento de dados sensíveis do Amparai.
> Baseada no parecer do advogado (LGPD) e no `LGPD_INVENTARIO_DADOS.md`.
> **Status: proposta para aprovação do fundador. O texto final do termo deve ser revisado
> pelo advogado antes de ir a produção.**

---

## 1. Objetivo

Colocar uma **porta legal** antes da coleta de dados sensíveis de saúde: nenhum dado
clínico é coletado sem um consentimento válido e **provável** (ônus da prova do controlador,
Art. 8º §2º). Hoje o consentimento é teatro de checklist — esta fase o torna real.

## 2. Escopo — divisão em 9a e 9b

Divido a fase porque parte depende de infra que ainda não existe (Firebase Storage).

**Fase 9a (esta entrega — não depende de Storage):**
- Termo de consentimento versionado, em linguagem simples.
- Árvore de decisão: titular consente / não consente.
- Caminho **cuidador de fato** (declaração por checkbox — sem upload).
- **Logs imutáveis** de consentimento (timestamp, IP, user_id, versão do termo, ação, método).
- **Revogação** por botão.
- **Enforcement**: coleta clínica bloqueada sem consentimento válido.

**Fase 9b (posterior — exige Firebase Storage com regras de LGPD):**
- Upload do **Termo de Curatela** (caminho curatela).
- **Prova por selfie/áudio** como reforço opcional do consentimento do titular.
- Bucket em `southamerica-east1`, não indexado, nunca exibido no app, retenção de 5 anos,
  download só por administrador (conforme parecer).

> A divisão é honesta: o caminho **cuidador de fato** (a maioria das famílias) e o
> **titular que toca "Eu autorizo" no app** funcionam 100% na 9a. Só os anexos ficam pra 9b.

## 3. Princípios legais (do parecer)

- Consentimento **livre, informado e inequívoco** (Art. 8º).
- **Ônus da prova** é do Amparai (Art. 8º §2º) → por isso os logs.
- **Revogação tão fácil quanto o consentimento** (um botão).
- **Bases distintas por funcionalidade**: consentimento para o app; **proteção da vida**
  (Art. 11, II, "e") só para SOS e pulseira.
- Sem representante formal → **declaração de cuidador de fato** (documenta boa-fé; **não**
  afasta a responsabilidade do Amparai como controlador perante a ANPD).

## 4. Modelo de dados — coleção `consents` (log imutável)

Cada evento é uma **linha nova** (nunca sobrescrever). Revogação é um novo registro.

```
consent_id:    string
owner_id:      string        # usuário que consentiu (dono da conta)
elder_id:      string
term_version:  string        # ex.: "1.0" — versão exata do termo aceito
action:        "accept" | "revoke"
method:        "titular" | "curatela" | "cuidador_de_fato"
declarations:  [string]      # textos dos checkboxes aceitos (caminho cuidador de fato)
ip:            string        # X-Forwarded-For (Cloud Run)
user_agent:    string
created_at:    timestamp
# 9b: proof_ref (path no Storage do termo de curatela / selfie / áudio)
```

O "estado atual" do consentimento = o registro `accept` mais recente sem `revoke`
posterior, **com `term_version` igual à versão vigente** (se o termo mudar, pede de novo).

## 5. Endpoints (backend)

| Método | Rota | Função |
|---|---|---|
| GET | `/api/consent/term` | Retorna o termo vigente (versão + texto) |
| GET | `/api/consent/status` | `{ consented: bool, method, term_version, at }` |
| POST | `/api/consent` | Grava aceite (method, declarations); captura IP/UA no servidor |
| POST | `/api/consent/revoke` | Grava revogação |

- `CONSENT_TERM_VERSION` = constante no servidor. O texto do termo mora no backend (não no
  cliente) para garantir que a versão registrada é a que foi realmente exibida.
- IP: ler de `X-Forwarded-For` (o Cloud Run põe o IP real do cliente ali).
- `onboarding_status.steps.consent` passa a ler de `/consent/status` (não mais de
  `elder.consent_given`). Mantém a chave `consent` — não quebra o contrato dos testes.

## 6. Enforcement (a parte que tem dente jurídico)

- `PUT /api/clinico` **rejeita com 403** se não houver consentimento válido.
- Mesma trava para qualquer coleta sensível futura.
- **Conta de teste/demo**: o seed passa a criar um registro de consentimento válido, para a
  suíte continuar verde. (Mesmo padrão do gating que já usamos.)

## 7. Fluxo / telas

O item "consentimento" no checklist do Hoje passa a abrir uma tela real:

```
1. TERMO (scroll) — linguagem simples: o que coletamos, pra quê, quem vê, como revogar.
2. "A [Nome] tem condições de dar esse consentimento agora?"
   ├─ SIM  → caminho TITULAR
   │         9a: botão "Eu autorizo" no próprio app (toque registrado).
   │         9b: opção de reforço por link no celular dela / selfie / áudio.
   └─ NÃO  → "Você possui Termo de Curatela?"
             ├─ SIM → caminho CURATELA
             │        9a: registra a intenção; 9b: anexa o documento.
             └─ NÃO → caminho CUIDADOR DE FATO
                      Checkbox duplo (texto do advogado), depois registra.
3. Grava o log e libera a coleta clínica.
```

**Texto dos checkboxes (cuidador de fato) — versão do advogado:**
> "Declaro ser o responsável de fato por [Nome] e autorizo o uso do Amparai para a
> organização de seu cuidado. Assumo integral responsabilidade legal por esta declaração
> perante o aplicativo e terceiros, isentando o Amparai de quaisquer litígios familiares
> decorrentes do uso e compartilhamento destes dados na plataforma."

## 8. Estrutura do termo (rascunho — texto final ao advogado)

Em linguagem "melhor amiga enfermeira", curto, sem juridiquês, cobrindo:
1. **O que guardamos** — dados de saúde e rotina da pessoa cuidada.
2. **Para quê** — organizar o cuidado da família; nunca vender, nunca usar para publicidade.
3. **Quem vê** — só quem a família convidar, conforme o papel (quando o círculo existir).
4. **Onde fica** — servidores no Brasil, criptografado.
5. **Emergência** — em risco de vida, dados essenciais podem ser usados para proteger a
   pessoa (base: proteção da vida).
6. **Seus direitos** — ver, corrigir, exportar e **apagar**; revogar a qualquer momento.

## 9. Decisões abertas para o fundador

1. **Escopo**: confirmar a divisão 9a/9b (anexos de curatela/selfie/áudio ficam para 9b,
   quando montarmos o Storage)?
2. **Caminho titular na 9a**: começar com o toque "Eu autorizo" no próprio app, e deixar o
   link-no-celular-dela para 9b? (Recomendo — menos fricção pra validar o fluxo.)
3. **Enforcement**: bloquear a coleta clínica sem consentimento é o correto — confirma que
   podemos seedar um consentimento para a conta de teste manter a suíte verde?
4. **Revisão do termo**: o texto final do termo (seção 8) vai ao advogado antes do deploy?

## 10. Fora de escopo desta fase (roadmap)

- Aviso + TTL de 30 dias para o **terceiro que escaneia a pulseira** (base: legítimo
  interesse / proteção da vida) — fase própria, junto do endurecimento da rota pública.
- Matriz de acesso por papel (Fase 10 — Círculo).
