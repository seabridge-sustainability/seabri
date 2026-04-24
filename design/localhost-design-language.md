# Design Language: OpenSeaBri — Personal Sustainability Intelligence

> Extracted from `http://localhost:5173` on April 24, 2026
> 95 elements analyzed

This document describes the complete design language of the website. It is structured for AI/LLM consumption — use it to faithfully recreate the visual design in any framework.

## Color Palette

### Primary Colors

| Role | Hex | RGB | HSL | Usage Count |
|------|-----|-----|-----|-------------|
| Primary | `#16a34a` | rgb(22, 163, 74) | hsl(142, 76%, 36%) | 2 |
| Secondary | `#22c55e` | rgb(34, 197, 94) | hsl(142, 71%, 45%) | 5 |

### Neutral Colors

| Hex | HSL | Usage Count |
|-----|-----|-------------|
| `#e5e5e5` | hsl(0, 0%, 90%) | 87 |
| `#a3a3a3` | hsl(0, 0%, 64%) | 31 |
| `#737373` | hsl(0, 0%, 45%) | 30 |
| `#f5f5f5` | hsl(0, 0%, 96%) | 24 |
| `#0a0a0a` | hsl(0, 0%, 4%) | 15 |
| `#222222` | hsl(0, 0%, 13%) | 11 |

### Background Colors

Used on large-area elements: `#0a0a0a`, `#111111`

### Text Colors

Text color palette: `#e5e5e5`, `#a3a3a3`, `#f5f5f5`, `#22c55e`, `#0a0a0a`, `#737373`

### Gradients

```css
background-image: radial-gradient(circle, rgba(34, 197, 94, 0.22), rgba(0, 0, 0, 0) 60%);
```

### Full Color Inventory

| Hex | Contexts | Count |
|-----|----------|-------|
| `#e5e5e5` | text, border | 87 |
| `#a3a3a3` | text, border | 31 |
| `#737373` | background, text, border | 30 |
| `#f5f5f5` | text, border | 24 |
| `#0a0a0a` | background, text, border | 15 |
| `#222222` | border | 11 |
| `#22c55e` | text, border | 5 |
| `#16a34a` | border, background | 2 |

## Typography

### Font Families

- **ui-sans-serif** — used for body (47 elements)
- **Arial** — used for body (40 elements)
- **Recoleta** — used for all (5 elements)
- **system-ui** — used for body (2 elements)
- **ui-monospace** — used for body (1 elements)

### Type Scale

| Size (px) | Size (rem) | Weight | Line Height | Letter Spacing | Used On |
|-----------|------------|--------|-------------|----------------|---------|
| 72px | 4.5rem | 900 | 73.44px | -1.8px | h1, br, span |
| 40px | 2.5rem | 500 | 60px | -0.8px | h2 |
| 28px | 1.75rem | 400 | normal | normal | span |
| 20px | 1.25rem | 900 | 30px | -0.2px | span |
| 17.92px | 1.12rem | 400 | 28.672px | normal | p |
| 16px | 1rem | 400 | normal | normal | html, head, script, meta |
| 15px | 0.9375rem | 600 | 22.5px | normal | a |
| 14px | 0.875rem | 400 | 21px | normal | div, a |
| 13.3333px | 0.8333rem | 400 | normal | normal | button |
| 13px | 0.8125rem | 400 | 18.2px | normal | div, footer, img, span |
| 12px | 0.75rem | 400 | 18px | normal | div, span |
| 11px | 0.6875rem | 400 | 16.5px | 0.88px | span |

### Heading Scale

```css
h1 { font-size: 72px; font-weight: 900; line-height: 73.44px; }
h2 { font-size: 40px; font-weight: 500; line-height: 60px; }
```

### Body Text

```css
body { font-size: 28px; font-weight: 400; line-height: normal; }
```

### Font Weights in Use

`400` (80x), `600` (9x), `900` (4x), `500` (2x)

## Spacing

**Base unit:** 2px

| Token | Value | Rem |
|-------|-------|-----|
| spacing-2 | 2px | 0.125rem |
| spacing-32 | 32px | 2rem |
| spacing-40 | 40px | 2.5rem |
| spacing-48 | 48px | 3rem |
| spacing-56 | 56px | 3.5rem |
| spacing-72 | 72px | 4.5rem |

## Border Radii

| Label | Value | Count |
|-------|-------|-------|
| md | 6px | 1 |
| md | 10px | 2 |
| full | 50px | 1 |
| full | 999px | 2 |

## CSS Custom Properties

### Colors

```css
--bg-app: #0a0a0a;
--bg-surface: #111111;
--bg-surface-hover: #161616;
--bg-sidebar: #0d0d0d;
--bg-input: #0f0f0f;
--bg-bubble-user: #1a1a1a;
--bg-bubble-assistant: #111111;
--border-default: #1a1a1a;
--border-muted: #222222;
--text-primary: #f5f5f5;
--text-secondary: #e5e5e5;
--text-muted: #a3a3a3;
--accent-green: #16a34a;
--accent-green-2: #22c55e;
--accent-ocean: #0ea5e9;
--accent-deep: #0b3b4a;
--accent-sand: #d4c29a;
--shadow-card: 0 8px 32px rgba(0, 0, 0, 0.35);
```

### Typography

```css
--text-faint: #737373;
--font-display: "Recoleta", Georgia, "Times New Roman", serif;
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
```

### Shadows

```css
--shadow-hero: 0 30px 80px rgba(22, 163, 74, 0.18);
```

### Radii

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-xl: 16px;
```

### Semantic

```css
success: [object Object];
warning: [object Object];
error: [object Object];
info: [object Object];
```

## Transitions & Animations

**Durations:** `0.12s`

### Common Transitions

```css
transition: all;
transition: transform 0.12s, border-color 0.12s;
```

## Component Patterns

Detected UI component patterns and their most common styles:

### Buttons (8 instances)

```css
.button {
  background-color: rgb(17, 17, 17);
  color: rgb(229, 229, 229);
  font-size: 13.3333px;
  font-weight: 400;
  padding-top: 20px;
  padding-right: 20px;
  border-radius: 12px;
}
```

### Links (5 instances)

```css
.link {
  color: rgb(163, 163, 163);
  font-size: 14px;
  font-weight: 400;
}
```

### Navigation (1 instances)

```css
.navigatio {
  background-color: rgba(10, 10, 10, 0.85);
  color: rgb(229, 229, 229);
  padding-top: 18px;
  padding-bottom: 18px;
  padding-left: 32px;
  padding-right: 32px;
  position: sticky;
}
```

### Footer (1 instances)

```css
.foote {
  color: rgb(115, 115, 115);
  padding-top: 32px;
  padding-bottom: 32px;
  font-size: 13px;
}
```

## Component Clusters

Reusable component instances grouped by DOM structure and style similarity:

### Button — 8 instances, 1 variant

**Variant 1** (8 instances)

```css
  background: rgb(17, 17, 17);
  color: rgb(229, 229, 229);
  padding: 20px 20px 20px 20px;
  border-radius: 12px;
  border: 1px 1px 1px 4px solid rgb(34, 34, 34);
  font-size: 13.3333px;
  font-weight: 400;
```

## Layout System

**2 grid containers** and **9 flex containers** detected.

### Container Widths

| Max Width | Padding |
|-----------|---------|
| 1200px | 32px |
| 100% | 0px |

### Grid Column Patterns

| Columns | Usage Count |
|---------|-------------|
| 2-column | 1x |
| 4-column | 1x |

### Grid Templates

```css
grid-template-columns: 593.453px 494.531px;
gap: 48px;
grid-template-columns: 272px 272px 272px 272px;
gap: 16px;
```

### Flex Patterns

| Direction/Wrap | Count |
|----------------|-------|
| row/nowrap | 7x |
| row/wrap | 2x |

**Gap values:** `10px`, `12px`, `16px`, `24px`, `48px`, `8px`

## Responsive Design

### Viewport Snapshots

| Viewport | Body Font | Nav Visible | Max Columns | Hamburger | Page Height |
|----------|-----------|-------------|-------------|-----------|-------------|
| mobile (375px) | 16px | Yes | 2 | No | 812px |
| tablet (768px) | 16px | Yes | 2 | No | 1024px |
| desktop (1280px) | 16px | Yes | 4 | No | 800px |
| wide (1920px) | 16px | Yes | 4 | No | 1080px |

### Breakpoint Changes

**375px → 768px** (mobile → tablet):
- H1 size: `40px` → `46.08px`
- Page height: `812px` → `1024px`

**768px → 1280px** (tablet → desktop):
- H1 size: `46.08px` → `72px`
- Max grid columns: `2` → `4`
- Page height: `1024px` → `800px`

**1280px → 1920px** (desktop → wide):
- Page height: `800px` → `1080px`

## Interaction States

### Button States

**"🌊Climate RiskHow climate chan"**
```css
/* Hover */
border-color: rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 34, 34) rgb(239, 68, 68) → rgb(22, 161, 73) rgb(22, 161, 73) rgb(22, 161, 73) rgb(26, 161, 74);
transform: none → matrix(1, 0, 0, 1, 0, -1.9671);
```
```css
/* Focus */
border-color: rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 34, 34) rgb(239, 68, 68) → rgb(22, 163, 74);
transform: none → matrix(1, 0, 0, 1, 0, -2);
outline: rgb(229, 229, 229) none 3px → rgb(16, 16, 16) auto 1px;
```

**"🌿Nature & BiodiversityHow you"**
```css
/* Hover */
border-color: rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 197, 94) → rgb(22, 163, 74) rgb(22, 163, 74) rgb(22, 163, 74) rgb(22, 163, 74);
transform: none → matrix(1, 0, 0, 1, 0, -1.99912);
```
```css
/* Focus */
border-color: rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 197, 94) → rgb(22, 163, 74);
transform: none → matrix(1, 0, 0, 1, 0, -2);
outline: rgb(229, 229, 229) none 3px → rgb(16, 16, 16) auto 1px;
```

**"📋Sustainability ReportingWhat"**
```css
/* Hover */
border-color: rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 34, 34) rgb(59, 130, 246) → rgb(22, 161, 73) rgb(22, 161, 73) rgb(22, 161, 73) rgb(23, 162, 77);
transform: none → matrix(1, 0, 0, 1, 0, -1.96717);
```
```css
/* Focus */
border-color: rgb(34, 34, 34) rgb(34, 34, 34) rgb(34, 34, 34) rgb(59, 130, 246) → rgb(22, 163, 74);
transform: none → matrix(1, 0, 0, 1, 0, -2);
outline: rgb(229, 229, 229) none 3px → rgb(16, 16, 16) auto 1px;
```

## Accessibility (WCAG 2.1)

**Overall Score: 100%** — 1 passing, 0 failing color pairs

### Passing Color Pairs

| Foreground | Background | Ratio | Level |
|------------|------------|-------|-------|
| `#0a0a0a` | `#16a34a` | 6.01:1 | AA |

## Design System Score

**Overall: 90/100 (Grade: A)**

| Category | Score |
|----------|-------|
| Color Discipline | 100/100 |
| Typography Consistency | 50/100 |
| Spacing System | 100/100 |
| Shadow Consistency | 85/100 |
| Border Radius Consistency | 100/100 |
| Accessibility | 100/100 |
| CSS Tokenization | 100/100 |

**Strengths:** Tight, disciplined color palette, Well-defined spacing scale, Clean elevation system, Consistent border radii, Strong accessibility compliance, Good CSS variable tokenization

**Issues:**
- 5 font families — consider limiting to 2 (heading + body)

## Gradients

**1 unique gradients** detected.

| Type | Direction | Stops | Classification |
|------|-----------|-------|----------------|
| radial | circle | 2 | brand |

```css
background: radial-gradient(circle, rgba(34, 197, 94, 0.22), rgba(0, 0, 0, 0) 60%);
```

## Z-Index Map

**3 unique z-index values** across 2 layers.

| Layer | Range | Elements |
|-------|-------|----------|
| sticky | 10,10 | nav |
| base | 0,1 | div, div, img |

## Font Files

| Family | Source | Weights | Styles |
|--------|--------|---------|--------|
| Recoleta | self-hosted | 400, 500, 900 | normal |

## Image Style Patterns

| Pattern | Count | Key Styles |
|---------|-------|------------|
| thumbnail | 2 | objectFit: fill, borderRadius: 6px, shape: rounded |
| gallery | 1 | objectFit: fill, borderRadius: 0px, shape: square |

**Aspect ratios:** 1:1 (3x)

## Motion Language

**Feel:** mixed · **Scroll-linked:** yes

### Duration Tokens

| name | value | ms |
|---|---|---|
| `xs` | `120ms` | 120 |

## Component Anatomy

### button — 8 instances

**Slots:** label

## Brand Voice

**Tone:** friendly · **Pronoun:** you-only · **Headings:** Sentence case (balanced)

### Top CTA Verbs

- **get** (2)
- **climate** (1)
- **nature** (1)
- **investment** (1)
- **build** (1)
- **explore** (1)
- **start** (1)

### Button Copy Patterns

- "🌊
climate risk
how climate change threatens what you own
understand how flooding, wildfire, heat, drought, and sea level rise affect your home, farm, business," (1×)
- "🌿
nature & biodiversity
how your activities depend on and impact nature
understand water stress, forest dependencies, soil health, pollinator risk, and how the" (1×)
- "📋
sustainability reporting
what you need to disclose, to whom, by when
navigate climate and nature disclosure requirements. get plain-language action lists for" (1×)
- "🔍
investment risk screening
sustainability risks in what you own or are buying
screen investments for physical climate risk, transition risk, nature dependenci" (1×)
- "🏠
home & community
sustainability decisions for your home and neighborhood
get practical guidance on energy efficiency, solar and storage, flood and fire prepa" (1×)
- "🎯
net zero & decarbonization
building a credible path to zero emissions
set credible emissions reduction targets, build real decarbonization roadmaps, and unde" (1×)
- "🌾
natural capital & land
income from nature: credits, conservation, regenerative practices
explore carbon credits, biodiversity credits, regenerative agricultu" (1×)
- "🌍
general sustainability
any question, any topic, any person
start here if you're not sure which specialist you need. any sustainability question welcome — fro" (1×)

### Sample Headings

> Your personal
sustainability intelligence.
> Eighteen agents. One sustainability focus.

## Quick Start

To recreate this design in a new project:

1. **Install fonts:** Add `ui-sans-serif` from Google Fonts or your font provider
2. **Import CSS variables:** Copy `variables.css` into your project
3. **Tailwind users:** Use the generated `tailwind.config.js` to extend your theme
4. **Design tokens:** Import `design-tokens.json` for tooling integration
