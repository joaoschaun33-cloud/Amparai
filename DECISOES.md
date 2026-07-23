# Registro de Decisões de Projeto

## [D-009] MedBag — marca-ingrediente da pasta de saúde

### Decisão
O módulo da pasta de saúde (D-008) chama-se **MedBag** (medbag.com.br, domínio do fundador). Um código, duas marcas — nunca dois produtos nesta fase.

### Implicações para a engenharia (obrigatórias)
1. Módulo com fronteira limpa: `backend/medbag/` — modelos, rotas e coleções próprias (prefixo `medbag_` ou subcoleção dedicada), para permitir extração futura sem refatorar o Amparai.
2. Schema de **paciente genérico** (patient), não idoso-específico — o elder do Amparai é uma instância de patient.
3. Link do médico servido sob domínio medbag.com.br com identidade MedBag ("histórico compartilhado com você pela família via MedBag").
4. Na UI do Amparai, a seção Saúde exibe "MedBag incluso" — a marca aparece para a família como benefício da assinatura.
5. PROIBIDO nesta fase: app MedBag separado, onboarding separado, marketing separado.

## [D-008] Estrela Norte: a pasta de saúde da vida do idoso

### Decisão
A Amparai será o registro unificado e portátil da vida de saúde do idoso, controlado pela família: exames, receitas e laudos num só lugar; qualquer filho acessa; o próximo médico recebe tudo por link consentido. Princípios: o médico NUNCA precisa logar/adotar nada (família alimenta via foto+OCR; médico recebe link sem fricção); terminologia obrigatória "pasta de saúde da família" — NUNCA "prontuário eletrônico" (território regulado CFM/SBIS).

### Preparação imediata (vale para a migração em curso)
1. Modelagem dos dados de saúde no Firestore alinhada ao padrão **FHIR** (o mesmo da RNDS) — nomes de campos e estrutura compatíveis, mesmo sem integração agora.
2. Documentos (exame, receita, laudo) como objetos de primeira classe: arquivo no Cloud Storage + metadados estruturados no Firestore, vinculados ao histórico.
3. Rota "link do médico": versão compartilhável e somente-leitura do histórico, com consentimento registrado e expiração. Construção completa da visão: pós-piloto.
4. Ingestão de documentos com hierarquia: **arquivo digital nativo primeiro** (encaminhar PDF via share sheet do celular e, futuramente, via WhatsApp; PDFs têm texto embutido — extração melhor e mais barata que OCR), foto como fallback para papel. O produto faz coaching ativo: após cada consulta na agenda, sugerir à família "peça o exame/receita em PDF na recepção". Receitas digitais assinadas (ICP-Brasil): guardar o código de validação como metadado.

## [D-007] RESOLVIDA: o app é a porta de entrada; o kit é oferta complementar

### Decisão (fundador, 22/07/2026)
O APP é o cavalo de Troia; o Kit Anjo é oferta para o subconjunto com risco de perambulação. Implicações para o código: o onboarding e todo o produto funcionam 100% sem hardware; nenhuma tela pode assumir que o kit existe; a seção de segurança apresenta o kit como "adicione proteção física" (upsell), nunca como pré-requisito. Em teste seguem apenas as mensagens de aquisição (3 variantes de landing, fora do app).

## [D-004] Privacidade e Segurança dos Dados na Pulseira Pública

### Contexto
A página pública da pulseira (`/pulseira/[id]`) estava expondo informações médicas detalhadas e confidenciais do idoso (tipo sanguíneo, alergias e condições de saúde) e sua idade para qualquer pessoa que escaneasse o QR code ou acessasse o link. Isso constitui uma violação da Lei Geral de Proteção de Dados (LGPD) e coloca a privacidade de uma pessoa vulnerável em risco.

### Decisão
Ficou definido que antes de qualquer demonstração externa ou uso real do aplicativo, a página pública da pulseira deve ser estritamente limitada para exibir apenas informações de contato de emergência e localização.

Especificamente, a página pública e seu endpoint de API correspondente (`GET /api/pulseira/{elder_id}`) devem expor apenas:
1. **Primeiro nome** do idoso (respeitando honoríficos comuns como "Dona" ou "Seu").
2. **Foto de perfil**.
3. **Botão de ligar** para os contatos de emergência cadastrados.
4. **Formulário para notificar localização** da pessoa encontrada.

Todas as outras informações sensíveis (idade, tipo sanguíneo, alergias, condições médicas e observações clínicas detalhadas) foram removidas da página pública e da resposta da API pública correspondente.

### Consequências
- A segurança e privacidade do idoso são preservadas de acordo com as normas da LGPD.
- O "bom samaritano" que escanear a pulseira verá apenas o primeiro nome, a foto e os botões de ação para ligar para a família ou enviar a localização atual.
- A API pública não trafega dados clínicos sigilosos sob nenhuma circunstância sem autenticação prévia.
