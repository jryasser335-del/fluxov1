import { Search, Maximize, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ViewType } from "./Sidebar";
import { HistoryButton } from "./HistoryButton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TopBarProps {
  activeView: ViewType;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const viewConfig: Record<ViewType, { title: string; subtitle: string; icon: string }> = {
  canales: { title: "Canales", subtitle: "EN VIVO", icon: "📺" },
  peliculas: { title: "Películas", subtitle: "CATÁLOGO", icon: "🎬" },
  series: { title: "Series", subtitle: "CATÁLOGO", icon: "📀" },
  doramas: { title: "Doramas", subtitle: "ASIÁTICO", icon: "🎭" },
  eventos: { title: "Deportes", subtitle: "EVENTOS", icon: "⚽" },
};

export function TopBar({ activeView, searchValue, onSearchChange }: TopBarProps) {
  const { user } = useAuth();
  const config = viewConfig[activeView];

  const getPlaceholder = () => {
    switch (activeView) {
      case "peliculas": return "Buscar película…";
      case "series": return "Buscar serie…";
      case "doramas": return "Buscar dorama…";
      case "eventos": return "Buscar evento…";
      default: return "Buscar…";
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 py-3 animate-fade-in">
      {/* Title section */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] text-xl">
          {config.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl md:text-2xl tracking-wider text-white">
              {config.title}
            </h1>
            {activeView === "canales" && (
              <span className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-[10px] font-bold text-red-400 uppercase tracking-wider animate-pulse">
                Live
              </span>
            )}
          </div>
          <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase hidden sm:block">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Search + controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/10 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity" />
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-40 md:w-56 pl-10 pr-4 h-10 rounded-2xl border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-primary/30 transition-all duration-300 placeholder:text-white/25 text-sm"
            />
          </div>
        </div>

        {/* History button */}
        <HistoryButton />

        {/* Notifications */}
        <button className="relative h-10 w-10 rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white/50 flex items-center justify-center hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/70 transition-all duration-300">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className="hidden sm:flex h-10 w-10 rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white/50 items-center justify-center hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/70 transition-all duration-300"
        >
          <Maximize className="w-4 h-4" />
        </button>

        {/* User avatar */}
        <Link
          to={user ? "/admin" : "/auth"}
          className={cn(
            "h-10 w-10 rounded-2xl border flex items-center justify-center transition-all duration-300 overflow-hidden",
            user 
              ? "border-primary/30 bg-gradient-to-br from-primary/20 to-accent/10" 
              : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.1]"
          )}
        >
          {user ? (
            <span className="text-sm font-bold text-primary">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-4 h-4 text-white/50" />
          )}
        </Link>
      </div>
    </header>
  );
}

