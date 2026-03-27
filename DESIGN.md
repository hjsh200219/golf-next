# GolfShin Design System

## Classification
**APP UI** — utility tool, data-dense, task-focused (not marketing/landing page)

## Color Tokens (Tailwind)
| Token | Hex | Usage |
|-------|-----|-------|
| `golf-primary` | `#15803d` | Primary actions, active states, links |
| `golf-secondary` | `#166534` | Hover states, emphasis |
| `golf-accent` | `#4ade80` | Highlights, progress indicators |
| `golf-muted` | `#86efac` | Subtle backgrounds |
| `golf-bg` | `#f8faf9` | Page background |
| `golf-surface` | `#ffffff` | Card/panel background |
| `golf-surface-hover` | `#f0fdf4` | Card/panel hover |

**Rule**: Never use raw `green-*` Tailwind classes. Always use `golf-*` tokens.

## Typography
- **Primary**: Pretendard Variable (Korean-optimized)
- **Mono**: JetBrains Mono (prices, times)
- **Tabular nums**: Always use `.tabular-nums` for prices and time values

## Shadows
| Token | Usage |
|-------|-------|
| `shadow-card` | Default card elevation |
| `shadow-card-hover` | Card hover state |
| `shadow-nav` | Header/nav bar |
| `shadow-btn` | Button default |
| `shadow-btn-hover` | Button hover |

## Spacing & Layout
- Max content width: `max-w-6xl`
- Page padding: `px-4 sm:px-6 lg:px-8`
- Card border-radius: `rounded-xl` (small) / `rounded-2xl` (large)
- Section gap: `space-y-4`
- Mobile bottom padding: `pb-20` (for MobileNav)

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

### Animations
- `spring-hover`: cubic-bezier(0.16, 1, 0.3, 1) for all hover transitions
- `animate-fade-up`: Entry animation for cards/panels
- `stagger-children`: Sequential fade-up for list items
- `animate-shimmer`: Loading skeleton

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
