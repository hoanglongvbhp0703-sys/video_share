import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Upload from "./pages/Upload";
import Channel from "./pages/Channel";
import Search from "./pages/Search";
import Trending from "./pages/Trending";
import Profile from "./pages/Profile";
import Category from "./pages/Category";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Notifications from "./pages/Notifications";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import TagPage from "./pages/Tag";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import Register from "./pages/Register";
import Help from "./pages/Help";
import Landing from "./pages/Landing";
import { useAuth } from "./_core/hooks/useAuth";

function RootPage() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Home /> : <Landing />;
}

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to); }, [to, navigate]);
  return null;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={RootPage} />
      <Route path={"/watch/:id"} component={Watch} />
      <Route path={"/upload"} component={Upload} />
      <Route path={"/channel/:id"} component={Channel} />
      <Route path={"/channel"} component={Channel} />
      <Route path={"/search"} component={Search} />
      <Route path={"/trending"} component={Trending} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/category/:id"} component={Category} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/history"} component={History} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/playlists"} component={Playlists} />
      <Route path={"/playlist/:id"} component={PlaylistDetail} />
      <Route path={"/tag/:name"} component={TagPage} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/reports"} component={AdminReports} />
      <Route path={"/help"} component={Help} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable={true}
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
