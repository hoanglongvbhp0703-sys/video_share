import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSearch } from "wouter";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center space-y-4">
          <p className="text-red-600 font-medium">Link không hợp lệ hoặc đã hết hạn.</p>
          <Link href="/forgot-password">
            <Button className="w-full">Yêu cầu link mới</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setDone(true);
        setTimeout(() => navigate("/login"), 2500);
      } else if (data?.error === "TOKEN_EXPIRED") {
        setError("Link đã hết hạn. Vui lòng yêu cầu link mới.");
      } else if (data?.error === "TOKEN_USED") {
        setError("Link này đã được sử dụng. Vui lòng yêu cầu link mới.");
      } else {
        setError(data?.message || "Link không hợp lệ hoặc đã hết hạn");
      }
    } catch {
      setError("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">VS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
          <p className="text-gray-500 text-sm mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700 text-center">
              Mật khẩu đã được đặt lại thành công! Đang chuyển về trang đăng nhập...
            </div>
            <Link href="/login">
              <Button className="w-full">Đăng nhập ngay</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu mới
              </label>
              <Input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu
              </label>
              <Input
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="space-y-2">
                <p className="text-sm text-red-600">{error}</p>
                {(error.includes("hết hạn") || error.includes("đã được sử dụng")) && (
                  <Link href="/forgot-password">
                    <button type="button" className="text-sm text-primary hover:underline">
                      Yêu cầu link mới →
                    </button>
                  </Link>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !password || !confirm}
            >
              {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
