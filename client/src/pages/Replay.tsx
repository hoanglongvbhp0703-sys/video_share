import Layout from "@/components/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Loader2, Film, Users, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/lib/useDateLocale";
import { format } from "date-fns";

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const locale = useDateLocale();

  const { data: stream, isLoading } = trpc.livestreams.getById.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!stream || !stream.videoUrl) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Film className="w-14 h-14 text-muted-foreground/40" />
          <p className="text-muted-foreground text-lg">{t("replay.notFound")}</p>
          <Button variant="outline" onClick={() => history.back()}>
            {t("replay.goBack")}
          </Button>
        </div>
      </Layout>
    );
  }

  const durationMs =
    stream.startedAt && stream.endedAt
      ? new Date(stream.endedAt).getTime() - new Date(stream.startedAt).getTime()
      : null;
  const durationStr = durationMs != null
    ? durationMs >= 3600000
      ? `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}p`
      : `${Math.floor(durationMs / 60000)}p`
    : null;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                src={stream.videoUrl}
                controls
                className="w-full h-full object-contain"
                autoPlay={false}
              />
              <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                <Film className="w-3 h-3" />
                {t("replay.badge")}
              </span>
            </div>

            <div>
              <h1 className="text-xl font-bold text-foreground leading-snug mb-3">
                {stream.title}
              </h1>

              <div className="flex items-center gap-3">
                <Link href={`/channel/${stream.channelId}`}>
                  <Avatar className="w-10 h-10 flex-shrink-0 cursor-pointer">
                    {stream.channelAvatarUrl && <AvatarImage src={stream.channelAvatarUrl} />}
                    <AvatarFallback>
                      {stream.channelName?.charAt(0).toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link
                    href={`/channel/${stream.channelId}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {stream.channelName}
                  </Link>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {stream.startedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(stream.startedAt), "d MMM yyyy, HH:mm", { locale })}
                      </span>
                    )}
                    {(stream.viewerCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {stream.viewerCount} {t("replay.peakViewers")}
                      </span>
                    )}
                    {durationStr && (
                      <span>{t("replay.duration")}: {durationStr}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="font-semibold text-sm text-foreground">{t("replay.aboutStream")}</p>
              <p className="text-sm text-muted-foreground">{stream.title}</p>
              {stream.startedAt && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(stream.startedAt), "EEEE, d MMMM yyyy", { locale })}
                </p>
              )}
              {durationStr && (
                <p className="text-xs text-muted-foreground">
                  {t("replay.duration")}: {durationStr}
                </p>
              )}
              {(stream.viewerCount ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {t("replay.peakViewers")}: {stream.viewerCount}
                </p>
              )}
            </div>

            <Link href={`/channel/${stream.channelId}`}>
              <Button variant="outline" className="w-full">
                {t("replay.viewChannel")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
