# Briefing para o advogado — Termo de Consentimento do Amparai

> Objetivo deste documento: dar ao advogado todo o contexto para **redigir o texto final do
> termo de consentimento que aparece dentro do app**. O mecanismo (telas, logs, enforcement)
> já está construído; o que falta é **o texto do termo**, que é decisão jurídica.

---

## 1. O que é o Amparai (contexto)

O Amparai é um aplicativo de **organização do cuidado familiar de uma pessoa idosa**. Quem usa
é a **família** (filhos, cuidadores) — a pessoa idosa não opera o app. Ele ajuda a família a
dividir plantões, acompanhar remédios, guardar dados de saúde, dividir custos e agir em
emergência.

**Ponto jurídico central:** o Amparai **não é um serviço de saúde** e **não é operado por
profissionais de saúde**. Isso é relevante porque afasta o uso da base do art. 11, II, "f"
(tutela da saúde por profissionais/serviços de saúde) como fundamento geral do produto.

## 2. O que é ESTE termo, especificamente

É o **consentimento que a família aceita, dentro do app, ANTES de o Amparai guardar qualquer
dado de saúde** da pessoa cuidada. Sem esse consentimento válido, o sistema **bloqueia** a
gravação de dados clínicos (já implementado: a rota de salvar prontuário retorna 403 sem
consentimento vigente).

Não é a Política de Privacidade (essa já existe e está publicada). É o **termo específico de
consentimento para dado sensível de saúde**, mais curto e em linguagem acolhedora, exibido no
momento da coleta.

## 3. Como o consentimento funciona no app (já construído)

Fluxo da tela de consentimento:

1. **Exibe o termo** (o texto que você vai redigir) para leitura.
2. Pergunta: **"A pessoa de quem você cuida tem condições de dar este consentimento agora?"**
   - **Sim → caminho do titular:** a própria pessoa toca "Eu autorizo".
   - **Não → caminho do cuidador de fato:** a família aceita uma **declaração** (checkbox
     duplo) assumindo a responsabilidade. *(O texto dessa declaração você já nos forneceu e
     está no app — reproduzido no item 7.)*
3. **Registra um log imutável** de cada evento (aceite e revogação), contendo:
   `timestamp`, `IP`, `ID do usuário`, `versão exata do termo aceito`, `ação` (accept/revoke),
   `método` (titular / cuidador de fato) e as `declarações` aceitas.

A **versão do termo** fica travada no servidor (`CONSENT_TERM_VERSION`). Se o texto mudar, a
versão sobe e todos são convidados a consentir de novo. Hoje a versão está como `"1.0-draft"`
justamente para sinalizar que o texto ainda é rascunho, à sua espera.

## 4. Quais dados o termo precisa cobrir (inventário real do que o app processa)

- **Dados sensíveis de saúde:** tipo sanguíneo, alergias, condições, medicações contínuas,
  cirurgias, plano de saúde, mobilidade, estado cognitivo, notas livres.
- **Rotina de saúde:** marcação de remédios tomados, linha do tempo de eventos (aferições,
  áudios de cuidadores), consultas.
- **Localização e emergência:** pings de GPS, última localização no SOS.
- **Imagem:** foto da pessoa cuidada.
- **Financeiro com reflexo em saúde:** despesas e **fotos de recibos médicos** (o recibo
  revela tratamento).

## 5. O que o app FAZ com os dados — pontos que o termo precisa mencionar

1. **Processamento por Inteligência Artificial (Google Gemini):** o app usa IA para (a) ler
   recibos médicos por OCR e (b) gerar um resumo semanal do cuidado. **Esse processamento
   ocorre fora do Brasil (transferência internacional).** Regra interna: nenhum dado sensível
   é usado para treinar modelos públicos de terceiros. **Precisa estar no termo.**
2. **Compartilhamento no "círculo de cuidado":** a família convida membros (irmãos,
   cuidadores) com papéis e permissões — o dado é compartilhado apenas com quem foi convidado,
   conforme o papel.
3. **Retenção e exclusão:** ao pedir exclusão, os dados de saúde são **apagados
   imediatamente**; apenas os **logs de consentimento são retidos por 5 anos** (obrigação
   legal / ônus da prova). *(Já implementado no app.)*
4. **Direitos do titular:** ver, corrigir, exportar, **apagar** e **revogar o consentimento a
   qualquer momento** — tudo por botões no próprio app. *(Já implementado.)*

## 6. Bases legais por funcionalidade (para você confirmar/ajustar no texto)

- **Consentimento** (art. 7º, I / art. 11, I) → para o app em geral e a guarda dos dados de
  saúde.
- **Proteção da vida e da incolumidade física** (art. 11, II, "e") → **exclusivamente** para
  os gatilhos de **SOS** e para a exposição mínima na **pulseira** de emergência.
- Entendemos que operamos com **bases distintas por funcionalidade** — favor confirmar.

## 7. O que precisamos de você (a entrega)

**O texto final do termo de consentimento in-app.** Requisitos:

- **Linguagem clara e acolhedora** ("melhor amiga enfermeira"), sem juridiquês. Curto e
  escaneável. É lido por uma família cansada, não por um advogado.
- **Vocabulário proibido** (guarda-corpo de marca): não usar "paciente", "monitorar",
  "vigiar", "rastrear", "ALERTA", nomes de doenças. Usar "sua mãe", "a pessoa de quem você
  cuida", "círculo de cuidado".
- **Deve cobrir:** o que guardamos, para quê, quem vê (o círculo), onde fica (servidores no
  Brasil, criptografado), a base de proteção à vida na emergência, os direitos (incluindo
  revogar/apagar), e **amarrar explicitamente** os dois pontos que você mesmo destacou:
  **(a) transferência internacional (processamento por IA fora do país)** e **(b) as
  salvaguardas de IA**.

**Declaração de cuidador de fato — texto que você já aprovou e que está no app (para sua
validação final):**

> ☐ "Declaro ser o responsável de fato por [Nome do Idoso] e autorizo o uso do Amparai para a
> organização de seu cuidado."
>
> ☐ "Assumo integral responsabilidade legal por esta declaração perante o aplicativo e
> terceiros, isentando o Amparai de quaisquer litígios familiares decorrentes do uso e
> compartilhamento destes dados na plataforma."

## 8. Rascunho atual do termo (ponto de partida — para você reescrever/aprovar)

> No Amparai, o cuidado da sua mãe é organizado com carinho e responsabilidade. Antes de
> guardar qualquer informação de saúde dela, queremos ser transparentes:
> - **O que guardamos:** os dados de saúde e a rotina de cuidado da pessoa de quem você cuida.
> - **Para quê:** apenas para ajudar a sua família a organizar o cuidado. Nunca vendemos seus
>   dados nem os usamos para publicidade.
> - **Quem vê:** só quem a sua família convidar para o círculo de cuidado.
> - **Onde fica:** em servidores no Brasil, com criptografia.
> - **Em uma emergência:** dados essenciais podem ser usados para proteger a vida da pessoa
>   cuidada.
> - **Seus direitos:** você pode ver, corrigir, exportar e apagar esses dados, e retirar este
>   consentimento a qualquer momento, com um toque.

*(Falta neste rascunho, e é onde precisamos de você: a redação da transferência internacional
por IA e das salvaguardas de IA, com o rigor jurídico correto e mantendo a linguagem simples.)*

## 9. O que acontece quando você entregar

Trocamos o texto no servidor, subimos a `CONSENT_TERM_VERSION` para `1.0`, e a partir daí todo
consentimento é registrado sob a versão oficial. Só então abrimos o beta para famílias reais.
