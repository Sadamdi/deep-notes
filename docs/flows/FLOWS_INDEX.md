# Flows index

Execution flows describe what happens step by step across frontend, backend, database and AI, with a Mermaid diagram. One file per flow in `docs/flows/`.

| Flow | Doc | Status |
|---|---|---|
| Ask a question with citations | [ask-with-citations.md](ask-with-citations.md) | implemented; live verification pending |
| Use Bubi on notes and drafts | [workspace-ai-assist.md](workspace-ai-assist.md) | implemented locally; live route deployment pending |
| Server-backed notes, discussion, drafts, saved posts, and other handoffs | [frontend-local-handoffs.md](frontend-local-handoffs.md) | implemented locally; demo deployment pending |
| Friends, workspace invitations, and game sessions | [friends-and-game.md](friends-and-game.md) | implemented locally; API checks passed; six mocked-browser cases reported success but runner shutdown is unverified; live deployment verification pending |
| Audio, slide timeline, and spreadsheet chart sources | [source-media-visualization.md](source-media-visualization.md) | implemented locally; fake-AI tests passed; real Gemini audio verification and shared deployment pending |
