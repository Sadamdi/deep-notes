# F-03 and F-12 Source upload and ingestion

Status: implemented and tested. PDF, text, Markdown, DOCX, PPTX and web links.

Endpoints: `POST /notebooks/:id/sources/file` (multipart field `file`), `/sources/text`, `/sources/link`; `GET /sources`, `GET /sources/:sourceId`, `GET /sources/:sourceId/pages/:page`, `DELETE /sources/:sourceId`.

Flow: validate type and signature, extract text per page, split into passages (about 900 characters, on paragraph and sentence boundaries), embed in batches, store with the page number, set status `ready`. Work runs in-process, two at a time; status is `processing`, `ready` or `failed` (with a short reason) on the source row.

Business rules
- BR-01 Limit 15 MB per file; at most 400 passages per source. The original file is not kept: only the extracted text and embeddings are stored.
- BR-02 File type is decided by extension and checked against the file signature (`%PDF`, `PK`), so a renamed file is rejected.
- BR-03 PDF and PPTX keep real page or slide numbers. Text, DOCX and links have no pages, so their citations show the source title only.
- BR-04 Scanned PDFs without a text layer are rejected with a clear message (no OCR yet).
- BR-05 Links: only http and https, no credentials in the URL, every address the host resolves to must be public (blocks loopback, private, link-local and cloud metadata ranges), redirects are re-checked up to 3 hops, 2 MB and 15 s limits, only HTML or plain text. Known gap: the address is checked before the request, not pinned during it (DNS rebinding); acceptable for the demo, to be closed with a pinned resolver.
- BR-06 Only the uploader or the owner can delete a source; editors and owners can add.
- BR-07 Uploaded text is treated as data. Prompts tell the model to ignore instructions found inside sources (see F-04).
