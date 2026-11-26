# Flow: server-backed frontend inputs and remaining handoffs

Status: implemented locally; the shared demo deployment is pending.

```mermaid
flowchart TD
  A[Open workspace notes] --> B[Load notebook, sources, and private notes from API]
  B --> C[Write a personal note and optionally choose a source/page]
  C --> M[Optional: request cited AI help on selected or full note text]
  M --> N[Review output and citations; apply only by user action]
  N --> D[POST/PATCH note; show server response]
  D --> E[Other devices load the same private note from the account API]
  C --> O[Optional: create a reusable source from note text]
  O --> P[POST /notebooks/:id/sources/text and normal ingestion]
  D --> F[Optional: open the note in Studio]
  G[Open workspace discussion] --> H[Load member messages and sources from API]
  H --> I[Write a message and optionally attach a source]
  I --> J[POST message; poll for new server messages every five seconds]
  K[Save a feed post] --> L[POST/DELETE account save state]
  L --> M2[GET /saved-posts returns saved posts]
  F --> Q[Load account drafts in Studio]
  Q --> R[Optional: request cited AI help on selected or full draft text]
  R --> S[Review output and citations; apply only by user action]
  S --> T[POST/PATCH draft; show server response]
  T --> U[Publishing handoff: no publication API is called]
  V[Find old local items] --> W[User explicitly chooses import]
  W --> X[Retry-safe API requests; keep browser copy]
```

Notes, discussions, drafts, and saved posts now use authenticated APIs. Notes remain private to their author; discussion is shared with notebook members. Old browser items are not uploaded automatically, and their local copies are preserved after explicit import. AI assistance sends selected/current editor text only after the user chooses an action; it returns citations but does not save the text or result. Turning a note into a workspace source is also an explicit action.

Publication, recovery email, notifications, and live classroom presence remain handoffs in [API_HANDOFF.md](../frontend/API_HANDOFF.md). The new note, discussion, draft, and saved-post endpoints are documented in [API_CONTRACT.md](../API_CONTRACT.md); the shared demo server still needs the migration and backend deployment.
