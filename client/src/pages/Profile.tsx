import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Tv, CalendarDays, Users, Video, Settings } from "lucide-react";
import { getLoginUrl } from "@/const";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/lib/useDateLocale";

export default function Profile() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const { data: profile, isLoading } = trpc.users.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("profile.notLoggedIn")}</h2>
          <p className="text-gray-500 mb-6">{t("profile.notLoggedInDesc")}</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t("profile.login")}
          </a>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!profile) return null;

  const { channel } = profile;
  const joinDate = profile.createdAt
    ? format(new Date(profile.createdAt), "MMMM yyyy", { locale: dateLocale })
    : null;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        {/* User Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/10" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <Avatar className="w-20 h-20 border-4 border-white shadow">
                {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name || ""} />}
                <AvatarFallback className="bg-primary text-white text-2xl font-bold">
                  {profile.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4" />
                {t("profile.editProfile")}
              </Button>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{profile.name || t("profile.user")}</h1>
            {profile.email && (
              <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
            )}
            {profile.bio && (
              <p className="text-gray-700 mt-3 text-sm leading-relaxed">{profile.bio}</p>
            )}
            {joinDate && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{t("profile.memberSince")} {joinDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Channel Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tv className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">{t("profile.myChannel")}</h2>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              {channel.avatarUrl && <AvatarImage src={channel.avatarUrl} alt={channel.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {channel.name?.charAt(0).toUpperCase() || "K"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{channel.name}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  {channel.subscriberCount.toLocaleString()} {t("profile.subscribers")}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Video className="w-3.5 h-3.5" />
                  {channel.videoCount} {t("profile.videos")}
                </span>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={() => navigate("/channel")}>{t("profile.viewChannel")}</Button>
          </div>

          {channel.description && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{channel.description}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
