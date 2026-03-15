import { useState, useEffect } from "react";
import { Star, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleRowProps {
  id: string;
  name: string;
  teamHome?: string;
  teamAway?: string;
  time?: string;
  isLive?: boolean;
  hasLink?: boolean;
  isResolving?: boolean;
  isFavorite?: boolean;
  poster?: string;
  onToggleFavorite?: () => void;
  onClick?: () => void;
}

// Logo cache
const logoCache = new Map<string, { logo: string | null; ts: number }>();
const LOGO_TTL_OK = 24 * 60 * 60 * 1000;
const LOGO_TTL_NULL = 5 * 60 * 1000;

async function fetchLogo(name: string): Promise<string | null> {
  if (!name || name.length < 2) return null;
  const key = name.toLowerCase().trim();
  const cached = logoCache.get(key);
  if (cached) {
    const ttl = cached.logo ? LOGO_TTL_OK : LOGO_TTL_NULL;
    if (Date.now() - cached.ts < ttl) return cached.logo;
  }
  try {
    const { data, error } = await supabase.functions.invoke("team-logo-search", { body: { t: name } });
    if (!error && data?.logo) {
      logoCache.set(key, { logo: data.logo, ts: Date.now() });
      return data.logo;
    }
  } catch { /* skip */ }
  logoCache.set(key, { logo: null, ts: Date.now() });
  return null;
}

function SmallBadge({ name }: { name: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let c = false;
    if (!name) return;
    fetchLogo(name).then((u) => { if (!c) setLogo(u); });
    return () => { c = true; };
  }, [name]);

  if (logo && !err) {
    return (
      <img
        src={logo}
        alt={name}
        className="w-6 h-6 object-contain flex-shrink-0"
        onError={() => setErr(true)}
        loading="lazy"
      />
    );
  }
  return null;
}

export function ScheduleRow({
  id,
  name,
  teamHome,
  teamAway,
  time,
  isLive,
  hasLink,
  isResolving,
  isFavorite,
  onToggleFavorite,
  onClick,
}: ScheduleRowProps) {
  const displayHome = teamHome || name?.split(" vs ")?.[1]?.trim() || name?.split(" - ")?.[1]?.trim();
  const displayAway = teamAway || name?.split(" vs ")?.[0]?.trim() || name?.split(" - ")?.[0]?.trim() || name;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200",
        "hover:bg-white/[0.03] active:bg-white/[0.05]",
        "border-b border-white/[0.04] last:border-b-0",
      )}
      onClick={onClick}
    >
      {/* Time / Live indicator */}
      <div className="flex-shrink-0 w-[52px] flex items-center justify-center">
        {isLive ? (
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive shadow-lg shadow-destructive/40" />
          </div>
        ) : time ? (
          <span className="text-[13px] font-mono text-muted-foreground/50 tabular-nums">{time}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground/30">—</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Away / Team 1 */}
        <div className="flex items-center gap-2.5">
          <SmallBadge name={displayAway || ""} />
          <span className={cn(
            "text-[13px] font-medium truncate",
            isLive ? "text-foreground/95" : "text-foreground/70"
          )}>
            {displayAway || "TBD"}
          </span>
        </div>
        {/* Home / Team 2 */}
        {displayHome && displayHome !== displayAway && (
          <div className="flex items-center gap-2.5">
            <SmallBadge name={displayHome} />
            <span className={cn(
              "text-[13px] font-medium truncate",
              isLive ? "text-foreground/95" : "text-foreground/70"
            )}>
              {displayHome}
            </span>
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isResolving && (
          <Loader2 className="w-4 h-4 text-primary/50 animate-spin" />
        )}
        {hasLink && !isResolving && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/[0.08] border border-success/15">
            <Zap className="w-3 h-3 text-success/70" />
          </div>
        )}
      </div>

      {/* Favorite */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
            isFavorite
              ? "text-warning"
              : "text-muted-foreground/15 opacity-0 group-hover:opacity-100 hover:text-muted-foreground/40"
          )}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
      )}
    </div>
  );
}
