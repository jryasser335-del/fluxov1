import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ViewType } from "./Sidebar";
import { HistoryButton } from "./HistoryButton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

interface TopBarProps {
  activeView: ViewType;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const viewConfig: Record<ViewType, { title: string; subtitle: string; icon: string }> = {
  eventos: { title: "Deportes", subtitle: "EVENTOS", icon: "⚽" },
  multistream: { title: "Multi Stream", subtitle: "MÚLTIPLE", icon: "🖥️" },
};

export function TopBar({ activeView, searchValue, onSearchChange }: TopBarProps) {
  const { isAdmin } = useAuth();
  const config = viewConfig[activeView];

  const getPlaceholder = () => {
    switch (activeView) {
      case "eventos": return "Buscar evento…";
      default: return "Buscar…";
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 py-3 animate-fade-in">
      {/* Title section */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] text-xl shrink-0">
          {config.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg md:text-2xl tracking-wider text-white truncate">
              {config.title}
            </h1>
            {activeView === "eventos" && (
              <span className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-[10px] font-bold text-red-400 uppercase tracking-wider animate-pulse shrink-0">
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
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 to-accent/10 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity" />
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-32 md:w-56 pl-9 pr-3 h-10 rounded-xl border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-primary/30 transition-all duration-300 placeholder:text-white/25 text-sm"
            />
          </div>
        </div>

        {/* History button - hidden on mobile */}
        <div className="hidden sm:block">
          <HistoryButton />
        </div>

        {/* Notifications - hidden on mobile */}
        <button className="hidden sm:flex relative h-10 w-10 rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/50 items-center justify-center hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/70 transition-all duration-300">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </button>

        {/* Admin link */}
        {isAdmin && (
          <Link
            to="/admin"
            className="hidden sm:flex h-10 px-4 rounded-xl border border-primary/20 bg-primary/5 text-primary/80 items-center justify-center hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all duration-300 text-xs font-semibold tracking-wide"
          >
            Admin
          </Link>
        )}
      </div>
    </header>
  );
}

