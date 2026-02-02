import { Search, Maximize, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ViewType } from "./Sidebar";
import { HistoryButton } from "./HistoryButton";

interface TopBarProps {
  activeView: ViewType;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function TopBar({ activeView, searchValue, onSearchChange }: TopBarProps) {
  const getTitle = () => {
    switch (activeView) {
      case "canales":
        return "CANALES EN VIVO";
      case "peliculas":
        return "PELÍCULAS";
      case "series":
        return "SERIES";
      case "doramas":
        return "DORAMAS";
      case "eventos":
        return "EVENTOS DEPORTIVOS";
      default:
        return "STREAMING";
    }
  };

  const getPlaceholder = () => {
    switch (activeView) {
      case "peliculas":
        return "Buscar película…";
      case "series":
        return "Buscar serie…";
      case "doramas":
        return "Buscar dorama…";
      case "eventos":
        return "Buscar evento…";
      default:
        return "Buscar contenido…";
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
    <header className="flex items-center justify-between gap-4 py-4 animate-fade-in">
      {/* Title with gradient */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <h1 className="font-display text-lg md:text-xl tracking-wider bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
          {getTitle()}
        </h1>
      </div>

      {/* Search + controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-primary/30 to-accent/20 opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-white/40 pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-48 md:w-64 pl-10 pr-4 h-11 rounded-full border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.06] focus:border-primary/40 transition-all duration-300 placeholder:text-white/30"
            />
          </div>
        </div>

        {/* History button */}
        <HistoryButton />

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className="h-11 w-11 rounded-full border border-white/[0.08] bg-white/[0.04] text-foreground flex items-center justify-center hover:border-primary/30 hover:bg-primary/10 transition-all duration-300 group"
        >
          <Maximize className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>
    </header>
  );
}
