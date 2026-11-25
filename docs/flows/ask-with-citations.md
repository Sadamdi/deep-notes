# Flow: ask a question with citations

Status: implemented in the frontend and backend contract; live browser/API verification is pending because the local backend is unavailable.

```mermaid
sequenceDiagram
  participant U as Member (frontend)
  participant B as Backend
  participant D as PostgreSQL + pgvector
  participant G as Gemini API

  U->>B: POST /notebooks/:id/ask { question }
  B->>D: check caller is a member of the notebook
  alt not a member
    B-->>U: 404 NOT_FOUND
  end
  B->>G: embed the question
  B->>D: nearest chunks WHERE source belongs to this notebook
  alt no chunk close enough
    B-->>U: { grounded: false, text: fixed refusal, citations: [] }
  else chunks found
    B->>G: answer using only these chunks
    B->>B: map the answer to retrieved chunks, build citations
    B->>D: store question, answer, citations
    B-->>U: { grounded: true, text, citations[] }
  end
```

Rules: the notebook filter is inside the retrieval query; a citation must reference a chunk that was actually retrieved; an answer with no valid citation is converted to `grounded: false`.

The frontend renders citations as source/page controls. Selecting one opens the source page dialog using `GET /notebooks/:id/sources/:sourceId/pages/:page`; loading, request failure, and ungrounded answers remain visible as text states.
