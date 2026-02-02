import { TMDB_IMG } from "@/lib/constants";
import { TMDBResult } from "@/lib/api";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { getPlatformLabel, getPlatformColor } from "@/lib/platforms";
import { Play } from "lucide-react";
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

  // Rating color based on score
  const getRatingColor = (score: number) => {
    if (score >= 8) return "bg-green-500 text-white";
    if (score >= 6) return "bg-yellow-500 text-black";
    return "bg-red-500 text-white";
  };

  const handleClick = () => {
    if (hasStream && streamUrl) {
      openPlayer(title, { url1: streamUrl }, type);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative rounded-lg overflow-hidden aspect-[2/3] cursor-pointer group",
        "transition-all duration-300",
        hasStream && "hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/50"
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

      {/* Rating badge - top right corner */}
      {rating && parseFloat(rating) > 0 && (
        <div className={cn(
          "absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md text-xs font-bold",
          getRatingColor(parseFloat(rating))
        )}>
          {rating}
        </div>
      )}

      {/* Platform badge - top left */}
      {platform && (
        <div 
          className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-sm border border-white/10"
          style={{ color: getPlatformColor(platform) }}
        >
          {getPlatformLabel(platform)}
        </div>
      )}

      {/* Hover overlay with play button */}
      <div className={cn(
        "absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300",
        hasStream ? "opacity-0 group-hover:opacity-100" : "opacity-0"
      )}>
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
          <Play className="w-6 h-6 text-white fill-white ml-1" />
        </div>
      </div>

      {/* Bottom gradient for title */}
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
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-xs text-white/50 bg-black/50 px-2 py-1 rounded">Sin enlace</span>
        </div>
      )}
    </div>
  );
}
