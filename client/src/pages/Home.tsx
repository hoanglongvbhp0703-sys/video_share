import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import VideoCard from "@/components/VideoCard";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "@shared/types";

interface VideoWithChannel extends Video {
  channelName?: string;
}

export default function Home() {
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: videoList, isLoading: isFetching } = trpc.videos.list.useQuery({
    limit: 20,
    offset: 0,
  });

  useEffect(() => {
    if (videoList) {
      setVideos(videoList as VideoWithChannel[]);
      setIsLoading(false);
    }
  }, [videoList]);

  return (
    <Layout>
      <div className="w-full h-full overflow-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Khám phá</h1>
            <p className="text-muted-foreground text-sm mt-1">Những video được xem nhiều nhất</p>
          </div>

          {/* Video Grid */}
          {isLoading || isFetching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="w-full aspect-video rounded-lg" />
                  <div className="flex gap-3">
                    <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-600 text-lg">Chưa có video nào</p>
              <p className="text-gray-500 text-sm mt-2">Hãy quay lại sau</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
