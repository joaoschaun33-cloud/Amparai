# Registro de Decisões de Projeto

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
