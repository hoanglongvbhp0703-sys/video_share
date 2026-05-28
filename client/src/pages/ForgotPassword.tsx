import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Vui lòng nhập email hợp lệ (ví dụ: you@example.com)");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Đã xảy ra lỗi, vui lòng thử lại");
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
          <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
          <p className="text-gray-500 text-sm mt-1">
            {sent ? "Kiểm tra server console để lấy link" : "Nhập email để nhận link đặt lại mật khẩu"}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700 text-center">
              Nếu email <strong>{email}</strong> tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi.
              <br /><br />
              <span className="text-xs text-green-600">(Dev: xem console server để lấy link)</span>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                ← Quay lại đăng nhập
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
            </Button>

            <Link href="/login">
              <button
                type="button"
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors text-center"
              >
                ← Quay lại đăng nhập
              </button>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
