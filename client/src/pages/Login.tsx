import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl, getRegisterUrl } from "@/const";
import { useState } from "react";
import { useLocation } from "wouter";

const hasOAuth = !!(
  import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
);

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"email" | "name">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Vui lòng nhập email hợp lệ");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Thử đăng nhập trước — nếu email chưa có sẽ cần nhập tên
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        window.location.href = "/";
      } else if (res.status === 422 && data?.error === "NAME_REQUIRED") {
        // Email chưa tồn tại → cần nhập tên để tạo tài khoản
        setStep("name");
      } else {
        setError(data?.error || "Đăng nhập thất bại");
      }
    } catch {
      setError("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên hiển thị");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
        credentials: "include",
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Đăng ký thất bại");
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
          <p className="text-gray-500 text-sm mt-1">
            {step === "email" ? "Đăng nhập để tiếp tục" : "Tạo tài khoản mới"}
          </p>
        </div>

        {/* Step 1: Email */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={loading || !email.trim()}>
              {loading ? "Đang kiểm tra..." : "Tiếp tục"}
            </Button>

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
        )}

        {/* Step 2: Name (new user) */}
        {step === "name" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              Email <strong>{email}</strong> chưa có tài khoản. Nhập tên để tạo mới.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên hiển thị
              </label>
              <Input
                placeholder="Tên của bạn"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={loading || !name.trim()}>
              {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </Button>

            <button
              type="button"
              onClick={() => { setStep("email"); setError(""); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Dùng email khác
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
