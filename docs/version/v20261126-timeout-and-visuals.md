# Gateway timeout, upload limit, classroom and concept map visuals

| Attribute | Value |
|---|---|
| **Version** | v0.0.10 |
| **Date** | 2026-11-26 |
| **Status** | In Progress |
| **Author** | Sulthan Adam Rahmadi |
| **Type** | Fix |
| **Area** | deploy / frontend / docs |
| **Branch** | `adam/fix-live-timeout-visuals` |
| **PR** | #5; gateway region follow-up on `adam/gateway-region` |

## 1. Why

On the live site, starting a game session showed "Server mengirim respons yang tidak dapat dibaca" and the server log showed requests aborted at about 24 seconds (game session, concept map). The edge gateway must answer within 25 seconds. The upload box also promised 15 MB although the gateway rejects about 4.5 MB, and the classroom and concept map were hard to read.

## 2. Plan

This entry was written after the code.

- [x] gateway on the Node.js runtime with a 100 second limit
- [x] upload limit 4 MB in the UI
- [x] illustrated classroom (design page 10) replaces the three.js scene; `three` removed
- [x] concept map as a left-to-right tree; format previews on the visualisation page
- [x] draft video tool

## 3. Files changed

`deploy/gateway/api/gateway.js`, `frontend/src/features/visualization/`, `ClassroomScene` and `ConceptTree` pages, `SourceUploader.tsx`, `frontend/package.json`, `agents/tools/`, docs.

## 4. Verification

- [x] lint, type-check, frontend tests (35), frontend build (26 Nov 2026)
- [x] gateway handler called locally against the live server: health and companion catalog 200
- [x] classroom, concept map and visualisation pages viewed on the local app, no console errors
- [x] gateway and frontend deployed (26 Nov 2026); a solo game session was created on the live site (201 after 24.5 s on the server)
- [x] classroom page viewed on the live site; concept map and visualisation page checked locally only
- [x] gateway moved from `iad1` to `pdx1`: median of 15 requests went from 0.80 s to 0.70 s (health) and from 0.74 s to 0.67 s (catalog)

## 5. Data impact

None.

## 6. Rollback

Promote the earlier gateway and frontend deployments in the Vercel dashboard.
