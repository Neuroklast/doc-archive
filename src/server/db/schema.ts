import { sql } from "drizzle-orm";
import {
  boolean, index, integer, pgTable, text, timestamp,
  uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";

// Better Auth core tables. Keep column/property names aligned with its Drizzle adapter.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

// Google OAuth is separate from Better Auth identity. Store only encrypted refresh tokens.
export const storageConnections = pgTable("storage_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 32 }).notNull().default("google_drive"),
  providerAccountId: text("provider_account_id").notNull(),
  displayName: text("display_name"),
  rootFolderId: text("root_folder_id").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("connected"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("storage_owner_provider_idx").on(t.userId, t.provider)]);

export const oauthStates = pgTable("oauth_states", {
  stateHash: text("state_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  verifierEncrypted: text("verifier_encrypted").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, (t) => [index("oauth_state_expiry_idx").on(t.expiresAt)]);

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  driveFolderId: text("drive_folder_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("folders_owner_parent_idx").on(t.userId, t.parentId),
  uniqueIndex("folders_owner_parent_name_unique").on(
    t.userId,
    sql`coalesce(${t.parentId}::text, '')`,
    sql`lower(${t.name})`,
  ),
]);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  sender: text("sender"),
  documentDate: timestamp("document_date", { withTimezone: true }),
  status: varchar("status", { length: 32 }).notNull().default("processing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("documents_owner_date_idx").on(t.userId, t.createdAt)]);

export const documentVersions = pgTable("document_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").notNull().references(() => storageConnections.id),
  providerObjectId: text("provider_object_id").notNull(),
  kind: varchar("kind", { length: 24 }).notNull(),
  mimeType: text("mime_type").notNull(),
  bytes: integer("bytes").notNull(),
  sha256: text("sha256"),
  integrity: varchar("integrity", { length: 24 }).notNull().default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("versions_document_idx").on(t.documentId)]);

export const documentOcr = pgTable("document_ocr", {
  documentId: uuid("document_id").primaryKey().references(() => documents.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  language: varchar("language", { length: 16 }).notNull().default("deu"),
  confidence: integer("confidence"),
}, (t) => [index("document_ocr_german_fts_idx").using("gin", sql`to_tsvector('german', ${t.text})`)]);

export const uploadSessions = pgTable("upload_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").notNull().references(() => storageConnections.id),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  expectedBytes: integer("expected_bytes").notNull(),
  expectedSha256: text("expected_sha256"),
  title: text("title").notNull().default("Dokument"),
  sender: text("sender"),
  ocrText: text("ocr_text"),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  providerObjectId: text("provider_object_id"),
  documentId: uuid("document_id").references(() => documents.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("uploads_owner_status_idx").on(t.userId, t.status)]);
