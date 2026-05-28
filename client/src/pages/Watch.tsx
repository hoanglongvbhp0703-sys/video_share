import { useParams, Link } from "wouter";
import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import VideoPlayer from "@/components/VideoPlayer";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Share2, MoreVertical, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface VideoParams {
  id: string;
}

export default function Watch() {
  const { id } = useParams<VideoParams>();
  const { user, isAuthenticated } = useAuth();
  const videoId = parseInt(id || "0");

  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Video + channel
  const { data: video, isLoading: videoLoading } = trpc.videos.getById.useQuery(
    { id: videoId },
    { enabled: !!videoId }
  );

  const { data: channel } = trpc.channels.getById.useQuery(
    { id: video?.channelId ?? 0 },
    { enabled: !!video?.channelId }
  );

  // Comments
  const { data: comments, refetch: refetchComments } = trpc.comments.getByVideoId.useQuery(
    { videoId, limit: 20, offset: 0 },
    { enabled: !!videoId }
  );

  // User names for comments
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
        ? Object.fromEntries(commentUsers.map((u) => [u.id, u.name ?? `Người dùng ${u.id}`]))
        : {},
    [commentUsers]
  );

  // Like
  const { data: myLike, refetch: refetchLike } = trpc.likes.getMyLike.useQuery(
    { videoId },
    { enabled: !!videoId }
  );

  // Subscription
  const { data: isSubscribed, refetch: refetchSubscription } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: video?.channelId ?? 0 },
    { enabled: !!video?.channelId && isAuthenticated }
  );

  // Related videos — same channel as current video
  const { data: relatedVideos } = trpc.channels.getVideos.useQuery(
    { channelId: video?.channelId ?? 0, limit: 6, offset: 0 },
    { enabled: !!video?.channelId }
  );

  // Mutations
  const incrementViewMutation = trpc.videos.incrementView.useMutation();
  const recordHistoryMutation = trpc.watchHistory.record.useMutation();
  const createCommentMutation = trpc.comments.create.useMutation();
  const toggleLikeMutation = trpc.likes.toggle.useMutation({
    onSuccess: () => refetchLike(),
  });
  const toggleSubscriptionMutation = trpc.subscriptions.toggle.useMutation({
    onSuccess: () => refetchSubscription(),
  });

  // Increment view + record watch history on mount
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
      toast.error("Vui lòng đăng nhập để bình luận");
      return;
    }
    if (!commentText.trim()) {
      toast.error("Bình luận không được để trống");
      return;
    }

    setIsSubmittingComment(true);
    try {
      await createCommentMutation.mutateAsync({ videoId, content: commentText });
      setCommentText("");
      await refetchComments();
      toast.success("Bình luận đã được thêm");
    } catch {
      toast.error("Lỗi khi thêm bình luận");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleLike = (type: "like" | "dislike") => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập");
      return;
    }
    toggleLikeMutation.mutate({ videoId, type });
  };

  const handleToggleSubscription = () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đăng ký kênh");
      return;
    }
    if (!video?.channelId) return;
    toggleSubscriptionMutation.mutate(
      { channelId: video.channelId },
      {
        onSuccess: (subscribed) => {
          toast.success(subscribed ? "Đã đăng ký kênh" : "Đã hủy đăng ký kênh");
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
          <p className="text-gray-600">Video không tìm thấy</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Video Player */}
        <VideoPlayer
          src={video.videoUrl || ""}
          poster={video.thumbnailUrl || undefined}
          title={video.title}
        />
        <div className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Video Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>

            {/* Channel Info and Subscribe */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <Link href={`/channel/${video.channelId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-white font-bold">
                    {channel?.name?.charAt(0).toUpperCase() ?? "K"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{channel?.name ?? "Đang tải..."}</p>
                  <p className="text-sm text-gray-600">
                    {channel?.subscriberCount?.toLocaleString() ?? 0} người đăng ký
                  </p>
                </div>
              </Link>
              <Button
                variant={isSubscribed ? "outline" : "default"}
                onClick={handleToggleSubscription}
                disabled={toggleSubscriptionMutation.isPending}
                className="gap-2"
              >
                <Bell className="w-4 h-4" />
                {isSubscribed ? "Đã đăng ký" : "Đăng ký"}
              </Button>
            </div>

            {/* Like/Dislike and Share */}
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
                <span className="text-sm">Chia sẻ</span>
              </button>

              <button className="ml-auto p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Video Description */}
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 mb-2">
                {video.viewCount.toLocaleString()} lượt xem •{" "}
                {formatDistanceToNow(new Date(video.createdAt), { locale: vi, addSuffix: true })}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{video.description}</p>
            </div>

            {/* Comments Section */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{video.commentCount} bình luận</h2>

              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="mb-6">
                  <div className="flex gap-3 mb-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-white">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <Textarea
                      placeholder="Thêm bình luận công khai..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCommentText("")} disabled={isSubmittingComment}>
                      Hủy
                    </Button>
                    <Button disabled={!commentText.trim() || isSubmittingComment} type="submit">
                      Bình luận
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-gray-600 mb-6">
                  <Link href="/login" className="text-primary hover:underline">Đăng nhập</Link> để bình luận
                </p>
              )}

              <div className="space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {(userMap[comment.userId] ?? "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {userMap[comment.userId] ?? `Người dùng ${comment.userId}`}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                          {formatDistanceToNow(new Date(comment.createdAt), { locale: vi, addSuffix: true })}
                        </p>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">Chưa có bình luận nào</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Related Videos */}
          <div className="lg:col-span-1">
            <h3 className="font-bold text-gray-900 mb-4">Video khác của kênh</h3>
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
                          {relatedVideo.viewCount.toLocaleString()} lượt xem
                        </p>
                      </div>
                    </Link>
                  ))
              ) : (
                <div className="text-sm text-gray-600">Không có video liên quan</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
