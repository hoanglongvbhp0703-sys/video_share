import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  getOrCreateChannel,
  getChannelById,
  getVideoById,
  getVideosByChannelId,
  getLatestVideos,
  getTrendingVideos,
  searchVideos,
  suggestVideos,
  getVideosByCategory,
  incrementVideoViewCount,
  getCommentsByVideoId,
  createComment,
  getUserLikeOnVideo,
  toggleLike,
  isUserSubscribed,
  toggleSubscription,
  getChannelSubscriberCount,
  createVideo,
  recordWatchHistory,
  getWatchHistoryWithVideos,
  getUsersByIds,
  getUserByOpenId,
  upsertUser,
  getChannelVideoCount,
  getDb,
  createPlaylist,
  getPlaylistsByUserId,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getPlaylistVideos,
  isVideoInPlaylist,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createReport,
  getOrCreateTag,
  addTagToVideo,
  getTagsByVideoId,
  getVideosByTag,
  getAdminStats,
  listAllUsers,
  countAllUsers,
  setUserRole,
  listAllReports,
  updateReportStatus,
  adminDeleteVideo,
  adminDeleteComment,
} from "./db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { videos } from "../drizzle/schema";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      // Strip password hash — never send to client
      const { password: _pw, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Video routers
  videos: router({
    uploadPresignedUrl: protectedProcedure
      .input(z.object({
        videoFileName: z.string(),
        videoMimeType: z.string(),
        thumbnailFileName: z.string().optional(),
        thumbnailMimeType: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Generate unique IDs for this upload session
        const uploadId = Date.now();
        const videoKey = `videos/${ctx.user.id}/${uploadId}/${input.videoFileName}`;
        const thumbnailKey = input.thumbnailFileName 
          ? `videos/${ctx.user.id}/${uploadId}/${input.thumbnailFileName}`
          : undefined;

        return {
          uploadId,
          videoKey,
          thumbnailKey,
        };
      }),

    uploadFile: protectedProcedure
      .input(z.object({
        fileKey: z.string(),
        fileData: z.instanceof(Uint8Array),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await storagePut(
            input.fileKey,
            input.fileData,
            input.mimeType
          );
          return result;
        } catch (error) {
          console.error("Storage upload error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to upload file to storage",
          });
        }
      }),

    createWithUrls: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        videoUrl: z.string(),
        thumbnailUrl: z.string().optional(),
        duration: z.number().optional(),
        category: z.string().max(50).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const channel = await getOrCreateChannel(ctx.user.id, ctx.user.name || "User");
        return createVideo(
          channel.id,
          input.title,
          input.description || "",
          input.videoUrl,
          input.thumbnailUrl,
          input.duration,
          input.category
        );
      }),

    list: publicProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getLatestVideos(input.limit, input.offset)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const video = await getVideoById(input.id);
        if (!video) throw new TRPCError({ code: "NOT_FOUND" });
        return video;
      }),

    search: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => searchVideos(input.query, input.limit, input.offset)),

    suggest: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().default(8) }))
      .query(({ input }) => suggestVideos(input.query, input.limit)),

    getTrending: publicProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getTrendingVideos(input.limit, input.offset)),

    getByCategory: publicProcedure
      .input(z.object({ category: z.string(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getVideosByCategory(input.category, input.limit, input.offset)),

    incrementView: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => incrementVideoViewCount(input.id)),

    upload: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        videoUrl: z.string(),
        thumbnailUrl: z.string().optional(),
        duration: z.number().optional(),
        category: z.string().max(50).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const channel = await getOrCreateChannel(ctx.user.id, ctx.user.name || "User");
        return createVideo(
          channel.id,
          input.title,
          input.description || "",
          input.videoUrl,
          input.thumbnailUrl,
          input.duration,
          input.category
        );
      }),
  }),

  // Channel routers
  channels: router({
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const channel = await getChannelById(input.id);
        if (!channel) throw new TRPCError({ code: "NOT_FOUND" });
        return channel;
      }),

    getMyChannel: protectedProcedure
      .query(async ({ ctx }) => getOrCreateChannel(ctx.user.id, ctx.user.name || "User")),

    getVideos: publicProcedure
      .input(z.object({ channelId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getVideosByChannelId(input.channelId, input.limit, input.offset)),
  }),

  // Comment routers
  comments: router({
    getByVideoId: publicProcedure
      .input(z.object({ videoId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getCommentsByVideoId(input.videoId, input.limit, input.offset)),

    create: protectedProcedure
      .input(z.object({ videoId: z.number(), content: z.string().min(1).max(5000) }))
      .mutation(({ input, ctx }) => createComment(input.videoId, ctx.user.id, input.content)),
  }),

  // Like routers
  likes: router({
    getMyLike: publicProcedure
      .input(z.object({ videoId: z.number(), userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const userId = input.userId ?? ctx.user?.id;
        if (!userId) return null;
        const result = await getUserLikeOnVideo(input.videoId, userId);
        return result ?? null;
      }),

    toggle: protectedProcedure
      .input(z.object({ videoId: z.number(), type: z.enum(["like", "dislike"]) }))
      .mutation(({ input, ctx }) => toggleLike(input.videoId, ctx.user.id, input.type)),
  }),

  // User routers
  users: router({
    getByIds: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .query(({ input }) => getUsersByIds(input.ids)),

    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      const { password: _pw, ...user } = ctx.user;
      const channel = await getOrCreateChannel(ctx.user.id, ctx.user.name || "User");
      const videoCount = await getChannelVideoCount(channel.id);
      return {
        ...user,
        channel: { ...channel, videoCount },
      };
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const updates: Record<string, unknown> = { openId: ctx.user.openId };
        if (input.name !== undefined) updates.name = input.name;
        if (input.bio !== undefined) updates.bio = input.bio;
        await upsertUser(updates as Parameters<typeof upsertUser>[0]);
        return { success: true };
      }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        // Kiểm tra password hiện tại
        if (user.password) {
          const valid = await bcrypt.compare(input.currentPassword, user.password);
          if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Mật khẩu hiện tại không đúng" });
        }

        const newHash = await bcrypt.hash(input.newPassword, 10);
        await upsertUser({ openId: ctx.user.openId, password: newHash });
        return { success: true };
      }),
  }),

  // Watch History routers
  watchHistory: router({
    record: protectedProcedure
      .input(z.object({ videoId: z.number(), watchDuration: z.number().default(0) }))
      .mutation(({ input, ctx }) => recordWatchHistory(input.videoId, ctx.user.id, input.watchDuration)),

    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ ctx, input }) => getWatchHistoryWithVideos(ctx.user.id, input.limit, input.offset)),
  }),

  // Playlist routers
  playlists: router({
    getMyPlaylists: protectedProcedure.query(({ ctx }) => getPlaylistsByUserId(ctx.user.id)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const playlist = await getPlaylistById(input.id);
        if (!playlist) throw new TRPCError({ code: "NOT_FOUND" });
        return playlist;
      }),

    getVideos: publicProcedure
      .input(z.object({ playlistId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
      .query(({ input }) => getPlaylistVideos(input.playlistId, input.limit, input.offset)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        isPublic: z.boolean().default(true),
      }))
      .mutation(({ input, ctx }) =>
        createPlaylist(ctx.user.id, input.name, input.description ?? null, input.isPublic)
      ),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).nullable().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const playlist = await getPlaylistById(id);
        if (!playlist) throw new TRPCError({ code: "NOT_FOUND" });
        if (playlist.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return updatePlaylist(id, ctx.user.id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const playlist = await getPlaylistById(input.id);
        if (!playlist) throw new TRPCError({ code: "NOT_FOUND" });
        if (playlist.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return deletePlaylist(input.id, ctx.user.id);
      }),

    addVideo: protectedProcedure
      .input(z.object({ playlistId: z.number(), videoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const playlist = await getPlaylistById(input.playlistId);
        if (!playlist) throw new TRPCError({ code: "NOT_FOUND" });
        if (playlist.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return addVideoToPlaylist(input.playlistId, input.videoId);
      }),

    removeVideo: protectedProcedure
      .input(z.object({ playlistId: z.number(), videoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const playlist = await getPlaylistById(input.playlistId);
        if (!playlist) throw new TRPCError({ code: "NOT_FOUND" });
        if (playlist.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return removeVideoFromPlaylist(input.playlistId, input.videoId);
      }),

    isVideoInPlaylist: protectedProcedure
      .input(z.object({ playlistId: z.number(), videoId: z.number() }))
      .query(({ input }) => isVideoInPlaylist(input.playlistId, input.videoId)),
  }),

  // Notification routers
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(30), offset: z.number().default(0) }))
      .query(({ ctx, input }) => getNotifications(ctx.user.id, input.limit, input.offset)),

    getUnreadCount: protectedProcedure.query(({ ctx }) => getUnreadNotificationCount(ctx.user.id)),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input, ctx }) => markNotificationAsRead(input.id, ctx.user.id)),

    markAllAsRead: protectedProcedure.mutation(({ ctx }) => markAllNotificationsAsRead(ctx.user.id)),
  }),

  // Report routers
  reports: router({
    create: protectedProcedure
      .input(z.object({
        targetType: z.enum(["video", "comment"]),
        targetId: z.number(),
        reason: z.string().min(1).max(100),
        description: z.string().max(1000).optional(),
      }))
      .mutation(({ input, ctx }) =>
        createReport(ctx.user.id, input.targetType, input.targetId, input.reason, input.description)
      ),
  }),

  // Tag routers
  tags: router({
    getByVideo: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .query(({ input }) => getTagsByVideoId(input.videoId)),

    getVideosByTag: publicProcedure
      .input(z.object({ tag: z.string(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getVideosByTag(input.tag, input.limit, input.offset)),

    addToVideo: protectedProcedure
      .input(z.object({ videoId: z.number(), tagName: z.string().min(1).max(100) }))
      .mutation(async ({ input, ctx }) => {
        const video = await getVideoById(input.videoId);
        if (!video) throw new TRPCError({ code: "NOT_FOUND" });
        const channel = await getOrCreateChannel(ctx.user.id, ctx.user.name || "User");
        if (video.channelId !== channel.id) throw new TRPCError({ code: "FORBIDDEN" });
        const tag = await getOrCreateTag(input.tagName);
        await addTagToVideo(input.videoId, tag.id);
        return tag;
      }),
  }),

  // Subscription routers
  subscriptions: router({
    isSubscribed: publicProcedure
      .input(z.object({ channelId: z.number(), userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const userId = input.userId ?? ctx.user?.id;
        if (!userId) return false;
        return isUserSubscribed(input.channelId, userId);
      }),

    toggle: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .mutation(({ input, ctx }) => toggleSubscription(input.channelId, ctx.user.id)),

    getCount: publicProcedure
      .input(z.object({ channelId: z.number() }))
      .query(({ input }) => getChannelSubscriberCount(input.channelId)),
  }),

  // Admin routers
  admin: router({
    getStats: adminProcedure
      .query(() => getAdminStats()),

    listUsers: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        const [items, total] = await Promise.all([
          listAllUsers(input.limit, input.offset),
          countAllUsers(),
        ]);
        return { items, total };
      }),

    setUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể thay đổi role của chính mình" });
        }
        return setUserRole(input.userId, input.role);
      }),

    listReports: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(({ input }) => listAllReports(input.limit, input.offset)),

    updateReportStatus: adminProcedure
      .input(z.object({ reportId: z.number(), status: z.enum(["pending", "reviewed", "resolved", "dismissed"]) }))
      .mutation(({ input }) => updateReportStatus(input.reportId, input.status)),

    deleteVideo: adminProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(({ input }) => adminDeleteVideo(input.videoId)),

    deleteComment: adminProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(({ input }) => adminDeleteComment(input.commentId)),
  }),
});

export type AppRouter = typeof appRouter;
