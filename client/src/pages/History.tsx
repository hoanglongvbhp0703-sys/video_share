import { Link } from "wouter";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { History as HistoryIcon, User } from "lucide-react";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/lib/useDateLocale";

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function History() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const { data: history, isLoading } = trpc.watchHistory.getHistory.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("history.notLoggedIn")}</h2>
          <p className="text-gray-500 mb-6">{t("history.notLoggedInDesc")}</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t("history.login")}
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <HistoryIcon className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">{t("history.title")}</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-40 h-24 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <Link
                key={item.id}
                href={`/watch/${item.videoId}`}
                className="flex gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-40 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                  {item.videoThumbnailUrl ? (
                    <img
                      src={item.videoThumbnailUrl}
                      alt={item.videoTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-primary/40 text-xs">No img</span>
                    </div>
                  )}
                  {item.videoDuration && (
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                      {formatDuration(item.videoDuration)}
                    </div>
                  )}
                  {/* Progress bar — shows how far the user has watched */}
                  {(() => {
                    const total = item.videoDuration ?? 0;
                    if (total <= 0) return null;
                    // Prefer localStorage position (most recent, within 24h)
                    let watched = item.watchDuration ?? 0;
                    try {
                      const raw = localStorage.getItem(`vs_resume_${item.videoId}`);
                      if (raw) {
                        const { position, timestamp } = JSON.parse(raw) as { position: number; timestamp: number };
                        if (Date.now() - timestamp < 86400000 && position > 0) watched = position;
                      }
                    } catch {}
                    const pct = Math.min(100, (watched / total) * 100);
                    if (pct < 1) return null;
                    return (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                        <div className="h-full bg-red-500 transition-none" style={{ width: `${pct}%` }} />
                      </div>
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                    {item.videoTitle}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.videoViewCount?.toLocaleString()} {t("history.views")}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t("history.watchedAt")} {formatDistanceToNow(new Date(item.watchedAt), { locale: dateLocale, addSuffix: true })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <HistoryIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">{t("history.noHistory")}</p>
            <Link href="/" className="inline-block mt-3 text-sm text-primary hover:underline">
              {t("history.explore")}
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
