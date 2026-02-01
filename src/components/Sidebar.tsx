import { Tv, Film, Clapperboard, Theater, Trophy, Settings, Sparkles, Library } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export type ViewType = "canales" | "peliculas" | "series" | "doramas" | "eventos" | "catalogo";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode; gradient: string }[] = [
  { 
    view: "catalogo", 
    label: "CATÁLOGO", 
    icon: <Library className="w-5 h-5" />,
    gradient: "from-yellow-500 to-orange-400"
  },
  { 
    view: "canales", 
    label: "CANALES", 
    icon: <Tv className="w-5 h-5" />,
    gradient: "from-blue-500 to-cyan-400"
  },
  { 
    view: "peliculas", 
    label: "PELÍCULAS", 
    icon: <Film className="w-5 h-5" />,
    gradient: "from-purple-500 to-pink-400"
  },
  { 
    view: "series", 
    label: "SERIES", 
    icon: <Clapperboard className="w-5 h-5" />,
    gradient: "from-orange-500 to-amber-400"
  },
  { 
    view: "doramas", 
    label: "DORAMAS", 
    icon: <Theater className="w-5 h-5" />,
    gradient: "from-rose-500 to-pink-400"
  },
  { 
    view: "eventos", 
    label: "EVENTOS", 
    icon: <Trophy className="w-5 h-5" />,
    gradient: "from-emerald-500 to-teal-400"
  },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user, isAdmin } = useAuth();

  return (
    <aside className="sticky top-0 h-screen flex flex-col items-center border-r border-white/5 bg-gradient-to-b from-[hsl(220_20%_6%)] to-[hsl(220_20%_4%)] backdrop-blur-2xl max-md:w-[78px] w-[86px]">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />
      
      {/* Logo */}
      <div className="relative mt-5 mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[hsl(220_20%_12%)] to-[hsl(220_20%_8%)] border border-white/10 shadow-lg overflow-hidden p-2 group">
          <img 
            src="https://images.seeklogo.com/logo-png/48/1/fluxo-logo-png_seeklogo-485780.png" 
            alt="Fluxo" 
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" 
          />
        </div>
        <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-float" />
      </div>

      {/* Divider */}
      <div className="w-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />

      {/* Navigation */}
      <nav className="flex flex-col gap-2 px-3">
        {navItems.map(({ view, label, icon, gradient }, index) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              style={{ animationDelay: `${index * 0.05}s` }}
              className={cn(
                "relative w-[60px] h-[60px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 animate-fade-in group",
                isActive
                  ? "bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/40 shadow-lg shadow-primary/20"
                  : "border border-transparent hover:border-white/10 hover:bg-white/[0.04]"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-primary to-primary/60" />
              )}
              
              {/* Icon with gradient on active */}
              <div className={cn(
                "transition-all duration-300",
                isActive 
                  ? `bg-gradient-to-br ${gradient} bg-clip-text text-transparent` 
                  : "text-white/70 group-hover:text-white/90"
              )}>
                <div className={isActive ? `text-primary` : ""}>{icon}</div>
              </div>
              
              <span className={cn(
                "text-[9px] font-medium tracking-wider transition-colors duration-300",
                isActive ? "text-white" : "text-white/50 group-hover:text-white/70"
              )}>
                {label}
              </span>

              {/* Hover glow */}
              {!isActive && (
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="w-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />

      {/* Admin/Login Button */}
      <Link
        to={isAdmin ? "/admin" : "/auth"}
        className="relative w-[60px] h-[60px] mb-5 rounded-2xl flex flex-col items-center justify-center gap-1 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 group"
      >
        <Settings className="w-5 h-5 text-white/60 group-hover:text-white/90 transition-all duration-300 group-hover:rotate-90" />
        <span className="text-[9px] font-medium tracking-wider text-white/50 group-hover:text-white/70 transition-colors">
          {isAdmin ? "ADMIN" : user ? "CUENTA" : "LOGIN"}
        </span>
      </Link>
    </aside>
  );
}
