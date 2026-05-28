import { useState } from "react";
import TopNavigation from "./TopNavigation";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  onSearchChange?: (query: string) => void;
}

export default function Layout({ children, onSearchChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-white">
      <TopNavigation
        onSearchChange={onSearchChange}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
