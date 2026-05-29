import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl, getRegisterUrl } from "@/const";
import { SESSION_TOKEN_KEY } from "@shared/const";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const hasOAuth = !!(
  import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
);

export default function Login() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
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
      setError(t("auth.errorInvalidEmail"));
      return;
    }
    if (!password) {
      setError(t("auth.errorRequiredPassword"));
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
        if (data?.token) sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        window.location.href = "/";
      } else if (res.status === 422 && data?.error === "NAME_REQUIRED") {
        setError(t("auth.errorEmailNotFound"));
      } else if (data?.error === "INVALID_CREDENTIALS") {
        setError(t("auth.errorInvalidCredentials"));
      } else if (data?.error === "NO_PASSWORD") {
        setError(t("auth.errorNoPassword"));
      } else {
        setError(data?.message || data?.error || t("auth.errorServerError"));
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
          <h1 className="text-2xl font-bold text-gray-900">VideoShare</h1>
          <p className="text-gray-500 text-sm mt-1">{t("auth.loginSubtitle")}</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.email")}
            </label>
            <Input
              type="email"
              placeholder={t("auth.emailPlaceholder")}
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
                {t("auth.password")}
              </label>
              <Link href="/forgot-password">
                <span className="text-xs text-primary hover:underline cursor-pointer">
                  {t("auth.forgotPasswordLink")}
                </span>
              </Link>
            </div>
            <Input
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              disabled={loading}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading || !email.trim() || !password}>
            {loading ? t("auth.loginLoading") : t("auth.loginSubmit")}
          </Button>

          <p className="text-center text-sm text-gray-500">
            {t("auth.noAccount")}{" "}
            <Link href="/register">
              <span className="text-primary font-medium hover:underline cursor-pointer">
                {t("auth.registerNow")}
              </span>
            </Link>
          </p>

          {hasOAuth && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">{t("auth.or")}</div>
              </div>
              <a href={getLoginUrl()} className="block">
                <Button variant="outline" className="w-full" size="lg">
                  {t("auth.loginWithManus")}
                </Button>
              </a>
              <a href={getRegisterUrl()} className="block">
                <Button variant="ghost" className="w-full" size="sm">
                  {t("auth.registerWithManus")}
                </Button>
              </a>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
