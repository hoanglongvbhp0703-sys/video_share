import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SESSION_TOKEN_KEY } from "@shared/const";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("auth.errorEmailInvalid"));
      return;
    }
    if (!name.trim()) {
      setError(t("auth.errorNameRequired"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.errorPasswordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.errorPasswordMismatch"));
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data?.token) sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        setSuccess(true);
        setTimeout(() => { window.location.href = "/"; }, 1200);
      } else if (data?.error === "INVALID_CREDENTIALS") {
        setError(t("auth.errorEmailTaken"));
      } else if (data?.error === "NO_PASSWORD") {
        setError(t("auth.errorEmailOtherMethod"));
      } else if (data?.error === "EMAIL_INVALID") {
        setError(data.message || t("auth.errorEmailInvalid"));
      } else {
        setError(t("auth.errorRegisterFail"));
      }
    } catch {
      setError(t("auth.errorCantConnect"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer hover:opacity-90 transition-opacity">
              <span className="text-white text-2xl font-bold">VS</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.registerTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("auth.registerSubtitle")}</p>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">{t("auth.registerSuccess")}</p>
            <p className="text-sm text-gray-500">{t("auth.redirecting")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.email")}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.displayName")}</label>
              <Input
                placeholder={t("auth.displayNamePlaceholder")}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.password")}</label>
              <Input
                type="password"
                placeholder={t("auth.newPasswordPlaceholder")}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.confirmPassword")}</label>
              <Input
                type="password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                disabled={loading}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !email.trim() || !name.trim() || !password || !confirmPassword}
            >
              {loading ? t("auth.registerLoading") : t("auth.registerSubmit")}
            </Button>

            <p className="text-center text-sm text-gray-500">
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                {t("auth.loginLink")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
