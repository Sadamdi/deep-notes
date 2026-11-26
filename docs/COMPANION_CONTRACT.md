# Companion contract (mascot, explanations, uploads)

For the frontend and design team. The backend decides **what the mascot says and does**; the frontend only plays it. Everything below is in code as Zod schemas in [`shared/src/companion.ts`](../shared/src/companion.ts) and in the live API documentation at `/api/docs` (Swagger UI) and `/api/docs/openapi.json`.

Try it without logging in or waiting for the AI:
- `GET /api/v1/companion/catalog` — mascots, animation names, reactions, upload limits.
- `GET /api/v1/companion/demo` — a complete sample performance. `?scenario=notfound` gives the "answer not in the sources" case.

## 1. The idea in one picture

```
 user uploads files ──► backend reads them ──► user asks / opens a topic
                                                        │
                       ┌────────────────────────────────┘
                       ▼
        POST /notebooks/:id/companion/explain
                       │   body: { question, mascotId?, style, level }
                       ▼
   { performance: { beats: [ {say, emotion, animation, citation, durationMs}, ... ],
                    citations: [ {sourceTitle, page, quote} ], followUps: [...] } }
                       │
                       ▼
   frontend plays beat 0, 1, 2...  → mascot clip + speech bubble (text) + preview panel (citation)
```

Rules:
1. **Text is always there.** `say` is complete on its own. Sound and animation are extras, so the product works for people who are Deaf or have sound off.
2. **The animation list is closed.** The backend only ever sends names from the table below. Designers build exactly these clips; if a mascot lacks one, the frontend plays `idle`.
3. **The frontend never invents content.** It does not choose what to say or which source to show. It plays beats.

## 2. Mascots and teaching style

`GET /companion/catalog` returns `mascots: [{ id, name, role, tagline, animations[] }]`. Roles: `teacher`, `friend`, `coach`. **Names are placeholders** (Kiko, Mimi, Bobo) until the design team decides; they live in `backend/src/modules/companion/companion.service.ts` and change in one place.

Request: `POST /api/v1/notebooks/:id/companion/explain` (needs login and notebook membership)

| Field | Values | Default |
|---|---|---|
| `question` | 3 to 1000 characters | required |
| `mascotId` | an id from the catalog | the mascot whose role matches `style` |
| `style` | `teacher` (step by step), `friend` (casual), `coach` (motivating) | `teacher` |
| `level` | `simple`, `normal`, `detailed` | `normal` |

Response `data`: `{ questionId, question, performance }`.

## 3. The performance

```jsonc
{
  "id": "…", "mascotId": "kiko", "style": "teacher", "level": "simple",
  "grounded": true,               // false = answer not found in the sources (one shrug beat)
  "beats": [
    { "index": 0, "say": "Halo! Hari ini kita bahas topologi bintang.",
      "emotion": "senang", "animation": "wave",
      "citation": null,           // or an index into `citations`: show that passage in the preview panel
      "durationMs": 2200,         // rough time for typing effect or clip; may be ignored
      "voiceNoteId": null }       // reserved for generated voice (see section 7)
  ],
  "citations": [ { "sourceId": "…", "sourceTitle": "Catatan Jaringan", "page": 1, "quote": "…" } ],
  "followUps": ["Apa beda topologi bintang dan bus?"]
}
```

Player logic (suggested):
1. For each beat in order: play `animation`, type or speak `say`, and if `citation` is not null open `citations[citation]` in the preview panel (fetch the full page with `GET /notebooks/:id/sources/:sourceId/pages/:page`).
2. When the last beat ends, play `idle` and show `followUps` as buttons (each sends a new explain request).
3. If `grounded` is false, show the single beat and offer "add a source".
4. Show the citation chips under the speech bubble; clicking one opens the page preview.

## 4. Animation vocabulary (closed list, 22 clips)

| Name | Use it for |
|---|---|
| `idle` | waiting, breathing, blinking |
| `wave` | greeting, goodbye |
| `nod` | agreeing, "yes, that is right" |
| `shake_head` | "not quite" |
| `think` | reasoning, loading while the AI works |
| `point_left`, `point_right`, `point_up` | pointing at content, the preview panel, "pay attention" |
| `lean_in` | curious, asking the user something |
| `read_book` | reading the source |
| `hold_magnifier` | looking closely at a detail |
| `write_on_board` | explaining step by step (default for idle) |
| `raise_hand` | "I found something" or "I have a question" |
| `shrug` | does not know, answer not in the sources |
| `thumbs_up` | well done, encouragement |
| `clap`, `celebrate` | small and big celebration |
| `jump`, `dance` | excitement, rewards |
| `sad`, `facepalm` | disappointment, playful "oops" |
| `sleepy` | long idle |

The six canonical Figma-backed Bubi expressions are `idle`, `senang`, `sedih`, `marah`, `antusias`, and `semangat`. Every beat has both an emotion and an animation, so a mascot can combine them (for example `point_right` with `senang`). Older stored labels (`neutral`, `curious`, `happy`, `thinking`, `encouraging`, `concerned`) are normalized to these expressions when read. New AI prompts and API responses use the six canonical names; `marah` is reserved for anger in the cited material and must never blame the learner.

Frontend playback keeps the original transparent Figma SVG for each expression. It first shows the image asset, then renders the same SVG inline with unique local IDs so its masks and references remain independent when several Bubi characters appear together. The player starts a short clip when the active beat or reaction changes and plays every clip in the table above except `idle`; clips that name a prop show the gesture only. Clips missing from the selected mascot's catalog hold a still pose. Missing or malformed expression assets fall back to Idle. `prefers-reduced-motion` keeps the requested face visible and disables movement. The active beat's text and every citation stay available when the user changes steps or reduces motion.

Adding a clip: add the name to `ANIMATIONS` in `shared/src/companion.ts`, to this table, and tell the design team, all in one pull request.

## 5. Reactions the frontend can trigger without the AI

`GET /companion/catalog` returns `reactions`. Use these for instant feedback (no request needed):

| Event | Animation | Emotion |
|---|---|---|
| `greeting` | `wave` | `senang` |
| `waiting_for_ai` | `think` | `idle` |
| `new_source_ready` | `raise_hand` | `antusias` |
| `answer_not_found` | `shrug` | `sedih` |
| `quiz_correct` | `nod` | `senang` |
| `quiz_wrong` | `sad` | `semangat` |
| `quiz_perfect` | `celebrate` | `semangat` |
| `streak_kept` | `clap` | `semangat` |
| `long_idle` | `sleepy` | `idle` |

## 6. Uploads

`POST /notebooks/:id/sources/file` (multipart field `file`, optional `title`, 15 MB).

| Type | Extensions | Citation points to |
|---|---|---|
| PDF (text or scanned) | `.pdf` | page number; scans are read by a vision model |
| Slides | `.pptx` | slide number |
| Word | `.docx` | the source title (no pages) |
| Spreadsheet | `.xlsx`, `.csv` | sheet number for xlsx; rows are read as "column: value" |
| Notes | `.txt`, `.md`, or pasted text (`/sources/text`) | the source title |
| Image (photo of a board, handwritten note, diagram) | `.png`, `.jpg`, `.jpeg`, `.webp` | the source title; text is read by a vision model |
| Web page | `/sources/link` | the source title |

Flow for the upload screen: send the file, get `202 { id, status: "processing" }`, then poll `GET /notebooks/:id/sources` every 2 seconds until `status` is `ready` (play `new_source_ready`) or `failed` (show `error`). The preview of the original file is the extracted text per page (`GET …/sources/:sourceId/pages/:page`); the backend does not keep the original file.

## 7. Planned, not built yet (frontend can design for it)

| Item | Intended shape | Status |
|---|---|---|
| Voice notes (mascot speaks) | `beat.voiceNoteId` → `GET /voice-notes/:id` returns audio; until then it is always `null`. Browser speech synthesis can read `say` in the meantime. | planned |
| Audio or recorded lectures as sources | `.mp3 .m4a .wav .mp4`, transcript with minute and second citations | planned, needs a transcription test first |
| Visualisation of notes (mind map, timeline) from a source | `GET /notebooks/:id/sources/:sourceId/visual?kind=mindmap` returning nodes and edges with page references | planned |
| Live streaming of a performance | server-sent events, one beat at a time | planned; the beats array is enough for now |

Do not build UI that depends on a planned item before the backend marks it implemented in [API_CONTRACT.md](API_CONTRACT.md).

## 8. Errors the player must handle

Same envelope as the rest of the API: `{ success: false, error: { code, message } }`. Common codes: `UNAUTHORIZED` (sign in), `NOT_FOUND` (not a member), `RATE_LIMITED` (40 AI requests per 10 minutes; play `sleepy` or a "rest a moment" message), `VALIDATION`.

## 9. Tambahan (25 Nov)
- `POST /notebooks/:id/companion/teach-back`: pemain menjelaskan, maskot menilai dan membalas sebagai murid. Lihat [GAME_CONTRACT.md](GAME_CONTRACT.md).
- `sourceIds` pada `/companion/explain` membatasi jawaban ke sumber acuan yang dipilih.
- `GET /notebooks/:id/sources/:sourceId/visual?kind=mindmap` memberi data peta konsep (simpul dan garis) untuk panel visualisasi.
