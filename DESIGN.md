# AMPARAI — Sistema de Design (Base Airbnb Hospitality & Trust)

> **Visão Geral**: O sistema de design do **Amparai** é construído com base na filosofia do *Airbnb Design System*, priorizando **hospitalidade, acolhimento familiar, clareza impecável e confiança**. Substituímos a frieza de softwares clínicos/hospitalares por tons quentes, cartões arredondados (`14px`), botões em pílula (`rounded.full`), tipografia legível e grande espaço tátil.

---

## 🎨 Paleta de Cores (Tokens de Marca & Contexto)

```yaml
colors:
  # Cores Principais da Marca (Amparai Sage & Brand Green)
  primary: "#2E7D60"             # Verde marca (ações primárias, botões, ícones ativos)
  primary-active: "#23634B"      # Verde primário pressionado
  primary-disabled: "#A3D4C2"    # Verde primário desabilitado
  primary-soft: "#E8F4F0"        # Fundo suave verde de destaque
  
  # Acolhimento & Tons Quentes (Warm Beige Canvas)
  canvas: "#F7F0E6"              # Fundo da aplicação (creme/areia suave)
  surface: "#FFFFFF"             # Cartões e modais (branco puro elevado)
  surface-soft: "#FAF6F0"        # Cartões secundários
  surface-tertiary: "#F0E8DD"    # Chips e tags neutras
  
  # Emergência & Alerta (Modo SOS)
  clay-red: "#A9402E"            # Vermelho argila (SOS / Emergência / Busca)
  on-clay-red: "#FFFFFF"         # Texto sobre vermelho argila (WCAG AAA)
  
  # Tipografia & Leitura (Ink & Muted)
  ink: "#2D2621"                 # Texto principal (quase preto aquecido)
  body: "#4A423B"                # Texto secundário de corpo
  muted: "#786E65"               # Texto suave / placeholders / legendas
  hairline: "#E6DEC6"            # Divisores e bordas suaves
  hairline-soft: "#F0EAD8"       # Bordas internas
  
  # Status Clínico (Cuidados & Notificações)
  status-bem: "#2E7D60"          # Verde (Tudo bem)
  status-atencao: "#D97706"       # Âmbar (Atenção / Lembrete pendente)
  status-emergencia: "#A9402E"   # Vermelho Argila (Emergência)
```

---

## 📐 Tipografia & Escala (Alta Legibilidade)

| Token | Propriedade / Tamanho | Peso | Uso Principal |
| :--- | :--- | :--- | :--- |
| `display-xl` | Serif / `28px` (lh: 1.25) | Bold (`700`) | Títulos de tela ("Modo Busca", "Oi, Família") |
| `display-lg` | Serif / `22px` (lh: 1.2) | SemiBold (`600`) | Títulos de Seção e Mês na Escala |
| `title-md` | Sans-Serif / `18px` (lh: 1.3) | SemiBold (`600`) | Nome do idoso, títulos de medicamentos |
| `title-sm` | Sans-Serif / `16px` (lh: 1.3) | Medium (`500`) | Nomes de cuidadores, itens de diário |
| `body-md` | Sans-Serif / `16px` (lh: 1.5) | Regular (`400`) | Descrições e notas de saúde |
| `body-sm` | Sans-Serif / `14px` (lh: 1.4) | Regular (`400`) | Horários, dosagens, detalhes secundários |
| `button-md` | Sans-Serif / `16px` (lh: 1.2) | SemiBold (`600`) | Rótulos de botões primários e modais |
| `badge` | Sans-Serif / `12px` (lh: 1.2) | Bold (`700`) | Chips de papel (`Coordenador`, `Familiar`) |

---

## ⭕ Raio de Arredondamento (Rounded Borders)

```yaml
rounded:
  none: 0px
  xs: 4px         # Badges menores
  sm: 8px         # Inputs e campos de texto
  md: 14px        # Cartões principais (Diário, Remédios, Plantão, Custos)
  lg: 20px        # Modais e BottomSheets
  xl: 32px        # Orbs de ação
  full: 9999px    # Botões em pílula e chips de status
```

---

## 🎛️ Padrões de Componentes (Airbnb Spec)

### 1. Botão Primário (Airbnb Pill Button)
* **Fundo**: `{colors.primary}` (`#2E7D60`)
* **Texto**: `{colors.surface}` (`#FFFFFF`) — SemiBold `16px`
* **Raio**: `{rounded.full}` (`9999px`)
* **Altura**: `52px` (Grande área de toque para facilidade de uso)
* **Sombra**: `shadow.card` suave

### 2. Cartões de Conteúdo (Property & Care Cards)
* **Fundo**: `{colors.surface}` (`#FFFFFF`)
* **Borda**: `1px solid {colors.hairline}`
* **Raio**: `{rounded.md}` (`14px`)
* **Padding**: `16px`
* **Elevação**: Sombra ambiente sutil para destacar do fundo creme (`canvas`)

### 3. Barra de Abas e Navegação (Bottom Bar & Header)
* **Header**: Fundo transparente ou Creme (`#F7F0E6`), ícone de marca no topo esquerdo.
* **Navegação Inferior**: 4 abas (*Hoje*, *Saúde*, *Escala*, *Custos*), pílula indicadora ativa em verde marca.

### 4. Modo Emergência / SOS
* **Fundo**: `{colors.clay-red}` (`#A9402E`)
* **Cards Internos**: Brancos elevando o contraste (WCAG AAA).
* **Botão de Ação**: Pílula branca com texto em vermelho argila em negrito `900` de `18px`.
