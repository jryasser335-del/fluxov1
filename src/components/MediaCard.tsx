import { TMDB_IMG } from "@/lib/constants";
import { TMDBResult } from "@/lib/api";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { getPlatformLabel, getPlatformColor } from "@/lib/platforms";

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
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";
  const posterUrl = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : "";
  
  const hasStream = !!streamUrl;

  const handleClick = () => {
    if (hasStream && streamUrl) {
      openPlayer(title, streamUrl, type);
    } else {
      console.log(`No stream available for: ${title}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative rounded-xl overflow-hidden border border-white/10 bg-white/[0.04] min-h-[320px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-card group"
    >
      {/* Poster */}
      {posterUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center scale-[1.03] saturate-[1.05] contrast-[1.02]"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
      )}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/50 to-black/95" />

      {/* Top tags */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center gap-2 z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] px-2.5 py-1.5 rounded-full border border-white/15 bg-black/30">
            {type.toUpperCase()}
          </span>
          {platform && (
            <span 
              className="text-[11px] px-2.5 py-1.5 rounded-full border border-white/20 bg-black/40 font-medium"
              style={{ 
                borderColor: `${getPlatformColor(platform)}50`,
                color: getPlatformColor(platform) 
              }}
            >
              {getPlatformLabel(platform)}
            </span>
          )}
        </div>
        <span className={`text-[11px] px-2.5 py-1.5 rounded-full border ${hasStream ? 'border-success/35 text-green-200' : 'border-destructive/35 text-red-200'} bg-black/30`}>
          {hasStream ? "PLAY" : "NO LINK"}
        </span>
      </div>

      {/* Bottom info */}
      <div className="absolute left-3 right-3 bottom-3 z-10">
        <h3 className="text-sm font-semibold leading-tight mb-1.5 drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)] line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>{year}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-accent to-secondary shadow-glow" />
            {rating}
          </span>
        </div>
      </div>
    </div>
  );
}
