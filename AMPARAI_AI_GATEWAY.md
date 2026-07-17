# Spec — Gateway de IA do Amparai (fallback multi-provedor)
> Para a IA executora. Decisão D-006. Motor: **LiteLLM** (módulo Python no FastAPI; não subir proxy separado no piloto).
> Princípio: o gateway é infraestrutura invisível — nenhuma tarefa de produto depende de UM provedor, e nenhuma falha de provedor chega crua na família.

## 0. Chaves disponíveis (no `.env` da raiz — nomes já padronizados)
- `XAI_API_KEY` — Grok (xAI) ✅
- `GROQ_API_KEY` — Groq: inferência rápida de Llama e **Whisper** (transcrição) ✅
- `GEMINI_API_KEY` — Gemini ✅
- `ANTHROPIC_API_KEY` — Claude ⏳ pendente (criar em console.anthropic.com); até lá, as cadeias abaixo usam a ordem "sem Claude"
- `HF_TOKEN` — Hugging Face, opcional (reserva de transcrição/embeddings)

## 1. Arquitetura
- Módulo `backend/ai_gateway/` com uma função pública única: `run_task(task_name, payload) -> AIResult`.
- Cada tarefa tem: cadeia de modelos (ordem de fallback), timeout, temperatura, prompt de sistema versionado (`ai_gateway/prompts/`), validador de saída e **fallback terminal determinístico**.
- LiteLLM configurado via `ai_gateway/config.yaml` — trocar ordem/modelo é editar config, nunca código de produto.
- Local: chaves no `.env` (já no .gitignore). Produção: Secret Manager (Fase 4 da migração).

## 2. Filas por tarefa
| task_name | Cadeia com Claude (alvo) | Cadeia atual (sem Claude) | Timeout | Fallback terminal (obrigatório) |
|---|---|---|---|---|
| `resumo_semanal` | claude-sonnet → gemini-pro → grok | gemini-pro → grok → llama-3.3-70b (Groq) | 30s | texto empático estático do PRD |
| `fraseio_alerta` | claude-sonnet → gemini-pro | gemini-pro → grok | 10s | template fixo do alerta |
| `classificar_confirmacao` | gemini-flash → claude-haiku → llama (Groq) | gemini-flash → llama-3.1-8b (Groq) → grok-mini | 5s | marcar "não confirmado" + notificar cuidador |
| `transcrever_audio` | whisper-large-v3-turbo (Groq) → gemini | idem | 20s | pedir confirmação por texto/botão |
| `ocr_recibo` | gemini-vision → grok-vision | idem | 20s | formulário manual pré-aberto |

Regras das cadeias:
- Fallback dispara em: erro, timeout, rate-limit, ou **validador reprovando a saída** (não só falha de rede).
- Alertas críticos (emergência, medicação): a DECISÃO é sempre regra determinística; o LLM apenas escreve a frase. Se o fraseio falhar, template fixo. Nunca inverter.
- Fallback terminal nunca é outro LLM: é texto/ação nossa, segura, escrita por humano.

## 3. Validadores de saída (por tarefa)
- `resumo_semanal` / `fraseio_alerta`: PT-BR; sem vocabulário proibido ("o idoso", "paciente", "monitorar", "rastrear", "ALERTA", nomes de doenças, diagnóstico); tamanho no limite. Reprovou → próximo da cadeia.
- `classificar_confirmacao`: saída ∈ {confirmou, nao_confirmou, incerto}. Qualquer outra coisa = incerto.
- `transcrever_audio`: texto não vazio; confiança baixa → tratar como incerto.
- `ocr_recibo`: valor > 0, data plausível, categoria do enum.

## 4. Custo e observabilidade
- Logar TODA chamada em `ai_calls`: task, modelo, posição na cadeia, tokens, custo estimado, latência, aprovado/reprovado, circleId (sem conteúdo sensível).
- Métrica-guia: **custo de IA por família/mês ≤ R$ 2,00**. Alertar se a projeção passar.
- Budget duro no LiteLLM por chave; estourou → só `classificar_confirmacao` e `fraseio_alerta` seguem, resto cai no fallback terminal.

## 5. Privacidade
- Nunca enviar aos provedores: nome completo, telefone, endereço, CPF. Primeiro nome/apelido + IDs internos.
- Ativar opt-out de treinamento em cada provedor; documentar no mapeamento LGPD o que sai do país.

## 6. Critérios de aceite
1. Testes com provedor mockado: derrubar o 1º → 2º assume; derrubar todos → fallback terminal, NUNCA erro 500 no app.
2. Validador rejeita palavra proibida e cai para o próximo modelo (teste automatizado).
3. `ai_calls` com custo real em 100% das chamadas.
4. Benchmark: 20 exemplos reais de `resumo_semanal` em PT-BR nos provedores disponíveis; anexar comparação — a ordem final é decisão do fundador.
