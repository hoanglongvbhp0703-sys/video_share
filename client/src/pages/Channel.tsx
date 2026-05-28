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
import { Camera, ImagePlus } from "lucide-react";

interface ChannelParams {
  id?: string;
}

export default function Channel() {
  const { id } = useParams<ChannelParams>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [localBannerUrl, setLocalBannerUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const channelId = id ? parseInt(id) : undefined;

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

  const { data: subscribed } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: activeChannelId || 0 },
    { enabled: !!activeChannelId && isAuthenticated }
  );

  const { data: subscriberCount } = trpc.subscriptions.getCount.useQuery(
    { channelId: activeChannelId || 0 },
    { enabled: !!activeChannelId }
  );

  const toggleSubscribeMutation = trpc.subscriptions.toggle.useMutation();
  const updateImagesMutation = trpc.channels.updateImages.useMutation({
    onSuccess: (data, variables) => {
      if (variables.type === "avatar") setLocalAvatarUrl(data.url);
      else setLocalBannerUrl(data.url);
      utils.channels.getMyChannel.invalidate();
      utils.channels.getById.invalidate();
      toast.success(variables.type === "avatar" ? "Đã cập nhật ảnh đại diện kênh" : "Đã cập nhật ảnh bìa kênh");
    },
    onError: () => toast.error("Tải ảnh lên thất bại"),
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB");
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
    if (!isAuthenticated) { toast.error("Vui lòng đăng nhập"); return; }
    if (!activeChannelId) return;
    toggleSubscribeMutation.mutate(
      { channelId: activeChannelId },
      {
        onSuccess: (result) => {
          setIsSubscribed(result);
          toast.success(result ? "Đã đăng ký kênh" : "Đã hủy đăng ký");
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
        {/* Hidden file inputs */}
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
                {isMyChannel ? "Chưa có ảnh bìa — click để thêm" : ""}
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
                  ? "Đang tải..." : "Đổi ảnh bìa"}
              </div>
            </button>
          )}
        </div>

        {/* Channel Info */}
        <div className="px-4 md:px-6 py-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            {/* Avatar with edit overlay */}
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
                {subscriberCount?.toLocaleString() || 0} người đăng ký
              </p>
            </div>

            {isMyChannel ? (
              <Button onClick={() => navigate("/upload")}>Upload video</Button>
            ) : (
              <Button onClick={handleToggleSubscribe} variant={subscribed ? "outline" : "default"}>
                {subscribed ? "Đã đăng ký" : "Đăng ký"}
              </Button>
            )}
          </div>

          {displayChannel.description && (
            <p className="text-muted-foreground">{displayChannel.description}</p>
          )}
        </div>

        {/* Videos Section */}
        <div className="p-4 md:p-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">Video</h2>

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
              <p className="text-muted-foreground">Chưa có video nào</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
