import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, CheckCheck, Video, Users, MessageSquare, Info, User } from "lucide-react";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeIcon: Record<string, React.ReactNode> = {
  new_video: <Video className="w-4 h-4 text-primary" />,
  new_subscriber: <Users className="w-4 h-4 text-green-500" />,
  comment: <MessageSquare className="w-4 h-4 text-blue-500" />,
  reply: <MessageSquare className="w-4 h-4 text-purple-500" />,
  system: <Info className="w-4 h-4 text-gray-400" />,
};

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated }
  );

  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bạn chưa đăng nhập</h2>
          <p className="text-gray-500 mb-6">Đăng nhập để xem thông báo.</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Đăng nhập
          </a>
        </div>
      </Layout>
    );
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-700" />
            <h1 className="text-xl font-bold text-gray-900">Thông báo</h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="gap-2 text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="text-center py-16">
            <BellOff className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Chưa có thông báo nào.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markAsRead.mutate({ id: n.id })}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer",
                  n.isRead
                    ? "bg-white border-gray-200 hover:bg-gray-50"
                    : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {typeIcon[n.type] ?? <Info className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm leading-relaxed", !n.isRead && "font-medium text-gray-900", n.isRead && "text-gray-700")}>
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
