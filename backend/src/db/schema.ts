import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/**
 * Enum-like columns are stored as text and validated with Zod (see shared),
 * so adding a value never needs a database migration.
 *
 * Embedding size 768 matches the planned embedding model; change it together with a migration.
 */
export const EMBEDDING_DIMENSIONS = 768;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notebooks = pgTable("notebooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  course: text("course"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notebookMembers = pgTable(
  "notebook_members",
  {
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("editor"), // owner | editor | viewer
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.notebookId, t.userId] })],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    kind: text("kind").notNull(), // pdf | slides | link | note
    status: text("status").notNull().default("processing"), // processing | ready | failed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sources_notebook_idx").on(t.notebookId)],
);

/** One retrievable passage. `page` lets an answer cite the exact page it used. */
export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    page: integer("page"),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (t) => [
    index("source_chunks_source_idx").on(t.sourceId),
    index("source_chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  notebookId: uuid("notebook_id")
    .notNull()
    .references(() => notebooks.id, { onDelete: "cascade" }),
  askedBy: uuid("asked_by")
    .notNull()
    .references(() => users.id),
  question: text("question").notNull(),
  grounded: integer("grounded").notNull().default(0), // 1 when the answer has citations
  answer: text("answer").notNull(),
  citations: jsonb("citations").notNull().default([]), // Citation[] from shared
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  notebookId: uuid("notebook_id")
    .notNull()
    .references(() => notebooks.id, { onDelete: "cascade" }),
  items: jsonb("items").notNull(), // generated questions, each tied to a source chunk
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notebooksRelations = relations(notebooks, ({ many, one }) => ({
  owner: one(users, { fields: [notebooks.ownerId], references: [users.id] }),
  members: many(notebookMembers),
  sources: many(sources),
}));

export const sourcesRelations = relations(sources, ({ many, one }) => ({
  notebook: one(notebooks, { fields: [sources.notebookId], references: [notebooks.id] }),
  chunks: many(sourceChunks),
}));
