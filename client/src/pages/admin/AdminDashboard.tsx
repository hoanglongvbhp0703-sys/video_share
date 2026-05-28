import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, navigate]);

  const { data: stats, isLoading } = trpc.admin.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  if (loading || !user || user.role !== "admin") return null;

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
            <span className="block px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 cursor-pointer">
              Tổng quan
            </span>
          </Link>
          <Link href="/admin/users">
            <span className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tổng quan</h2>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Người dùng" value={stats?.users ?? 0} color="blue" />
              <StatCard label="Video" value={stats?.videos ?? 0} color="green" />
              <StatCard label="Bình luận" value={stats?.comments ?? 0} color="purple" />
              <StatCard label="Báo cáo chờ" value={stats?.pendingReports ?? 0} color="red" />
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickLink href="/admin/users" title="Quản lý người dùng" desc="Xem danh sách, đổi role user/admin" />
            <QuickLink href="/admin/reports" title="Xử lý báo cáo" desc="Xem và giải quyết các báo cáo nội dung" />
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "green" | "purple" | "red" }) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    purple: "text-purple-600 bg-purple-50",
    red: "text-red-600 bg-red-50",
  };
  return (
    <div className="bg-white rounded-xl p-5 border">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color].split(" ")[0]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl p-5 border hover:border-gray-400 cursor-pointer transition-colors">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
    </Link>
  );
}
