import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Upload, Menu, User, Tv, History, Settings, LogOut, Bell, BellOff, Video, Users, MessageSquare, Info, CheckCheck, Globe } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { useDateLocale } from "@/lib/useDateLocale";

interface TopNavigationProps {
  onSearchChange?: (query: string) => void;
  onSidebarToggle?: () => void;
}

export default function TopNavigation({ onSearchChange, onSidebarToggle }: TopNavigationProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = useDateLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, navigate] = useLocation();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: suggestions } = trpc.videos.suggest.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.trim().length >= 2 }
  );

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 10, offset: 0 },
    { enabled: isAuthenticated && showNotifications }
  );

  const utils = trpc.useUtils();

  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation({
    onMutate: () => {
      // Flip isRead trên tất cả notifications trong cache — deterministic
      utils.notifications.list.setData(
        { limit: 10, offset: 0 },
        (old) => old?.map((n) => ({ ...n, isRead: true }))
      );
    },
    onSuccess: (data) => {
      // unreadCount thực từ server
      utils.notifications.getUnreadCount.setData(undefined, data.unreadCount);
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onMutate: ({ id }) => {
      // Flip isRead trên notification cụ thể — deterministic
      utils.notifications.list.setData(
        { limit: 10, offset: 0 },
        (old) => old?.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    },
    onSuccess: (data) => {
      // unreadCount thực từ server, không hardcode -1
      utils.notifications.getUnreadCount.setData(undefined, data.unreadCount);
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const notifTypeIcon: Record<string, React.ReactNode> = {
    new_video: <Video className="w-3.5 h-3.5 text-primary" />,
    new_subscriber: <Users className="w-3.5 h-3.5 text-green-500" />,
    comment: <MessageSquare className="w-3.5 h-3.5 text-blue-500" />,
    reply: <MessageSquare className="w-3.5 h-3.5 text-purple-500" />,
    system: <Info className="w-3.5 h-3.5 text-gray-400" />,
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      onSearchChange?.(searchQuery);
    }
  };

  const handleSelectSuggestion = (title: string) => {
    setSearchQuery(title);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(title)}`);
    onSearchChange?.(title);
  };

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 gap-4">
        {/* Left: Logo and Sidebar Toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onSidebarToggle}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:text-primary/90 transition-colors">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">VS</span>
            </div>
            <span className="hidden sm:inline">VideoShare</span>
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div ref={searchContainerRef} className="flex-1 max-w-md mx-4 hidden sm:flex relative">
          <form onSubmit={handleSearch} className="flex w-full">
            <Input
              type="text"
              placeholder={t("topnav.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="rounded-l-full border-border focus:border-primary"
            />
            <button
              type="submit"
              className="bg-muted hover:bg-accent px-4 rounded-r-full transition-colors border border-l-0 border-border"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          </form>
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-xl shadow-lg border border-border z-50 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s.title); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                >
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-popover-foreground truncate">{s.title}</p>
                    {s.channelName && (
                      <p className="text-xs text-muted-foreground truncate">{s.channelName}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Upload, Bell, Language, User Menu */}
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/upload")}
                className="gap-2 text-foreground hover:bg-accent"
              >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">{t("topnav.upload")}</span>
              </Button>

              {/* Bell notification dropdown */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  className="relative p-2 hover:bg-accent rounded-full transition-colors"
                  aria-label={t("topnav.notifications")}
                >
                  <Bell className="w-5 h-5 text-foreground" />
                  {(unreadCount ?? 0) > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-popover rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-foreground" />
                        <span className="font-semibold text-sm text-popover-foreground">{t("topnav.notifications")}</span>
                        {(unreadCount ?? 0) > 0 && (
                          <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {(unreadCount ?? 0) > 0 && (
                        <button
                          onClick={() => markAllAsRead.mutate()}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          {t("topnav.markAllRead")}
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {!notifications || notifications.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-2">
                          <BellOff className="w-8 h-8 text-gray-200" />
                          <p className="text-sm text-gray-400">{t("topnav.noNotifications")}</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.isRead && markAsRead.mutate({ id: n.id })}
                            className={cn(
                              "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent",
                              !n.isRead && "bg-primary/5"
                            )}
                          >
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                              {notifTypeIcon[n.type] ?? <Info className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs leading-relaxed", !n.isRead ? "font-medium text-popover-foreground" : "text-muted-foreground")}>
                                {n.message}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: dateLocale })}
                              </p>
                            </div>
                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-border px-4 py-2">
                      <button
                        onClick={() => { setShowNotifications(false); navigate("/notifications"); }}
                        className="w-full text-xs text-primary hover:text-primary/80 transition-colors py-1"
                      >
                        {t("topnav.viewAllNotifications")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 p-2 hover:bg-accent rounded-full transition-colors text-sm text-foreground">
                <Globe className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-medium">{currentLang.flag}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("topnav.language")}
              </div>
              <DropdownMenuSeparator />
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    i18n.language === lang.code && "bg-accent font-medium"
                  )}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="text-sm">{lang.label}</span>
                  {i18n.language === lang.code && (
                    <span className="ml-auto text-primary text-xs">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-accent rounded-full transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? ""} />
                    <AvatarFallback className="bg-primary text-white text-xs font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 py-2">
                <div className="px-4 py-3 flex items-center gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? ""} />
                    <AvatarFallback className="bg-primary text-white font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    {user?.email && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{t("topnav.myProfile")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/channel")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <Tv className="w-4 h-4 text-gray-500" />
                  <span>{t("topnav.myChannel")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/history")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <History className="w-4 h-4 text-gray-500" />
                  <span>{t("topnav.watchHistory")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>{t("topnav.settings")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => logout()}
                  className="cursor-pointer flex items-center gap-3 px-4 py-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("topnav.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/register")}>
                {t("topnav.register")}
              </Button>
              <Button variant="default" size="sm" onClick={() => navigate("/login")}>
                {t("topnav.login")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-3 relative">
        <form onSubmit={handleSearch}>
          <div className="flex w-full">
            <Input
              type="text"
              placeholder={t("topnav.searchPlaceholderMobile")}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="rounded-l-full border-border focus:border-primary text-sm"
            />
            <button
              type="submit"
              className="bg-muted hover:bg-accent px-3 rounded-r-full transition-colors border border-l-0 border-border"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </form>
        {showSuggestions && suggestions && suggestions.length > 0 && (
          <div className="absolute left-4 right-4 mt-1 bg-popover rounded-xl shadow-lg border border-border z-50 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s.title); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
              >
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-popover-foreground truncate">{s.title}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
