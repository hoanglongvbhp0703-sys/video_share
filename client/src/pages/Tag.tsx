import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import VideoCard from "@/components/VideoCard";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Music, Gamepad2, Film, Tv, Trophy, Newspaper, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

const TAG_ICONS: Record<string, React.ElementType> = {
  hot:        Flame,
  nhac:       Music,
  gaming:     Gamepad2,
  phim:       Film,
  live:       Tv,
  "the-thao": Trophy,
  "tin-tuc":  Newspaper,
};

const TAG_I18N_KEYS: Record<string, { label: string; desc: string }> = {
  hot:        { label: "tag.hot",      desc: "tag.descHot" },
  nhac:       { label: "tag.nhac",     desc: "tag.descNhac" },
  gaming:     { label: "tag.gaming",   desc: "tag.descGaming" },
  phim:       { label: "tag.phim",     desc: "tag.descPhim" },
  live:       { label: "tag.live",     desc: "tag.descLive" },
  "the-thao": { label: "tag.theThao",  desc: "tag.descTheThao" },
  "tin-tuc":  { label: "tag.tinTuc",   desc: "tag.descTinTuc" },
};

export default function TagPage() {
  const { name } = useParams<{ name: string }>();
  const tag = name || "";
  const { t } = useTranslation();

  const IconComponent = TAG_ICONS[tag] ?? Tag;
  const i18nKeys = TAG_I18N_KEYS[tag];

  const { data: videos, isLoading } = trpc.tags.getVideosByTag.useQuery(
    { tag, limit: 40, offset: 0 },
    { enabled: !!tag }
  );

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {i18nKeys ? t(i18nKeys.label) : `#${tag}`}
            </h1>
            {i18nKeys && (
              <p className="text-gray-500 text-sm mt-0.5">{t(i18nKeys.desc)}</p>
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
            <p className="text-sm text-gray-400 mb-4">{t("tag.videoCount", { count: videos.length })}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Tag className="w-14 h-14 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">{t("tag.noVideos")}</p>
            <Link href="/" className="mt-3 text-sm text-primary hover:underline">
              {t("tag.exploreAll")}
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
