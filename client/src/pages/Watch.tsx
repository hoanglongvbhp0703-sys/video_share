import { useParams, Link } from "wouter";
import { useEffect, useState, useMemo } from "react";
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
import { ThumbsUp, ThumbsDown, Share2, MoreVertical, Bell, ListVideo } from "lucide-react";
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
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const videoId = parseInt(id || "0");

  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

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
  const createCommentMutation = trpc.comments.create.useMutation();
  const utils = trpc.useUtils();
  const toggleLikeMutation = trpc.likes.toggle.useMutation({
    onSuccess: () => {
      refetchLike();
      utils.videos.getById.invalidate({ id: videoId });
    },
    onError: (err) => toast.error(err.message || t("watch.likeError")),
  });
  const toggleSubscriptionMutation = trpc.subscriptions.toggle.useMutation({
    onSuccess: () => refetchSubscription(),
  });

  useEffect(() => {
    if (videoId) {
      incrementViewMutation.mutate({ id: videoId });
      if (isAuthenticated) {
        recordHistoryMutation.mutate({ videoId, watchDuration: 0 });
      }
    }
  }, [videoId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(t("watch.commentLoginError"));
      return;
    }
    if (!commentText.trim()) {
      toast.error(t("watch.commentEmptyError"));
      return;
    }

    setIsSubmittingComment(true);
    try {
      await createCommentMutation.mutateAsync({ videoId, content: commentText });
      setCommentText("");
      await refetchComments();
      toast.success(t("watch.commentSuccess"));
    } catch {
      toast.error(t("watch.commentError"));
    } finally {
      setIsSubmittingComment(false);
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
    if (!isAuthenticated) {
      toast.error(t("watch.loginToSubscribe"));
      return;
    }
    if (!video?.channelId) return;
    toggleSubscriptionMutation.mutate(
      { channelId: video.channelId },
      {
        onSuccess: (subscribed) => {
          toast.success(subscribed ? t("watch.subscribeSuccess") : t("watch.unsubscribeSuccess"));
        },
      }
    );
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                    myLike?.type === "like" ? "bg-primary text-white" : "hover:bg-gray-200"
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm">{video.likeCount}</span>
                </button>
                <div className="w-px h-6 bg-gray-300" />
                <button
                  onClick={() => handleToggleLike("dislike")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                    myLike?.type === "dislike" ? "bg-primary text-white" : "hover:bg-gray-200"
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span className="text-sm">{video.dislikeCount}</span>
                </button>
              </div>

              <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-full transition-colors">
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">{video.commentCount} {t("watch.comments")}</h2>

              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="mb-6">
                  <div className="flex gap-3 mb-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-white">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <Textarea
                      placeholder={t("watch.addComment")}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCommentText("")} disabled={isSubmittingComment}>
                      {t("watch.cancel")}
                    </Button>
                    <Button disabled={!commentText.trim() || isSubmittingComment} type="submit">
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
