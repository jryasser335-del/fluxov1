import { Tv, Film, Clapperboard, Theater, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewType = "canales" | "peliculas" | "series" | "doramas" | "eventos";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: "canales", label: "CANALES", icon: <Tv className="w-[18px] h-[18px]" /> },
  { view: "peliculas", label: "PELÍCULAS", icon: <Film className="w-[18px] h-[18px]" /> },
  { view: "series", label: "SERIES", icon: <Clapperboard className="w-[18px] h-[18px]" /> },
  { view: "doramas", label: "DORAMAS", icon: <Theater className="w-[18px] h-[18px]" /> },
  { view: "eventos", label: "EVENTOS", icon: <Users className="w-[18px] h-[18px]" /> },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="sticky top-0 h-screen p-4 flex flex-col items-center gap-3 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl max-md:w-[78px] w-[86px]">
      {/* Logo */}
      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/65 to-destructive/40 border border-white/15 shadow-cinema mb-2">
        <span className="font-display text-lg tracking-wider">F</span>
      </div>

      {/* Navigation */}
      {navItems.map(({ view, label, icon }) => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={cn(
            "w-[58px] h-[58px] rounded-xl flex flex-col items-center justify-center gap-1.5 border transition-all duration-150 cursor-pointer",
            activeView === view
              ? "bg-gradient-to-b from-primary/20 to-white/[0.03] border-primary/40"
              : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:bg-white/[0.05] hover:border-white/20"
          )}
        >
          <div className="text-white/90">{icon}</div>
          <span className="text-[10px] text-muted-foreground tracking-wider">{label}</span>
        </button>
      ))}
    </aside>
  );
}
