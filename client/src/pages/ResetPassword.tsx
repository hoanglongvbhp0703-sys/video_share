import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation();
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
          <p className="text-red-600 font-medium">{t("auth.invalidLink")}</p>
          <Link href="/forgot-password">
            <Button className="w-full">{t("auth.requestNewLink")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("auth.errorPasswordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.errorPasswordMismatch"));
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
        setError(t("auth.errorTokenExpired"));
      } else if (data?.error === "TOKEN_USED") {
        setError(t("auth.errorTokenUsed"));
      } else {
        setError(data?.message || t("auth.invalidLink"));
      }
    } catch {
      setError(t("auth.errorCantConnect"));
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
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.resetPasswordTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("auth.resetPasswordSubtitle")}</p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700 text-center">
              {t("auth.resetSuccess")}
            </div>
            <Link href="/login">
              <Button className="w-full">{t("auth.loginNow")}</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.newPassword")}
              </label>
              <Input
                type="password"
                placeholder={t("auth.newPasswordPlaceholder")}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.confirmPassword")}
              </label>
              <Input
                type="password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="space-y-2">
                <p className="text-sm text-red-600">{error}</p>
                {(error === t("auth.errorTokenExpired") || error === t("auth.errorTokenUsed")) && (
                  <Link href="/forgot-password">
                    <button type="button" className="text-sm text-primary hover:underline">
                      {t("auth.requestNewLink")} →
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
              {loading ? t("auth.resetPasswordLoading") : t("auth.resetPasswordSubmit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
