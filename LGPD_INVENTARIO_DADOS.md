# Amparai — Inventário de Dados e Matriz de Acesso (para análise jurídica)

> Documento técnico preparado para consulta de LGPD. Descreve **o que o sistema
> efetivamente processa hoje** (verificado no código, não no plano de produto) e o que
> está previsto no roadmap. Data: 21/07/2026.

**Controlador:** Amparai
**Natureza:** aplicativo de organização do cuidado familiar de pessoa idosa. **Não é
serviço de saúde e não é operado por profissionais de saúde** (relevante para o art. 11, II, "f").
**Titulares envolvidos:** (1) a pessoa idosa cuidada; (2) os familiares/cuidadores usuários;
(3) terceiros eventuais (quem escaneia a pulseira).
**Infraestrutura:** Google Cloud — Cloud Run e Firestore na região `southamerica-east1` (São Paulo).

---

## 1. Dados da pessoa idosa (titular hipervulnerável)

### 1.1 Dados sensíveis de saúde — módulo Clínico (`GET/PUT /api/clinico`)
| Dado | Observação |
|---|---|
| Tipo sanguíneo | Sensível (saúde) |
| Alergias | Sensível (saúde) |
| Condições de saúde | Sensível (saúde) |
| Medicações de uso contínuo | Sensível (saúde) |
| Cirurgias | Sensível (saúde) |
| Plano de saúde | Sensível (saúde) |
| Mobilidade | Sensível (saúde) |
| Estado cognitivo | Sensível — e é o próprio dado que define a capacidade de consentir |
| Notas livres | Campo aberto: risco de conter qualquer coisa |
| Contatos de emergência | Dado pessoal de terceiros (familiares) |

### 1.2 Rotina de saúde
- **Medicações do dia e marcação de "tomou"** (`/api/hoje`, `POST /api/medications/{id}/toggle`).
- **Linha do tempo de saúde** (`/api/saude`): eventos como aferição de pressão, com
  `source: whatsapp_audio` (áudio de cuidador transcrito).
- **Consultas/compromissos** previstos na tela Hoje.

### 1.3 Localização
- Pings de geolocalização da pessoa idosa.
- Última localização conhecida no acionamento do **SOS** (`POST /api/sos`).
- Localização registrada quando alguém escaneia a **pulseira**.

### 1.4 Imagem
- Foto da pessoa idosa (`photo_url`) — inclusive exposta na rota pública da pulseira.

### 1.5 Financeiro com reflexo em saúde
- Despesas e **recibos médicos** (`/api/custos`, `POST /api/expenses`): valor, categoria
  (Medicamentos, Consultas, Cuidadora…) e **foto do recibo**. Recibo médico revela saúde.

---

## 2. Dados de terceiros (pessoas sem conta no app)

**`POST /api/pulseira/{elder_id}/scan`** — quem encontra a pessoa idosa na rua e escaneia o QR
tem gravados: **nome, telefone, observação livre e localização**.
Esse terceiro não possui conta, não aceitou termo e não é informado do tratamento.
👉 *Ponto que precisa de base legal e aviso próprios.*

---

## 3. Quem tem acesso — situação REAL hoje (verificada no código)

| Superfície | Quem acessa | O que vê |
|---|---|---|
| **Rota pública da pulseira** `GET /api/pulseira/{id}` | **Qualquer pessoa**, sem login, com o link/QR | Primeiro nome, **foto** e **contatos de emergência** |
| Todo o restante (clínico, saúde, custos, escala, SOS) | **Somente o usuário dono da conta** (`owner_id`) | Tudo |
| Círculo de cuidado (irmãos, cuidadores, profissionais) | **Ninguém — não implementado** | Nada |

**Detalhamento importante:**

1. **A rota da pulseira já foi minimizada.** Uma correção anterior (D-004) removeu tipo
   sanguíneo, alergias e condições do retorno público. Hoje devolve apenas primeiro nome,
   foto e contatos de emergência. Ainda assim: é **foto e nome de pessoa vulnerável +
   telefones de familiares, sem autenticação**, protegidos apenas pelo caráter não-óbvio do
   `elder_id`.

2. **O compartilhamento familiar NÃO existe.** `POST /api/invitations` gera um código e
   `GET /api/invitations/{code}` o consulta, mas **não há endpoint de aceite**: o campo
   `accepted` nunca é alterado e nenhum usuário é vinculado à família de outro. Os papéis
   (`coordenador`, `irmao`, `cuidador`, `profissional`) são **rótulos sem efeito de
   permissão**. Na prática, hoje **só o dono da conta vê os dados**.

3. **Consequência jurídica:** a pergunta "quem além do cuidador principal tem acesso" tem,
   hoje, a resposta "ninguém". Ela se torna crítica **no momento em que implementarmos o
   compartilhamento** — que é uma pendência de roadmap.

---

## 4. Compartilhamento com terceiros / operadores

| Destino | O que sai | Observação |
|---|---|---|
| **Google Gemini** (`/api/summary/weekly`) | Contexto da rotina de cuidado para gerar o resumo semanal | Processamento por IA de terceiro; regra interna manda **nunca enviar identificação completa** — precisa ser auditado |
| **Google Gemini** (`/api/ocr/receipt`) | **Imagem do recibo médico** | Documento de saúde enviado a terceiro |
| **WhatsApp** (deep-link `wa.me`) | Mensagem de cobrança gentil entre familiares | Sem API Meta; dado sai pelo app de mensagens do usuário |
| **Firebase Cloud Messaging** | Token do aparelho + título/corpo da notificação | Conteúdo da notificação não deve revelar saúde |

⚠️ **Transferência internacional:** Cloud Run e Firestore estão em São Paulo, mas o
processamento pelo Gemini ocorre fora do país. Precisa de base e salvaguarda próprias.

---

## 5. O que ainda NÃO existe (roadmap) e já precisa de desenho jurídico

- **Consentimento de fato**: não há tela de consentimento. O item do checklist
  "Registrar o consentimento" apenas navega para a tela clínica (`hoje.tsx:144`).
  O campo `consent_given` existe no backend, mas nada o coleta adequadamente.
- **Compartilhamento com o círculo** e permissões por papel.
- **Armazenamento de exames e documentos de consulta** (upload de PDFs/imagens).
- **Registro de logs de consentimento** (timestamp, IP, versão do termo, ação).
- **Revogação do consentimento** pelo app.
- **Política de retenção e eliminação** de dados.

---

## 6. Perguntas objetivas ao advogado

1. **Base legal do produto como um todo**: dado que não somos serviço de saúde (art. 11,
   II, "f" é frágil para nós), confirmamos que a base é **consentimento** do titular ou do
   representante legal, com a "proteção da vida" (art. 11, II, "e") sustentando apenas as
   funções de emergência (SOS e pulseira)? Podemos operar com **bases distintas por
   funcionalidade**?

2. **Declaração do cuidador de fato**: a modelagem proposta (declaração + assunção de
   responsabilidade civil) documenta boa-fé, mas entendemos que **não transfere a
   responsabilidade do Amparai como controlador** perante a ANPD. Correto? Qual o texto que
   maximiza a proteção sem criar falsa sensação de imunidade?

3. **Prova de consentimento por selfie/áudio**: a evidência sugerida (foto do idoso segurando
   a tela, ou áudio autorizando) é **ela própria dado pessoal sensível/biométrico**. Qual a
   base legal e o prazo de retenção adequados para essa evidência?

4. **Terceiro que escaneia a pulseira**: qual base legal e qual aviso mínimo devemos exibir
   antes de coletar nome, telefone e localização de quem socorre?

5. **Exposição pública da pulseira**: manter foto + primeiro nome + contatos de emergência em
   rota sem autenticação é aceitável sob "proteção da vida"? Recomenda alguma proteção
   adicional (token rotativo, expiração, exibição parcial)?

6. **Uso de IA (Gemini)**: quais salvaguardas e quais informações no termo são obrigatórias
   para o processamento por IA e a transferência internacional?

7. **Documentos de exames**: exigências específicas de retenção, criptografia e eliminação
   para upload de exames e laudos?
