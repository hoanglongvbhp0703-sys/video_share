import { useParams, useLocation } from "wouter";
import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Camera, ImagePlus, Radio, Video, Tv, Users, Clock, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChannelParams {
  id?: string;
}

export default function Channel() {
  const { id } = useParams<ChannelParams>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [localBannerUrl, setLocalBannerUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const channelId = id ? parseInt(id) : undefined;
  const [activeTab, setActiveTab] = useState<"videos" | "livestreams">("videos");

  const utils = trpc.useUtils();

  const { data: myChannel } = trpc.channels.getMyChannel.useQuery(
    undefined,
    { enabled: isAuthenticated && !channelId }
  );

  const { data: channel, isLoading: channelLoading } = trpc.channels.getById.useQuery(
    { id: channelId || 0 },
    { enabled: !!channelId }
  );

  const activeChannelId = channelId || myChannel?.id;
  const { data: videos, isLoading: videosLoading } = trpc.channels.getVideos.useQuery(
    { channelId: activeChannelId || 0, limit: 20, offset: 0 },
    { enabled: !!activeChannelId }
  );
  const { data: pastLivestreams, isLoading: livestreamsLoading } = trpc.channels.getLivestreams.useQuery(
    { channelId: activeChannelId || 0, limit: 20, offset: 0 },
    { enabled: !!activeChannelId }
  );

  const { data: subscribed } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: activeChannelId || 0 },
    { enabled: !!activeChannelId && isAuthenticated }
  );

  const { data: subscriberCount } = trpc.subscriptions.getCount.useQuery(
    { channelId: activeChannelId || 0 },
    { enabled: !!activeChannelId }
  );

  const toggleSubscribeMutation = trpc.subscriptions.toggle.useMutation();
  const deleteLivestreamMutation = trpc.livestreams.delete.useMutation({
    onSuccess: () => {
      utils.channels.getLivestreams.invalidate({ channelId: activeChannelId });
      toast.success(t("channel.livestreamDeleted"));
    },
    onError: () => toast.error(t("channel.deleteFailed")),
  });

  const { data: activeLivestream } = trpc.livestreams.getActiveByChannel.useQuery(
    { channelId: activeChannelId || 0 },
    { enabled: !!activeChannelId, refetchInterval: 10000 }
  );
  const updateImagesMutation = trpc.channels.updateImages.useMutation({
    onSuccess: (data, variables) => {
      if (variables.type === "avatar") setLocalAvatarUrl(data.url);
      else setLocalBannerUrl(data.url);
      utils.channels.getMyChannel.invalidate();
      utils.channels.getById.invalidate();
      utils.videos.list.invalidate();
      utils.channels.getVideos.invalidate();
      toast.success(variables.type === "avatar" ? t("channel.avatarUpdated") : t("channel.bannerUpdated"));
    },
    onError: () => toast.error(t("channel.uploadFailed")),
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("channel.imageError"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("channel.imageTooLarge"));
      return;
    }
    const buffer = await file.arrayBuffer();
    updateImagesMutation.mutate({
      type,
      fileData: new Uint8Array(buffer),
      fileName: file.name,
      mimeType: file.type,
    });
    e.target.value = "";
  };

  const handleToggleSubscribe = () => {
    if (!isAuthenticated) { toast.error(t("channel.loginError")); return; }
    if (!activeChannelId) return;
    toggleSubscribeMutation.mutate(
      { channelId: activeChannelId },
      {
        onSuccess: (result) => {
          toast.success(result ? t("channel.subscribeSuccess") : t("channel.unsubscribeSuccess"));
          utils.subscriptions.isSubscribed.invalidate({ channelId: activeChannelId });
          utils.subscriptions.getCount.invalidate({ channelId: activeChannelId });
        },
      }
    );
  };

  const displayChannel = channelId ? channel : myChannel;
  const isMyChannel = isAuthenticated && !!displayChannel && displayChannel.userId === user?.id;

  const avatarUrl = localAvatarUrl ?? displayChannel?.avatarUrl;
  const bannerUrl = localBannerUrl ?? displayChannel?.bannerUrl;
  const isUploading = updateImagesMutation.isPending;

  if (channelLoading || !displayChannel) {
    return (
      <Layout>
        <div className="p-4 md:p-6">
          <Skeleton className="w-full h-48 rounded-lg mb-6" />
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full">
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleImageChange(e, "avatar")} />
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleImageChange(e, "banner")} />

        {/* Channel Banner */}
        <div className="relative w-full h-48 bg-gradient-to-r from-primary/20 to-primary/10 overflow-hidden group">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-primary/40 text-sm">
                {isMyChannel ? t("channel.noBanner") : ""}
              </span>
            </div>
          )}
          {isMyChannel && (
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <div className="flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
                <ImagePlus className="w-4 h-4" />
                {isUploading && updateImagesMutation.variables?.type === "banner"
                  ? t("channel.uploading") : t("channel.changeBanner")}
              </div>
            </button>
          )}
        </div>

        {/* Channel Info */}
        <div className="px-4 md:px-6 py-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div className="relative group w-24 h-24 -mt-12 flex-shrink-0">
              <Avatar className="w-24 h-24 border-4 border-background">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayChannel.name} className="object-cover" />}
                <AvatarFallback className="bg-primary text-white text-2xl font-bold">
                  {displayChannel.name?.charAt(0).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
              {isMyChannel && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploading && updateImagesMutation.variables?.type === "avatar"
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />
                  }
                </button>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{displayChannel.name}</h1>
              <p className="text-muted-foreground mt-1">
                {subscriberCount?.toLocaleString() || 0} {t("channel.subscribers")}
              </p>
            </div>

            {isMyChannel ? (
              <div className="flex gap-2">
                <Button onClick={() => navigate("/upload")} variant="outline">
                  {t("channel.uploadVideo")}
                </Button>
                <Button
                  onClick={() => navigate("/go-live")}
                  className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  <Radio className="w-4 h-4" />
                  {t("channel.goLive")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {activeLivestream && (
                  <Button
                    onClick={() => navigate(`/live/${activeChannelId}`)}
                    className="bg-red-600 hover:bg-red-700 text-white gap-1.5 animate-pulse"
                    size="sm"
                  >
                    <span className="w-2 h-2 bg-white rounded-full" />
                    LIVE
                  </Button>
                )}
                <Button onClick={handleToggleSubscribe} variant={subscribed ? "outline" : "default"}>
                  {subscribed ? t("channel.subscribed") : t("channel.subscribe")}
                </Button>
              </div>
            )}
          </div>

          {displayChannel.description && (
            <p className="text-muted-foreground">{displayChannel.description}</p>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border px-4 md:px-6">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "videos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className="w-4 h-4" />
            {t("channel.videoTab")}
            {videos && videos.length > 0 && (
              <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{videos.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("livestreams")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "livestreams"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tv className="w-4 h-4" />
            {t("channel.livestreamTab")}
            {pastLivestreams && pastLivestreams.length > 0 && (
              <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{pastLivestreams.length}</span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4 md:p-6">
          {activeTab === "videos" && (
            <>
              {videosLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <Skeleton className="w-full aspect-video rounded-lg" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : videos && videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={{ ...video, channelName: displayChannel.name }} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t("channel.noVideos")}</p>
                </div>
              )}
            </>
          )}

          {activeTab === "livestreams" && (
            <>
              {livestreamsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <Skeleton className="w-full aspect-video rounded-lg" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : pastLivestreams && pastLivestreams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pastLivestreams.map((stream) => {
                    const durationMs = stream.startedAt && stream.endedAt
                      ? new Date(stream.endedAt).getTime() - new Date(stream.startedAt).getTime()
                      : null;
                    const durationStr = durationMs != null
                      ? durationMs >= 3600000
                        ? `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}p`
                        : `${Math.floor(durationMs / 60000)}p`
                      : null;
                    return (
                      <div key={stream.id} className="flex flex-col gap-2 group">
                        <div
                          className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer"
                          onClick={() => navigate(`/live/${activeChannelId}`)}
                        >
                          {stream.thumbnailUrl ? (
                            <img src={stream.thumbnailUrl} alt={stream.title ?? ""} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tv className="w-10 h-10 text-muted-foreground/40" />
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                            {t("channel.aired")}
                          </span>
                          {durationStr && (
                            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {durationStr}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2">
                              {stream.title || t("channel.noTitle")}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-muted-foreground">
                                {stream.startedAt
                                  ? new Date(stream.startedAt).toLocaleDateString("vi-VN", {
                                      day: "2-digit", month: "2-digit", year: "numeric",
                                      hour: "2-digit", minute: "2-digit",
                                    })
                                  : ""}
                              </p>
                              {(stream.viewerCount ?? 0) > 0 && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {stream.viewerCount} {t("channel.views")}
                                </p>
                              )}
                            </div>
                          </div>
                          {isMyChannel && (
                            <button
                              onClick={() => {
                                if (confirm(t("channel.confirmDeleteLivestream"))) {
                                  deleteLivestreamMutation.mutate({ id: stream.id });
                                }
                              }}
                              disabled={deleteLivestreamMutation.isPending}
                              className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title={t("channel.deleteLivestream")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tv className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("channel.noLivestreams")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
