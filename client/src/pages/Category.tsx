import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import VideoCard from "@/components/VideoCard";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_LABELS: Record<string, string> = {
  music: "Âm nhạc",
  gaming: "Gaming",
  movies: "Phim",
  live: "Trực tiếp",
  sports: "Thể thao",
  news: "Tin tức",
};

interface CategoryParams {
  id: string;
}

export default function Category() {
  const { id } = useParams<CategoryParams>();
  const category = id || "";
  const label = CATEGORY_LABELS[category] || category;

  const { data: videos, isLoading } = trpc.videos.getByCategory.useQuery(
    { category, limit: 20, offset: 0 },
    { enabled: !!category }
  );

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
          <p className="text-gray-600 text-sm mt-1">
            Video trong danh mục {label}
          </p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 text-lg">Chưa có video nào trong danh mục này</p>
            <Link href="/" className="mt-3 text-sm text-primary hover:underline">
              Khám phá tất cả video →
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
