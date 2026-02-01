import { Search, Maximize, Sparkles, Zap } from "lucide-react";
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
    <header className="relative flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.04] to-white/[0.02] backdrop-blur-2xl flex-wrap overflow-hidden animate-fade-in">
      {/* Ambient glow */}
      <div className="absolute top-0 right-1/4 w-40 h-20 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />
      
      {/* Brand */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="relative group">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/30 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[hsl(220_20%_12%)] to-[hsl(220_20%_8%)] border border-white/10 overflow-hidden p-1.5 transition-transform duration-300 group-hover:scale-105">
            <img 
              src="https://images.seeklogo.com/logo-png/48/1/fluxo-logo-png_seeklogo-485780.png" 
              alt="Fluxo" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl tracking-wider font-bold gradient-text">FLUXO</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-primary">
              BETA
            </span>
          </div>
          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            Stream • Movies • Sports
          </span>
        </div>
      </div>

      {/* Search and controls */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl min-w-[200px] relative z-10">
        <div className="relative flex-1 group">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getPlaceholder()}
            className="relative pl-11 pr-4 h-11 rounded-full border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] focus:border-primary/40 transition-all duration-300 placeholder:text-white/30"
          />
        </div>

        {/* Mode pill */}
        <button className="h-11 px-4 rounded-full border border-white/[0.08] bg-gradient-to-r from-white/[0.04] to-transparent text-foreground flex items-center gap-2.5 hover:border-primary/30 hover:from-primary/10 transition-all duration-300 group">
          <div className="relative">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary to-purple-400 block" />
            <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" />
          </div>
          <span className="text-sm font-medium">Cinema</span>
          <Sparkles className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className="h-11 w-11 rounded-full border border-white/[0.08] bg-white/[0.04] text-foreground flex items-center justify-center hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300 group"
        >
          <Maximize className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>
    </header>
  );
}
