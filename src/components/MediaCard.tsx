import { TMDB_IMG } from "@/lib/constants";
import { TMDBResult } from "@/lib/api";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { getPlatformLabel, getPlatformColor } from "@/lib/platforms";
import { Play, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MediaCardProps {
  item: TMDBResult;
  type: "movie" | "series" | "dorama";
  streamUrl?: string;
  platform?: string | null;
}

export function MediaCard({ item, type, streamUrl, platform }: MediaCardProps) {
  const { openPlayer } = usePlayerModal();
  const title = item.title || item.name || "";
  const date = item.release_date || item.first_air_date || "";
  const year = date ? date.slice(0, 4) : "—";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const posterUrl = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : "";
  
  const hasStream = !!streamUrl;
  const ratingNum = rating ? parseFloat(rating) : 0;
  const ratingColor = ratingNum >= 7 ? "text-green-400" : ratingNum >= 5 ? "text-yellow-400" : "text-red-400";

  const handleClick = () => {
    if (hasStream && streamUrl) {
      openPlayer(title, { url1: streamUrl }, type);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative rounded-2xl overflow-hidden aspect-[2/3] transition-all duration-400",
        "bg-gradient-to-br from-white/[0.04] to-transparent",
        "border border-white/[0.06]",
        hasStream && "cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_25px_50px_-12px_hsl(270_100%_50%/0.3)] hover:border-primary/30"
      )}
    >
      {/* Poster Image */}
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent flex items-center justify-center">
          <span className="text-5xl opacity-30">🎬</span>
        </div>
      )}

      {/* Top gradient for badges */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* Rating badge */}
      {rating && ratingNum > 0 && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
          <Star className={cn("w-3 h-3 fill-current", ratingColor)} />
          <span className={cn("text-xs font-bold", ratingColor)}>{rating}</span>
        </div>
      )}

      {/* Platform badge */}
      {platform && (
        <div 
          className="absolute top-2.5 left-2.5 z-20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md border border-white/10"
          style={{ color: getPlatformColor(platform) }}
        >
          {getPlatformLabel(platform)}
        </div>
      )}

      {/* Hover overlay with play button */}
      {hasStream && (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 scale-150 bg-primary/30 blur-2xl rounded-full animate-pulse" />
            {/* Play button */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary via-purple-600 to-accent flex items-center justify-center shadow-xl shadow-primary/40 transform scale-75 group-hover:scale-100 transition-all duration-300 border border-white/20">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
      
      {/* Title and info */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 z-10">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1.5 group-hover:text-primary-foreground transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 font-medium">{year}</span>
          {hasStream && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30 text-[9px] font-bold text-primary uppercase">
              <Play className="w-2.5 h-2.5 fill-current" />
              Ver
            </span>
          )}
        </div>
      </div>

      {/* No stream indicator */}
      {!hasStream && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2">
          <Clock className="w-6 h-6 text-white/30" />
          <span className="text-xs text-white/40 font-medium">Próximamente</span>
        </div>
      )}
    </div>
  );
}

