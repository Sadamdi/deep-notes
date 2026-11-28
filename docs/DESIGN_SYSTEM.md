# Design system

Stack: Tailwind CSS v4 + shadcn/ui (new-york style, neutral base) + lucide icons. Tokens live in
`frontend/src/index.css` (`:root`, `.dark`, `@theme inline`). Components in `frontend/src/components/ui` come from the shadcn
CLI (`pnpm dlx shadcn@latest add <component>` from `frontend/`); do not hand-edit them unless needed, and note any edit here.

## Rules

1. **Tokens only.** Use `bg-primary`, `text-muted-foreground`, `border-border`, `rounded-lg`... Never raw hex or arbitrary colors.
   New color or radius = new token in `index.css`, documented below.
2. **Reuse first.** Check `components/ui` and `components/` before building a new component.
3. **Light and dark.** Every token has a value in both themes.
4. **Motion is optional.** Nothing essential may depend on animation or 3D; `prefers-reduced-motion` is honored globally.
5. **Accessibility.** Every input has a visible label; focus rings are never removed; contrast of text on its background is at
   least WCAG AA; state is never shown by color alone (add text or icon); everything works with keyboard only.
6. **Text first.** Information is available as text. Visualizations (such as the 3D source map) add to it and never replace it.
7. **Responsive.** Design for phone width first; students use phones.

## Tokens

| Token | Use |
|---|---|
| `primary` / `primary-foreground` | main actions, links |
| `secondary`, `muted`, `accent` | surfaces, subtle fills, hover |
| `destructive` | errors and dangerous actions |
| `cite` | citation chips and grounded-answer indicators |
| `warning` | "not found in the sources" and partial states |
| `navy`, `mint`, `teal`, `coral` | Deep Notes brand surfaces, accents, and game feedback |
| `auth-surface`, `auth-subtle-foreground`, `auth-field-surface`, `auth-outline-border` | Authentication screen background, supporting text, fields, and secondary action outline |
| `auth-panel-gradient`, `auth-panel-radius`, `auth-control-radius` | Figma authentication artwork panel and controls |
| `radius` (0.625rem base) | corner radius; `rounded-sm/md/lg/xl` derive from it |
| font | Inter, falling back to system sans |

## Domain components

| Component | Behavior |
|---|---|
| Answer card | shows answer text and grounding state; ungrounded answers have no citation controls |
| Citation control and source page dialog | shows source title/page and opens page text through the authorized source-page endpoint |
| Source row | title, type, who added it, status (processing, ready, failed) |
| Contribution and group views | member activity, progress, gaps, assignments, and text values from existing group endpoints |
| Quiz and game screens | one active question at a time, keyboard-operable navigation, preserved answers, server-grounded feedback, and a result summary |
| Shared app/public layouts | responsive desktop navigation, phone menu/bottom bar, consistent page states and protected route shell |
| Workspace notes/discussion and Studio editor | reusable local-first forms; device-only behavior is stated in the UI |
| Source scope picker | per-notebook choice of all ready sources or an explicit subset; shared across ask, companion, quiz, game, and writing assistance |
| Workspace invite dialog | owner adds an accepted friend or registered email, chooses viewer/editor role, or creates a role-matched invite link |
| AI assistance panel | task-specific actions, validated source citations with excerpts, and an explicit apply action; generated text is never inserted automatically |
| Bubi loading state | shared page, panel, and compact status variants for page reads and actions; the mascot keeps a stable layout footprint and honors reduced motion |
| Matching and order games | unique definition selection with explicit partial-credit guidance; draggable order with keyboard move controls kept alongside it |
| Source map/class visualizer | optional SVG/canvas views with text equivalents and API-backed source references |
| Bubi mascot | six original Figma SVG expressions (`idle`, `senang`, `sedih`, `marah`, `antusias`, `semangat`); short character/arm reactions, Idle asset fallback, and reduced-motion support |
| Authentication frame and field | shared sign-in/sign-up layout using exported Figma artwork, labeled icon fields, password visibility, and responsive form actions |
| Workspace navigation | shared wrapping tabs for workspace, classroom, and visualization; labels remain single-line and keep a consistent minimum height |
| Workspace creation preview | card cover uses the selected category icon and form state for its title, course, description, and visibility; follows the primary form action on phones |
| Landing and authentication mascot | exported SVG Bubi enters inside the authentication artwork panel and waves; compact mobile placement and reduced-motion fallback keep the form usable |
| Home learning panel | server-backed resume destination, shared streak card, and up to three account workspaces; loading and failure states do not imply that a user has no workspaces |

Mascot motion is a brief state change, not a continuous loop. Supported reactions animate Bubi as a unit or move its arms; `prefers-reduced-motion` disables movement while the chosen face remains visible. Loading uses a short finite thinking motion, not a loop. The existing streak SVG tiers get a short celebration only after server stats confirm an increase. Explanation text, citations, streak counts, and game/quiz results never depend on animation. Shared buttons provide a small pressed response, and page headings enter softly; both respect the reduced-motion preference.

Landing and authentication use the same SVG mascot renderer as study screens. The authentication version is clipped by its artwork card so Bubi emerges from the card edge; the landing version scales down and reserves space for the primary actions on mobile. Workspace tabs wrap as complete, single-line controls so narrow screens do not need horizontal tab scrolling.

## Changelog

- Initial tokens and shadcn base components (button, card, input, label, badge, table).
- Final Figma foundation: light mint canvas (`#f4f8f7`), navy actions/text (`#163b4a`), mint surfaces (`#bcebdc`), teal accent, coral game feedback, and Manrope-first typography. Token values are centralized in `frontend/src/index.css`.
