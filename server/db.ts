import { eq, and, desc, asc, gt, like, ilike, or, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users, channels, videos, comments, likes, subscriptions, watchHistory,
  playlists, playlistVideos, tags, videoTags, notifications, reports, passwordResets,
  livestreams, livestreamSignals, liveChats,
  InsertNotification,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { normalizeVi } from "../shared/normalize";

type DrizzleDB = ReturnType<typeof drizzle>;
let _db: DrizzleDB | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, {
        max: 1,            // Supabase session pooler: 1 connection/process để tránh EMAXCONNSESSION
        idle_timeout: 10,  // đóng connection nhàn rỗi sau 10s
        connect_timeout: 10,
        prepare: false,    // bắt buộc khi dùng pgBouncer/Supabase pooler
      });
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

    const textFields = ["name", "email", "loginMethod", "passwordHash", "avatarUrl", "bio"] as const;
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
    console.warn("[Database] getUserByOpenId: database not available for openId:", openId);
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  if (result.length === 0) {
    console.warn("[Database] getUserByOpenId: no user found for openId:", openId);
  }

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
    name: userName,
    nameNorm: normalizeVi(userName),
  });

  const created = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .orderBy(desc(channels.createdAt))
    .limit(1);

  return created[0];
}

export async function updateChannelImages(userId: number, updates: { avatarUrl?: string; bannerUrl?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(channels).set(updates).where(eq(channels.userId, userId));
}

export async function updateChannelByUserId(userId: number, name: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(channels).set({ name, nameNorm: normalizeVi(name) }).where(eq(channels.userId, userId));
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
    titleNorm: normalizeVi(title),
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
      channelAvatarUrl: channels.avatarUrl,
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
      channelAvatarUrl: channels.avatarUrl,
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

  const trimmedNorm = normalizeVi(trimmed);
  // Tách thành các từ riêng lẻ, tối đa 8 token
  const tokens = trimmed.split(/\s+/).filter(Boolean).slice(0, 8);
  const tokensNorm = tokens.map(normalizeVi);

  // Điều kiện OR: khớp gốc (có dấu) HOẶC khớp norm (không dấu)
  // Thêm case đặc biệt: user gõ liền không dấu (vd "honganh") → REPLACE(titleNorm, ' ', '')
  const tokenConditions = tokens.flatMap((token, i) => {
    const tn = tokensNorm[i];
    return [
      ilike(videos.title, `%${token}%`),
      ilike(videos.description, `%${token}%`),
      ilike(channels.name, `%${token}%`),
      ilike(videos.titleNorm, `%${tn}%`),
      ilike(channels.nameNorm, `%${tn}%`),
      sql<boolean>`REPLACE(${videos.titleNorm}, ' ', '') ILIKE ${`%${tn}%`}`,
    ];
  });

  // Điểm liên quan: exact match > phrase match > token match > norm match > compound norm
  const scoreParts = [
    sql<number>`CASE WHEN LOWER(${videos.title}) = LOWER(${trimmed}) THEN 300 ELSE 0 END`,
    sql<number>`CASE WHEN ${videos.titleNorm} = ${trimmedNorm} THEN 280 ELSE 0 END`,
    sql<number>`CASE WHEN ${videos.title} ILIKE ${`%${trimmed}%`} THEN 150 ELSE 0 END`,
    sql<number>`CASE WHEN ${videos.titleNorm} ILIKE ${`%${trimmedNorm}%`} THEN 130 ELSE 0 END`,
    ...tokensNorm.flatMap((tn, i) => [
      sql<number>`CASE WHEN ${videos.title} ILIKE ${`%${tokens[i]}%`} THEN 50 ELSE 0 END`,
      sql<number>`CASE WHEN ${videos.titleNorm} ILIKE ${`%${tn}%`} THEN 45 ELSE 0 END`,
      sql<number>`CASE WHEN REPLACE(${videos.titleNorm}, ' ', '') ILIKE ${`%${tn}%`} THEN 40 ELSE 0 END`,
      sql<number>`CASE WHEN ${channels.name} ILIKE ${`%${tokens[i]}%`} THEN 30 ELSE 0 END`,
      sql<number>`CASE WHEN ${channels.nameNorm} ILIKE ${`%${tn}%`} THEN 28 ELSE 0 END`,
      sql<number>`CASE WHEN ${videos.description} ILIKE ${`%${tokens[i]}%`} THEN 10 ELSE 0 END`,
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
      channelAvatarUrl: channels.avatarUrl,
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

  const trimmedNorm = normalizeVi(trimmed);
  const tokens = trimmed.split(/\s+/).filter(Boolean).slice(0, 5);
  const tokensNorm = tokens.map(normalizeVi);

  const tokenConditions = tokens.flatMap((token, i) => {
    const tn = tokensNorm[i];
    return [
      ilike(videos.title, `%${token}%`),
      ilike(channels.name, `%${token}%`),
      ilike(videos.titleNorm, `%${tn}%`),
      ilike(channels.nameNorm, `%${tn}%`),
      sql<boolean>`REPLACE(${videos.titleNorm}, ' ', '') ILIKE ${`%${tn}%`}`,
    ];
  });

  const scoreParts = [
    sql<number>`CASE WHEN ${videos.title} ILIKE ${`%${trimmed}%`} THEN 100 ELSE 0 END`,
    sql<number>`CASE WHEN ${videos.titleNorm} ILIKE ${`%${trimmedNorm}%`} THEN 90 ELSE 0 END`,
    ...tokensNorm.map((tn, i) =>
      sql<number>`CASE WHEN ${videos.titleNorm} ILIKE ${`%${tn}%`} OR REPLACE(${videos.titleNorm}, ' ', '') ILIKE ${`%${tn}%`} THEN 50 ELSE 0 END`
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
      channelAvatarUrl: channels.avatarUrl,
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

  // JOIN channels để trả về channelId — khớp với shape của getCommentsByVideoId
  const created = await db
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
    .where(and(eq(comments.videoId, videoId), eq(comments.userId, userId)))
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
  let newType: "like" | "dislike" | null;

  if (existing) {
    if (existing.type === type) {
      // Xóa like/dislike — trigger tự giảm count
      await db.delete(likes).where(eq(likes.id, existing.id));
      newType = null;
    } else {
      // Đổi type — trigger tự swap counts
      await db.update(likes).set({ type }).where(eq(likes.id, existing.id));
      newType = type;
    }
  } else {
    // Thêm mới — trigger tự tăng count
    await db.insert(likes).values({ videoId, userId, type });
    newType = type;
  }

  // Lấy counts thực từ DB (trigger đã chạy xong trong cùng transaction)
  const video = await getVideoById(videoId);
  return {
    type: newType,
    likeCount: video?.likeCount ?? 0,
    dislikeCount: video?.dislikeCount ?? 0,
  };
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

  const subscribed = await isUserSubscribed(channelId, userId);

  if (subscribed) {
    // Hủy subscribe — trigger tự giảm subscriberCount
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.channelId, channelId), eq(subscriptions.userId, userId)));
  } else {
    // Subscribe — trigger tự tăng subscriberCount
    await db.insert(subscriptions).values({ channelId, userId });
  }

  // Lấy subscriberCount thực từ DB (trigger đã chạy xong)
  const updated = await getChannelById(channelId);
  return {
    isSubscribed: !subscribed,
    subscriberCount: updated?.subscriberCount ?? 0,
  };
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

export async function updateWatchDuration(userId: number, videoId: number, duration: number) {
  const db = await getDb();
  if (!db || duration <= 0) return null;

  // Update the most recent history entry for this user+video
  await db.execute(sql`
    UPDATE "watchHistory"
    SET "watchDuration" = ${duration}
    WHERE id = (
      SELECT id FROM "watchHistory"
      WHERE "userId" = ${userId} AND "videoId" = ${videoId}
      ORDER BY "watchedAt" DESC
      LIMIT 1
    )
  `);
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

  // DISTINCT ON keeps only the latest row per video for this user
  const deduped = await db
    .selectDistinctOn([watchHistory.videoId], {
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
    .orderBy(watchHistory.videoId, desc(watchHistory.watchedAt));

  // Re-sort by most recently watched, then paginate
  return deduped
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
    .slice(offset, offset + limit);
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
      channelAvatarUrl: channels.avatarUrl,
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
  if (!db) return { unreadCount: 0 };
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  const unreadCount = await getUnreadNotificationCount(userId);
  return { unreadCount };
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return { unreadCount: 0 };
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  return { unreadCount: 0 };
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

// Maps sidebar tag slugs → videos.category values
const CATEGORY_TAG_MAP: Record<string, string> = {
  nhac: "music",
  gaming: "gaming",
  phim: "movies",
  live: "live",
  "the-thao": "sports",
  "tin-tuc": "news",
};

const VIDEO_SELECT_FIELDS = {
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
  channelAvatarUrl: channels.avatarUrl,
};

export async function getVideosByTag(tagName: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const slug = tagName.toLowerCase();

  // "hot" slug → top viewed videos (no tags/category lookup needed)
  if (slug === "hot") {
    return db
      .select(VIDEO_SELECT_FIELDS)
      .from(videos)
      .leftJoin(channels, eq(videos.channelId, channels.id))
      .where(eq(videos.isPublished, true))
      .orderBy(desc(videos.viewCount), desc(videos.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const tagVideos = await db
    .select(VIDEO_SELECT_FIELDS)
    .from(videoTags)
    .innerJoin(tags, eq(videoTags.tagId, tags.id))
    .innerJoin(videos, eq(videoTags.videoId, videos.id))
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(tags.name, slug), eq(videos.isPublished, true)))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);

  const categoryValue = CATEGORY_TAG_MAP[slug];
  if (!categoryValue) return tagVideos;

  const categoryVideos = await db
    .select(VIDEO_SELECT_FIELDS)
    .from(videos)
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(and(eq(videos.category, categoryValue), eq(videos.isPublished, true)))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);

  // Merge and deduplicate by id
  const seen = new Set<number>();
  return [...tagVideos, ...categoryVideos]
    .filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true; })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
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

export async function deleteVideoByChannelOwner(videoId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const video = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
  if (!video[0]) return { success: false, reason: "NOT_FOUND" as const };

  const channel = await db.select().from(channels).where(eq(channels.id, video[0].channelId)).limit(1);
  if (!channel[0] || channel[0].userId !== userId) return { success: false, reason: "FORBIDDEN" as const };

  await db.delete(videos).where(eq(videos.id, videoId));
  return { success: true, reason: null };
}

export async function adminDeleteComment(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(comments).where(eq(comments.id, commentId));
  return { success: true };
}

// ─── Password reset queries ───────────────────────────────────────────────────

export async function createPasswordReset(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Xóa token cũ chưa dùng của user này trước khi tạo token mới
  await db.delete(passwordResets).where(and(eq(passwordResets.userId, userId), sql`${passwordResets.usedAt} IS NULL`));
  await db.insert(passwordResets).values({ userId, token, expiresAt });
}

export async function getPasswordResetByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordResets).where(eq(passwordResets.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markPasswordResetUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, id));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ─── Livestream functions ─────────────────────────────────────────────────────

const LIVESTREAM_SELECT = {
  id: livestreams.id,
  channelId: livestreams.channelId,
  title: livestreams.title,
  status: livestreams.status,
  viewerCount: livestreams.viewerCount,
  thumbnailUrl: livestreams.thumbnailUrl,
  videoUrl: livestreams.videoUrl,
  startedAt: livestreams.startedAt,
  endedAt: livestreams.endedAt,
  channelName: channels.name,
  channelAvatarUrl: channels.avatarUrl,
};

export async function startLivestream(channelId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Kết thúc stream cũ nếu còn active
  await db.update(livestreams)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(livestreams.channelId, channelId), eq(livestreams.status, "live")));
  await db.insert(livestreams).values({ channelId, title });
  const [row] = await db.select()
    .from(livestreams)
    .where(eq(livestreams.channelId, channelId))
    .orderBy(desc(livestreams.startedAt))
    .limit(1);
  return row;
}

export async function endLivestream(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(livestreams)
    .set({ status: "ended", endedAt: new Date(), viewerCount: 0 })
    .where(eq(livestreams.id, id));
}

export async function getActiveLivestreamByChannel(channelId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select(LIVESTREAM_SELECT)
    .from(livestreams)
    .leftJoin(channels, eq(livestreams.channelId, channels.id))
    .where(and(eq(livestreams.channelId, channelId), eq(livestreams.status, "live")))
    .orderBy(desc(livestreams.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllActiveLivestreams(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select(LIVESTREAM_SELECT)
    .from(livestreams)
    .leftJoin(channels, eq(livestreams.channelId, channels.id))
    .where(eq(livestreams.status, "live"))
    .orderBy(desc(livestreams.viewerCount), desc(livestreams.startedAt))
    .limit(limit);
}

export async function getEndedLivestreamsByChannel(channelId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select(LIVESTREAM_SELECT)
    .from(livestreams)
    .leftJoin(channels, eq(livestreams.channelId, channels.id))
    .where(and(eq(livestreams.channelId, channelId), eq(livestreams.status, "ended")))
    .orderBy(desc(livestreams.startedAt))
    .limit(limit)
    .offset(offset);
}

export async function updateLivestreamViewerCount(id: number, count: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(livestreams).set({ viewerCount: count }).where(eq(livestreams.id, id));
}

export async function saveLivestreamRecording(id: number, videoUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Lưu videoUrl vào livestream
  await db.update(livestreams).set({ videoUrl }).where(eq(livestreams.id, id));

  // 2. Tạo video entry để bản ghi xuất hiện trong danh sách video kênh
  const stream = await getLivestreamById(id);
  if (!stream?.channelId) return;

  const durationSecs =
    stream.startedAt && stream.endedAt
      ? Math.round(
          (new Date(stream.endedAt).getTime() - new Date(stream.startedAt).getTime()) / 1000
        )
      : null;

  const title = stream.title || "Livestream Recording";
  await db.insert(videos).values({
    channelId: stream.channelId,
    title,
    titleNorm: normalizeVi(title),
    videoUrl,
    thumbnailUrl: stream.thumbnailUrl ?? null,
    duration: durationSecs,
    category: "live",
    description: "",
  });
}

export async function getLivestreamById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select(LIVESTREAM_SELECT)
    .from(livestreams)
    .leftJoin(channels, eq(livestreams.channelId, channels.id))
    .where(eq(livestreams.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteLivestream(id: number, channelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(livestreamSignals).where(eq(livestreamSignals.livestreamId, id));
  await db.delete(liveChats).where(eq(liveChats.livestreamId, id));
  await db.delete(livestreams).where(and(eq(livestreams.id, id), eq(livestreams.channelId, channelId)));
}

// Viewer gửi WebRTC offer
export async function saveLivestreamOffer(livestreamId: number, viewerId: number, payload: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Xóa offer cũ của viewer này nếu có
  await db.delete(livestreamSignals).where(
    and(
      eq(livestreamSignals.livestreamId, livestreamId),
      eq(livestreamSignals.viewerId, viewerId),
      eq(livestreamSignals.fromRole, "viewer"),
    )
  );
  await db.insert(livestreamSignals).values({ livestreamId, viewerId, fromRole: "viewer", type: "offer", payload });
}

// Streamer gửi WebRTC answer cho một viewer cụ thể
export async function saveLivestreamAnswer(livestreamId: number, viewerId: number, payload: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(livestreamSignals).values({ livestreamId, viewerId, fromRole: "streamer", type: "answer", payload });
}

// Streamer poll: lấy offer mới từ viewer (id > afterId)
export async function getStreamerSignals(livestreamId: number, afterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(livestreamSignals)
    .where(and(
      eq(livestreamSignals.livestreamId, livestreamId),
      eq(livestreamSignals.fromRole, "viewer"),
      gt(livestreamSignals.id, afterId),
    ))
    .orderBy(asc(livestreamSignals.id))
    .limit(50);
}

// Viewer poll: lấy answer từ streamer (id > afterId)
export async function getViewerSignals(livestreamId: number, viewerId: number, afterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(livestreamSignals)
    .where(and(
      eq(livestreamSignals.livestreamId, livestreamId),
      eq(livestreamSignals.viewerId, viewerId),
      eq(livestreamSignals.fromRole, "streamer"),
      gt(livestreamSignals.id, afterId),
    ))
    .orderBy(asc(livestreamSignals.id))
    .limit(5);
}

export async function saveLiveChat(livestreamId: number, userId: number, userName: string, message: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(liveChats).values({ livestreamId, userId, userName, message });
}

export async function getLiveChats(livestreamId: number, afterId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(liveChats)
    .where(and(eq(liveChats.livestreamId, livestreamId), gt(liveChats.id, afterId)))
    .orderBy(asc(liveChats.id))
    .limit(limit);
}
