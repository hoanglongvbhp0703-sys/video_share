import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Mail, ArrowLeft, CheckCircle, Play } from "lucide-react";

type Step = "email" | "otp" | "done";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [otpInputs, setOtpInputs] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // ─── OTP input helpers ─────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpInputs];
    next[index] = digit;
    setOtpInputs(next);
    setError("");
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setOtpInputs(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // ─── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
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
        setStep("otp");
        startResendCooldown();
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

  // ─── Step 2: Verify OTP + new password ────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpInputs.join("");
    if (code.length !== 6) {
      setError(t("auth.errorOtpRequired"));
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
      const res = await fetch("/api/auth/reset-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: code, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStep("done");
        setTimeout(() => navigate("/login"), 2500);
      } else if (data?.error === "OTP_NOT_FOUND") {
        setError(t("auth.errorOtpInvalid"));
      } else if (data?.error === "OTP_EXPIRED") {
        setError(t("auth.errorOtpExpired"));
      } else if (data?.error === "OTP_USED") {
        setError(t("auth.errorOtpUsed"));
      } else {
        setError(data?.message || t("auth.errorServerError"));
      }
    } catch {
      setError(t("auth.errorCantConnect"));
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setOtpInputs(["", "", "", "", "", ""]);
        startResendCooldown();
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden relative">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />

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
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-400" />
              </div>
              <p className="text-lg font-semibold text-white">{t("auth.resetSuccess")}</p>
              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-primary to-blue-500 text-white border-0">
                  {t("auth.loginNow")}
                </Button>
              </Link>
            </div>
          )}

          {/* ── Enter email ── */}
          {step === "email" && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-white">{t("auth.forgotPasswordTitle")}</h1>
                <p className="text-white/60 text-sm mt-1">{t("auth.forgotPasswordSubtitle")}</p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.email")}</label>
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

                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold border-0"
                  size="lg"
                  disabled={loading || !email.trim()}
                >
                  {loading ? t("auth.sendingOtp") : t("auth.sendOtp")}
                </Button>

                <Link href="/login">
                  <button type="button" className="w-full text-sm text-white/50 hover:text-white/80 transition-colors text-center mt-1">
                    {t("auth.backToLogin")}
                  </button>
                </Link>
              </form>
            </>
          )}

          {/* ── OTP + new password ── */}
          {step === "otp" && (
            <>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); setOtpInputs(["", "", "", "", "", ""]); }}
                className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> {t("auth.backToForm")}
              </button>

              <div className="text-center mb-5">
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 bg-blue-500/20 border border-blue-400/40 rounded-full flex items-center justify-center">
                    <Mail className="w-7 h-7 text-blue-300" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{t("auth.otpTitle")}</h2>
                <p className="text-sm text-white/60">
                  {t("auth.otpSentTo")} <span className="text-white font-medium">{email}</span>
                </p>
                <p className="text-xs text-white/40 mt-1">{t("auth.otpDevHint")}</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                {/* OTP boxes */}
                <div className="flex gap-2 justify-center">
                  {otpInputs.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      disabled={loading}
                      className="w-11 h-14 text-center text-xl font-bold rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50 transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.newPassword")}</label>
                  <Input
                    type="password"
                    placeholder={t("auth.newPasswordPlaceholder")}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    disabled={loading}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.confirmPassword")}</label>
                  <Input
                    type="password"
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    disabled={loading}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
                    <p className="text-sm text-red-300 text-center">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold border-0"
                  size="lg"
                  disabled={loading || otpInputs.join("").length !== 6 || !password || !confirmPassword}
                >
                  {loading ? t("auth.resetPasswordLoading") : t("auth.resetPasswordSubmit")}
                </Button>

                <p className="text-center text-sm text-white/50">
                  {t("auth.otpNotReceived")}{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-white/40">{t("auth.resendIn", { seconds: resendCooldown })}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-blue-300 font-medium hover:text-blue-200 transition-colors"
                    >
                      {t("auth.resendOtp")}
                    </button>
                  )}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
