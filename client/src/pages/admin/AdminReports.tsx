import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  reviewed: "Đang xem",
  resolved: "Đã giải quyết",
  dismissed: "Bỏ qua",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  reviewed: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-600",
};

export default function AdminReports() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, navigate]);

  const { data: reports, isLoading, refetch } = trpc.admin.listReports.useQuery(
    { limit, offset },
    { enabled: user?.role === "admin" }
  );

  const updateStatusMutation = trpc.admin.updateReportStatus.useMutation({
    onSuccess: () => { toast.success("Đã cập nhật trạng thái"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteVideoMutation = trpc.admin.deleteVideo.useMutation({
    onSuccess: () => { toast.success("Đã xóa video"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteCommentMutation = trpc.admin.deleteComment.useMutation({
    onSuccess: () => { toast.success("Đã xóa bình luận"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (loading || !user || user.role !== "admin") return null;

  const items = reports ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">
          ← Về trang chủ
        </Link>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r min-h-screen p-4 space-y-1">
          <Link href="/admin">
            <span className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">
              Tổng quan
            </span>
          </Link>
          <Link href="/admin/users">
            <span className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">
              Người dùng
            </span>
          </Link>
          <Link href="/admin/reports">
            <span className="block px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 cursor-pointer">
              Báo cáo
            </span>
          </Link>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Báo cáo nội dung</h2>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
              Không có báo cáo nào.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {r.targetType === "video" ? "Video" : "Bình luận"} #{r.targetId}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{r.reason}</p>
                      {r.description && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{r.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Bởi: {r.reporterName ?? r.reporterEmail ?? "Ẩn danh"} —{" "}
                        {new Date(r.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {r.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({ reportId: r.id, status: "reviewed" })}
                        >
                          Đang xem
                        </Button>
                      )}
                      {r.targetType === "video" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteVideoMutation.isPending}
                          onClick={() => {
                            if (confirm("Xóa video này?")) {
                              deleteVideoMutation.mutate({ videoId: r.targetId });
                              updateStatusMutation.mutate({ reportId: r.id, status: "resolved" });
                            }
                          }}
                        >
                          Xóa video
                        </Button>
                      )}
                      {r.targetType === "comment" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteCommentMutation.isPending}
                          onClick={() => {
                            if (confirm("Xóa bình luận này?")) {
                              deleteCommentMutation.mutate({ commentId: r.targetId });
                              updateStatusMutation.mutate({ reportId: r.id, status: "resolved" });
                            }
                          }}
                        >
                          Xóa bình luận
                        </Button>
                      )}
                      {r.status !== "dismissed" && r.status !== "resolved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-500"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({ reportId: r.id, status: "dismissed" })}
                        >
                          Bỏ qua
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {items.length === limit && (
            <div className="mt-4 flex gap-2 justify-center">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                onClick={() => setOffset(offset + limit)}
              >
                Sau
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
