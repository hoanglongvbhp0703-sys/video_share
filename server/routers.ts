import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  getOrCreateChannel,
  getChannelById,
  updateChannelByUserId,
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
  deleteVideoByChannelOwner,
  updateChannelImages,
  startLivestream,
  endLivestream,
  getActiveLivestreamByChannel,
  getAllActiveLivestreams,
  saveLivestreamOffer,
  saveLivestreamAnswer,
  getStreamerSignals,
  getViewerSignals,
  saveLiveChat,
  getLiveChats,
  updateLivestreamViewerCount,
  getEndedLivestreamsByChannel,
  deleteLivestream,
  saveLivestreamRecording,
  getLivestreamById,
} from "./db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { videos } from "../drizzle/schema";
import { storagePut } from "./storage";

type ChatResult = { message: string; category: string | null; searchQuery: string | null };

function keywordFallback(userMsg: string, language: string): ChatResult {
  const q = userMsg.toLowerCase();

  const RULES: Array<{ patterns: string[]; category: string; replies: Record<string, string> }> = [
    {
      category: "music",
      patterns: ["nhạc", "nhac", "music", "âm nhạc", "am nhac", "mv", "ca sĩ", "ca si", "bài hát", "bai hat", "ost", "音楽", "歌"],
      replies: { vi: "Tuyệt! Đây là những video âm nhạc hay nhất cho bạn 🎵", en: "Great choice! Here are some music videos for you 🎵", ja: "素晴らしい！音楽動画をご紹介します 🎵" },
    },
    {
      category: "gaming",
      patterns: ["game", "gaming", "trò chơi", "tro choi", "esport", "gameplay", "playthrough", "minecraft", "lol", "pubg", "ゲーム"],
      replies: { vi: "Gaming it is! Xem ngay những video game hấp dẫn 🎮", en: "Let's game! Here are some gaming videos for you 🎮", ja: "ゲーム動画をどうぞ！ 🎮" },
    },
    {
      category: "movies",
      patterns: ["phim", "film", "movie", "điện ảnh", "dien anh", "series", "tập phim", "tap phim", "trailer", "映画", "ドラマ"],
      replies: { vi: "Hay lắm! Đây là những video phim hot nhất 🎬", en: "Great! Here are the hottest movie videos for you 🎬", ja: "映画動画をご用意しました 🎬" },
    },
    {
      category: "sports",
      patterns: ["thể thao", "the thao", "sport", "bóng đá", "bong da", "football", "soccer", "tennis", "gym", "fitness", "スポーツ", "サッカー"],
      replies: { vi: "Thể thao là số 1! Đây là những video thể thao hot 🏃", en: "Sports fan! Check out these sports videos 🏃", ja: "スポーツ動画をどうぞ！ 🏃" },
    },
    {
      category: "news",
      patterns: ["tin tức", "tin tuc", "news", "thời sự", "thoi su", "báo", "bao", "sự kiện", "su kien", "ニュース", "時事"],
      replies: { vi: "Cập nhật ngay! Đây là những video tin tức mới nhất 📰", en: "Stay informed! Here are the latest news videos 📰", ja: "最新ニュース動画をどうぞ 📰" },
    },
    {
      category: "live",
      patterns: ["live", "trực tiếp", "truc tiep", "stream", "phát sóng", "phat song", "ライブ", "配信"],
      replies: { vi: "Xem trực tiếp ngay! Đây là các buổi stream 📡", en: "Going live! Here are some livestream videos 📡", ja: "ライブ配信動画をどうぞ 📡" },
    },
  ];

  for (const rule of RULES) {
    if (rule.patterns.some(p => q.includes(p))) {
      return {
        message: rule.replies[language] ?? rule.replies["en"],
        category: rule.category,
        searchQuery: null,
      };
    }
  }

  // Không match category → dùng làm search query
  const isQuestion = q.length < 3 || ["?", "gì", "gi", "what", "nào", "nao"].some(w => q.includes(w));
  if (isQuestion || q.length < 4) {
    const askAgain: Record<string, string> = {
      vi: "Bạn muốn xem gì? Thử nhập: phim, nhạc, gaming, thể thao, tin tức hoặc live nhé! 😊",
      en: "What would you like to watch? Try: movies, music, gaming, sports, news, or live! 😊",
      ja: "何を見たいですか？映画、音楽、ゲーム、スポーツ、ニュース、ライブなど入力してみて！ 😊",
    };
    return { message: askAgain[language] ?? askAgain["en"], category: null, searchQuery: null };
  }

  // Dùng input làm keyword search
  const searching: Record<string, string> = {
    vi: `Tìm video về "${userMsg}" cho bạn nhé! 🔍`,
    en: `Searching videos about "${userMsg}" for you! 🔍`,
    ja: `「${userMsg}」の動画を検索します！ 🔍`,
  };
  return { message: searching[language] ?? searching["en"], category: null, searchQuery: userMsg };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      // Strip password hash — never send to client
      const { passwordHash: _pw, ...safeUser } = opts.ctx.user;
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const result = await deleteVideoByChannelOwner(input.id, ctx.user.id);
        if (!result.success) {
          throw new TRPCError({
            code: result.reason === "NOT_FOUND" ? "NOT_FOUND" : "FORBIDDEN",
          });
        }
        return { success: true };
      }),

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

    updateImages: protectedProcedure
      .input(z.object({
        type: z.enum(["avatar", "banner"]),
        fileData: z.instanceof(Uint8Array),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const key = `channels/${ctx.user.id}/${input.type}/${input.fileName}`;
        const { url } = await storagePut(key, input.fileData, input.mimeType);
        const updates = input.type === "avatar" ? { avatarUrl: url } : { bannerUrl: url };
        await updateChannelImages(ctx.user.id, updates);
        return { url };
      }),

    getVideos: publicProcedure
      .input(z.object({ channelId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getVideosByChannelId(input.channelId, input.limit, input.offset)),

    getLivestreams: publicProcedure
      .input(z.object({ channelId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getEndedLivestreamsByChannel(input.channelId, input.limit, input.offset)),
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
      const { passwordHash: _pw, ...user } = ctx.user;
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
        if (input.name !== undefined) {
          await updateChannelByUserId(ctx.user.id, input.name);
        }
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
        if (user.passwordHash) {
          const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
          if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Mật khẩu hiện tại không đúng" });
        }

        const newHash = await bcrypt.hash(input.newPassword, 10);
        await upsertUser({ openId: ctx.user.openId, passwordHash: newHash });
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
      .mutation(async ({ input, ctx }) => {
        const channel = await getChannelById(input.channelId);
        if (!channel) throw new TRPCError({ code: "NOT_FOUND", message: "Kênh không tồn tại" });
        if (channel.userId === ctx.user.id)
          throw new TRPCError({ code: "FORBIDDEN", message: "Không thể đăng ký kênh của chính mình" });
        return toggleSubscription(input.channelId, ctx.user.id);
      }),

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

  // Livestream routers
  livestreams: router({
    start: protectedProcedure
      .input(z.object({ title: z.string().min(1).max(255) }))
      .mutation(async ({ input, ctx }) => {
        const channel = await getOrCreateChannel(ctx.user.id, ctx.user.name || "User");
        return startLivestream(channel.id, input.title);
      }),

    end: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => endLivestream(input.id)),

    getActiveByChannel: publicProcedure
      .input(z.object({ channelId: z.number() }))
      .query(({ input }) => getActiveLivestreamByChannel(input.channelId)),

    getAllActive: publicProcedure
      .query(() => getAllActiveLivestreams()),

    // Viewer gửi WebRTC offer (SDP đầy đủ sau khi ICE gathering xong)
    sendViewerOffer: protectedProcedure
      .input(z.object({ livestreamId: z.number(), payload: z.string() }))
      .mutation(({ input, ctx }) =>
        saveLivestreamOffer(input.livestreamId, ctx.user.id, input.payload)
      ),

    // Streamer gửi WebRTC answer cho một viewer
    sendStreamerAnswer: protectedProcedure
      .input(z.object({ livestreamId: z.number(), viewerId: z.number(), payload: z.string() }))
      .mutation(({ input }) =>
        saveLivestreamAnswer(input.livestreamId, input.viewerId, input.payload)
      ),

    // Streamer poll: lấy offer mới từ viewers
    getStreamerSignals: protectedProcedure
      .input(z.object({ livestreamId: z.number(), afterId: z.number().default(0) }))
      .query(({ input }) => getStreamerSignals(input.livestreamId, input.afterId)),

    // Viewer poll: lấy answer từ streamer
    getViewerSignals: publicProcedure
      .input(z.object({ livestreamId: z.number(), viewerId: z.number(), afterId: z.number().default(0) }))
      .query(({ input }) => getViewerSignals(input.livestreamId, input.viewerId, input.afterId)),

    sendChat: protectedProcedure
      .input(z.object({ livestreamId: z.number(), message: z.string().min(1).max(500) }))
      .mutation(({ input, ctx }) =>
        saveLiveChat(input.livestreamId, ctx.user.id, ctx.user.name || "Ẩn danh", input.message)
      ),

    getChats: publicProcedure
      .input(z.object({ livestreamId: z.number(), afterId: z.number().default(0) }))
      .query(({ input }) => getLiveChats(input.livestreamId, input.afterId)),

    updateViewerCount: protectedProcedure
      .input(z.object({ id: z.number(), count: z.number() }))
      .mutation(({ input }) => updateLivestreamViewerCount(input.id, input.count)),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const channel = await getOrCreateChannel(ctx.user.id, ctx.user.name || "User");
        await deleteLivestream(input.id, channel.id);
        return { success: true };
      }),

    saveRecording: protectedProcedure
      .input(z.object({ id: z.number(), videoUrl: z.string().url() }))
      .mutation(async ({ input, ctx }) => {
        const channel = await getOrCreateChannel(ctx.user.id, ctx.user.name || "User");
        const stream = await getLivestreamById(input.id);
        if (!stream || stream.channelId !== channel.id) throw new TRPCError({ code: "FORBIDDEN" });
        await saveLivestreamRecording(input.id, input.videoUrl);
        return { success: true };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getLivestreamById(input.id)),
  }),

  ai: router({
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(500),
        })).max(20),
        language: z.string().default("vi"),
      }))
      .mutation(async ({ input }) => {
        const apiKey = process.env.GROQ_API_KEY;
        const lastUserMsg = [...input.messages].reverse().find(m => m.role === "user")?.content ?? "";

        // Thử gọi Groq nếu có API key
        if (apiKey) {
          try {
            const langName =
              input.language === "vi" ? "Vietnamese" :
              input.language === "ja" ? "Japanese" : "English";

            const systemPrompt = `You are a friendly video recommendation assistant for VideoShare.
Available categories: news, gaming, music, movies, live, sports

Rules (MUST follow):
1. If the user asks about a topic you cannot find relevant content for, or the topic is outside the available categories, honestly say you don't know about that specific topic and suggest 2-3 of the available categories they might enjoy instead. Set category to the closest match or null, and searchQuery to null.
2. NEVER make up video titles or claim content exists when it may not.
3. Always set at least one of category or searchQuery unless you genuinely cannot map the request to any content — in that case, set both to null and explain kindly.
4. Respond ONLY with raw JSON (no markdown, no backticks): {"message":"...","category":"music|gaming|movies|news|live|sports|null","searchQuery":"keywords or null"}
5. Respond in ${langName}. Be concise (1-2 sentences).`;

            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: systemPrompt }, ...input.messages],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 500,
              }),
            });

            if (res.ok) {
              const data = await res.json() as { choices: Array<{ message: { content: string } }> };
              const raw = (data.choices[0]?.message?.content ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
              const parsed = JSON.parse(raw) as { message?: string; category?: string | null; searchQuery?: string | null };
              const validCategories = ["news", "gaming", "music", "movies", "live", "sports"];
              return {
                message: parsed.message ?? keywordFallback(lastUserMsg, input.language).message,
                category: validCategories.includes(parsed.category ?? "") ? (parsed.category ?? null) : null,
                searchQuery: parsed.searchQuery ?? null,
              };
            }
            console.error("xAI API error:", res.status, await res.text());
          } catch (e) {
            console.error("xAI call failed, using keyword fallback:", e);
          }
        }

        // Fallback: keyword matching thông minh (không cần API key)
        return keywordFallback(lastUserMsg, input.language);
      }),
  }),
});

export type AppRouter = typeof appRouter;
