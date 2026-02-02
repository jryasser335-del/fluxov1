import { TMDB_IMG } from "@/lib/constants";
import { TMDBResult } from "@/lib/api";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { getPlatformLabel, getPlatformColor } from "@/lib/platforms";
import { Play, Star } from "lucide-react";
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

  const handleClick = () => {
    if (hasStream && streamUrl) {
      openPlayer(title, { url1: streamUrl }, type);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "card-shine glass-panel glass-panel-hover relative rounded-2xl overflow-hidden aspect-[2/3]",
        hasStream && "cursor-pointer"
      )}
    >
      {/* Poster Image */}
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
          <span className="text-4xl opacity-50">🎬</span>
        </div>
      )}

      {/* Rating badge */}
      {rating && parseFloat(rating) > 0 && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold text-white">{rating}</span>
        </div>
      )}

      {/* Platform badge */}
      {platform && (
        <div 
          className="absolute top-2 left-2 z-20 px-2 py-1 rounded-lg text-[10px] font-semibold bg-black/70 backdrop-blur-sm border border-white/10"
          style={{ color: getPlatformColor(platform) }}
        >
          {getPlatformLabel(platform)}
        </div>
      )}

      {/* Hover overlay with play button */}
      {hasStream && (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 transform scale-75 hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent" />
      
      {/* Title and year */}
      <div className="absolute inset-x-0 bottom-0 p-3 z-10">
        <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-1">
          {title}
        </h3>
        <p className="text-xs text-white/60">{year}</p>
      </div>

      {/* No stream indicator */}
      {!hasStream && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
          <span className="text-xs text-white/50 bg-black/60 px-3 py-1.5 rounded-full border border-white/10">
            Sin enlace
          </span>
        </div>
      )}
    </div>
  );
}
