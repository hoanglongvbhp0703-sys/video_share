import { useParams, useLocation } from "wouter";
import { useState } from "react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface ChannelParams {
  id?: string;
}

export default function Channel() {
  const { id } = useParams<ChannelParams>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const channelId = id ? parseInt(id) : undefined;

  // Get my channel if no ID provided
  const { data: myChannel } = trpc.channels.getMyChannel.useQuery(
    undefined,
    { enabled: isAuthenticated && !channelId }
  );

  // Get specific channel
  const { data: channel, isLoading: channelLoading } = trpc.channels.getById.useQuery(
    { id: channelId || 0 },
    { enabled: !!channelId }
  );

  // Get channel videos
  const activeChannelId = channelId || myChannel?.id;
  const { data: videos, isLoading: videosLoading } = trpc.channels.getVideos.useQuery(
    { channelId: activeChannelId || 0, limit: 20, offset: 0 },
    { enabled: !!activeChannelId }
  );

  // Get subscription status
  const { data: subscribed } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: activeChannelId || 0 },
    { enabled: !!activeChannelId && isAuthenticated }
  );

  // Get subscriber count
  const { data: subscriberCount } = trpc.subscriptions.getCount.useQuery(
    { channelId: activeChannelId || 0 },
    { enabled: !!activeChannelId }
  );

  // Mutations
  const toggleSubscribeMutation = trpc.subscriptions.toggle.useMutation();

  const handleToggleSubscribe = () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

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
  const isMyChannel = !channelId && isAuthenticated;

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
        {/* Channel Banner */}
        <div className="w-full h-48 bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
          {displayChannel.bannerUrl ? (
            <img
              src={displayChannel.bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-primary/50">Channel Banner</div>
          )}
        </div>

        {/* Channel Info */}
        <div className="px-4 md:px-6 py-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <Avatar className="w-24 h-24 -mt-12 border-4 border-white">
              <AvatarFallback className="bg-primary text-white text-2xl font-bold">
                {displayChannel.name?.charAt(0).toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{displayChannel.name}</h1>
              <p className="text-gray-600 mt-1">
                {subscriberCount?.toLocaleString() || 0} người đăng ký
              </p>
            </div>

            {isMyChannel ? (
              <Button onClick={() => navigate("/upload")}>Upload video</Button>
            ) : (
              <Button
                onClick={handleToggleSubscribe}
                variant={subscribed ? "outline" : "default"}
              >
                {subscribed ? "Đã đăng ký" : "Đăng ký"}
              </Button>
            )}
          </div>

          {displayChannel.description && (
            <p className="text-gray-700">{displayChannel.description}</p>
          )}
        </div>

        {/* Videos Section */}
        <div className="p-4 md:p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Video</h2>

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
                <VideoCard
                  key={video.id}
                  video={{ ...video, channelName: displayChannel.name }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Chưa có video nào</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
