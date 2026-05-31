import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SESSION_TOKEN_KEY } from "@shared/const";
import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Play, CheckCircle, Mail, ArrowLeft } from "lucide-react";

type Step = "form" | "otp" | "done";

export default function Register() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  // Form fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP
  const [otp, setOtp] = useState("");
  const [otpInputs, setOtpInputs] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  // ─── OTP input helpers ─────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpInputs];
    next[index] = digit;
    setOtpInputs(next);
    setOtp(next.join(""));
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
    setOtp(next.join(""));
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // ─── Step 1: Submit form → send OTP ───────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/auth/send-register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStep("otp");
        startResendCooldown();
      } else if (data?.error === "EMAIL_TAKEN") {
        setError(t("auth.errorEmailTaken"));
      } else if (data?.error === "EMAIL_INVALID") {
        setError(t("auth.errorEmailInvalid"));
      } else {
        setError(data?.message || t("auth.errorRegisterFail"));
      }
    } catch {
      setError(t("auth.errorCantConnect"));
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP → create user ─────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpInputs.join("");
    if (code.length !== 6) {
      setError(t("auth.errorOtpRequired"));
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: code, name: name.trim(), password }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data?.token) sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        setStep("done");
        setTimeout(() => { window.location.href = "/"; }, 1200);
      } else if (data?.error === "OTP_NOT_FOUND") {
        setError(t("auth.errorOtpInvalid"));
      } else if (data?.error === "OTP_EXPIRED") {
        setError(t("auth.errorOtpExpired"));
      } else if (data?.error === "OTP_USED") {
        setError(t("auth.errorOtpUsed"));
      } else {
        setError(data?.message || t("auth.errorRegisterFail"));
      }
    } catch {
      setError(t("auth.errorCantConnect"));
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ────────────────────────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      if (res.ok) {
        setOtpInputs(["", "", "", "", "", ""]);
        setOtp("");
        startResendCooldown();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || t("auth.errorRegisterFail"));
      }
    } catch {
      setError(t("auth.errorCantConnect"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden relative py-8">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

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
          <p className="text-white/60 text-sm">{t("auth.registerSubtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-400" />
              </div>
              <p className="text-lg font-semibold text-white mb-1">{t("auth.registerSuccess")}</p>
              <p className="text-sm text-white/50">{t("auth.redirecting")}</p>
            </div>
          )}

          {/* ── Form ── */}
          {step === "form" && (
            <>
              <h2 className="text-xl font-bold text-white mb-6 text-center">{t("auth.registerTitle")}</h2>
              <form onSubmit={handleFormSubmit} className="space-y-4">
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

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.displayName")}</label>
                  <Input
                    placeholder={t("auth.displayNamePlaceholder")}
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    disabled={loading}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{t("auth.password")}</label>
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
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold shadow-lg shadow-primary/25 border-0 mt-2"
                  size="lg"
                  disabled={loading || !email.trim() || !name.trim() || !password || !confirmPassword}
                >
                  {loading ? t("auth.sendingOtp") : t("auth.continueToOtp")}
                </Button>

                <p className="text-center text-sm text-white/50 pt-1">
                  {t("auth.hasAccount")}{" "}
                  <Link href="/login" className="text-blue-300 font-medium hover:text-blue-200 transition-colors">
                    {t("auth.loginLink")}
                  </Link>
                </p>
              </form>
            </>
          )}

          {/* ── OTP ── */}
          {step === "otp" && (
            <>
              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); setOtpInputs(["", "", "", "", "", ""]); }}
                className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> {t("auth.backToForm")}
              </button>

              <div className="text-center mb-6">
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

              <form onSubmit={handleOtpSubmit} className="space-y-5">
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

                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
                    <p className="text-sm text-red-300 text-center">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold shadow-lg shadow-primary/25 border-0"
                  size="lg"
                  disabled={loading || otpInputs.join("").length !== 6}
                >
                  {loading ? t("auth.verifyingOtp") : t("auth.verifyOtp")}
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
