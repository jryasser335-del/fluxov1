import { Tv, Film, Clapperboard, Theater, Trophy, Settings, Sparkles, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export type ViewType = "canales" | "peliculas" | "series" | "doramas" | "eventos";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    view: "canales", 
    label: "LIVE", 
    icon: <Tv className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-400"
  },
  { 
    view: "peliculas", 
    label: "CINE", 
    icon: <Film className="w-5 h-5" />,
    color: "from-purple-500 to-pink-400"
  },
  { 
    view: "series", 
    label: "SERIES", 
    icon: <Clapperboard className="w-5 h-5" />,
    color: "from-orange-500 to-amber-400"
  },
  { 
    view: "doramas", 
    label: "DRAMA", 
    icon: <Theater className="w-5 h-5" />,
    color: "from-rose-500 to-red-400"
  },
  { 
    view: "eventos", 
    label: "SPORT", 
    icon: <Trophy className="w-5 h-5" />,
    color: "from-emerald-500 to-green-400"
  },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user, isAdmin } = useAuth();

  return (
    <aside className="sticky top-0 h-screen flex flex-col items-center border-r border-white/[0.04] bg-gradient-to-b from-[hsl(240_20%_6%)] to-[hsl(240_20%_3%)] max-md:w-[78px] w-[86px]">
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-primary/15 blur-[50px] rounded-full pointer-events-none" />
      
      {/* Logo */}
      <div className="relative mt-5 mb-3">
        <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden group cursor-pointer">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20" />
          
          {/* Glow on hover */}
          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
          
          {/* Logo */}
          <img 
            src="/pwa-192x192.png" 
            alt="FluxoTV" 
            className="w-9 h-9 relative z-10 rounded-lg transition-transform group-hover:scale-105"
          />
        </div>
        <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-primary animate-pulse" />
      </div>

      {/* Brand */}
      <span className="text-[9px] font-black text-primary/80 tracking-[0.3em] mb-4">FLUXO</span>

      {/* Divider */}
      <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 px-2.5">
        {navItems.map(({ view, label, icon, color }, index) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              style={{ animationDelay: `${index * 0.05}s` }}
              className={cn(
                "relative w-[62px] h-[56px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 animate-fade-in group",
                isActive
                  ? "bg-white/[0.08] border border-white/[0.12] shadow-lg"
                  : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className={cn(
                  "absolute -left-2.5 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b",
                  color
                )} />
              )}
              
              {/* Icon */}
              <div className={cn(
                "transition-all duration-300",
                isActive 
                  ? "text-white scale-110" 
                  : "text-white/50 group-hover:text-white/80 group-hover:scale-105"
              )}>
                {icon}
              </div>
              
              {/* Label */}
              <span className={cn(
                "text-[8px] font-bold tracking-[0.15em] transition-colors duration-300",
                isActive ? "text-white" : "text-white/40 group-hover:text-white/60"
              )}>
                {label}
              </span>

              {/* Active glow effect */}
              {isActive && (
                <div className={cn(
                  "absolute inset-0 rounded-2xl opacity-20 blur-xl bg-gradient-to-br pointer-events-none",
                  color
                )} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />

      {/* Install button */}
      <Link
        to="/install"
        className="w-[62px] h-[50px] mb-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group"
      >
        <Download className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
        <span className="text-[7px] font-bold tracking-wider text-primary/60 group-hover:text-primary/80 transition-colors">
          APP
        </span>
      </Link>

      {/* Admin/Login Button */}
      <Link
        to={isAdmin ? "/admin" : "/auth"}
        className="w-[62px] h-[50px] mb-5 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300 group"
      >
        <Settings className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-all duration-300 group-hover:rotate-90" />
        <span className="text-[7px] font-bold tracking-wider text-white/30 group-hover:text-white/60 transition-colors">
          {isAdmin ? "ADMIN" : user ? "USER" : "LOGIN"}
        </span>
      </Link>
    </aside>
  );
}
