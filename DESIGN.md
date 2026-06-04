# TULAY — Design system

Light theme, restrained color strategy: tinted neutrals + one confident accent + functional
status + a sequential scale for the priority choropleth. All color in OKLCH. Never #000/#fff.

## Color strategy
Restrained. Neutrals carry the surface; the accent (cobalt) appears on <10% of pixels
(active nav, primary action, selection, key data). The map's choropleth is the one place a
full sequential palette is used, because it IS the data.

## Tokens (CSS custom properties, OKLCH)
Neutrals tinted toward the accent hue (258) at chroma ~0.006 so white never reads clinical.

Light:
- --background:        oklch(0.985 0.004 258)   /* canvas, faint cool tint */
- --surface:          oklch(0.995 0.003 258)   /* panels / cards */
- --surface-muted:    oklch(0.965 0.006 258)   /* insets, table stripes */
- --foreground:       oklch(0.255 0.012 264)   /* near-ink, not black */
- --muted-foreground: oklch(0.515 0.014 264)
- --border:           oklch(0.915 0.007 258)
- --border-strong:    oklch(0.86  0.009 258)
- --accent:           oklch(0.555 0.175 258)   /* cobalt — confident, not gov-flat */
- --accent-hover:     oklch(0.50  0.18  258)
- --accent-fg:        oklch(0.99  0.01  258)
- --ring:             oklch(0.62  0.15  258 / 0.45)

Status (functional only):
- --success: oklch(0.62 0.14 152)
- --warning: oklch(0.74 0.15 78)
- --danger:  oklch(0.585 0.20 27)
- --info:    = accent

Priority choropleth (sequential, low priority → high priority = needs intervention):
calm green → teal → amber → deep red. Low score = adequate, high = urgent.
- p0 oklch(0.78 0.12 150)  p1 oklch(0.80 0.11 110)  p2 oklch(0.84 0.13 85)
- p3 oklch(0.78 0.15 55)   p4 oklch(0.66 0.19 33)   p5 oklch(0.55 0.21 27)

Dark theme is out of scope (see scene: bright office). Tokens are structured so a dark map
mode could be added later, but ship light only.

## Glass (intentional, not default)
ONLY for panels floating directly over the Leaflet map:
  background: oklch(0.995 0.003 258 / 0.72); backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid oklch(0.99 0.01 258 / 0.6); box-shadow: 0 8px 28px -12px oklch(0.4 0.03 264 / 0.25)
Everywhere else: solid --surface. No glass on the rail, top bar content cards, tables, modals.

## Typography
- Geist Sans (already loaded) for UI/body. Geist Mono for numbers, coordinates, scores, codes.
- Scale (ratio ~1.25): 12 / 13 / 14(base) / 16 / 20 / 26 / 33px.
- Weights: 400 body, 500 labels/nav, 600 headings, 700 reserved for page title + big stats.
- Numbers in data contexts use Mono + tabular-nums so columns align.
- Body measure capped 65–75ch. Sentence case everywhere. No em dashes.

## Spacing & layout
- 4px base. Rhythm, not uniformity: page padding 24–32px, panel padding 20px, control gap 8–12px.
- Radius: panels/cards 16px, controls (button/input/select) 10px, pills/badges 999px, rail items 12px.
- App shell: fixed left icon rail (64px), then per-page contextual top bar (~56px), then content.
  Map pages are full-bleed with floating glass panels; data pages use the canvas with solid panels.
- Cards are not the default. Use the canvas directly; reach for a panel only when grouping earns it.
  Never nest panels.

## Elevation
Three steps only. 0 flat (on-canvas). 1 resting panel: 0 1px 2px + 0 8px 24px -16px cool shadow.
2 floating/glass over map (above). No glow, no neon.

## Motion
- ease-out-quint [cubic-bezier(0.22,1,0.36,1)], 160–220ms. Never animate layout props.
- Map panels slide/fade in on mount; selection transitions tint, not bounce. No elastic.

## Components (rework these primitives)
- Button: solid accent (primary), quiet (subtle surface, border), ghost. 10px radius, 500 weight,
  no gradients. Focus ring uses --ring.
- Panel (replaces ad-hoc Card usage): --surface, 16px radius, elevation 1, 20px padding.
- GlassPanel: the floating map variant (glass tokens above).
- Badge / StatusBadge: pill, functional color as 12% tint background + solid text, no side stripes.
- ScoreBadge: mono number on choropleth-tinted pill; the shared way a priority score is shown.
- StatTile: label (muted, 12px) + big mono number + optional delta; used in stat strips, not a
  hero-metric grid. Vary sizes; do not build identical card grids.
- RegionList: scannable rows (name + ScoreBadge + bar), selection tints the row in accent.
- Rail / TopBar: the persistent shell.

## Anti-slop bans (enforced)
No side-stripe borders. No gradient text. No glass except the map-overlay case above.
No hero-metric template. No identical icon-card grids. No modal as first thought (drill-in uses
an inline side panel, not a dialog). Sentence case, no em dashes.
