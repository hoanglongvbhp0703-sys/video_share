import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Lock, LogOut, Moon, Sun } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const utils = trpc.useUtils();

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật hồ sơ");
      utils.auth.me.invalidate();
      utils.users.getMyProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const changePassword = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Đã đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bạn chưa đăng nhập</h2>
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

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { name?: string; bio?: string } = {};
    if (name.trim() && name.trim() !== user?.name) updates.name = name.trim();
    const trimmedBio = bio.trim();
    if (trimmedBio !== ((user as any)?.bio || "")) updates.bio = trimmedBio;
    if (Object.keys(updates).length === 0) return;
    updateProfile.mutate(updates);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>

        {/* User info header */}
        <div className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="bg-primary text-white text-xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.name || "Người dùng"}</p>
            <p className="text-sm text-gray-500">{user?.email || ""}</p>
          </div>
        </div>

        {/* Đổi tên */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Thông tin cơ bản</h2>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên hiển thị"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu bản thân</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Viết vài dòng giới thiệu về bạn..."
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</p>
            </div>
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              size="sm"
            >
              {updateProfile.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </form>
        </div>

        {/* Đổi mật khẩu */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Đổi mật khẩu</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mật khẩu hiện tại"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            <Button
              type="submit"
              disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
              size="sm"
            >
              {changePassword.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </form>
        </div>

        {/* Giao diện — dark mode */}
        {switchable && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <h2 className="text-base font-semibold text-gray-900">Giao diện</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Chế độ tối</p>
                <p className="text-xs text-gray-500 mt-0.5">Chuyển sang nền tối để dễ xem hơn ban đêm</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  theme === "dark" ? "bg-primary" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={theme === "dark"}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Đăng xuất */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <LogOut className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">Tài khoản</h2>
          </div>
          <Button variant="destructive" size="sm" onClick={() => logout()}>
            Đăng xuất
          </Button>
        </div>
      </div>
    </Layout>
  );
}
