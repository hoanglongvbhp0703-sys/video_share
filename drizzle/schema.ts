import { pgTable, serial, text, timestamp, varchar, bigint, boolean, index, uniqueIndex, integer, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  password: text("password"),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  role: varchar("role", { length: 10 }).$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * One channel per user — uniqueIndex enforces this at DB level.
 */
export const channels = pgTable(
  "channels",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    avatarUrl: text("avatarUrl"),
    bannerUrl: text("bannerUrl"),
    subscriberCount: integer("subscriberCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdUniq: uniqueIndex("channels_userId_uniq").on(table.userId),
  })
);

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = typeof channels.$inferInsert;

export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channelId").notNull().references(() => channels.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    videoUrl: text("videoUrl").notNull(),
    thumbnailUrl: text("thumbnailUrl"),
    duration: integer("duration"),
    viewCount: bigint("viewCount", { mode: "number" }).default(0).notNull(),
    likeCount: integer("likeCount").default(0).notNull(),
    dislikeCount: integer("dislikeCount").default(0).notNull(),
    commentCount: integer("commentCount").default(0).notNull(),
    category: varchar("category", { length: 50 }),
    isPublished: boolean("isPublished").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    channelIdIdx: index("videos_channelId_idx").on(table.channelId),
    createdAtIdx: index("videos_createdAt_idx").on(table.createdAt),
  })
);

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    videoId: integer("videoId").notNull().references(() => videos.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    likeCount: integer("likeCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    videoIdIdx: index("comments_videoId_idx").on(table.videoId),
    userIdIdx: index("comments_userId_idx").on(table.userId),
  })
);

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * One like/dislike per user per video — uniqueIndex enforces this.
 */
export const likes = pgTable(
  "likes",
  {
    id: serial("id").primaryKey(),
    videoId: integer("videoId").notNull().references(() => videos.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 10 }).$type<"like" | "dislike">().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    videoUserUniq: uniqueIndex("likes_videoId_userId_uniq").on(table.videoId, table.userId),
  })
);

export type Like = typeof likes.$inferSelect;
export type InsertLike = typeof likes.$inferInsert;

/**
 * One subscription per user per channel — uniqueIndex enforces this.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channelId").notNull().references(() => channels.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    channelUserUniq: uniqueIndex("subscriptions_channelId_userId_uniq").on(table.channelId, table.userId),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * watchHistory allows multiple rows per (user, video) — each row is one viewing session.
 */
export const watchHistory = pgTable(
  "watchHistory",
  {
    id: serial("id").primaryKey(),
    videoId: integer("videoId").notNull().references(() => videos.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    watchedAt: timestamp("watchedAt").defaultNow().notNull(),
    watchDuration: integer("watchDuration").default(0).notNull(),
  },
  (table) => ({
    videoUserIdx: index("watchHistory_videoId_userId_idx").on(table.videoId, table.userId),
    userIdIdx: index("watchHistory_userId_idx").on(table.userId),
    watchedAtIdx: index("watchHistory_watchedAt_idx").on(table.watchedAt),
  })
);

export type WatchHistory = typeof watchHistory.$inferSelect;
export type InsertWatchHistory = typeof watchHistory.$inferInsert;

export const playlists = pgTable(
  "playlists",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isPublic: boolean("isPublic").default(true).notNull(),
    videoCount: integer("videoCount").default(0).notNull(),
    thumbnailUrl: text("thumbnailUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("playlists_userId_idx").on(table.userId),
  })
);

export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = typeof playlists.$inferInsert;

/**
 * A video can appear at most once per playlist — uniqueIndex enforces this.
 */
export const playlistVideos = pgTable(
  "playlistVideos",
  {
    id: serial("id").primaryKey(),
    playlistId: integer("playlistId").notNull().references(() => playlists.id, { onDelete: "cascade" }),
    videoId: integer("videoId").notNull().references(() => videos.id, { onDelete: "cascade" }),
    position: integer("position").default(0).notNull(),
    addedAt: timestamp("addedAt").defaultNow().notNull(),
  },
  (table) => ({
    playlistVideoUniq: uniqueIndex("playlistVideos_playlistId_videoId_uniq").on(table.playlistId, table.videoId),
    playlistIdIdx: index("playlistVideos_playlistId_idx").on(table.playlistId),
  })
);

export type PlaylistVideo = typeof playlistVideos.$inferSelect;

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export type Tag = typeof tags.$inferSelect;

/**
 * Composite PK (videoId, tagId) already guarantees uniqueness — no separate index needed.
 */
export const videoTags = pgTable(
  "videoTags",
  {
    videoId: integer("videoId").notNull().references(() => videos.id, { onDelete: "cascade" }),
    tagId: integer("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.videoId, table.tagId] }),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull().$type<"new_video" | "new_subscriber" | "comment" | "reply" | "system">(),
    message: text("message").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notifications_userId_idx").on(table.userId),
    userReadIdx: index("notifications_userId_isRead_idx").on(table.userId, table.isRead),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("targetType", { length: 20 }).notNull().$type<"video" | "comment">(),
    targetId: integer("targetId").notNull(),
    reason: varchar("reason", { length: 100 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).$type<"pending" | "reviewed" | "resolved" | "dismissed">().default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("reports_userId_idx").on(table.userId),
    targetIdx: index("reports_targetType_targetId_idx").on(table.targetType, table.targetId),
  })
);

export type Report = typeof reports.$inferSelect;

// ─── Relations (Drizzle query layer) ─────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  channels: many(channels),
  comments: many(comments),
  likes: many(likes),
  subscriptions: many(subscriptions),
  watchHistories: many(watchHistory),
  playlists: many(playlists),
  notifications: many(notifications),
  reports: many(reports),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  user: one(users, { fields: [channels.userId], references: [users.id] }),
  videos: many(videos),
  subscriptions: many(subscriptions),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  channel: one(channels, { fields: [videos.channelId], references: [channels.id] }),
  comments: many(comments),
  likes: many(likes),
  watchHistories: many(watchHistory),
  playlistVideos: many(playlistVideos),
  videoTags: many(videoTags),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  video: one(videos, { fields: [comments.videoId], references: [videos.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  video: one(videos, { fields: [likes.videoId], references: [videos.id] }),
  user: one(users, { fields: [likes.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  channel: one(channels, { fields: [subscriptions.channelId], references: [channels.id] }),
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  video: one(videos, { fields: [watchHistory.videoId], references: [videos.id] }),
  user: one(users, { fields: [watchHistory.userId], references: [users.id] }),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, { fields: [playlists.userId], references: [users.id] }),
  playlistVideos: many(playlistVideos),
}));

export const playlistVideosRelations = relations(playlistVideos, ({ one }) => ({
  playlist: one(playlists, { fields: [playlistVideos.playlistId], references: [playlists.id] }),
  video: one(videos, { fields: [playlistVideos.videoId], references: [videos.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  videoTags: many(videoTags),
}));

export const videoTagsRelations = relations(videoTags, ({ one }) => ({
  video: one(videos, { fields: [videoTags.videoId], references: [videos.id] }),
  tag: one(tags, { fields: [videoTags.tagId], references: [tags.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, { fields: [reports.userId], references: [users.id] }),
}));
