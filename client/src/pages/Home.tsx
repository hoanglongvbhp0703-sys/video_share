import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import VideoCard from "@/components/VideoCard";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 20;

type VideoItem = {
  id: number;
  channelId: number;
  title: string;
  description: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  category: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  channelName: string | null;
  channelAvatarUrl: string | null;
};

export default function Home() {
  const { t } = useTranslation();

  const [offset, setOffset] = useState(0);
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, isFetching } = trpc.videos.list.useQuery(
    { limit: PAGE_SIZE, offset },
    { staleTime: 60_000 }
  );

  useEffect(() => {
    if (!data) return;
    if (offset === 0) {
      setAllVideos(data);
    } else {
      setAllVideos((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        const fresh = data.filter((v) => !ids.has(v.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    }
    if (data.length < PAGE_SIZE) setHasMore(false);
  }, [data, offset]);

  const sentinelRef = useInfiniteScroll(hasMore, isFetching, () => {
    setOffset((prev) => prev + PAGE_SIZE);
  });

  const isInitialLoad = isFetching && allVideos.length === 0;

  return (
    <Layout>
      <div className="w-full h-full overflow-auto">
        <div className="p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{t("home.discover")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("home.subtitle")}</p>
          </div>

          {isInitialLoad ? (
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
          ) : allVideos.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>

              {/* Sentinel element — triggers load more when visible */}
              <div ref={sentinelRef} className="h-4" />

              {isFetching && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!hasMore && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("home.noMoreVideos")}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-600 text-lg">{t("home.noVideos")}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
