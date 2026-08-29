# Especificação — Fase 10: Círculo de Cuidado (compartilhamento + RBAC)

> Proposta técnica e de produto. Baseada na matriz de acesso validada pelo advogado.
> **Status atualizado em 24/08/2026:** modelo `owner_id + memberships` implementado. A
> decisão posterior do fundador permite ao Familiar registrar ações operacionais; governança
> permanece exclusiva do Coordenador. Financeiro e notas continuam fechados por padrão.

---

## 1. Objetivo

Fazer a promessa central do Amparai virar realidade: **a família cuidando junto.** Hoje cada
usuário está sozinho na própria conta — o convite gera código, mas não há aceite e ninguém
compartilha nada. Esta fase liga as contas e aplica **quem vê o quê** por papel (RBAC),
respeitando o princípio da minimização (LGPD art. 6º, III).

## 2. Escopo — v1 e v2

**v1 (esta fase):** apenas **Coordenador** e **Familiar**. É o primeiro caso de uso real
(irmão convidando irmão) e a menor superfície de risco.

**v2 (depois):** **Cuidador** (profissional contratado) e **Profissional de saúde** — que têm
regras mais finas (ver matriz). Construímos a infraestrutura RBAC completa agora, mas só
entregamos os dois primeiros papéis.

## 3. Modelo de dados — como o compartilhamento funciona

Hoje tudo é escopado por `owner_id` (a uid do dono da conta). Duas formas de introduzir o
compartilhamento:

**Opção A — Entidade `household` (família) própria.** Todo dado passa a pertencer a um
`household_id`; usuários são membros do household com papel. Limpo e escalável, mas exige
**migrar** todo dado existente (adicionar `household_id`). Melhor a longo prazo.

**Opção B — `owner_id` continua sendo o "id da família" + coleção `memberships`** ✅ recomendada
para a v1. A uid do Coordenador **é** o id do household. Uma coleção `memberships` liga
`member_uid → owner_id (household) + papel + permissões`. Nenhuma migração de dado: as queries
continuam por `owner_id`, resolvido a partir da associação do usuário. Ships mais rápido e é
"household-shaped" o suficiente. (Migração para a Opção A fica trivial depois, se necessário.)

**Recomendação: Opção B.** Detalhe do registro de associação:

```
membership_id: string
household_owner_id: string   # a uid do Coordenador (a "família")
member_uid: string           # quem foi convidado
role: "coordenador" | "familiar"   # (v2: "cuidador" | "profissional")
can_see_financeiro: bool     # padrão FALSE (famílias brigam por dinheiro)
can_see_notas: bool          # padrão FALSE
created_at, invited_by
```

## 4. Fluxo convite → aceite (o endpoint que falta)

1. **Coordenador cria o convite** (`POST /invitations` — já existe) com `role` e as permissões
   (`can_see_financeiro`, `can_see_notas`, padrão fechado). Gera código de 8 caracteres.
2. **Convidado abre `/convite/[code]`** (rota pública já existe) → vê de qual família se trata
   e quem convidou → faz login com Google (ou já está logado).
3. **Aceite — NOVO endpoint `POST /invitations/{code}/accept`**: cria a `membership`
   (member_uid → household + papel + permissões), marca o convite como `accepted`, e vincula
   o usuário à família. Um código só pode ser aceito uma vez.

## 5. Resolução de contexto (o ponto delicado)

Quando um **Familiar** loga, o app não pode mandá-lo pro onboarding (ele não cria a própria
mãe — ele **entra** na família de alguém). Então, no login, o backend resolve:

- Tem household próprio (é dono de um elder)? → mostra a própria família.
- Tem `membership`? → mostra a família de que faz parte (o `household_owner_id`).
- Nenhum dos dois? → onboarding (cria a própria).

Isso muda o `require_user`/`onboarding_status` e o guard de rota do app. **Decisão v1:** um
usuário pertence a **uma** família por vez (own OU convidado). Múltiplas famílias (cuidar de
pai e mãe em contas distintas) fica como limitação de roadmap, coerente com o "um elder por
conta" do PRD.

## 6. Matriz de acesso (RBAC) — validada pelo advogado

| Domínio | Coordenador | Familiar |
|---|---|---|
| Clínico (ler) | ✅ CRUD | ✅ leitura |
| Rotina (remédios, saúde) | ✅ CRUD | ✅ leitura |
| Localização / SOS | ✅ | ✅ leitura |
| **Financeiro (custos)** | ✅ | ⚠️ leitura **só se o Coordenador habilitar** (padrão fechado) |
| **Notas livres** | ✅ | ⚠️ leitura **só se habilitado** (padrão fechado) |
| Convidar / atribuir papel / revogar | ✅ (exclusivo) | ❌ |

*(v2 — Cuidador: clínico essencial só-leitura + rotina leitura/escrita + localização; sem
financeiro nem notas. Profissional de saúde: clínico/rotina completo; sem localização, sem
financeiro, sem notas.)*

## 7. Enforcement — na camada de API

Autorização é aplicada **no backend** (D-005: clientes nunca falam com o Firestore; as regras
são deny-all). Padrão: um helper resolve `(household_owner_id, role, permissões)` do
requisitante e:

- rotas de **escrita** (PUT/POST/DELETE de dados) → só Coordenador (na v1).
- rotas de **leitura** → Coordenador e Familiar; `custos` e `notas` filtrados pela permissão.
- rotas de **gestão do círculo** (criar convite, revogar) → só Coordenador.

A matriz nasce como **configuração declarativa** (um mapa `papel → domínio → permissão`), não
`if` espalhado — é o que o advogado pediu e o que deixa o dataset limpo para o futuro.

## 8. Revogação

O Coordenador pode remover um membro → apaga a `membership`. Acesso cai na hora (a resolução
de contexto deixa de encontrar a associação). `DELETE /members/{id}` já existe para a lista;
passa a também remover a associação de acesso.

## 9. Fora de escopo (roadmap)

- Papéis **Cuidador** e **Profissional** (v2).
- Múltiplas famílias por usuário.
- Notificações ao círculo em eventos (já há push; a orquestração "avisar todos" é fase própria).
- Aviso/TTL da pulseira para terceiros (fase própria).

## 10. Decisões abertas para o fundador

1. **Modelo de dados**: confirma a **Opção B** (owner_id como household + memberships), sem
   migração agora?
2. **Um usuário = uma família na v1** (own ou convidado), múltiplas famílias no roadmap?
3. **Escrita só do Coordenador na v1** (Familiar é leitura), ou algum Familiar deve poder
   marcar "tomou remédio" / registrar evento? (Recomendo leitura pura na v1; escrita
   colaborativa é decisão de produto com implicação de responsabilidade.)
4. **Padrão fechado** para financeiro e notas (Familiar só vê se habilitado) — confirma?
