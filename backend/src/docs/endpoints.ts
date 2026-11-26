import {
  answerRoundSchema,
  createCommentSchema,
  createDiscussionMessageSchema,
  createWriterDraftSchema,
  createPostSchema,
  createSessionSchema,
  teachBackSchema,
  addLinkSourceSchema,
  addMemberSchema,
  addTextSourceSchema,
  askQuestionSchema,
  changePasswordSchema,
  changeRoleSchema,
  createWorkspaceNoteSchema,
  createAssignmentSchema,
  createInviteSchema,
  createNotebookSchema,
  deleteAccountSchema,
  explainRequestSchema,
  friendRequestSchema,
  generateQuizSchema,
  joinRequestSchema,
  loginSchema,
  performanceSchema,
  profileSchema,
  registerSchema,
  submitAttemptSchema,
  updateWorkspaceNoteSchema,
  updateWriterDraftSchema,
  updateAssignmentSchema,
  updateNotebookSchema,
  workspaceAiAssistSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  publishArticleSchema,
  updatePublishedArticleSchema,
  articleCommentSchema,
  notificationListSchema,
  classroomPresenceSchema,
  articleDetailSchema,
  publicationListSchema,
  publishedArticleSchema,
  sourceVisualResponseSchema,
  sourceTranscriptSchema,
} from "@deep-notes/shared";
import type { ZodType } from "zod";

export type Method = "get" | "post" | "put" | "patch" | "delete";

export interface Endpoint {
  method: Method;
  /** Express-style path under /api/v1, for example /notebooks/:id */
  path: string;
  tag: string;
  summary: string;
  /** default true; false for routes that work without a session cookie */
  auth?: boolean;
  /** minimum notebook role, when the route is scoped to a notebook */
  role?: "viewer" | "editor" | "owner";
  body?: ZodType;
  /** multipart upload instead of JSON */
  upload?: boolean;
  response?: ZodType;
  /** feature ids from docs/PLAN_SEMIFINAL.md */
  feature?: string;
  notes?: string;
}

const NB = "/notebooks/:id";

/**
 * The single registry the OpenAPI document is generated from. When you add or change a route, change it here too:
 * tests fail if a registered operation does not exist on the server.
 */
export const ENDPOINTS: Endpoint[] = [
  { method: "get", path: "/health", tag: "Platform", summary: "Service status and time", auth: false },

  { method: "post", path: "/auth/register", tag: "Accounts", feature: "F-01", summary: "Create an account and sign in", auth: false, body: registerSchema },
  { method: "post", path: "/auth/login", tag: "Accounts", feature: "F-01", summary: "Sign in (sets the httpOnly session cookie)", auth: false, body: loginSchema },
  { method: "post", path: "/auth/password-reset/request", tag: "Accounts", summary: "Request a single-use password reset email", auth: false, body: passwordResetRequestSchema },
  { method: "post", path: "/auth/password-reset/confirm", tag: "Accounts", summary: "Set a new password from a 30-minute reset link", auth: false, body: passwordResetConfirmSchema },
  { method: "post", path: "/auth/logout", tag: "Accounts", feature: "F-01", summary: "Sign out this device", auth: false },
  { method: "get", path: "/auth/me", tag: "Accounts", feature: "F-01", summary: "Current user" },
  { method: "patch", path: "/me/profile", tag: "Accounts", feature: "F-14", summary: "Set course and study-partner opt-in", body: profileSchema },
  { method: "get", path: "/me/partners", tag: "Accounts", feature: "F-14", summary: "Study partners with the same course (opt-in only)" },
  { method: "get", path: "/me/friends", tag: "Accounts", summary: "List friends and pending friend requests" },
  { method: "post", path: "/me/friend-requests", tag: "Accounts", summary: "Request friendship by exact email or public user ID", body: friendRequestSchema },
  { method: "post", path: "/me/friend-requests/:requestId/accept", tag: "Accounts", summary: "Accept an incoming friend request" },
  { method: "delete", path: "/me/friend-requests/:requestId", tag: "Accounts", summary: "Reject or cancel a pending friend request" },
  { method: "delete", path: "/me/friends/:userId", tag: "Accounts", summary: "Remove an accepted friend" },
  { method: "post", path: "/me/password", tag: "Accounts", feature: "F-01", summary: "Change password and sign out other devices", body: changePasswordSchema },
  { method: "post", path: "/me/logout-all", tag: "Accounts", feature: "F-01", summary: "Sign out everywhere" },
  { method: "get", path: "/me/export", tag: "Accounts", feature: "F-01", summary: "Download my own data" },
  { method: "get", path: "/me/drafts", tag: "Studio", summary: "List my private writer drafts" },
  { method: "post", path: "/me/drafts", tag: "Studio", summary: "Create a writer draft", body: createWriterDraftSchema },
  { method: "patch", path: "/me/drafts/:draftId", tag: "Studio", summary: "Update my writer draft", body: updateWriterDraftSchema },
  { method: "delete", path: "/me/drafts/:draftId", tag: "Studio", summary: "Delete my writer draft" },
  { method: "delete", path: "/me", tag: "Accounts", feature: "F-01", summary: "Delete my account (409 while I own notebooks)", body: deleteAccountSchema },

  { method: "post", path: "/notebooks", tag: "Notebooks", feature: "F-02", summary: "Create a notebook (creator becomes owner)", body: createNotebookSchema },
  { method: "get", path: "/notebooks", tag: "Notebooks", feature: "F-02", summary: "My notebooks" },
  { method: "get", path: NB, tag: "Notebooks", feature: "F-02", summary: "Notebook detail with my role", role: "viewer", notes: "Non-members get 404, never 403." },
  { method: "patch", path: NB, tag: "Notebooks", feature: "F-02", summary: "Update title, course, description, category, visibility", role: "owner", body: updateNotebookSchema },
  { method: "delete", path: NB, tag: "Notebooks", feature: "F-02", summary: "Delete the notebook and everything in it", role: "owner" },
  { method: "get", path: `${NB}/members`, tag: "Notebooks", feature: "F-02", summary: "List members", role: "viewer" },
  { method: "post", path: `${NB}/members`, tag: "Notebooks", feature: "F-02", summary: "Add a member by exact email or accepted friend ID", role: "owner", body: addMemberSchema },
  { method: "patch", path: `${NB}/members/:userId`, tag: "Notebooks", feature: "F-02", summary: "Change a member's role", role: "owner", body: changeRoleSchema },
  { method: "delete", path: `${NB}/members/:userId`, tag: "Notebooks", feature: "F-02", summary: "Remove a member (a member may remove themselves)", role: "viewer" },
  { method: "post", path: `${NB}/invites`, tag: "Notebooks", feature: "F-02", summary: "Create an invite link", role: "owner", body: createInviteSchema },
  { method: "get", path: `${NB}/invites`, tag: "Notebooks", feature: "F-02", summary: "List invites", role: "owner" },
  { method: "delete", path: `${NB}/invites/:token`, tag: "Notebooks", feature: "F-02", summary: "Revoke an invite", role: "owner" },
  { method: "post", path: "/invites/:token/accept", tag: "Notebooks", feature: "F-02", summary: "Join a notebook with an invite token" },

  { method: "get", path: "/public/notebooks", tag: "Public", feature: "F-11", summary: "Browse public notebooks (query q, category)" },
  { method: "post", path: "/public/notebooks/:id/join-requests", tag: "Public", feature: "F-11", summary: "Ask to join a public notebook", body: joinRequestSchema },
  { method: "get", path: `${NB}/join-requests`, tag: "Public", feature: "F-11", summary: "Pending join requests", role: "owner" },
  { method: "post", path: `${NB}/join-requests/:userId/:decision`, tag: "Public", feature: "F-11", summary: "Approve or reject (decision = approve | reject)", role: "owner" },

  { method: "post", path: `${NB}/sources/file`, tag: "Sources", feature: "F-03", summary: "Upload a file: PDF, TXT, MD, DOCX, PPTX, XLSX, CSV, PNG, JPG, WEBP (field `file`, 15 MB)", role: "editor", upload: true, notes: "Returns 202; poll GET sources until status is ready or failed. Scans and images are read by a vision model." },
  { method: "post", path: `${NB}/sources/text`, tag: "Sources", feature: "F-03", summary: "Add pasted text", role: "editor", body: addTextSourceSchema },
  { method: "post", path: `${NB}/sources/link`, tag: "Sources", feature: "F-12", summary: "Add a web page (private addresses refused)", role: "editor", body: addLinkSourceSchema },
  { method: "get", path: `${NB}/sources`, tag: "Sources", feature: "F-03", summary: "List sources with processing status", role: "viewer" },
  { method: "get", path: `${NB}/notes`, tag: "Notes", summary: "List my private notes in this notebook", role: "viewer" },
  { method: "post", path: `${NB}/notes`, tag: "Notes", summary: "Create a private note", role: "viewer", body: createWorkspaceNoteSchema },
  { method: "patch", path: `${NB}/notes/:noteId`, tag: "Notes", summary: "Update my private note", role: "viewer", body: updateWorkspaceNoteSchema },
  { method: "delete", path: `${NB}/notes/:noteId`, tag: "Notes", summary: "Delete my private note", role: "viewer" },
  { method: "get", path: `${NB}/discussion`, tag: "Discussion", summary: "List notebook discussion messages", role: "viewer" },
  { method: "post", path: `${NB}/discussion`, tag: "Discussion", summary: "Send a notebook discussion message", role: "viewer", body: createDiscussionMessageSchema },
  { method: "get", path: `${NB}/sources/:sourceId`, tag: "Sources", feature: "F-03", summary: "One source", role: "viewer" },
  { method: "get", path: `${NB}/sources/:sourceId/pages/:page`, tag: "Sources", feature: "F-03", summary: "Text of one page, to preview a citation", role: "viewer" },
  { method: "delete", path: `${NB}/sources/:sourceId`, tag: "Sources", feature: "F-03", summary: "Delete a source (uploader or owner)", role: "editor" },

  { method: "post", path: `${NB}/ask`, tag: "Questions", feature: "F-04", summary: "Ask a question; answer is grounded with citations or a fixed not-found text", role: "viewer", body: askQuestionSchema },
  { method: "post", path: `${NB}/explain`, tag: "Questions", feature: "F-10", summary: "Explanation in steps with an emotion each", role: "viewer", body: askQuestionSchema },
  { method: "post", path: `${NB}/ai/assist`, tag: "Questions", summary: "Source-grounded help and questions from ready sources", role: "viewer", body: workspaceAiAssistSchema },
  { method: "get", path: `${NB}/questions`, tag: "Questions", feature: "F-04", summary: "Question history", role: "viewer" },
  { method: "delete", path: `${NB}/questions/:questionId`, tag: "Questions", feature: "F-04", summary: "Delete a question (asker or owner)", role: "viewer" },

  { method: "get", path: "/companion/catalog", tag: "Companion", feature: "F-10", summary: "Mascots, animation vocabulary, reactions, upload limits", auth: false },
  { method: "get", path: "/companion/demo", tag: "Companion", feature: "F-10", summary: "Sample performance for building the player (query scenario = explain | notfound)", auth: false, response: performanceSchema },
  { method: "post", path: `${NB}/companion/explain`, tag: "Companion", feature: "F-10", summary: "Explanation as a performance the mascot plays", role: "viewer", body: explainRequestSchema, response: performanceSchema },

  { method: "post", path: `${NB}/quizzes`, tag: "Quizzes", feature: "F-05", summary: "Generate a quiz (practice, weekly or exam)", role: "editor", body: generateQuizSchema },
  { method: "get", path: `${NB}/quizzes`, tag: "Quizzes", feature: "F-05", summary: "List quizzes with my attempts", role: "viewer" },
  { method: "get", path: `${NB}/quizzes/:quizId`, tag: "Quizzes", feature: "F-05", summary: "Quiz without answers", role: "viewer" },
  { method: "delete", path: `${NB}/quizzes/:quizId`, tag: "Quizzes", feature: "F-05", summary: "Delete a quiz (creator or owner)", role: "editor" },
  { method: "post", path: `${NB}/quizzes/:quizId/start`, tag: "Quizzes", feature: "F-09", summary: "Exam only: start the server clock", role: "viewer" },
  { method: "post", path: `${NB}/quizzes/:quizId/attempts`, tag: "Quizzes", feature: "F-05", summary: "Submit answers; returns score and per-question result", role: "viewer", body: submitAttemptSchema },
  { method: "get", path: `${NB}/quizzes/:quizId/attempts/mine`, tag: "Quizzes", feature: "F-05", summary: "My attempts", role: "viewer" },
  { method: "get", path: `${NB}/quizzes/:quizId/scoreboard`, tag: "Quizzes", feature: "F-15", summary: "Scoreboard and members who have not taken it", role: "viewer" },

  { method: "get", path: `${NB}/contributions`, tag: "Group", feature: "F-06", summary: "Who added sources, asked, took quizzes", role: "viewer" },
  { method: "get", path: `${NB}/progress`, tag: "Group", feature: "F-08", summary: "Quiz results per member and for the group", role: "viewer" },
  { method: "get", path: `${NB}/gaps`, tag: "Group", feature: "F-16", summary: "Knowledge gap map with source pages to review", role: "viewer" },
  { method: "get", path: `${NB}/assignments`, tag: "Group", feature: "F-17", summary: "Study assignments and per-member progress", role: "viewer" },
  { method: "post", path: `${NB}/assignments`, tag: "Group", feature: "F-17", summary: "Assign a topic to a member", role: "owner", body: createAssignmentSchema },
  { method: "patch", path: `${NB}/assignments/:assignmentId`, tag: "Group", feature: "F-17", summary: "Set todo, doing or done (assignee or owner)", role: "viewer", body: updateAssignmentSchema },
  { method: "delete", path: `${NB}/assignments/:assignmentId`, tag: "Group", feature: "F-17", summary: "Delete an assignment", role: "owner" },
  { method: "post", path: `${NB}/sessions`, tag: "Game", feature: "F-18", summary: "Create a game session: the server plans the rounds and picks the game types (auto) or uses gameTypes (manual)", role: "viewer", body: createSessionSchema, notes: "solo starts at once; duel and group wait for join and start. focusTopic makes a recovery mission." },
  { method: "get", path: `${NB}/sessions`, tag: "Game", feature: "F-18", summary: "Recent sessions", role: "viewer" },
  { method: "get", path: `${NB}/sessions/:sid`, tag: "Game", feature: "F-18", summary: "Session state: rounds without answers, participants, which rounds I answered", role: "viewer", notes: "Poll every second for duel and group." },
  { method: "post", path: `${NB}/sessions/:sid/join`, tag: "Game", feature: "F-18", summary: "Join a waiting duel or group session", role: "viewer" },
  { method: "post", path: `${NB}/sessions/:sid/start`, tag: "Game", feature: "F-18", summary: "Creator starts a waiting session", role: "viewer" },
  { method: "get", path: `${NB}/sessions/:sid/scoreboard`, tag: "Game", feature: "F-18", summary: "Live ranking", role: "viewer" },
  { method: "post", path: `${NB}/sessions/:sid/rounds/:n/answer`, tag: "Game", feature: "F-18", summary: "Submit answers for a round; returns graded results, points and the mascot reaction", role: "viewer", body: answerRoundSchema },
  { method: "post", path: `${NB}/sessions/:sid/finish`, tag: "Game", feature: "F-18", summary: "Finish: points, streak, badges, weak topics with pages to review, rank", role: "viewer" },
  { method: "get", path: "/me/stats", tag: "Game", feature: "F-18", summary: "Points, streak, badges" },
  { method: "get", path: "/me/notifications", tag: "Notifications", summary: "List notifications and unread count", response: notificationListSchema },
  { method: "patch", path: "/me/notifications/:notificationId", tag: "Notifications", summary: "Mark one notification as read" },
  { method: "post", path: "/me/notifications/read-all", tag: "Notifications", summary: "Mark all notifications as read" },
  { method: "post", path: `${NB}/companion/teach-back`, tag: "Companion", feature: "F-19", summary: "Explain a topic to the mascot; it checks against the sources and reacts", role: "viewer", body: teachBackSchema },
  { method: "get", path: `${NB}/sources/:sourceId/transcript`, tag: "Sources", feature: "F-20", summary: "Timestamped transcript for a ready audio source", role: "viewer", response: sourceTranscriptSchema },
  { method: "get", path: `${NB}/sources/:sourceId/visual`, tag: "Sources", feature: "F-20", summary: "Source visualizations: mind map, ordered slide timeline, or exact spreadsheet chart data", role: "viewer", response: sourceVisualResponseSchema },
  { method: "get", path: `${NB}/classroom/presence`, tag: "Classroom", summary: "List attendees with an active 45-second lease", role: "viewer", response: classroomPresenceSchema },
  { method: "put", path: `${NB}/classroom/presence`, tag: "Classroom", summary: "Join or refresh classroom attendance (15-second heartbeat)", role: "viewer", response: classroomPresenceSchema },
  { method: "delete", path: `${NB}/classroom/presence`, tag: "Classroom", summary: "Leave the live classroom", role: "viewer" },
  { method: "get", path: "/publications", tag: "Publications", summary: "Search published public and member-visible workspace articles", response: publicationListSchema },
  { method: "post", path: "/publications", tag: "Publications", summary: "Publish a new snapshot of a writer draft", body: publishArticleSchema, response: publishedArticleSchema },
  { method: "get", path: "/publications/:articleId", tag: "Publications", summary: "Read a published article and its comments", response: articleDetailSchema },
  { method: "patch", path: "/publications/:articleId", tag: "Publications", summary: "Publish a new version from a writer draft", body: updatePublishedArticleSchema, response: publishedArticleSchema },
  { method: "delete", path: "/publications/:articleId", tag: "Publications", summary: "Withdraw my published article" },
  { method: "post", path: "/publications/:articleId/comments", tag: "Publications", summary: "Comment on an article or reply to a comment", body: articleCommentSchema },
  { method: "get", path: "/authors/:authorId/publications", tag: "Publications", summary: "List visible publications by an author", response: publicationListSchema },
  { method: "post", path: "/posts", tag: "Feed", feature: "F-21", summary: "Create a post, optionally attaching a public workspace or a finished session result", body: createPostSchema },
  { method: "get", path: "/feed", tag: "Feed", feature: "F-21", summary: "Feed, newest first (query scope = all | following, limit, before)" },
  { method: "get", path: "/saved-posts", tag: "Feed", feature: "F-21", summary: "List posts saved to my account" },
  { method: "post", path: "/posts/:id/save", tag: "Feed", feature: "F-21", summary: "Save a post to my account" },
  { method: "delete", path: "/posts/:id/save", tag: "Feed", feature: "F-21", summary: "Remove a saved post" },
  { method: "get", path: "/posts/:id", tag: "Feed", feature: "F-21", summary: "One post" },
  { method: "delete", path: "/posts/:id", tag: "Feed", feature: "F-21", summary: "Delete my post" },
  { method: "post", path: "/posts/:id/like", tag: "Feed", feature: "F-21", summary: "Like (idempotent)" },
  { method: "delete", path: "/posts/:id/like", tag: "Feed", feature: "F-21", summary: "Remove my like" },
  { method: "get", path: "/posts/:id/comments", tag: "Feed", feature: "F-21", summary: "Comments" },
  { method: "post", path: "/posts/:id/comments", tag: "Feed", feature: "F-21", summary: "Add a comment", body: createCommentSchema },
  { method: "delete", path: "/posts/:id/comments/:commentId", tag: "Feed", feature: "F-21", summary: "Delete a comment (commenter or post author)" },
  { method: "post", path: "/users/:userId/follow", tag: "Feed", feature: "F-21", summary: "Follow a user" },
  { method: "delete", path: "/users/:userId/follow", tag: "Feed", feature: "F-21", summary: "Unfollow" },
  { method: "get", path: "/users/:userId", tag: "Feed", feature: "F-21", summary: "Public profile: name, course, counts, badges (no email)" },
];
