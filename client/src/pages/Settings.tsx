import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Lock, LogOut, Moon, Sun, Globe } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();
  const { t, i18n } = useTranslation();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const utils = trpc.useUtils();

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t("settings.profileUpdated"));
      utils.auth.me.invalidate();
      utils.users.getMyProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const changePassword = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      toast.success(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("settings.notLoggedIn")}</h2>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t("settings.loginBtn")}
          </a>
        </div>
      </Layout>
    );
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedBio = bio.trim();
    updateProfile.mutate({ name: trimmedName, bio: trimmedBio });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.errorPasswordMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("settings.errorPasswordTooShort"));
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("settings.title")}</h1>

        {/* User info header */}
        <div className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="bg-primary text-white text-xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.name || t("settings.user")}</p>
            <p className="text-sm text-gray-500">{user?.email || ""}</p>
          </div>
        </div>

        {/* Profile section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">{t("settings.profileSection")}</h2>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings.displayName")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.displayName")}
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings.bio")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("settings.bioPlaceholder")}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</p>
            </div>
            <Button type="submit" disabled={updateProfile.isPending} size="sm">
              {updateProfile.isPending ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">{t("settings.passwordSection")}</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings.currentPassword")}</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settings.currentPassword")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings.newPassword")}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings.newPasswordPlaceholder")}
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings.confirmPassword")}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settings.confirmPasswordPlaceholder")}
              />
            </div>
            <Button
              type="submit"
              disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
              size="sm"
            >
              {changePassword.isPending ? t("settings.changingPassword") : t("settings.changePassword")}
            </Button>
          </form>
        </div>

        {/* Language */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">{t("settings.languageSection")}</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">{t("settings.languageDesc")}</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                  i18n.language === lang.code
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-700 border-gray-200 hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <span className="text-base">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Appearance — dark mode */}
        {switchable && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <h2 className="text-base font-semibold text-gray-900">{t("settings.appearanceSection")}</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{t("settings.darkMode")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("settings.darkModeDesc")}</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  theme === "dark" ? "bg-primary" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={theme === "dark"}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Account / Logout */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <LogOut className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">{t("settings.accountSection")}</h2>
          </div>
          <Button variant="destructive" size="sm" onClick={() => logout()}>
            {t("settings.logoutBtn")}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
