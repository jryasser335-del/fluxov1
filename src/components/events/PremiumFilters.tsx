import { RefreshCw, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface LeagueOption {
  value: string;
  label: string;
}

interface PremiumFiltersProps {
  league: string;
  onLeagueChange: (value: string) => void;
  leagueOptions: LeagueOption[];
  filter: string;
  onFilterChange: (value: string) => void;
  filterOptions: FilterOption[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function PremiumFilters({
  league,
  onLeagueChange,
  leagueOptions,
  filter,
  onFilterChange,
  filterOptions,
  searchQuery,
  onSearchChange,
  autoRefresh,
  onAutoRefreshChange,
  onRefresh,
  isLoading
}: PremiumFiltersProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Top row: League selector and refresh */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Premium league selector */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl opacity-30 group-hover:opacity-50 blur transition-opacity" />
          <select
            value={league}
            onChange={(e) => onLeagueChange(e.target.value)}
            className="relative h-11 rounded-xl px-4 pr-10 border border-white/10 bg-black/60 backdrop-blur-xl text-white font-medium outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
          >
            {leagueOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-black text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "h-11 px-5 rounded-xl flex items-center gap-2 font-medium transition-all duration-300",
            "bg-gradient-to-r from-white/5 to-white/10 border border-white/10",
            "hover:from-white/10 hover:to-white/15 hover:border-white/20",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn(
            "w-4 h-4 transition-transform",
            isLoading && "animate-spin"
          )} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>

        {/* Auto refresh toggle */}
        <label className={cn(
          "h-11 flex items-center gap-2 px-4 rounded-xl cursor-pointer transition-all duration-300",
          "border",
          autoRefresh 
            ? "bg-primary/20 border-primary/40 text-primary" 
            : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
        )}>
          <div className={cn(
            "relative w-8 h-5 rounded-full transition-colors",
            autoRefresh ? "bg-primary" : "bg-white/20"
          )}>
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-lg transition-transform",
              autoRefresh ? "left-3.5" : "left-0.5"
            )} />
          </div>
          <span className="text-sm font-medium">Auto</span>
          {autoRefresh && <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />}
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange(e.target.checked)}
            className="sr-only"
          />
        </label>
      </div>

      {/* Bottom row: Filters and search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Premium filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300",
                filter === option.value
                  ? "text-white"
                  : "text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
              )}
            >
              {filter === option.value && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-90" />
              )}
              <span className="relative">{option.label}</span>
              {option.count !== undefined && option.count > 0 && (
                <span className={cn(
                  "relative px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                  filter === option.value 
                    ? "bg-white/20 text-white" 
                    : "bg-white/10 text-white/50"
                )}>
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Premium search */}
        <div className="relative group flex-shrink-0">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar equipo..."
              className="pl-10 h-11 rounded-xl border-white/10 bg-black/60 backdrop-blur-xl text-white placeholder:text-white/30 w-full sm:w-56 focus:border-primary/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
