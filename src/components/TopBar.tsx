import { Search, Maximize, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ViewType } from "./Sidebar";
import { HistoryButton } from "./HistoryButton";

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

  const navItems = [
    { label: "Inicio", active: true },
    { label: "Películas", active: activeView === "peliculas" },
    { label: "Series", active: activeView === "series" },
    { label: "Mi Lista", active: false },
  ];

  return (
    <header className="flex items-center justify-between gap-6 py-4 px-6 animate-fade-in">
      {/* Brand */}
      <div className="flex items-center gap-8">
        <span className="font-bold text-xl text-primary tracking-wide">StreamFlow</span>
        
        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`text-sm transition-colors ${
                item.active 
                  ? "text-white font-medium" 
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and controls */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-64 pl-10 pr-4 h-10 rounded-full border-white/10 bg-white/5 hover:bg-white/10 focus:bg-white/10 focus:border-primary/40 transition-all placeholder:text-white/30"
          />
        </div>

        {/* History button */}
        <HistoryButton />

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <Bell className="w-5 h-5" />
        </button>

        {/* User */}
        <button className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center hover:bg-primary transition-colors">
          <User className="w-4 h-4 text-white" />
        </button>
      </div>
    </header>
  );
}
