import { eq, and, desc, like, ilike, or, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users, channels, videos, comments, likes, subscriptions, watchHistory,
  playlists, playlistVideos, tags, videoTags, notifications, reports,
  InsertNotification,
} from "../drizzle/schema";
import { ENV } from './_core/env';

type DrizzleDB = ReturnType<typeof drizzle>;
let _db: DrizzleDB | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "password", "avatarUrl", "bio"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Channel queries
export async function getOrCreateChannel(userId: number, userName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  await db.insert(channels).values({
    userId,
    name: `${userName}'s Channel`,
  });

  const created = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .orderBy(desc(channels.createdAt))
    .limit(1);

  return created[0];
}

export async function updateChannelByUserId(userId: number, name: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(channels).set({ name }).where(eq(channels.userId, userId));
}

export async function getChannelById(channelId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Video queries
export async function createVideo(
  channelId: number,
  title: string,
  description: string,
  videoUrl: string,
  thumbnailUrl?: string,
  duration?: number,
  category?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(videos).values({
    channelId,
    title,
    description,
    videoUrl,
    thumbnailUrl,
    duration,
    category: category || null,
    isPublished: true,
  });

  const created = await db
    .select()
    .from(videos)
    .where(eq(videos.channelId, channelId))
    .orderBy(desc(videos.createdAt))
    .limit(1);

  return created[0];
}

export async function getVideoById(videoId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getVideosByChannelId(channelId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: videos.id,
      channelId: videos.channelId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      dislikeCount: videos.dislikeCount,
      commentCount: videos.commentCount,
      category: videos.category,
      isPublished: videos.isPublished,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      channelName: channels.name,
    })
    .from(videos)
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(videos.channelId, channelId), eq(videos.isPublished, true)))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getLatestVideos(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: videos.id,
      channelId: videos.channelId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      dislikeCount: videos.dislikeCount,
      commentCount: videos.commentCount,
      category: videos.category,
      isPublished: videos.isPublished,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      channelName: channels.name,
    })
    .from(videos)
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(eq(videos.isPublished, true))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function searchVideos(query: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  // Tách thành các từ riêng lẻ, tối đa 8 token
  const tokens = trimmed.split(/\s+/).filter(Boolean).slice(0, 8);

  // Điều kiện OR: bất kỳ token nào xuất hiện trong title, description, hoặc tên channel
  const tokenConditions = tokens.flatMap(token => [
    ilike(videos.title, `%${token}%`),
    ilike(videos.description, `%${token}%`),
    ilike(channels.name, `%${token}%`),
  ]);

  // Điểm liên quan: title khớp đầy đủ > title chứa cụm từ > title chứa từng token > channel > description
  const scoreParts = [
    sql<number>`CASE WHEN LOWER(${videos.title}) = LOWER(${trimmed}) THEN 300 ELSE 0 END`,
    sql<number>`CASE WHEN ${videos.title} ILIKE ${`%${trimmed}%`} THEN 150 ELSE 0 END`,
    ...tokens.flatMap(token => [
      sql<number>`CASE WHEN ${videos.title} ILIKE ${`%${token}%`} THEN 50 ELSE 0 END`,
      sql<number>`CASE WHEN ${channels.name} ILIKE ${`%${token}%`} THEN 30 ELSE 0 END`,
      sql<number>`CASE WHEN ${videos.description} ILIKE ${`%${token}%`} THEN 10 ELSE 0 END`,
    ]),
  ];
  const score = sql<number>`(${sql.join(scoreParts, sql` + `)})`;

  return db
    .select({
      id: videos.id,
      channelId: videos.channelId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      dislikeCount: videos.dislikeCount,
      commentCount: videos.commentCount,
      category: videos.category,
      isPublished: videos.isPublished,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      channelName: channels.name,
    })
    .from(videos)
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(videos.isPublished, true), or(...tokenConditions)))
    .orderBy(desc(score), desc(videos.viewCount))
    .limit(limit)
    .offset(offset);
}

export async function suggestVideos(query: string, limit: number = 8) {
  const db = await getDb();
  if (!db) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean).slice(0, 5);

  const tokenConditions = tokens.flatMap(token => [
    ilike(videos.title, `%${token}%`),
    ilike(channels.name, `%${token}%`),
  ]);

  const scoreParts = [
    sql<number>`CASE WHEN ${videos.title} ILIKE ${`%${trimmed}%`} THEN 100 ELSE 0 END`,
    ...tokens.map(token =>
      sql<number>`CASE WHEN ${videos.title} ILIKE ${`%${token}%`} THEN 50 ELSE 0 END`
    ),
  ];
  const score = sql<number>`(${sql.join(scoreParts, sql` + `)})`;

  return db
    .select({ id: videos.id, title: videos.title, channelName: channels.name })
    .from(videos)
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(videos.isPublished, true), or(...tokenConditions)))
    .orderBy(desc(score), desc(videos.viewCount))
    .limit(limit);
}

export async function getVideosByCategory(category: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: videos.id,
      channelId: videos.channelId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      dislikeCount: videos.dislikeCount,
      commentCount: videos.commentCount,
      category: videos.category,
      isPublished: videos.isPublished,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      channelName: channels.name,
    })
    .from(videos)
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(videos.isPublished, true), eq(videos.category, category)))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function incrementVideoViewCount(videoId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    return await db
      .update(videos)
      .set({ viewCount: sql`"viewCount" + 1` })
      .where(eq(videos.id, videoId));
  } catch (error) {
    console.error("Failed to increment view count:", error);
    return null;
  }
}

// Comment queries
export async function getCommentsByVideoId(videoId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: comments.id,
      videoId: comments.videoId,
      userId: comments.userId,
      content: comments.content,
      likeCount: comments.likeCount,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      channelId: channels.id,
    })
    .from(comments)
    .leftJoin(channels, eq(channels.userId, comments.userId))
    .where(eq(comments.videoId, videoId))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createComment(videoId: number, userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(comments).values({ videoId, userId, content });

  const created = await db
    .select()
    .from(comments)
    .where(eq(comments.videoId, videoId))
    .orderBy(desc(comments.createdAt))
    .limit(1);

  return created[0];
}

// Like queries
export async function getUserLikeOnVideo(videoId: number, userId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(likes)
    .where(and(eq(likes.videoId, videoId), eq(likes.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function toggleLike(videoId: number, userId: number, type: "like" | "dislike") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserLikeOnVideo(videoId, userId);

  if (existing) {
    if (existing.type === type) {
      // Xóa like/dislike — trigger tự giảm count
      await db.delete(likes).where(eq(likes.id, existing.id));
      return null;
    } else {
      // Đổi type — trigger tự swap counts
      await db.update(likes).set({ type }).where(eq(likes.id, existing.id));
      return type;
    }
  } else {
    // Thêm mới — trigger tự tăng count
    await db.insert(likes).values({ videoId, userId, type });
    return type;
  }
}

// Subscription queries
export async function isUserSubscribed(channelId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.channelId, channelId), eq(subscriptions.userId, userId)))
    .limit(1);

  return result.length > 0;
}

export async function toggleSubscription(channelId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const channel = await getChannelById(channelId);
  if (!channel) throw new Error("Channel not found");

  const isSubscribed = await isUserSubscribed(channelId, userId);

  if (isSubscribed) {
    // Hủy subscribe — trigger tự giảm subscriberCount
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.channelId, channelId), eq(subscriptions.userId, userId)));
    return false;
  } else {
    // Subscribe — trigger tự tăng subscriberCount
    await db.insert(subscriptions).values({ channelId, userId });
    return true;
  }
}

export async function getChannelSubscriberCount(channelId: number) {
  const db = await getDb();
  if (!db) return 0;

  const channel = await getChannelById(channelId);
  return channel?.subscriberCount ?? 0;
}

// Watch History queries
export async function recordWatchHistory(videoId: number, userId: number, watchDuration: number = 0) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(watchHistory).values({
      videoId,
      userId,
      watchDuration,
    });
    return result;
  } catch (error) {
    console.error("Failed to record watch history:", error);
    return null;
  }
}

export async function getWatchHistory(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(watchHistory)
    .where(eq(watchHistory.userId, userId))
    .orderBy(desc(watchHistory.watchedAt))
    .limit(limit)
    .offset(offset);

  return result;
}

export async function getWatchHistoryWithVideos(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: watchHistory.id,
      watchedAt: watchHistory.watchedAt,
      watchDuration: watchHistory.watchDuration,
      videoId: videos.id,
      videoTitle: videos.title,
      videoThumbnailUrl: videos.thumbnailUrl,
      videoDuration: videos.duration,
      videoViewCount: videos.viewCount,
      videoChannelId: videos.channelId,
    })
    .from(watchHistory)
    .innerJoin(videos, eq(watchHistory.videoId, videos.id))
    .where(eq(watchHistory.userId, userId))
    .orderBy(desc(watchHistory.watchedAt))
    .limit(limit)
    .offset(offset);
}

export async function getTrendingVideos(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: videos.id,
      channelId: videos.channelId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      dislikeCount: videos.dislikeCount,
      commentCount: videos.commentCount,
      category: videos.category,
      isPublished: videos.isPublished,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      channelName: channels.name,
    })
    .from(videos)
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(eq(videos.isPublished, true))
    .orderBy(desc(videos.viewCount))
    .limit(limit)
    .offset(offset);
}

export async function getChannelVideoCount(channelId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videos)
    .where(and(eq(videos.channelId, channelId), eq(videos.isPublished, true)));

  return result[0]?.count ?? 0;
}

export async function getUsersByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];

  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, ids));
}

// ─── Playlist queries ────────────────────────────────────────────────────────

export async function createPlaylist(userId: number, name: string, description: string | null, isPublic: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(playlists).values({ userId, name, description, isPublic });
  const created = await db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, userId))
    .orderBy(desc(playlists.createdAt))
    .limit(1);
  return created[0];
}

export async function getPlaylistsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playlists).where(eq(playlists.userId, userId)).orderBy(desc(playlists.createdAt));
}

export async function getPlaylistById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function updatePlaylist(id: number, userId: number, updates: { name?: string; description?: string | null; isPublic?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(playlists).set({ ...updates, updatedAt: new Date() }).where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
  return getPlaylistById(id);
}

export async function deletePlaylist(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(playlistVideos).where(eq(playlistVideos.playlistId, id));
  await db.delete(playlists).where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
  return { success: true };
}

export async function isVideoInPlaylist(playlistId: number, videoId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(playlistVideos)
    .where(and(eq(playlistVideos.playlistId, playlistId), eq(playlistVideos.videoId, videoId)))
    .limit(1);
  return result.length > 0;
}

export async function addVideoToPlaylist(playlistId: number, videoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const alreadyIn = await isVideoInPlaylist(playlistId, videoId);
  if (alreadyIn) return { success: true };

  const maxPositionResult = await db
    .select({ max: sql<number>`coalesce(max("position"), -1)::int` })
    .from(playlistVideos)
    .where(eq(playlistVideos.playlistId, playlistId));
  const nextPosition = (maxPositionResult[0]?.max ?? -1) + 1;

  // INSERT trigger tự tăng videoCount + cập nhật updatedAt
  await db.insert(playlistVideos).values({ playlistId, videoId, position: nextPosition });
  return { success: true };
}

export async function removeVideoFromPlaylist(playlistId: number, videoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // DELETE trigger tự giảm videoCount + cập nhật updatedAt
  await db.delete(playlistVideos).where(and(eq(playlistVideos.playlistId, playlistId), eq(playlistVideos.videoId, videoId)));
  return { success: true };
}

export async function getPlaylistVideos(playlistId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: videos.id,
      channelId: videos.channelId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      dislikeCount: videos.dislikeCount,
      commentCount: videos.commentCount,
      category: videos.category,
      isPublished: videos.isPublished,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      channelName: channels.name,
      position: playlistVideos.position,
      addedAt: playlistVideos.addedAt,
    })
    .from(playlistVideos)
    .innerJoin(videos, eq(playlistVideos.videoId, videos.id))
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(playlistVideos.playlistId, playlistId), eq(videos.isPublished, true)))
    .orderBy(playlistVideos.position)
    .limit(limit)
    .offset(offset);
}

// ─── Notification queries ────────────────────────────────────────────────────

export async function createNotification(userId: number, type: InsertNotification["type"], message: string, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(notifications).values({
    userId,
    type,
    message,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
  return { success: true };
}

export async function getNotifications(userId: number, limit: number = 30, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

export async function markNotificationAsRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ─── Report queries ──────────────────────────────────────────────────────────

export async function createReport(
  userId: number,
  targetType: "video" | "comment",
  targetId: number,
  reason: string,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reports).values({ userId, targetType, targetId, reason, description: description ?? null });
  return { success: true };
}

// ─── Tag queries ─────────────────────────────────────────────────────────────

export async function getOrCreateTag(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(tags).where(eq(tags.name, name.toLowerCase())).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(tags).values({ name: name.toLowerCase() });
  const created = await db.select().from(tags).where(eq(tags.name, name.toLowerCase())).limit(1);
  return created[0];
}

export async function addTagToVideo(videoId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(videoTags).values({ videoId, tagId }).onConflictDoNothing();
}

export async function getTagsByVideoId(videoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: tags.id, name: tags.name })
    .from(videoTags)
    .innerJoin(tags, eq(videoTags.tagId, tags.id))
    .where(eq(videoTags.videoId, videoId));
}

export async function getVideosByTag(tagName: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: videos.id,
      channelId: videos.channelId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      dislikeCount: videos.dislikeCount,
      commentCount: videos.commentCount,
      category: videos.category,
      isPublished: videos.isPublished,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      channelName: channels.name,
    })
    .from(videoTags)
    .innerJoin(tags, eq(videoTags.tagId, tags.id))
    .innerJoin(videos, eq(videoTags.videoId, videos.id))
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(tags.name, tagName.toLowerCase()), eq(videos.isPublished, true)))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Admin queries ────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [userCount, videoCount, commentCount, pendingReportCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ count: sql<number>`count(*)::int` }).from(videos),
    db.select({ count: sql<number>`count(*)::int` }).from(comments),
    db.select({ count: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, "pending")),
  ]);

  return {
    users: userCount[0]?.count ?? 0,
    videos: videoCount[0]?.count ?? 0,
    comments: commentCount[0]?.count ?? 0,
    pendingReports: pendingReportCount[0]?.count ?? 0,
  };
}

export async function listAllUsers(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAllUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return result[0]?.count ?? 0;
}

export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
  return { success: true };
}

export async function listAllReports(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      description: reports.description,
      status: reports.status,
      createdAt: reports.createdAt,
      reporterName: users.name,
      reporterEmail: users.email,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateReportStatus(reportId: number, status: "pending" | "reviewed" | "resolved" | "dismissed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reports).set({ status }).where(eq(reports.id, reportId));
  return { success: true };
}

export async function adminDeleteVideo(videoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(videos).where(eq(videos.id, videoId));
  return { success: true };
}

export async function adminDeleteComment(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(comments).where(eq(comments.id, commentId));
  return { success: true };
}
