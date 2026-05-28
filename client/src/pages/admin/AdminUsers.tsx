import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminUsers() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, navigate]);

  const { data, isLoading, refetch } = trpc.admin.listUsers.useQuery(
    { limit, offset },
    { enabled: user?.role === "admin" }
  );

  const setRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật role");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (loading || !user || user.role !== "admin") return null;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

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
            <span className="block px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 cursor-pointer">
              Người dùng
            </span>
          </Link>
          <Link href="/admin/reports">
            <span className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">
              Báo cáo
            </span>
          </Link>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Người dùng</h2>
            <span className="text-sm text-gray-500">{total} tổng cộng</span>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-xl border overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border-b animate-pulse flex gap-4">
                  <div className="h-4 bg-gray-200 rounded flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tên</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Đăng nhập</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ngày tạo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {u.name || <span className="text-gray-400 italic">Chưa đặt</span>}
                        {u.id === user.id && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Bạn</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{u.loginMethod ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        {u.id !== user.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={setRoleMutation.isPending}
                            onClick={() =>
                              setRoleMutation.mutate({
                                userId: u.id,
                                role: u.role === "admin" ? "user" : "admin",
                              })
                            }
                          >
                            {u.role === "admin" ? "Hạ xuống user" : "Nâng lên admin"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-500">
                  <span>Trang {currentPage} / {totalPages}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                    >
                      Trước
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={offset + limit >= total}
                      onClick={() => setOffset(offset + limit)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
