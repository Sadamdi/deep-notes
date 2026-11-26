# Flow: local-only frontend work and backend handoffs

Status: implemented in the browser; local persistence is limited to the current device and browser profile.

```mermaid
flowchart TD
  A[Open workspace notes] --> B[Load notebook and sources from API]
  B --> C[Write a personal note and choose a ready source/page]
  C --> M[Optional: request cited AI help on selected or full note text]
  M --> N[Review output and citations; apply only by user action]
  N --> D[Save to localStorage on this device]
  C --> O[Optional: create a reusable source from note text]
  O --> P[POST /notebooks/:id/sources/text and normal ingestion]
  D --> E[Optional: copy the note into a local Studio draft]
  F[Open workspace discussion] --> G[Load workspace, member identity, and sources from API]
  G --> H[Write a message and optionally attach a source]
  H --> I[Save message to localStorage on this device]
  J[Save a feed post] --> K[Store post ID in localStorage]
  K --> L[Fetch the current post with GET /posts/:id]
  E --> Q[Optional: request cited AI help on selected or full draft text]
  Q --> R[Review output and citations; apply only by user action]
  R --> S[Publishing handoff: no publication API is called]
```

The notes, discussion messages, saved-post IDs, and Studio drafts are not synchronized with another browser or workspace member. The UI states this before a user saves locally. AI assistance sends selected/current editor text only after the user chooses an action; it returns citations but does not save the text or result. Turning a note into a workspace source is also an explicit action. Saved posts are retrieved through the existing `GET /posts/:id`; unavailable or deleted posts are omitted from the local saved list.

The backend handoff is recorded in [API_HANDOFF.md](../frontend/API_HANDOFF.md). Notes, discussion, and drafts remain local; the documented AI assist and source-ingestion endpoints are called only for the user's explicit actions.
