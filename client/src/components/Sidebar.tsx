import { Home, Flame, Zap, Music, Gamepad2, Film, Tv, Trophy, Newspaper, Settings, HelpCircle, X, History, Bell, ListVideo } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const mainNav = [
  { icon: Home,      label: "Trang chủ",  href: "/" },
  { icon: Flame,     label: "Xu hướng",   href: "/trending" },
  { icon: Zap,       label: "Hot 🔥",     href: "/tag/hot" },
  { icon: Music,     label: "Âm nhạc",    href: "/tag/nhac" },
  { icon: Gamepad2,  label: "Gaming",      href: "/tag/gaming" },
  { icon: Film,      label: "Phim",        href: "/tag/phim" },
  { icon: Tv,        label: "Trực tiếp",   href: "/tag/live" },
  { icon: Trophy,    label: "Thể thao",    href: "/tag/the-thao" },
  { icon: Newspaper, label: "Tin tức",     href: "/tag/tin-tuc" },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleNavClick = () => {
    // chỉ đóng sidebar trên mobile (overlay)
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
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-16 left-0 h-[calc(100vh-64px)] w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Close Button for Mobile */}
          <div className="md:hidden p-4 border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {mainNav.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ))}

            {/* Authenticated-only nav */}
            {isAuthenticated && (
              <>
                <div className="pt-2 pb-1 px-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tài khoản</p>
                </div>
                <NavLink href="/history" icon={History} label="Lịch sử xem" />
                <NavLink href="/playlists" icon={ListVideo} label="Danh sách phát" />
                <NavLink href="/notifications" icon={Bell} label="Thông báo" />
              </>
            )}
          </nav>

          {/* Footer Navigation */}
          <div className="border-t border-gray-200 px-3 py-4 space-y-1">
            <Link
              href="/settings"
              onClick={handleNavClick}
              className="flex items-center gap-4 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Cài đặt</span>
            </Link>
            <Link
              href="/help"
              onClick={handleNavClick}
              className="flex items-center gap-4 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Trợ giúp</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
