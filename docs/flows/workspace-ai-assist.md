# Workspace AI assistance

The ask, companion, quiz, and game tools reuse one per-notebook source scope. Notes, discussion drafts, and Studio send their current text only when the user chooses an AI action. AI assistance itself is not stored.

```mermaid
sequenceDiagram
  actor User
  participant UI as Workspace editor
  participant API as Notebook API
  participant DB as PostgreSQL
  participant AI as Configured AI provider

  User->>UI: Choose an action and review text
  UI->>UI: Validate task, input, and source scope with shared Zod
  UI->>API: POST /notebooks/:id/ai/assist
  API->>API: Require session, notebook membership, rate limit, validate body
  API->>DB: Retrieve ready chunks in notebook and selected source scope
  DB-->>API: Ranked passages with page and source metadata
  alt No relevant passage
    API-->>UI: grounded false, fixed not-found text, no citations
  else Relevant passages found
    API->>AI: Task, user text as untrusted context, and retrieved passages
    AI-->>API: Text, suggested items, and passage indexes/quotes
    API->>API: Validate citation indexes and quotes against retrieved passages
    alt No valid citation
      API-->>UI: grounded false, fixed not-found text, no citations
    else Valid citations
      API-->>UI: grounded true, output, items, citations
      UI-->>User: Show output and source-page references for review
      User->>UI: Explicitly apply result or leave unchanged
    end
  end
```

Notes, discussion messages, and Studio drafts persist through their authenticated APIs. A user can still explicitly submit a note through `POST /notebooks/:id/sources/text`; source-role checks and normal ingestion then apply.
