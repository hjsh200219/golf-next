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

## Component Patterns

### Cards
```
rounded-xl bg-white shadow-card ring-1 ring-gray-100
```

### Buttons (Primary)
```
rounded-xl bg-golf-primary text-white shadow-btn spring-hover
hover:shadow-btn-hover hover:scale-[1.02] active:scale-[0.98]
```

### Glassmorphism
```
glass → bg-white/72 backdrop-blur-20 border-white/50
```

## Interaction States

Every data-fetching component MUST handle:

| State | Pattern |
|-------|---------|
| Loading | Skeleton shimmer or spinner with `border-golf-primary` |
| Empty | Warm message + primary action + context |
| Error | Red card with icon + message + retry button |
| Success | Data display with toast confirmation |

## Accessibility

- Touch targets: minimum `44px` (use `min-h-[44px] min-w-[44px]`)
- Focus visible: `focus-visible:ring-2 focus-visible:ring-golf-primary/40`
- `aria-label` on all icon-only buttons
- `aria-expanded` on collapsible panels
- `aria-sort` on sortable table headers
- `sr-only` labels for form controls

## Icons

- SVG stroke icons (Heroicons style), `strokeWidth={1.5}` or `{2}`
- Never use emoji as icons in production UI

## Toast Notifications

- Library: `sonner`
- Position: `top-center`
- Types: `toast.success()`, `toast.error()`, `toast.info()`
- Duration: 3000ms with close button

## Mobile Navigation

- Fixed bottom bar with glassmorphism
- 3 items: 예약 (search), 날씨 (weather), 설정 (settings)
- SVG icons, 44px minimum touch targets
- Active state: `text-golf-primary font-semibold`
