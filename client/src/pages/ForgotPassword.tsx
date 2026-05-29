import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("auth.errorEmailForgotPassword"));
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
        setError(data?.message || t("auth.errorServerError"));
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
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.forgotPasswordTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {sent ? t("auth.forgotPasswordSentSubtitle") : t("auth.forgotPasswordSubtitle")}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700 text-center">
              {t("auth.forgotPasswordSentMessage", { email })}
              <br /><br />
              <span className="text-xs text-green-600">{t("auth.forgotPasswordDevHint")}</span>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                {t("auth.backToLogin")}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={loading || !email.trim()}>
              {loading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
            </Button>

            <Link href="/login">
              <button
                type="button"
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors text-center"
              >
                {t("auth.backToLogin")}
              </button>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
