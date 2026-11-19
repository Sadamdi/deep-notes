Team name: Aku Nak Menang Hackathon
Project title: Deep Notes: Shared, Source-Grounded AI Notebooks for Student Study Groups
Selected case: Case 1: Smarter Campus and Learning
Members: Sulthan Adam Rahmadi (leader), Maulvi Ilmullah Faturrahman Al Afghani, Alya Nugrahanti, Ulinnuha Mahbubi

Abstract

1. Problem. Students preparing group assignments and exams keep their learning materials in scattered places: lecture slides, journal PDFs, chat groups, and personal notes. Effort is duplicated, and nobody can easily check whether a summary or an AI answer is supported by the course materials. General AI chat tools answer from general knowledge, so students cannot tell which statements come from their sources.

2. Intended Users. Undergraduate students at Indonesian universities who work in study groups of three to five members on course assignments and prepare for exams together.

3. Supporting Observations or Evidence. We ran a small pilot survey of 6 undergraduate students (classes of 2024 and 2025, from science, technology, and engineering programs at several campuses). All 6 use AI tools for study daily and check answers against lecture slides, yet confidence that answers match the lecturer's material averaged 3.5 out of 5. Four of 6 sometimes or often repeat work or do not know who has done what in a group. Interest in a tool that answers only from the group's materials and shows the source page averaged 3.7 out of 5. The sample is small and not representative, so this is an early signal and collection continues. [1]

4. Proposed Solution and Core User Flow. Deep Notes is a web application where a study group keeps one shared notebook per course or assignment. A member creates a notebook and invites the group. Members upload sources (PDF, slides, links). Anyone can ask a question, and the assistant answers only from those sources and shows the source and page it used. The notebook then generates short quizzes from the group's own sources, and the group sees quiz results and who contributed which sources. Version one covers this flow for one course; public discovery of notebooks is planned later.

5. How It Differs from Existing Alternatives. Today students share files in chat groups and cloud folders and use general AI assistants individually. Existing AI notebook tools let an owner share a notebook with viewers or editors [2]. Deep Notes differs by being built around the study group: answers are limited to the group's sources and cite them, quizzes come from the same sources, and contributions are visible.

6. Planned Technologies. A responsive web application, a relational database, text extraction from documents, retrieval over uploaded sources, and a hosted language model API (planned: Gemini or a lower-cost model). AI is used for answering and quiz generation, and its role will be disclosed.

7. Expected Benefit and Development Plan. Expected benefit: students find supported answers faster and review more regularly. A planned two-week trial with a small group compares time to find an answer and quiz completion against their current method. Plan: week 1 accounts, notebooks, and uploads; week 2 cited question answering; week 3 quizzes and the trial. Main risk: unsupported answers. We limit answers to retrieved passages with citations and reply "not found" when evidence is missing.

Source Acknowledgments
[1] Team pilot survey, 3 to 4 November 2026, 6 respondents (Google Form, anonymous).
[2] Google Cloud, "Share notebooks", NotebookLM Enterprise documentation, accessed 4 November 2026.
