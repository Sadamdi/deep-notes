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
| `radius` (0.625rem base) | corner radius; `rounded-sm/md/lg/xl` derive from it |
| font | Inter, falling back to system sans |

## Domain components (to build)

| Component | Behavior |
|---|---|
| Answer card | shows the answer text and a list of citation chips; an ungrounded answer shows the `warning` "not found in the sources" state and no chips |
| Citation chip | `cite` color, source title and page; click opens the source at that page with the quoted passage highlighted |
| Source row | title, type, who added it, status (processing, ready, failed) |
| Contribution bar | per-member counts of sources and questions, with text values |
| Quiz card | one question at a time, keyboard friendly, result summary at the end |

## Changelog

- Initial tokens and shadcn base components (button, card, input, label, badge, table).
