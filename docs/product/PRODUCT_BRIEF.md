# Product brief

## One line

Deep Notes gives a student study group one shared notebook per course whose AI answers only from the group's own sources
and always shows where each statement came from.

## Problem

Students keep learning materials in scattered places (slides, journal PDFs, chat groups, personal notes). Group work repeats
effort, and nobody can easily check whether a summary or an AI answer is supported by the course materials. General AI chat
tools answer from general knowledge, so students cannot tell which statements come from their sources.

## Users

Undergraduate students at Indonesian universities who work in study groups of three to five members on course assignments
and prepare for exams together.

## Evidence so far

A small pilot survey (6 respondents, 3 to 4 November 2026) was used in the abstract; see
[abstract-preliminary.md](abstract-preliminary.md). The sample is small and not representative. Collection continues, and
any figure we publish must come from real responses.

## Version one scope (the core flow)

1. A member creates a notebook for a course and invites the group.
2. Members upload sources (PDF, slides, links).
3. Anyone asks a question. The answer uses only retrieved passages and shows source and page. If nothing supports an answer
   the assistant says "not found in the sources".
4. The notebook generates short quizzes from the same sources; the group sees results.
5. The notebook shows who contributed which sources.

Explicitly later: public discovery of notebooks, finding study partners, handwriting/drawing input, animations.

## Principles

- **Grounded or silent.** No answer without a citation. Better "not found" than a guess.
- **Text first.** Information must be reachable as text; motion and 3D are optional views (inclusive design).
- **Honest labels.** Sample data, simulations and planned features are labeled as such.
- **Low cost.** Prefer cheap or free tiers; cap uploads and AI calls per notebook.

## Main risks

| Risk | Mitigation |
|---|---|
| Unsupported or wrong answers | retrieval limits, mandatory citations, "not found" fallback, show the cited passage |
| Copyright of uploaded materials | per-notebook privacy, no public sharing in version one, demo with public or team-written material |
| AI cost and rate limits | per-notebook quotas, caching of embeddings, small chunk counts per question |
| Scope too large for the timeline | ship the core flow first; social features after the demo works |
