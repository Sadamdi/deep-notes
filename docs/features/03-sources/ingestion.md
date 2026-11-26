# F-03 and F-12 Source upload and ingestion

Status: implemented locally with mocked AI integration tests. Audio transcription needs a configured Gemini key and has not been verified against a real model in this environment.

Endpoints: `POST /notebooks/:id/sources/file` (multipart field `file`), `/sources/text`, `/sources/link`; `GET /sources`, `GET /sources/:sourceId`, `GET /sources/:sourceId/pages/:page`, `GET /sources/:sourceId/transcript`, `GET /sources/:sourceId/visual?kind=mindmap|timeline|chart`, `DELETE /sources/:sourceId`.

Flow: validate type and signature, extract text per page, split into passages (about 900 characters, on paragraph and sentence boundaries), embed in batches, store with the page number, set status `ready`. Work runs in-process, two at a time; status is `processing`, `ready` or `failed` (with a short reason) on the source row.

Business rules
- BR-01 Limit 15 MB per file; at most 400 passages per source. The original file is not kept: only the extracted text and embeddings are stored.
- BR-02 File type is decided by extension and checked against the file signature (`%PDF`, `PK`), so a renamed file is rejected.
- BR-03 PDF and PPTX keep real page or slide numbers. Text, DOCX and links have no pages, so their citations show the source title only.
- BR-04 Scanned PDFs (no text layer) are read by a vision model (`gemini-2.5-flash`, page by page, instructed to transcribe without adding anything) in the background; limit 12 MB. This needs the AI keys; without them such files are rejected with a clear message. Checked live on a synthetic scanned page: the text came back correctly. Handwriting and poor scans are not evaluated.
- BR-08 At most 40 sources per notebook.
- BR-05 Links: only http and https, no credentials in the URL, every address the host resolves to must be public (blocks loopback, private, link-local and cloud metadata ranges), redirects are re-checked up to 3 hops, 2 MB and 15 s limits, only HTML or plain text. Known gap: the address is checked before the request, not pinned during it (DNS rebinding); acceptable for the demo, to be closed with a pinned resolver.
- BR-06 Only the uploader or the owner can delete a source; editors and owners can add.
- BR-07 Uploaded text is treated as data. Prompts tell the model to ignore instructions found inside sources (see F-04).
- BR-09 Spreadsheets: XLSX sheets become numbered pages and each row is stored as `column: value` pairs; CSV handles quotes, BOM and semicolons. Images (PNG, JPG, WEBP) are read by the vision model like scanned pages. At most 2000 rows per sheet are indexed.
- BR-10 CSV/XLSX cell values are retained as structured rows (up to 2000 rows and 60 columns per sheet) for charts. The first column labels categories; remaining columns with numeric cells form data series. Values are parsed without AI or rounding.
- BR-11 PPTX slide text keeps the original slide number and is returned in slide order by `kind=timeline`. Each page retains at least one passage even when its extracted text is shorter than 20 characters.
- BR-12 MP3, M4A, MP4, WAV, AAC, OGG and WEBM files are checked against their container signature where applicable, transcribed in the background, and stored only as timestamped text segments and searchable passages. The original audio is not persisted. Gemini must be configured for this path; the transcript route is available only after source ingestion reaches `ready`.
- BR-13 Sources remain notebook-scoped. Transcript, timeline, chart, and source page requests all use the existing member check; derived tables and transcripts cascade when the source is deleted.
