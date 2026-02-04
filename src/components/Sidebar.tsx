import { Tv, Trophy, Settings, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppAuth } from "@/hooks/useAppAuth";

export type ViewType = "canales" | "eventos";

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
      {/* Desktop Sidebar - Ultra Premium Design */}
      <aside className="hidden md:flex sticky top-0 h-screen flex-col items-center border-r border-white/[0.06] bg-gradient-to-b from-black via-black to-black/95 w-[86px]">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/15 blur-[60px] rounded-full pointer-events-none" />
        
        {/* Logo with premium styling */}
        <div className="relative mt-6 mb-4">
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-accent/15 to-transparent border border-primary/25 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-2xl" />
            <img 
              src="/pwa-192x192.png" 
              alt="FluxoTV" 
              className="w-10 h-10 relative z-10 rounded-xl transition-transform group-hover:scale-105 drop-shadow-lg"
            />
            {/* Corner accent */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-primary to-accent opacity-80" />
          </div>
        </div>

        {/* Brand text */}
        <span className="text-[9px] font-black text-primary/90 tracking-[0.35em] mb-5">FLUXO</span>

        {/* Premium divider */}
        <div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent mb-5" />

        {/* Navigation with enhanced styling */}
        <nav className="flex flex-col gap-2 px-2.5">
          {navItems.map(({ view, label, icon, color }, index) => {
            const isActive = activeView === view;
            return (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                style={{ animationDelay: `${index * 0.05}s` }}
                className={cn(
                  "relative w-[64px] h-[60px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-500 animate-fade-in group",
                  isActive
                    ? "bg-gradient-to-br from-white/[0.1] to-white/[0.04] border border-white/[0.15] shadow-xl shadow-primary/10"
                    : "border border-transparent hover:bg-white/[0.05] hover:border-white/[0.08]"
                )}
              >
                {/* Active indicator bar - premium glow */}
                {isActive && (
                  <>
                    <div className={cn(
                      "absolute -left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full bg-gradient-to-b shadow-lg",
                      color
                    )} style={{ boxShadow: `0 0 15px hsl(var(--primary) / 0.5)` }} />
                    {/* Inner glow */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                  </>
                )}
                
                <div className={cn(
                  "transition-all duration-500",
                  isActive 
                    ? "text-white scale-110 drop-shadow-lg" 
                    : "text-white/50 group-hover:text-white/80 group-hover:scale-105"
                )}>
                  {icon}
                </div>
                
                <span className={cn(
                  "text-[8px] font-black tracking-[0.2em] transition-colors duration-500",
                  isActive ? "text-white" : "text-white/40 group-hover:text-white/70"
                )}>
                  {label}
                </span>

                {isActive && (
                  <div className={cn(
                    "absolute inset-0 rounded-2xl opacity-30 blur-xl bg-gradient-to-br pointer-events-none",
                    color
                  )} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Premium divider */}
        <div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent mb-4" />

        {/* Logout Button with enhanced styling */}
        {appUser && (
          <button
            onClick={logout}
            className="w-[64px] h-[54px] mb-2 rounded-2xl flex flex-col items-center justify-center gap-1 border border-red-500/25 bg-gradient-to-br from-red-500/10 to-red-600/5 hover:from-red-500/20 hover:to-red-600/10 hover:border-red-500/40 transition-all duration-500 group"
          >
            <LogOut className="w-4.5 h-4.5 text-red-400/70 group-hover:text-red-400 transition-colors duration-300" />
            <span className="text-[7px] font-bold tracking-wider text-red-400/60 group-hover:text-red-400/90 transition-colors duration-300">
              SALIR
            </span>
          </button>
        )}

        {/* Admin Button with enhanced styling */}
        {isAdmin && (
          <Link
            to="/admin"
            className="w-[64px] h-[54px] mb-6 rounded-2xl flex flex-col items-center justify-center gap-1 border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent hover:from-white/[0.08] hover:border-primary/30 transition-all duration-500 group"
          >
            <Settings className="w-4.5 h-4.5 text-white/40 group-hover:text-primary transition-all duration-500 group-hover:rotate-90" />
            <span className="text-[7px] font-bold tracking-wider text-white/30 group-hover:text-primary/80 transition-colors duration-300">
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
