import { useSearch } from "wouter";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

export default function Search() {
  const search = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [search]);

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
              {t("search.resultsFor")} "{searchQuery}"
            </h1>
            {results && (
              <p className="text-gray-600 text-sm mt-1">
                {t("search.found", { count: results.length })}
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
            <p className="text-gray-600 text-lg">{t("search.notFound")}</p>
            <p className="text-gray-500 text-sm mt-2">{t("search.tryOther")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 text-lg">{t("search.enterKeyword")}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
