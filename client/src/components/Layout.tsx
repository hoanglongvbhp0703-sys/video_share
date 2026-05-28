import { useState } from "react";
import TopNavigation from "./TopNavigation";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  onSearchChange?: (query: string) => void;
}

function readSidebarState(): boolean {
  try {
    const saved = localStorage.getItem("sidebar-open");
    return saved === null ? true : saved !== "false";
  } catch {
    return true;
  }
}

function saveSidebarState(open: boolean) {
  try {
    localStorage.setItem("sidebar-open", String(open));
  } catch {}
}

export default function Layout({ children, onSearchChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarState);

  const handleToggle = () => {
    setSidebarOpen((prev) => {
      saveSidebarState(!prev);
      return !prev;
    });
  };

  const handleClose = () => {
    setSidebarOpen(false);
    saveSidebarState(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation
        onSearchChange={onSearchChange}
        onSidebarToggle={handleToggle}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={handleClose} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
