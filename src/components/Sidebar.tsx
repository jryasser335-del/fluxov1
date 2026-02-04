import { Tv, Film, Clapperboard, Theater, Trophy, Settings, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppAuth } from "@/hooks/useAppAuth";

export type ViewType = "canales" | "peliculas" | "series" | "doramas" | "eventos";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    view: "canales", 
    label: "LIVE", 
    icon: <Tv className="w-5 h-5 max-md:w-6 max-md:h-6" />,
    color: "from-blue-500 to-cyan-400"
  },
  { 
    view: "peliculas", 
    label: "CINE", 
    icon: <Film className="w-5 h-5 max-md:w-6 max-md:h-6" />,
    color: "from-purple-500 to-pink-400"
  },
  { 
    view: "series", 
    label: "SERIES", 
    icon: <Clapperboard className="w-5 h-5 max-md:w-6 max-md:h-6" />,
    color: "from-orange-500 to-amber-400"
  },
  { 
    view: "doramas", 
    label: "DRAMA", 
    icon: <Theater className="w-5 h-5 max-md:w-6 max-md:h-6" />,
    color: "from-rose-500 to-red-400"
  },
  { 
    view: "eventos", 
    label: "SPORT", 
    icon: <Trophy className="w-5 h-5 max-md:w-6 max-md:h-6" />,
    color: "from-emerald-500 to-green-400"
  },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { isAdmin } = useAuth();
  const { appUser, logout } = useAppAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex sticky top-0 h-screen flex-col items-center border-r border-white/[0.04] bg-black w-[86px]">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />
        
        {/* Logo */}
        <div className="relative mt-5 mb-3">
          <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20" />
            <img 
              src="/pwa-192x192.png" 
              alt="FluxoTV" 
              className="w-9 h-9 relative z-10 rounded-lg transition-transform group-hover:scale-105"
            />
          </div>
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
                
                <div className={cn(
                  "transition-all duration-300",
                  isActive 
                    ? "text-white scale-110" 
                    : "text-white/50 group-hover:text-white/80"
                )}>
                  {icon}
                </div>
                
                <span className={cn(
                  "text-[8px] font-bold tracking-[0.15em] transition-colors duration-300",
                  isActive ? "text-white" : "text-white/40 group-hover:text-white/60"
                )}>
                  {label}
                </span>

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

        {/* Logout Button */}
        {appUser && (
          <button
            onClick={logout}
            className="w-[62px] h-[50px] mb-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 group"
          >
            <LogOut className="w-4 h-4 text-red-400/70 group-hover:text-red-400 transition-colors" />
            <span className="text-[7px] font-bold tracking-wider text-red-400/60 group-hover:text-red-400/80 transition-colors">
              SALIR
            </span>
          </button>
        )}

        {/* Admin Button */}
        {isAdmin && (
          <Link
            to="/admin"
            className="w-[62px] h-[50px] mb-5 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300 group"
          >
            <Settings className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-all duration-300 group-hover:rotate-90" />
            <span className="text-[7px] font-bold tracking-wider text-white/30 group-hover:text-white/60 transition-colors">
              ADMIN
            </span>
          </Link>
        )}
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/[0.06] px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-around">
          {navItems.map(({ view, label, icon, color }) => {
            const isActive = activeView === view;
            return (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300",
                  isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                )}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <div className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gradient-to-r",
                    color
                  )} />
                )}
                
                <div className={cn(
                  "transition-all duration-300",
                  isActive ? "text-white" : "text-white/50"
                )}>
                  {icon}
                </div>
                
                <span className={cn(
                  "text-[9px] font-bold tracking-wider transition-colors duration-300",
                  isActive ? "text-white" : "text-white/40"
                )}>
                  {label}
                </span>

                {isActive && (
                  <div className={cn(
                    "absolute inset-0 rounded-xl opacity-20 blur-lg bg-gradient-to-br pointer-events-none",
                    color
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
