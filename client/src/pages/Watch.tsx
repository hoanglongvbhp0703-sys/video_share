import { useParams, Link } from "wouter";
import { useEffect, useState, useMemo, useRef } from "react";
import Layout from "@/components/Layout";
import VideoPlayer from "@/components/VideoPlayer";
import SaveToPlaylistDialog from "@/components/SaveToPlaylistDialog";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThumbsUp, ThumbsDown, Share2, MoreVertical, Bell, ListVideo, MessageSquare, Smile } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/lib/useDateLocale";

interface VideoParams {
  id: string;
}

export default function Watch() {
  const { id } = useParams<VideoParams>();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = useDateLocale();
  const videoId = parseInt(id || "0");

  const [commentText, setCommentText] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Read resume position synchronously so VideoPlayer gets the correct initialTime on first render
  const [resumeTime] = useState<number>(() => {
    if (!videoId) return 0;
    try {
      const raw = localStorage.getItem(`vs_resume_${videoId}`);
      if (!raw) return 0;
      const { position, timestamp } = JSON.parse(raw) as { position: number; timestamp: number };
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000 && position > 10) return position;
      localStorage.removeItem(`vs_resume_${videoId}`);
      return 0;
    } catch {
      return 0;
    }
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const savePositionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTimeRef = useRef<number>(0);

  const RESUME_KEY = `vs_resume_${videoId}`;

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const { data: video, isLoading: videoLoading } = trpc.videos.getById.useQuery(
    { id: videoId },
    { enabled: !!videoId }
  );

  const { data: channel } = trpc.channels.getById.useQuery(
    { id: video?.channelId ?? 0 },
    { enabled: !!video?.channelId }
  );

  const { data: comments, refetch: refetchComments } = trpc.comments.getByVideoId.useQuery(
    { videoId, limit: 20, offset: 0 },
    { enabled: !!videoId }
  );

  const commentUserIds = useMemo(
    () => (comments ? Array.from(new Set(comments.map((c) => c.userId))) : []),
    [comments]
  );
  const { data: commentUsers } = trpc.users.getByIds.useQuery(
    { ids: commentUserIds },
    { enabled: commentUserIds.length > 0 }
  );
  const userMap = useMemo(
    () =>
      commentUsers
        ? Object.fromEntries(commentUsers.map((u) => [u.id, u.name ?? t("watch.user", { id: u.id })]))
        : {},
    [commentUsers, t]
  );

  const { data: myLike, refetch: refetchLike } = trpc.likes.getMyLike.useQuery(
    { videoId },
    { enabled: !!videoId }
  );

  const { data: isSubscribed, refetch: refetchSubscription } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: video?.channelId ?? 0 },
    { enabled: !!video?.channelId && isAuthenticated }
  );

  const { data: relatedVideos } = trpc.channels.getVideos.useQuery(
    { channelId: video?.channelId ?? 0, limit: 6, offset: 0 },
    { enabled: !!video?.channelId }
  );

  const incrementViewMutation = trpc.videos.incrementView.useMutation();
  const recordHistoryMutation = trpc.watchHistory.record.useMutation();
  const updateDurationMutation = trpc.watchHistory.updateDuration.useMutation();
  const utils = trpc.useUtils();

  const toggleLikeMutation = trpc.likes.toggle.useMutation({
    onMutate: async ({ videoId: vid, type }) => {
      await utils.likes.getMyLike.cancel({ videoId: vid });
      const prevLike = utils.likes.getMyLike.getData({ videoId: vid });
      const toggled = prevLike?.type === type;
      // Chỉ flip trạng thái like/dislike — đây là deterministic, không phải hardcode count
      utils.likes.getMyLike.setData({ videoId: vid }, toggled ? null : { type });
      return { prevLike };
    },
    onSuccess: (data, { videoId: vid }) => {
      // Cập nhật count bằng giá trị thực từ server (không hardcode ±1)
      utils.videos.getById.setData({ id: vid }, (old) =>
        old ? { ...old, likeCount: data.likeCount, dislikeCount: data.dislikeCount } : old
      );
    },
    onError: (err, { videoId: vid }, ctx) => {
      if (ctx?.prevLike !== undefined) utils.likes.getMyLike.setData({ videoId: vid }, ctx.prevLike);
      toast.error(err.message || t("watch.likeError"));
    },
    onSettled: (_, __, { videoId: vid }) => {
      utils.likes.getMyLike.invalidate({ videoId: vid });
    },
  });

  const toggleSubscriptionMutation = trpc.subscriptions.toggle.useMutation({
    onMutate: async ({ channelId }) => {
      await utils.subscriptions.isSubscribed.cancel({ channelId });
      const prev = utils.subscriptions.isSubscribed.getData({ channelId });
      // Flip boolean ngay — deterministic, không cần tính toán count
      utils.subscriptions.isSubscribed.setData({ channelId }, !prev);
      return { prev };
    },
    onSuccess: (data, { channelId }) => {
      // subscriberCount thực từ server, không hardcode ±1
      utils.subscriptions.getCount.setData({ channelId }, data.subscriberCount);
    },
    onError: (_, { channelId }, ctx) => {
      if (ctx?.prev !== undefined) utils.subscriptions.isSubscribed.setData({ channelId }, ctx.prev);
    },
    onSettled: (_, __, { channelId }) => {
      utils.subscriptions.isSubscribed.invalidate({ channelId });
      utils.subscriptions.getCount.invalidate({ channelId });
    },
  });

  const createCommentMutation = trpc.comments.create.useMutation({
    onSuccess: (newComment, { videoId: vid }) => {
      utils.comments.getByVideoId.setData(
        { videoId: vid, limit: 20, offset: 0 },
        (old) => (old ? [newComment, ...old] : [newComment])
      );
    },
    onError: () => {
      toast.error(t("watch.commentError"));
    },
    onSettled: (_, __, { videoId: vid }) => {
      utils.comments.getByVideoId.invalidate({ videoId: vid, limit: 20, offset: 0 });
      // Refresh commentCount in the header (updated by DB trigger, needs re-fetch)
      utils.videos.getById.invalidate({ id: vid });
    },
  });

  useEffect(() => {
    if (videoId) {
      incrementViewMutation.mutate({ id: videoId });
      if (isAuthenticated) {
        recordHistoryMutation.mutate({ videoId, watchDuration: 0 });
      }
    }
  }, [videoId]);

  // Show toast once if resuming from a saved position
  useEffect(() => {
    if (resumeTime > 0) {
      toast.info(t("watch.resumeFrom", { time: formatTime(resumeTime) }), { duration: 4000 });
    }
  }, []);

  // Save position to DB when navigating away (so History progress bar is up to date)
  useEffect(() => {
    return () => {
      const pos = Math.floor(currentTimeRef.current);
      if (pos > 5 && isAuthenticated) {
        updateDurationMutation.mutate({ videoId, duration: pos });
      }
    };
  }, [videoId, isAuthenticated]);

  // Save position every 10 seconds
  useEffect(() => {
    if (!videoId) return;
    savePositionTimerRef.current = setInterval(() => {
      const pos = currentTimeRef.current;
      const duration = video?.duration ?? 0;
      // Skip saving if watched less than 10s or already near the end (>95%)
      if (pos < 10 || (duration > 0 && pos >= duration * 0.95)) return;
      localStorage.setItem(RESUME_KEY, JSON.stringify({ position: pos, timestamp: Date.now() }));
    }, 10000);

    return () => {
      if (savePositionTimerRef.current) clearInterval(savePositionTimerRef.current);
    };
  }, [videoId, video?.duration]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      // composedPath() xử lý đúng Shadow DOM của emoji-mart
      const path = e.composedPath();
      if (pickerRef.current && !path.includes(pickerRef.current)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji: { native: string }) => {
    const ta = textareaRef.current;
    if (!ta) {
      setCommentText((prev) => prev + emoji.native);
      return;
    }
    const start = ta.selectionStart ?? commentText.length;
    const end = ta.selectionEnd ?? commentText.length;
    const newText = commentText.slice(0, start) + emoji.native + commentText.slice(end);
    setCommentText(newText);
    // Khôi phục cursor sau khi React re-render cập nhật value
    requestAnimationFrame(() => {
      const pos = start + emoji.native.length;
      ta.selectionStart = ta.selectionEnd = pos;
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    // Guard chặn double-submit khi user click nhanh trước khi React kịp disable button
    if (isSubmittingRef.current) return;
    if (!isAuthenticated) { toast.error(t("watch.commentLoginError")); return; }
    if (!commentText.trim()) { toast.error(t("watch.commentEmptyError")); return; }
    isSubmittingRef.current = true;
    createCommentMutation.mutate(
      { videoId, content: commentText },
      { onSettled: () => { isSubmittingRef.current = false; } }
    );
    setCommentText("");
    setShowEmojiPicker(false);
  };

  const handleTimeUpdate = (currentTime: number) => {
    currentTimeRef.current = currentTime;
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: video?.title ?? "", url });
      } catch {
        // User cancelled — no-op
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("watch.linkCopied"));
      } catch {
        toast.error(url);
      }
    }
  };

  const handleToggleLike = (type: "like" | "dislike") => {
    if (!isAuthenticated) {
      toast.error(t("watch.loginError"));
      return;
    }
    toggleLikeMutation.mutate({ videoId, type });
  };

  const handleToggleSubscription = () => {
    if (!isAuthenticated) { toast.error(t("watch.loginToSubscribe")); return; }
    if (!video?.channelId) return;
    const willSubscribe = !isSubscribed;
    toggleSubscriptionMutation.mutate({ channelId: video.channelId });
    toast.success(willSubscribe ? t("watch.subscribeSuccess") : t("watch.unsubscribeSuccess"));
  };

  if (videoLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6">
          <Skeleton className="w-full aspect-video rounded-lg mb-4" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout>
        <div className="p-4 md:p-6 text-center">
          <p className="text-gray-600">{t("watch.videoNotFound")}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <VideoPlayer
          src={video.videoUrl || ""}
          poster={video.thumbnailUrl || undefined}
          title={video.title}
          initialTime={resumeTime}
          onTimeUpdate={handleTimeUpdate}
        />
        <div className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>

            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <Link href={`/channel/${video.channelId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-white font-bold">
                    {channel?.name?.charAt(0).toUpperCase() ?? "K"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{channel?.name ?? t("common.loading")}</p>
                  <p className="text-sm text-gray-600">
                    {channel?.subscriberCount?.toLocaleString() ?? 0} {t("watch.subscribers")}
                  </p>
                </div>
              </Link>
              {channel?.userId !== user?.id && (
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  onClick={handleToggleSubscription}
                  disabled={toggleSubscriptionMutation.isPending}
                  className="gap-2"
                >
                  <Bell className="w-4 h-4" />
                  {isSubscribed ? t("watch.subscribed") : t("watch.subscribe")}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => handleToggleLike("like")}
                  disabled={toggleLikeMutation.isPending}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    myLike?.type === "like" ? "bg-primary text-white" : "hover:bg-gray-200"
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm">{video.likeCount}</span>
                </button>
                <div className="w-px h-6 bg-gray-300" />
                <button
                  onClick={() => handleToggleLike("dislike")}
                  disabled={toggleLikeMutation.isPending}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    myLike?.type === "dislike" ? "bg-primary text-white" : "hover:bg-gray-200"
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span className="text-sm">{video.dislikeCount}</span>
                </button>
              </div>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm">{t("watch.share")}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-auto p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                    <ListVideo className="w-4 h-4 mr-2" />
                    {t("channel.saveToPlaylist")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <SaveToPlaylistDialog
                videoId={videoId}
                open={saveDialogOpen}
                onClose={() => setSaveDialogOpen(false)}
              />
            </div>

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 mb-2">
                {video.viewCount.toLocaleString()} {t("watch.views")} •{" "}
                {formatDistanceToNow(new Date(video.createdAt), { locale: dateLocale, addSuffix: true })}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{video.description}</p>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {video.commentCount} {t("watch.comments")}
              </h2>

              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="mb-6">
                  <div className="flex gap-3 mb-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-white">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="relative flex-1">
                      <Textarea
                        ref={textareaRef}
                        placeholder={t("watch.addComment")}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="resize-none pr-10"
                        rows={3}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((v) => !v)}
                        className="absolute bottom-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Chèn emoji"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      {showEmojiPicker && (
                        <div ref={pickerRef} className="absolute bottom-full right-0 z-50 mb-1 shadow-xl">
                          <Picker
                            data={data}
                            onEmojiSelect={handleEmojiSelect}
                            theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
                            locale={["vi", "ja", "en"].includes(i18n.language) ? i18n.language : "en"}
                            previewPosition="none"
                            skinTonePosition="search"
                            set="native"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setCommentText(""); setShowEmojiPicker(false); }}>
                      {t("watch.cancel")}
                    </Button>
                    <Button disabled={!commentText.trim() || createCommentMutation.isPending} type="submit">
                      {t("watch.comment")}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-gray-600 mb-6">
                  <Link href="/login" className="text-primary hover:underline">{t("watch.loginToComment")}</Link>
                  {t("watch.loginToCommentSuffix")}
                </p>
              )}

              <div className="space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      {comment.channelId ? (
                        <Link href={`/channel/${comment.channelId}`}>
                          <Avatar className="w-8 h-8 flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {(userMap[comment.userId] ?? "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      ) : (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {(userMap[comment.userId] ?? "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        {comment.channelId ? (
                          <Link href={`/channel/${comment.channelId}`} className="text-sm font-medium text-gray-900 hover:text-primary transition-colors">
                            {userMap[comment.userId] ?? t("watch.user", { id: comment.userId })}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-gray-900">
                            {userMap[comment.userId] ?? t("watch.user", { id: comment.userId })}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mb-1">
                          {formatDistanceToNow(new Date(comment.createdAt), { locale: dateLocale, addSuffix: true })}
                        </p>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">{t("watch.noComments")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h3 className="font-bold text-gray-900 mb-4">{t("watch.relatedVideos")}</h3>
            <div className="space-y-3">
              {relatedVideos && relatedVideos.length > 0 ? (
                relatedVideos
                  .filter((v) => v.id !== videoId)
                  .slice(0, 5)
                  .map((relatedVideo) => (
                    <Link
                      key={relatedVideo.id}
                      href={`/watch/${relatedVideo.id}`}
                      className="flex gap-2 hover:opacity-80 transition-opacity group"
                    >
                      <div className="w-24 h-14 bg-gray-200 rounded flex-shrink-0 overflow-hidden relative">
                        {relatedVideo.thumbnailUrl ? (
                          <img
                            src={relatedVideo.thumbnailUrl}
                            alt={relatedVideo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <div className="text-primary/50 text-xs">No img</div>
                          </div>
                        )}
                        {relatedVideo.duration && (
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {Math.floor(relatedVideo.duration / 60)}:{(relatedVideo.duration % 60).toString().padStart(2, "0")}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                          {relatedVideo.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {relatedVideo.viewCount.toLocaleString()} {t("watch.views")}
                        </p>
                      </div>
                    </Link>
                  ))
              ) : (
                <div className="text-sm text-gray-600">{t("watch.noRelated")}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
