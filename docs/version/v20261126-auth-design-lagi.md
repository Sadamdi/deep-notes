# Authentication screens aligned with Design Lagi

| Attribute | Value |
|---|---|
| **Version** | v0.0.7 |
| **Date** | 2026-11-26 |
| **Status** | In Progress |
| **Author** | Deep Notes team |
| **Type** | Feature |
| **Area** | frontend / docs |
| **Branch** | `faturrahman82/auth-design-lagi` |
| **PR** | — |

## 1. Why

The first authentication screens should match the current Sign In and Sign Up designs on the `Design Lagi` Figma page while keeping their existing API behavior.

## 2. Plan

- [x] Rebuild the shared sign-in/sign-up frame around the Figma desktop layout, gradient illustration panel, typography, spacing, and field styles.
- [x] Keep login and registration schemas, backend mutations, recovery link, validation, error feedback, and password visibility working.
- [x] Use the existing Tailwind, shadcn controls, Lucide icons, brand tokens, and local Figma SVG assets.
- [x] Provide a responsive narrow-screen layout and accessible keyboard/focus states.
- [x] Verify both screens visually at the available desktop viewport and run frontend type-check and production build.
- [ ] Inspect the narrow-screen layout in a mobile viewport.
- [x] Data impact: none; no API or database changes.

## 3. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| The Figma page only provides desktop auth frames | A literal layout can overflow on phones | Reflow the same content into a single-column mobile layout |
| Auth screens already connect to the backend | Visual changes could break form submission | Preserve current shared schemas, hooks, and navigation handlers |

## 4. Verification

The local `/login` and `/register` screens were opened in the browser at a 1264×711 desktop viewport. Both headings, descriptions, labeled fields, action buttons, and cross-links are visible. Frontend TypeScript check and production build passed. Mobile viewport inspection and auth API submission remain unverified; no account was created. Vite reported the existing 535.75 kB three.js chunk warning.
