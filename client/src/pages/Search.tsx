import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Search() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Extract query from URL
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location]);

  const { data: results, isLoading } = trpc.videos.search.useQuery(
    { query: searchQuery, limit: 20, offset: 0 },
    { enabled: !!searchQuery }
  );

  return (
    <Layout onSearchChange={(query) => setSearchQuery(query)}>
      <div className="p-4 md:p-6">
        {searchQuery && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Kết quả tìm kiếm cho "{searchQuery}"
            </h1>
            {results && (
              <p className="text-gray-600 text-sm mt-1">
                Tìm thấy {results.length} video
              </p>
            )}
          </div>
        )}

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
        ) : results && results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 text-lg">Không tìm thấy video nào</p>
            <p className="text-gray-500 text-sm mt-2">Hãy thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 text-lg">Nhập từ khóa để tìm kiếm video</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
