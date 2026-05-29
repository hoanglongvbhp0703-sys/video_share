import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl, getRegisterUrl } from "@/const";
import { SESSION_TOKEN_KEY } from "@shared/const";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden relative">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center gap-2 cursor-pointer group mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-400 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
                VideoShare
              </span>
            </div>
          </Link>
          <p className="text-white/60 text-sm">{t("auth.loginSubtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">{t("auth.loginSubmit")}</h2>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
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
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-white/80">
                  {t("auth.password")}
                </label>
                <Link href="/forgot-password">
                  <span className="text-xs text-blue-300 hover:text-blue-200 cursor-pointer transition-colors">
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
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold shadow-lg shadow-primary/25 border-0 mt-2"
              size="lg"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? t("auth.loginLoading") : t("auth.loginSubmit")}
            </Button>

            <p className="text-center text-sm text-white/50 pt-1">
              {t("auth.noAccount")}{" "}
              <Link href="/register">
                <span className="text-blue-300 font-medium hover:text-blue-200 cursor-pointer transition-colors">
                  {t("auth.registerNow")}
                </span>
              </Link>
            </p>

            {hasOAuth && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs text-white/30 px-2">
                    <span className="bg-transparent px-2">{t("auth.or")}</span>
                  </div>
                </div>
                <a href={getLoginUrl()} className="block">
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" size="lg">
                    {t("auth.loginWithManus")}
                  </Button>
                </a>
                <a href={getRegisterUrl()} className="block">
                  <Button variant="ghost" className="w-full text-white/60 hover:text-white hover:bg-white/10" size="sm">
                    {t("auth.registerWithManus")}
                  </Button>
                </a>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
