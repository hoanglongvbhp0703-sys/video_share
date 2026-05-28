import { useParams } from "wouter";
import Layout from "@/components/Layout";
import VideoCard from "@/components/VideoCard";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Music, Gamepad2, Film, Tv, Trophy, Newspaper, Tag } from "lucide-react";

const TAG_META: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  hot:       { label: "Hot 🔥", icon: Flame,     description: "Những video đang được xem nhiều nhất" },
  nhac:      { label: "Âm nhạc", icon: Music,    description: "Video âm nhạc, MV, cover và biểu diễn" },
  gaming:    { label: "Gaming",   icon: Gamepad2, description: "Game, review, gameplay và esports" },
  phim:      { label: "Phim",     icon: Film,     description: "Phim, trailer, review và điện ảnh" },
  live:      { label: "Trực tiếp", icon: Tv,      description: "Stream trực tiếp và highlight" },
  "the-thao":{ label: "Thể thao", icon: Trophy,   description: "Bóng đá, thể thao và thể dục" },
  "tin-tuc": { label: "Tin tức",  icon: Newspaper, description: "Tin tức, thời sự và phân tích" },
};

export default function TagPage() {
  const { name } = useParams<{ name: string }>();
  const tag = name || "";
  const meta = TAG_META[tag];
  const IconComponent = meta?.icon ?? Tag;

  const { data: videos, isLoading } = trpc.tags.getVideosByTag.useQuery(
    { tag, limit: 40, offset: 0 },
    { enabled: !!tag }
  );

  return (
    <Layout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meta?.label ?? `#${tag}`}</h1>
            {meta?.description && (
              <p className="text-gray-500 text-sm mt-0.5">{meta.description}</p>
            )}
          </div>
        </div>

        {isLoading ? (
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
        ) : videos && videos.length > 0 ? (
          <>
            <p className="text-sm text-gray-400 mb-4">{videos.length} video</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Tag className="w-14 h-14 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Chưa có video nào với tag này.</p>
            <a href="/" className="mt-3 text-sm text-primary hover:underline">
              Khám phá tất cả video →
            </a>
          </div>
        )}
      </div>
    </Layout>
  );
}
