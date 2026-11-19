# Flow: ask a question with citations

Status: planned (nothing here is implemented yet).

```mermaid
sequenceDiagram
  participant U as Member (frontend)
  participant B as Backend
  participant D as PostgreSQL + pgvector
  participant G as Gemini API

  U->>B: POST /notebooks/:id/questions { question }
  B->>D: check caller is a member of the notebook
  alt not a member
    B-->>U: 404 NOT_FOUND
  end
  B->>G: embed the question
  B->>D: nearest chunks WHERE source belongs to this notebook
  alt no chunk close enough
    B-->>U: Answer { grounded: false, text: "not found in the sources" }
  else chunks found
    B->>G: answer using only these chunks
    B->>B: map the answer to retrieved chunks, build citations
    B->>D: store question, answer, citations
    B-->>U: Answer { grounded: true, text, citations[] }
  end
```

Rules: the notebook filter is inside the retrieval query; a citation must reference a chunk that was actually retrieved; an answer with no valid citation is converted to `grounded: false`.
