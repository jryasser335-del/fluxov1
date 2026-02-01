import { Search, Maximize } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ViewType } from "./Sidebar";

interface TopBarProps {
  activeView: ViewType;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function TopBar({ activeView, searchValue, onSearchChange }: TopBarProps) {
  const getPlaceholder = () => {
    switch (activeView) {
      case "peliculas":
        return "Buscar película…";
      case "series":
        return "Buscar serie…";
      case "doramas":
        return "Buscar dorama…";
      default:
        return "Buscar película o serie…";
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
    <div className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl flex-wrap">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-black overflow-hidden p-1">
          <img src="https://images.seeklogo.com/logo-png/48/1/fluxo-logo-png_seeklogo-485780.png" alt="Fluxo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display tracking-wider font-bold">FLUXO</span>
          <span className="text-muted-foreground text-xs">TMDB (películas/series) • ESPN (eventos)</span>
        </div>
      </div>

      {/* Search and controls */}
      <div className="flex items-center gap-2.5 flex-1 max-w-2xl min-w-[200px]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getPlaceholder()}
            className="pl-9 h-10 rounded-full border-white/10 bg-white/[0.05]"
          />
        </div>

        {/* Mode pill */}
        <button className="h-10 px-3 rounded-full border border-white/10 bg-white/[0.04] text-foreground flex items-center gap-2.5 hover:border-white/20 transition-colors">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-accent to-secondary shadow-glow" />
          <span className="text-sm">Modo cine</span>
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className="h-10 px-3 rounded-full border border-white/10 bg-white/[0.04] text-foreground flex items-center gap-2.5 hover:border-white/20 transition-colors"
        >
          <Maximize className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Full</span>
        </button>
      </div>
    </div>
  );
}
