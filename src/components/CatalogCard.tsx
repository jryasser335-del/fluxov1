import { useState } from "react";
import { TMDB_IMG } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { getPlatformLabel, getPlatformColor } from "@/lib/platforms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface MediaLink {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "series" | "dorama";
  title: string;
  poster_path: string | null;
  stream_url: string;
  season: number | null;
  episode: number | null;
  platform: string | null;
}

interface CatalogCardProps {
  item: MediaLink;
  episodes: MediaLink[];
}

export function CatalogCard({ item, episodes }: CatalogCardProps) {
  const { openPlayer } = usePlayerModal();
  const [showEpisodes, setShowEpisodes] = useState(false);
  
  const posterUrl = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : "";
  const hasMultipleEpisodes = episodes.length > 1;
  const isSeriesOrDorama = item.media_type === "series" || item.media_type === "dorama";

  // Group episodes by season
  const episodesBySeason = episodes.reduce((acc, ep) => {
    const season = ep.season || 1;
    if (!acc[season]) acc[season] = [];
    acc[season].push(ep);
    return acc;
  }, {} as Record<number, MediaLink[]>);

  // Sort episodes within each season
  Object.keys(episodesBySeason).forEach((season) => {
    episodesBySeason[Number(season)].sort((a, b) => (a.episode || 0) - (b.episode || 0));
  });

  const handleClick = () => {
    if (isSeriesOrDorama && hasMultipleEpisodes) {
      setShowEpisodes(true);
    } else {
      openPlayer(item.title, item.stream_url, item.media_type);
    }
  };

  const playEpisode = (ep: MediaLink) => {
    const epTitle = ep.season && ep.episode 
      ? `${ep.title} - T${ep.season}E${ep.episode}`
      : ep.title;
    openPlayer(epTitle, ep.stream_url, ep.media_type);
    setShowEpisodes(false);
  };

  return (
    <>
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
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
            <span className="text-4xl opacity-50">🎬</span>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/50 to-black/95" />

        {/* Top tags */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] px-2.5 py-1.5 rounded-full border border-white/15 bg-black/30">
              {item.media_type === "movie" ? "PELÍCULA" : item.media_type === "series" ? "SERIE" : "DORAMA"}
            </span>
            {item.platform && (
              <span 
                className="text-[11px] px-2.5 py-1.5 rounded-full border border-white/20 bg-black/40 font-medium"
                style={{ 
                  borderColor: `${getPlatformColor(item.platform)}50`,
                  color: getPlatformColor(item.platform) 
                }}
              >
                {getPlatformLabel(item.platform)}
              </span>
            )}
          </div>
          {isSeriesOrDorama && (
            <span className="text-[11px] px-2.5 py-1.5 rounded-full border border-primary/35 text-primary bg-black/30">
              {episodes.length} EP
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute left-3 right-3 bottom-3 z-10">
          <h3 className="text-sm font-semibold leading-tight mb-1.5 drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)] line-clamp-2">
            {item.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              Reproducir
            </span>
          </div>
        </div>
      </div>

      {/* Episode Selector Dialog */}
      <Dialog open={showEpisodes} onOpenChange={setShowEpisodes}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {posterUrl && (
                <img src={posterUrl} alt={item.title} className="w-12 h-16 object-cover rounded" />
              )}
              <div>
                <p>{item.title}</p>
                <p className="text-sm text-muted-foreground font-normal">
                  {episodes.length} episodios disponibles
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {Object.keys(episodesBySeason)
              .sort((a, b) => Number(a) - Number(b))
              .map((seasonNum) => (
                <div key={seasonNum}>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                    Temporada {seasonNum}
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {episodesBySeason[Number(seasonNum)].map((ep) => (
                      <Button
                        key={ep.id}
                        variant="outline"
                        size="sm"
                        onClick={() => playEpisode(ep)}
                        className="h-10"
                      >
                        {ep.episode || "—"}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
