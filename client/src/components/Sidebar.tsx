import { Home, Flame, Zap, Music, Gamepad2, Film, Tv, Trophy, Newspaper, Settings, HelpCircle, X, History, ListVideo, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  const mainNav = [
    { icon: Home,      label: t("nav.home"),    href: "/" },
    { icon: Flame,     label: t("nav.trending"), href: "/trending" },
    { icon: Zap,       label: t("nav.hot"),      href: "/tag/hot" },
    { icon: Music,     label: t("nav.music"),    href: "/tag/nhac" },
    { icon: Gamepad2,  label: t("nav.gaming"),   href: "/tag/gaming" },
    { icon: Film,      label: t("nav.movies"),   href: "/tag/phim" },
    { icon: Tv,        label: t("nav.live"),     href: "/tag/live" },
    { icon: Trophy,    label: t("nav.sports"),   href: "/tag/the-thao" },
    { icon: Newspaper, label: t("nav.news"),     href: "/tag/tin-tuc" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      onClose?.();
    }
  };

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => (
    <Link
      href={href}
      onClick={handleNavClick}
      className={cn(
        "flex items-center gap-4 px-3 py-2 rounded-lg transition-colors",
        isActive(href)
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-accent"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </Link>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed md:sticky top-16 left-0 h-[calc(100vh-64px)] w-64 bg-background border-r border-border overflow-y-auto transition-transform duration-300 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="md:hidden p-4 border-b border-border">
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {mainNav.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ))}

            {isAuthenticated && (
              <>
                <div className="pt-2 pb-1 px-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("sidebar.account")}</p>
                </div>
                <NavLink href="/history" icon={History} label={t("nav.watchHistory")} />
                <NavLink href="/playlists" icon={ListVideo} label={t("nav.playlists")} />
                {user?.role === "admin" && (
                  <>
                    <div className="pt-2 pb-1 px-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("sidebar.admin")}</p>
                    </div>
                    <NavLink href="/admin" icon={ShieldCheck} label={t("nav.adminPanel")} />
                  </>
                )}
              </>
            )}
          </nav>

          <div className="border-t border-border px-3 py-4 space-y-1">
            <Link
              href="/settings"
              onClick={handleNavClick}
              className="flex items-center gap-4 px-3 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{t("nav.settings")}</span>
            </Link>
            <Link
              href="/help"
              onClick={handleNavClick}
              className="flex items-center gap-4 px-3 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{t("nav.help")}</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
