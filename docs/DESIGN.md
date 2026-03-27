# Design System — GolfShin

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `golf-primary` | `#15803d` | Primary actions, headers, active states |
| `golf-secondary` | `#166534` | Secondary emphasis, hover states |
| `golf-accent` | `#4ade80` | Highlights, badges, success indicators |
| `golf-muted` | `#86efac` | Subtle backgrounds, disabled states |
| `golf-bg` | `#f8faf9` | Page background |
| `golf-surface` | `#ffffff` | Card backgrounds |
| `golf-surface-hover` | `#f0fdf4` | Card hover states |

Source: `tailwind.config.ts` → `theme.extend.colors.golf`

## Typography

- **Primary font**: Pretendard Variable (Korean + Latin)
- **Mono font**: JetBrains Mono (code, tabular data)
- **Word break**: `keep-all` (Korean line-break rule)
- **Font smoothing**: `antialiased` globally

Source: `tailwind.config.ts` → `theme.extend.fontFamily`, `globals.css`

## Shadows

| Token | Usage |
|-------|-------|
| `shadow-card` | Default card elevation |
| `shadow-card-hover` | Hovered card |
| `shadow-nav` | Navigation bar |
| `shadow-btn` | Button resting state |
| `shadow-btn-hover` | Button hover state |

All shadows use green-tinted `rgba(21, 128, 61, ...)` for brand cohesion.

## Animations

| Class | Effect | Timing |
|-------|--------|--------|
| `.animate-fade-up` | Fade in + slide up 12px | 0.5s spring |
| `.animate-shimmer` | Loading skeleton shimmer | 1.5s infinite |
| `.spring-hover` | Spring-based hover transition | 0.4s cubic-bezier |
| `.stagger-children` | Sequential child animations | 60ms delay per child |

Easing: `cubic-bezier(0.16, 1, 0.3, 1)` — spring-like curve for all animations.

## UI Patterns

| Pattern | Class | Description |
|---------|-------|-------------|
| Glassmorphism | `.glass` | Semi-transparent white + blur backdrop |
| Noise texture | `.noise-overlay` | Subtle fractal noise on body |
| Tabular numbers | `.tabular-nums` | Aligned digits for prices/times |

## Spacing

- Page padding: `px-4 sm:px-6 lg:px-8`
- Max width: `max-w-6xl` (center container)
- Mobile bottom nav clearance: `pb-24 md:pb-8`

## Border Radius

- Cards: `rounded-2xl` (1rem) or `rounded-3xl` (1.25rem)
- Buttons: `rounded-lg`
- Inputs: `rounded-lg`

## Component Rules

1. Use Tailwind utility classes — no CSS modules or styled-components
2. Responsive: mobile-first (`sm:`, `md:`, `lg:` breakpoints)
3. Green color palette only — no arbitrary colors outside the design system
4. All interactive elements must have hover/focus states
5. Price displays use `.tabular-nums` for alignment
