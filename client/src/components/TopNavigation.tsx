import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Upload, Menu, User, Tv, History, Settings, LogOut, Bell } from "lucide-react";
import { getLoginUrl, getRegisterUrl } from "@/const";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface TopNavigationProps {
  onSearchChange?: (query: string) => void;
  onSidebarToggle?: () => void;
}

export default function TopNavigation({ onSearchChange, onSidebarToggle }: TopNavigationProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, navigate] = useLocation();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms trước khi gọi API suggest
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Ẩn suggestions khi click ra ngoài
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

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

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

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 gap-4">
        {/* Left: Logo and Sidebar Toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onSidebarToggle}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-gray-700" />
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
              placeholder="Tìm kiếm video..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="rounded-l-full border-gray-300 focus:border-primary"
            />
            <button
              type="submit"
              className="bg-gray-100 hover:bg-gray-200 px-4 rounded-r-full transition-colors border border-l-0 border-gray-300"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          </form>
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s.title); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                >
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{s.title}</p>
                    {s.channelName && (
                      <p className="text-xs text-gray-400 truncate">{s.channelName}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Upload and User Menu */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/upload")}
                className="gap-2 text-gray-700 hover:bg-gray-100"
              >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
              <button
                onClick={() => navigate("/notifications")}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-white text-xs font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 py-2">
                {/* User info header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-white font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    {user?.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>Hồ sơ của tôi</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/channel")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <Tv className="w-4 h-4 text-gray-500" />
                  <span>Kênh của tôi</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/history")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <History className="w-4 h-4 text-gray-500" />
                  <span>Lịch sử xem</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer flex items-center gap-3 px-4 py-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>Cài đặt</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => logout()}
                  className="cursor-pointer flex items-center gap-3 px-4 py-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <a href={getRegisterUrl()}>
                <Button variant="outline" size="sm">
                  Đăng ký
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button variant="default" size="sm">
                  Đăng nhập
                </Button>
              </a>
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
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="rounded-l-full border-gray-300 focus:border-primary text-sm"
            />
            <button
              type="submit"
              className="bg-gray-100 hover:bg-gray-200 px-3 rounded-r-full transition-colors border border-l-0 border-gray-300"
            >
              <Search className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </form>
        {showSuggestions && suggestions && suggestions.length > 0 && (
          <div className="absolute left-4 right-4 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s.title); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
              >
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-800 truncate">{s.title}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
