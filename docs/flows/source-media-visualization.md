# Audio and structured source visualizations

```mermaid
flowchart TD
  A[Member uploads audio, PPTX, CSV, or XLSX] --> B[Validate notebook role, size, extension, and signature]
  B --> C{Source format}
  C -->|Audio| D[Gemini transcribes to timestamped segments]
  C -->|PPTX| E[Extract text with original slide numbers]
  C -->|CSV or XLSX| F[Extract searchable passages and structured cells]
  D --> G[Embed searchable passage text]
  E --> G
  F --> G
  G --> H[Store passages and derived metadata by source]
  H --> I[Mark source ready]
  I --> J{Member opens a view}
  J -->|Audio| K[GET transcript segments]
  J -->|PPTX| L[GET ordered slide timeline]
  J -->|CSV or XLSX| M[GET numeric chart series]
  J -->|Any ready source| N[GET concept mind map]
  H --> O[Source deletion cascades derived content]
```

Original audio is not saved. Audio transcription requires the backend Gemini configuration. Spreadsheet charts use stored extracted values without AI generation, while PPTX timeline entries retain source slide numbers. Every read is notebook-member scoped.
