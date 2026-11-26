import { z } from "zod";
import { citationSchema, notebookRoleSchema, sourceKindSchema } from "./notebook.js";
import { emotionSchema, quizKindSchema } from "./schemas.js";
import { animationSchema } from "./companion.js";
import { mascotSchema, performanceSchema } from "./companion.js";
import { BADGES, gameTypeSchema, itemRefSchema, publicRoundSchema, sessionModeSchema, type BadgeId } from "./game.js";

const isoDate = z.string().datetime();

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.email(),
  name: z.string(),
  course: z.string().nullable(),
  lookingForPartners: z.boolean().optional(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

export const notebookResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  course: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  visibility: z.enum(["private", "public"]),
  ownerId: z.string().uuid(),
  createdAt: isoDate,
  role: notebookRoleSchema,
});
export type NotebookResponse = z.infer<typeof notebookResponseSchema>;

export const notebookListItemSchema = notebookResponseSchema.extend({
  memberCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
});
export type NotebookListItem = z.infer<typeof notebookListItemSchema>;

export const sourceResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: sourceKindSchema,
  status: z.enum(["processing", "ready", "failed"]),
  error: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  origin: z.string().nullable(),
  createdAt: isoDate,
  uploadedBy: z.string().uuid(),
  uploadedByName: z.string(),
  chunkCount: z.number().int().nonnegative(),
});
export type SourceResponse = z.infer<typeof sourceResponseSchema>;

export const sourceAcceptedSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: sourceKindSchema,
  status: z.literal("processing"),
});
export type SourceAccepted = z.infer<typeof sourceAcceptedSchema>;

export const sourcePageSchema = z.object({ page: z.number().int().positive(), text: z.string() });

export const askResponseSchema = z.discriminatedUnion("grounded", [
  z.object({
    id: z.string().uuid(),
    question: z.string(),
    grounded: z.literal(true),
    text: z.string(),
    citations: z.array(z.object({
      sourceId: z.string().uuid(),
      sourceTitle: z.string(),
      page: z.number().int().positive().nullable(),
      quote: z.string(),
    })).min(1),
  }),
  z.object({
    id: z.string().uuid(),
    question: z.string(),
    grounded: z.literal(false),
    text: z.string(),
    citations: z.array(z.never()).optional(),
  }),
]);
export type AskResponse = z.infer<typeof askResponseSchema>;

export const workspaceAiAssistResponseSchema = z.discriminatedUnion("grounded", [
  z.object({ grounded: z.literal(true), text: z.string().min(1), items: z.array(z.string().min(1)).max(8), citations: z.array(citationSchema).min(1) }),
  z.object({ grounded: z.literal(false), text: z.string().min(1), items: z.array(z.never()), citations: z.array(z.never()) }),
]);
export type WorkspaceAiAssistResponse = z.infer<typeof workspaceAiAssistResponseSchema>;

export const quizCreatedSchema = z.object({
  id: z.string().uuid(),
  questionCount: z.number().int().positive(),
  kind: quizKindSchema,
});
export type QuizCreated = z.infer<typeof quizCreatedSchema>;

export const examStartedSchema = z.object({ startedAt: isoDate, timeLimitSec: z.number().int().nullable() });
export type ExamStarted = z.infer<typeof examStartedSchema>;

export const quizListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: quizKindSchema,
  timeLimitSec: z.number().int().nullable(),
  perQuestionSec: z.number().int().nullable(),
  dueAt: isoDate.nullable(),
  createdAt: isoDate,
  questionCount: z.number().int().positive(),
  createdBy: z.string().uuid(),
  myAttempts: z.number().int().nonnegative(),
  myBest: z.number().int().nonnegative().nullable(),
});
export type QuizListItem = z.infer<typeof quizListItemSchema>;

export const quizScoreboardSchema = z.object({
  quizId: z.string().uuid(), dueAt: isoDate.nullable(),
  ranking: z.array(z.object({ rank: z.number().int().positive(), userId: z.string().uuid(), name: z.string(), score: z.number().int().nonnegative(), total: z.number().int().positive(), durationMs: z.number().int().nonnegative().nullable(), takenAt: isoDate })),
  notYetTaken: z.array(z.object({ userId: z.string().uuid(), name: z.string() })),
});
export type QuizScoreboard = z.infer<typeof quizScoreboardSchema>;

export const quizResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: quizKindSchema,
  timeLimitSec: z.number().int().nullable(),
  perQuestionSec: z.number().int().nullable(),
  dueAt: isoDate.nullable(),
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    topic: z.string(),
  })).min(1),
});
export type QuizResponse = z.infer<typeof quizResponseSchema>;

export const quizAttemptResponseSchema = z.object({
  attemptId: z.string().uuid(),
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  durationMs: z.number().int().nonnegative().nullable(),
  results: z.array(z.object({
    index: z.number().int().nonnegative(),
    chosen: z.number().int().min(0).max(3).nullable(),
    correct: z.boolean(),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string(),
    topic: z.string(),
    sourceId: z.string().uuid(),
    sourceTitle: z.string(),
    page: z.number().int().positive().nullable(),
  })).min(1),
});
export type QuizAttemptResponse = z.infer<typeof quizAttemptResponseSchema>;

export const feedCardSchema = z.union([
  z.object({ type: z.literal("notebook"), unavailable: z.literal(true) }),
  z.object({
    type: z.literal("notebook"),
    unavailable: z.literal(false).optional(),
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    course: z.string().nullable(),
    memberCount: z.number().int().nonnegative(),
    sourceCount: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("result"),
    mode: sessionModeSchema,
    correct: z.number().int().nonnegative().nullable(),
    total: z.number().int().nonnegative().nullable(),
    points: z.number().int().nonnegative().nullable(),
  }),
]);

export const feedPostSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  createdAt: isoDate,
  authorId: z.string().uuid(),
  authorName: z.string(),
  authorCourse: z.string().nullable(),
  likes: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  savedByMe: z.boolean(),
  comments: z.number().int().nonnegative(),
  followingAuthor: z.boolean(),
  card: feedCardSchema.nullable(),
});
export type FeedPost = z.infer<typeof feedPostSchema>;

export const feedResponseSchema = z.object({ posts: z.array(feedPostSchema), nextBefore: isoDate.nullable() });
export type FeedResponse = z.infer<typeof feedResponseSchema>;

export const workspaceNoteSchema = z.object({
  id: z.string().uuid(), title: z.string(), body: z.string(), sourceId: z.string().uuid().nullable(),
  page: z.number().int().positive().nullable(), createdAt: isoDate, updatedAt: isoDate,
});
export type WorkspaceNoteResponse = z.infer<typeof workspaceNoteSchema>;

export const discussionMessageSchema = z.object({
  id: z.string().uuid(), authorId: z.string().uuid(), authorName: z.string(), body: z.string(),
  sourceId: z.string().uuid().nullable(), createdAt: isoDate,
});
export type DiscussionMessage = z.infer<typeof discussionMessageSchema>;
export const discussionResponseSchema = z.object({ messages: z.array(discussionMessageSchema), nextBefore: z.string().nullable() });
export type DiscussionResponse = z.infer<typeof discussionResponseSchema>;

export const writerDraftResponseSchema = z.object({
  id: z.string().uuid(), title: z.string(), summary: z.string(), body: z.string(), createdAt: isoDate, updatedAt: isoDate,
});
export type WriterDraftResponse = z.infer<typeof writerDraftResponseSchema>;
export const writerDraftListSchema = z.array(writerDraftResponseSchema);

export const savedPostListSchema = z.object({ posts: z.array(feedPostSchema) });
export type SavedPostList = z.infer<typeof savedPostListSchema>;
export const savePostResponseSchema = z.object({ saved: z.boolean() });
export type SavePostResponse = z.infer<typeof savePostResponseSchema>;

export const commentResponseSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  createdAt: isoDate,
  authorId: z.string().uuid(),
  authorName: z.string(),
});
export type CommentResponse = z.infer<typeof commentResponseSchema>;

export const publicNotebookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  course: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  visibility: z.literal("public"),
  ownerId: z.string().uuid(),
  createdAt: isoDate,
  memberCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
  isMember: z.boolean(),
});
export type PublicNotebook = z.infer<typeof publicNotebookSchema>;

const badgeIdSchema = z.enum(Object.keys(BADGES) as [BadgeId, ...BadgeId[]]);

export const userStatsSchema = z.object({
  points: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  bestStreak: z.number().int().nonnegative(),
  lastPlayDate: z.string().nullable(),
  sessionsPlayed: z.number().int().nonnegative(),
  playedToday: z.boolean(),
  badges: z.array(z.object({ id: badgeIdSchema, name: z.string(), earnedAt: isoDate })),
  allBadges: z.array(z.object({ id: badgeIdSchema, name: z.string() })),
});
export type UserStats = z.infer<typeof userStatsSchema>;

export const profileUpdateResponseSchema = z.object({ course: z.string().nullable(), lookingForPartners: z.boolean() });
export type ProfileUpdateResponse = z.infer<typeof profileUpdateResponseSchema>;

export const partnersResponseSchema = z.object({
  partners: z.array(z.object({ id: z.string().uuid(), name: z.string(), course: z.string().nullable() })),
  hint: z.string().optional(),
});
export type PartnersResponse = z.infer<typeof partnersResponseSchema>;

export const friendsResponseSchema = z.object({
  friends: z.array(z.object({ id: z.string().uuid(), name: z.string(), course: z.string().nullable(), since: isoDate })),
  requests: z.array(z.object({
    id: z.string().uuid(), userId: z.string().uuid(), name: z.string(), course: z.string().nullable(), createdAt: isoDate,
    direction: z.enum(["incoming", "outgoing"]),
  })),
});
export type FriendsResponse = z.infer<typeof friendsResponseSchema>;
export const friendRequestResultSchema = z.object({ sent: z.boolean(), message: z.string() });
export type FriendRequestResult = z.infer<typeof friendRequestResultSchema>;
export const addMemberResultSchema = z.object({ userId: z.string().uuid(), role: z.enum(["editor", "viewer"]) });
export type AddMemberResult = z.infer<typeof addMemberResultSchema>;
export const inviteResultSchema = z.object({ token: z.string(), role: z.enum(["editor", "viewer"]), expiresInDays: z.number().int().positive(), maxUses: z.number().int().positive() });
export type InviteResult = z.infer<typeof inviteResultSchema>;

export const publicProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  course: z.string().nullable(),
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative(),
  posts: z.number().int().nonnegative(),
  followedByMe: z.boolean(),
  friendshipStatus: z.enum(["none", "incoming", "outgoing", "friends"]),
  points: z.number().int().nonnegative(),
  badges: z.array(z.string()),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const groupContributionsSchema = z.object({
  members: z.array(z.object({
    userId: z.string().uuid(), name: z.string(), role: z.enum(["owner", "editor", "viewer"]),
    sourcesAdded: z.number().int().nonnegative(), questionsAsked: z.number().int().nonnegative(),
    quizzesTaken: z.number().int().nonnegative(), assignmentsDone: z.number().int().nonnegative(),
    lastActiveAt: isoDate.nullable(),
  })),
  recent: z.array(z.object({ type: z.string(), at: isoDate, userName: z.string(), userId: z.string().uuid(), refId: z.string().nullable() })),
});
export type GroupContributions = z.infer<typeof groupContributionsSchema>;

export const groupProgressSchema = z.object({
  members: z.array(z.object({
    userId: z.string().uuid(), name: z.string(), attempts: z.number().int().nonnegative(),
    averagePercent: z.number().int().nullable(), bestPercent: z.number().int().nullable(), lastAttemptAt: isoDate.nullable(),
  })),
  group: z.object({ attempts: z.number().int().nonnegative(), averagePercent: z.number().int().nullable() }),
});
export type GroupProgress = z.infer<typeof groupProgressSchema>;

export const knowledgeGapsSchema = z.object({
  gaps: z.array(z.object({
    topic: z.string(), answered: z.number().int().nonnegative(), missed: z.number().int().nonnegative(),
    missRatePercent: z.number().int().min(0).max(100), membersMissed: z.number().int().nonnegative(),
    reviewPages: z.array(z.object({ sourceId: z.string().uuid(), sourceTitle: z.string(), page: z.number().int().positive().nullable() })),
  })),
});
export type KnowledgeGaps = z.infer<typeof knowledgeGapsSchema>;

export const assignmentListSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(), topic: z.string(), status: z.enum(["todo", "doing", "done"]), dueAt: isoDate.nullable(),
    createdAt: isoDate, sourceId: z.string().uuid().nullable(), assigneeId: z.string().uuid(), assigneeName: z.string(), sourceTitle: z.string().nullable(),
  })),
  perMember: z.array(z.object({ userId: z.string().uuid(), name: z.string(), total: z.number().int().nonnegative(), done: z.number().int().nonnegative() })),
});
export type AssignmentList = z.infer<typeof assignmentListSchema>;

export const notebookMemberSchema = z.object({ id: z.string().uuid(), name: z.string(), email: z.string(), role: z.enum(["owner", "editor", "viewer"]), joinedAt: isoDate });
export type NotebookMember = z.infer<typeof notebookMemberSchema>;

export const mindMapResponseSchema = z.object({
  sourceId: z.string().uuid(), kind: z.literal("mindmap"), cached: z.boolean(),
  nodes: z.array(z.object({ id: z.string(), label: z.string(), page: z.number().int().positive().nullable(), level: z.number().int().min(0).max(3) })),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string() })),
});
export type MindMapResponse = z.infer<typeof mindMapResponseSchema>;

export const sourceTranscriptSchema = z.object({
  sourceId: z.string().uuid(),
  segments: z.array(z.object({ startSec: z.number().nonnegative(), endSec: z.number().positive(), text: z.string().min(1) }).refine((segment) => segment.endSec > segment.startSec)),
});
export type SourceTranscript = z.infer<typeof sourceTranscriptSchema>;

export const sourceTimelineSchema = z.object({
  sourceId: z.string().uuid(), kind: z.literal("timeline"), cached: z.boolean(),
  slides: z.array(z.object({ slide: z.number().int().positive(), text: z.string() })),
});
export type SourceTimeline = z.infer<typeof sourceTimelineSchema>;

export const sourceChartSchema = z.object({
  sourceId: z.string().uuid(), kind: z.literal("chart"), cached: z.boolean(),
  tables: z.array(z.object({
    name: z.string(), categoryColumn: z.string(),
    series: z.array(z.object({ name: z.string(), points: z.array(z.object({ label: z.string(), value: z.number() })) })),
  })),
});
export type SourceChart = z.infer<typeof sourceChartSchema>;
export const sourceVisualResponseSchema = z.discriminatedUnion("kind", [mindMapResponseSchema, sourceTimelineSchema, sourceChartSchema]);
export type SourceVisualResponse = z.infer<typeof sourceVisualResponseSchema>;

export const gameSessionSchema = z.object({
  id: z.string().uuid(), hostId: z.string().uuid(), mode: sessionModeSchema, status: z.enum(["waiting", "running", "finished"]), focusTopic: z.string().nullable(),
  roundCount: z.number().int().nonnegative(), rounds: z.array(publicRoundSchema), answeredRounds: z.array(z.number().int().nonnegative()),
  participants: z.array(z.object({ userId: z.string().uuid(), name: z.string(), score: z.number().int().nonnegative(), finished: z.boolean(), roundsAnswered: z.number().int().nonnegative() })),
  reactions: z.record(z.string(), z.object({ animation: animationSchema, emotion: emotionSchema })),
});
export type GameSession = z.infer<typeof gameSessionSchema>;

export const gameSessionListSchema = z.array(z.object({
  id: z.string().uuid(), mode: sessionModeSchema, status: z.enum(["waiting", "running", "finished"]), focusTopic: z.string().nullable(),
  createdAt: isoDate, roundCount: z.number().int().nonnegative(), players: z.number().int().nonnegative(),
}));
export type GameSessionList = z.infer<typeof gameSessionListSchema>;

export const gameRoundResultSchema = z.object({
  roundIndex: z.number().int().nonnegative(),
  results: z.array(z.object({
    index: z.number().int().nonnegative(), type: gameTypeSchema, correct: z.boolean(), fraction: z.number().min(0).max(1),
    correctAnswer: z.unknown().nullable(), explanation: z.string(), topic: z.string(), ref: itemRefSchema,
    teach: z.object({
      checkable: z.boolean(), understood: z.enum(["yes", "partly", "not_yet"]), score: z.number().int().min(0).max(100),
      covered: z.array(z.string()), missing: z.array(z.string()), wrong: z.array(z.string()), reply: z.string(),
      animation: animationSchema, emotion: emotionSchema, citations: z.array(citationSchema),
    }).optional(),
  })),
  correctCount: z.number().int().nonnegative(), total: z.number().int().positive(), points: z.number().int().nonnegative(),
  reaction: z.object({ animation: animationSchema, emotion: emotionSchema }),
  scoreboard: z.array(z.object({ userId: z.string().uuid(), name: z.string(), score: z.number().int().nonnegative(), finished: z.boolean(), roundsAnswered: z.number().int().nonnegative() })),
});
export type GameRoundResult = z.infer<typeof gameRoundResultSchema>;

export const gameFinishSchema = z.object({
  sessionId: z.string().uuid(), points: z.number().int().nonnegative(), accuracyPercent: z.number().int().min(0).max(100),
  correct: z.number().int().nonnegative(), total: z.number().int().nonnegative(), streak: z.number().int().nonnegative().optional(),
  badgesEarned: z.array(z.object({ id: badgeIdSchema, name: z.string() })),
  weakTopics: z.array(z.object({ topic: z.string(), missed: z.number().int().nonnegative(), reviewAt: z.array(z.string()) })),
  recoveryTopics: z.array(z.string()), rank: z.number().int().positive(), players: z.number().int().positive(),
  reaction: z.object({ animation: animationSchema, emotion: emotionSchema }),
});
export type GameFinish = z.infer<typeof gameFinishSchema>;

export const companionCatalogSchema = z.object({
  mascots: z.array(mascotSchema),
  animations: z.array(animationSchema),
  emotions: z.array(emotionSchema),
  styles: z.array(z.enum(["teacher", "friend", "coach"])),
  levels: z.array(z.enum(["simple", "normal", "detailed"])),
  reactions: z.record(z.string(), z.object({ animation: animationSchema, emotion: emotionSchema })),
  sourceKinds: z.array(sourceKindSchema),
  upload: z.object({ maxFileMb: z.number(), extensions: z.array(z.string()), plannedExtensions: z.array(z.string()) }),
});
export type CompanionCatalog = z.infer<typeof companionCatalogSchema>;

export const explainPerformanceResponseSchema = z.object({ questionId: z.string().uuid(), question: z.string(), performance: performanceSchema });
export type ExplainPerformanceResponse = z.infer<typeof explainPerformanceResponseSchema>;

export const teachBackResponseSchema = z.object({
  evaluation: z.object({ checkable: z.boolean(), understood: z.enum(["yes", "partly", "not_yet"]), score: z.number().int().min(0).max(100), covered: z.array(z.string()), missing: z.array(z.string()), wrong: z.array(z.string()) }),
  performance: performanceSchema,
});
export type TeachBackResponse = z.infer<typeof teachBackResponseSchema>;

export const notificationSchema = z.object({
  id: z.string().uuid(), kind: z.enum(["friend_request", "friend_accepted", "workspace_member_added", "join_request_decision"]),
  title: z.string(), body: z.string(), href: z.string(), readAt: isoDate.nullable(), createdAt: isoDate,
  actor: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
});
export type NotificationItem = z.infer<typeof notificationSchema>;
export const notificationListSchema = z.object({ items: z.array(notificationSchema), unreadCount: z.number().int().nonnegative() });
export type NotificationList = z.infer<typeof notificationListSchema>;

export const classroomPresenceSchema = z.object({
  members: z.array(z.object({ userId: z.string().uuid(), name: z.string(), lastSeenAt: isoDate })),
  expiresAfterSec: z.literal(45), heartbeatEverySec: z.literal(15),
});
export type ClassroomPresence = z.infer<typeof classroomPresenceSchema>;

export const publishedArticleSchema = z.object({
  id: z.string().uuid(), authorId: z.string().uuid(), authorName: z.string(), notebookId: z.string().uuid().nullable(),
  visibility: z.enum(["public", "workspace"]), version: z.number().int().positive(), title: z.string(), summary: z.string(), body: z.string(), coverUrl: z.string().url().nullable(),
  createdAt: isoDate, updatedAt: isoDate, commentCount: z.number().int().nonnegative(),
});
export type PublishedArticle = z.infer<typeof publishedArticleSchema>;
export const publicationListSchema = z.object({ items: z.array(publishedArticleSchema), nextCursor: z.string().nullable() });
export type PublicationList = z.infer<typeof publicationListSchema>;
export const articleCommentResponseSchema = z.object({
  id: z.string().uuid(), parentId: z.string().uuid().nullable(), body: z.string(), authorId: z.string().uuid(), authorName: z.string(), createdAt: isoDate,
});
export type ArticleComment = z.infer<typeof articleCommentResponseSchema>;
export const articleDetailSchema = z.object({ article: publishedArticleSchema, comments: z.array(articleCommentResponseSchema) });
export type ArticleDetail = z.infer<typeof articleDetailSchema>;
