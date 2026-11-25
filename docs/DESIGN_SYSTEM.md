# Design system

Stack: Tailwind CSS v4 + shadcn/ui (new-york style) + official Deep Notes Figma SVG icons (`frontend/src/assets/`).
Tokens live in `frontend/src/index.css` (`:root`, `.dark`, `@theme inline`). Components in `frontend/src/components/ui`
come from the shadcn CLI (`pnpm dlx shadcn@latest add <component>` from `frontend/`); do not hand-edit them unless
needed, and record every intentional edit in the changelog below.

Visual direction follows the Figma page `Desain Final Deep Notes` (`node-id=174:135`).

## Direction dials and rationale

- **Dials:** `ENERGY 2` (calm study space warmed by mint surfaces and Bubi), `RHYTHM 2` (predictable navigation shell with varied content cards), `MOTION 1` (state transitions only; `prefers-reduced-motion` disables non-essential motion).
- **Why this palette:** Ocean Deep (`#163b4a`) and Mint (`#bcebdc`) come from the Bubi ocean character identity while maintaining high reading contrast (>= 9.1:1 on primary surfaces) for long study sessions.
- **Why this layout:** A persistent left sidebar on tablet/desktop (`200px` / `220px`) and a 5-slot bottom bar on phones (`<768px`) keep `Beranda`, `Jelajah`, `Workspace`, and `Game` one tap away without crowding narrow screens.
- **Why this typography:** Self-hosted `Manrope Variable` matches the Figma specification and keeps Indonesian headings and dense citation labels legible at small sizes without external font requests.
- **Why this spacing:** Compact mobile margins (`18px`) with reserved bottom safe-area clearance prevent the fixed tab bar from covering content, while desktop (`44px` horizontal padding, `1160px` max content width) preserves comfortable line lengths.
- **Why use cards:** White cards (`#ffffff`) separate distinct study units (sources, explanation beats, workspace forms) against the `#f4f8f7` canvas without heavy shadows.
- **Why these icons and illustrations:** All six navigation glyphs, the book mark, and Bubi's idle pose are exported directly from the Figma component set so navigation cues match the product language rather than a generic icon pack.

## Rules

1. **Tokens only.** Use `bg-primary`, `bg-secondary`, `text-muted-foreground`, `border-border`, `rounded-lg`... Never raw hex or arbitrary colors in components. New color or radius = new token in `index.css`, documented below.
2. **Reuse first.** Check `components/ui` and `components/` before building a new component.
3. **Light and dark.** Every token has a WCAG AA verified value in both `:root` and `.dark`, and the shell ships a working theme toggle (`ThemeToggle`).
4. **Motion is optional.** Nothing essential may depend on animation or 3D; `prefers-reduced-motion` is honored globally.
5. **Accessibility.** Every input has a visible `<Label htmlFor>`; focus rings (`3px`) are never removed; text contrast is at least 4.5:1 and interactive boundaries at least 3:1 (WCAG 2.2 AA); state is never shown by color alone; interactive touch targets are at least `44x44px`; everything works with keyboard only.
6. **Text first.** Information is available as text. Visualizations (such as the 3D source map) add to it and never replace it.
7. **Responsive.** Three deliberate states: phone (`<768px`, top brand bar + fixed bottom bar + `/menu`), tablet (`768px-1023px`, `200px` sidebar), and desktop (`>=1024px`, `220px` sidebar with Bubi).

## Tokens

| Token | Light (`:root`) | Dark (`.dark`) | Contrast (WCAG 2.x) | Use |
|---|---|---|---|---|
| `background` | `#f4f8f7` | `#0d1f27` | canvas | page background |
| `foreground` | `#163b4a` | `#eaf5f2` | 11.15:1 / 15.17:1 on `background` | primary text |
| `card` / `card-foreground` | `#ffffff` / `#163b4a` | `#132a34` / `#eaf5f2` | 11.94:1 / 13.38:1 | cards, sidebar, mobile nav |
| `primary` / `primary-foreground` | `#163b4a` / `#ffffff` | `#7ce2cc` / `#0d1f27` | 11.94:1 / 10.95:1 | primary CTAs, active pills |
| `secondary` / `secondary-foreground` | `#bcebdc` / `#163b4a` | `#1d4d4c` / `#eaf5f2` | 9.13:1 / 8.49:1 | active nav item, secondary CTAs, Bubi stage |
| `muted` / `muted-foreground` | `#f4f8f7` / `#45616b` | `#183642` / `#9ec0c7` | 6.18:1 on `bg`, 6.61:1 on `card` (dark: 7.68:1) | secondary copy, subtle fills |
| `brand-teal` / `cite` | `#146c67` | `#5ed6c2` | 6.23:1 on `card`, 5.82:1 on `bg` (dark: 8.43:1) | headline accent, citation chips, focus ring |
| `warning` / `warning-foreground` | `#fae8c8` / `#6b4700` | `#4a3510` / `#fde4b4` | 6.90:1 / 8.65:1 | ungrounded fallback and non-fatal notices |
| `destructive` | `#a12d25` | `#ff8a80` | 7.20:1 on `card` (dark: 6.53:1) | validation errors and destructive actions |
| `border` / `input` | `#d4e3de` / `#647d86` | `#244854` / `#567a85` | `input` 4.36:1 / 3.21:1 (>= 3:1 UI) | structural dividers vs form field boundaries |
| `radius` (`0.625rem` base) | `10px` | `10px` | n/a | `rounded-sm` (6px), `md` (8px), `lg` (10px), `xl` (14px) |
| `font-sans` | `Manrope Variable` | `Manrope Variable` | n/a | self-hosted via `@fontsource-variable/manrope` |

## Domain components

| Component | Status | Behavior |
|---|---|---|
| `AppLayout` + `ThemeToggle` | built | responsive sidebar + mobile bottom bar + skip link + `/menu` + light/dark mode |
| `ApiStatus` | built | polls `GET /api/v1/health` with accessible `role="status"` badge |
| `SourcesTable` | built | TanStack Table v9 list of sources with text status badges and empty state |
| Answer card | to build | shows answer text and citation chips; ungrounded answers use `warning` and no chips |
| Citation chip | to build | `cite` color, source title and page; click opens source preview at that page |
| Contribution bar | to build | per-member counts of sources and questions, with text values |
| Quiz card | to build | one question at a time, keyboard friendly, result summary at the end |

## Changelog

- **2026-11-25:** Replaced scaffold purple/Inter tokens with Figma `Desain Final Deep Notes` Ocean Deep + Mint + Teal tokens and self-hosted `Manrope Variable`. Built responsive `AppLayout` (desktop/tablet sidebar with Bubi, mobile brand bar + 5-tab bottom bar + `Menu Tambahan`) and `ThemeToggle`. Updated `components/ui/button.tsx` and `components/ui/input.tsx` default heights to `min-h-11` (`44px`) and `rounded-lg` (`10px`) to match Figma geometry and WCAG 2.2 touch-target minimums.
- **2026-11-19:** Initial tokens and shadcn base components (`button`, `card`, `input`, `label`, `badge`, `table`).
