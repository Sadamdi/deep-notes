import type { Citation, NotebookRole, Performance } from "@deep-notes/shared";

export type WorkspaceDetail = {
  id: string;
  title: string;
  course: string | null;
  description: string | null;
  category: string | null;
  visibility: "private" | "public";
  ownerId: string;
  role: NotebookRole;
};

export type WorkspaceSource = {
  id: string;
  title: string;
  kind: string;
  status: "processing" | "ready" | "failed";
  error: string | null;
  pageCount: number | null;
  chunkCount: number;
  origin: string | null;
  uploadedBy: string;
  uploadedByName: string;
};

export type SelectedPreviewTarget = {
  sourceId: string;
  sourceTitle: string;
  page: number;
  highlightQuote?: string;
};

export type WorkspaceQuestionRow = {
  id: string;
  question: string;
  grounded: boolean;
  answer: string;
  citations: Citation[];
  askedByName: string;
  createdAt: string;
};

export type CompanionExplainResponse = {
  questionId: string;
  question: string;
  performance: Performance;
};

export type WorkspaceQuizSummary = {
  id: string;
  title: string;
  kind: "practice" | "weekly" | "exam";
  timeLimitSec: number | null;
  perQuestionSec: number | null;
  dueAt: string | null;
  questionCount: number;
  myAttempts: number;
  myBest: number | null;
};

export type WorkspaceQuizDetail = {
  id: string;
  title: string;
  kind: "practice" | "weekly" | "exam";
  timeLimitSec: number | null;
  perQuestionSec: number | null;
  dueAt: string | null;
  questions: Array<{
    question: string;
    options: [string, string, string, string];
    topic: string;
  }>;
};

export type WorkspaceAttemptResponse = {
  attemptId: string;
  score: number;
  total: number;
  durationMs: number | null;
  results: Array<{
    correct: boolean;
    correctIndex: number;
    explanation: string;
    topic: string;
    sourceId: string;
    sourceTitle: string;
    page: number | null;
  }>;
};
