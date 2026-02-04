import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ViewType } from "./Sidebar";
import { HistoryButton } from "./HistoryButton";
import { useAuth } from "@/hooks/useAuth";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TopBarProps {
  activeView: ViewType;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const viewConfig: Record<ViewType, { title: string; subtitle: string; icon: string }> = {
  canales: { title: "Canales", subtitle: "EN VIVO", icon: "📺" },
  eventos: { title: "Deportes", subtitle: "EVENTOS", icon: "⚽" },
};

export function TopBar({ activeView, searchValue, onSearchChange }: TopBarProps) {
  const { isAdmin } = useAuth();
  const { appUser, logout } = useAppAuth();
  const navigate = useNavigate();
  const config = viewConfig[activeView];

  const getPlaceholder = () => {
    switch (activeView) {
      case "eventos": return "Buscar evento…";
      default: return "Buscar…";
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between gap-4 py-4 animate-fade-in">
      {/* Title section with enhanced styling */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] text-2xl shrink-0 shadow-lg">
          {config.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-xl md:text-2xl tracking-wider text-white truncate">
              {config.title}
            </h1>
            {activeView === "canales" && (
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-500/25 to-red-600/20 border border-red-500/35 text-[10px] font-black text-red-400 uppercase tracking-[0.15em] animate-pulse shrink-0 shadow-sm shadow-red-500/20">
                Live
              </span>
            )}
          </div>
          <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase hidden sm:block mt-0.5">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Search + controls with premium styling */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Enhanced Search */}
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/25 to-accent/15 opacity-0 group-focus-within:opacity-100 blur-md transition-all duration-500" />
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-white/35 pointer-events-none group-focus-within:text-primary/70 transition-colors duration-300" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-36 md:w-60 pl-10 pr-4 h-11 rounded-2xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.06] focus:border-primary/40 transition-all duration-500 placeholder:text-white/25 text-sm shadow-inner"
            />
          </div>
        </div>

        {/* History button - hidden on mobile */}
        <div className="hidden sm:block">
          <HistoryButton />
        </div>

        {/* Premium Notifications button */}
        <button className="hidden sm:flex relative h-11 w-11 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent text-white/50 items-center justify-center hover:border-primary/30 hover:bg-white/[0.06] hover:text-white/80 transition-all duration-500 group">
          <Bell className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse shadow-sm shadow-red-500/50" />
        </button>

        {/* Admin link with premium styling */}
        {isAdmin && (
          <Link
            to="/admin"
            className="hidden sm:flex h-11 px-5 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 to-accent/5 text-primary/90 items-center justify-center hover:border-primary/40 hover:from-primary/15 hover:to-accent/10 hover:text-primary transition-all duration-500 text-xs font-bold tracking-wider shadow-sm shadow-primary/10"
          >
            Admin
          </Link>
        )}

        {/* User avatar / Logout with premium styling */}
        {appUser && (
          <button
            onClick={handleLogout}
            className={cn(
              "h-11 w-11 rounded-2xl border flex items-center justify-center transition-all duration-500 overflow-hidden group",
              "border-red-500/25 bg-gradient-to-br from-red-500/10 to-red-600/5 hover:from-red-500/20 hover:to-red-600/10 hover:border-red-500/40 shadow-sm shadow-red-500/10"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 text-red-400/70 group-hover:text-red-400 transition-colors duration-300" />
          </button>
        )}
      </div>
    </header>
  );
}

