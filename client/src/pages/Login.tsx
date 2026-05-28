import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl, getRegisterUrl } from "@/const";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const hasOAuth = !!(
  import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
);

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Vui lòng nhập email hợp lệ");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        window.location.href = "/";
      } else if (res.status === 422 && data?.error === "NAME_REQUIRED") {
        setError("Email này chưa có tài khoản. Vui lòng đăng ký trước.");
      } else if (data?.error === "INVALID_CREDENTIALS") {
        setError("Email hoặc mật khẩu không đúng");
      } else if (data?.error === "NO_PASSWORD") {
        setError("Tài khoản này đăng nhập qua phương thức khác (Google/Manus)");
      } else {
        setError(data?.message || data?.error || "Đăng nhập thất bại");
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">VS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VideoShare</h1>
          <p className="text-gray-500 text-sm mt-1">Đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Mật khẩu
                </label>
                <Link href="/forgot-password">
                  <span className="text-xs text-primary hover:underline cursor-pointer">
                    Quên mật khẩu?
                  </span>
                </Link>
              </div>
              <Input
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                disabled={loading}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={loading || !email.trim() || !password}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Chưa có tài khoản?{" "}
              <Link href="/register">
                <span className="text-primary font-medium hover:underline cursor-pointer">
                  Đăng ký ngay
                </span>
              </Link>
            </p>

            {hasOAuth && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">hoặc</div>
                </div>
                <a href={getLoginUrl()} className="block">
                  <Button variant="outline" className="w-full" size="lg">
                    Đăng nhập với Manus
                  </Button>
                </a>
                <a href={getRegisterUrl()} className="block">
                  <Button variant="ghost" className="w-full" size="sm">
                    Đăng ký với Manus
                  </Button>
                </a>
              </>
            )}
        </form>
      </div>
    </div>
  );
}
