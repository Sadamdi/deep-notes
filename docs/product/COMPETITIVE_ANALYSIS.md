# Competitive analysis (for the proposal)

Purpose: answer the judge's remark that Deep Notes was compared to NotebookLM without a feature comparison. This page must contain only claims we have verified. Unverified rows stay marked until someone checks the official page and records the date.

## What the existing tool already does (verified from public sources)

NotebookLM, from Google's own announcements and press coverage found on 23 Nov 2026:

| Capability | Status | Source |
|---|---|---|
| Answers grounded in the user's sources, with citations | exists | [Google blog: ways to use NotebookLM](https://blog.google/technology/google-labs/notebooklm-student-features/) |
| Flashcards and quizzes generated from sources, with an explain action that cites sources | exists (since Sep 2025) | [9to5Google](https://9to5google.com/2025/09/08/notebooklm-flashcards-quizzes/) |
| Quizzes can be shared with others by a link | exists | [AlternativeTo](https://alternativeto.net/news/2025/9/google-notebooklm-adds-flashcards-quizzes-and-new-formats-for-audio-overviews) |
| Notebook sharing with viewer or editor access, and public links | exists | [Maginative](https://www.maginative.com/article/googles-notebooklm-now-lets-you-share-ai-powered-notebooks-with-a-link/) |
| Audio Overviews | exists | Google blog above |
| Education tier: share a notebook with students and view engagement | exists | [Google one-pager](https://services.google.com/fh/files/misc/gemininotebook_gfe_one_pager.pdf) |

**Consequence for our pitch:** "answers with citations" and "quizzes from sources" are **not** differentiators. Saying they are would be wrong, and the judge already noticed the weak comparison. The proposal must not claim them as unique.

## Where Deep Notes can honestly differ (to build and then verify)

These are our bets. Each must be implemented and demonstrated before it appears in the proposal as a feature; until then it is "planned".

| Differentiator | Why it matters to a study group | Needs verification against NotebookLM |
|---|---|---|
| Per-member contribution view (who added which sources, who asked what, who finished which quiz) | groups ask "who did what"; the survey asked about this | yes: check whether NotebookLM shows per-member contributions to peers (the education tier shows engagement to a teacher, not to peers) |
| Group-level progress: quiz results compared across the group, weak topics of the group | study groups prepare for the same exam | yes |
| Public, course-organized notebooks that classmates can discover and join, with categories | peers reuse each other's organized material | yes: NotebookLM offers link sharing, not a browsable community feed (confirm) |
| Text-first explanation steps with an expressive companion that reacts per step | inclusive for students who need text; fun for others | n/a (our design); confirm no equivalent |
| Built for Indonesian campus study groups (Indonesian UI and prompts, invites by username or link, light on a phone) | target users | partly |

## Comparison table to publish (fill in only after verification)

| Feature | Deep Notes | NotebookLM | General AI chat | Chat group + cloud folder |
|---|---|---|---|---|
| Answers only from your sources | planned (core) | yes | no | n/a |
| Citation with page | planned (core) | yes (verify page-level) | no | n/a |
| Quizzes from sources | planned | yes | partly (not source-bound) | no |
| Per-member contributions visible to the group | planned | verify | no | no |
| Group-level quiz progress | planned | verify | no | no |
| Public course notebooks to discover | planned (later) | verify | no | no |
| Expressive companion explanations | planned (later) | no (verify) | no | no |

Update this table with real results and dates; delete any row we cannot support.
