import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { usePlayerModal } from "@/hooks/usePlayerModal";

export function PlayerModal() {
  const { isOpen, title, url, closePlayer } = usePlayerModal();
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, url]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Convert YouTube URLs to embed format
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    
    // YouTube watch URL
    const ytMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&controls=1&rel=0`;
    }
    
    return rawUrl;
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && closePlayer()}
      className="fixed inset-0 z-[9990] bg-black/80 flex items-center justify-center p-4"
    >
      <div className="w-[min(1100px,96vw)] rounded-2xl border border-white/10 bg-white/[0.04] shadow-cinema overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="font-display tracking-wider">{title || "Reproductor"}</h2>
          <button
            onClick={closePlayer}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/[0.05] hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player */}
        <div className="p-3">
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video">
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-radial from-white/[0.08] to-black/65 backdrop-blur-sm z-10">
                <Loader2 className="w-10 h-10 animate-spin text-white/80" />
                <span className="text-sm text-white/70">Cargando…</span>
              </div>
            )}

            {url ? (
              <iframe
                ref={iframeRef}
                src={getEmbedUrl(url)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
                onLoad={handleIframeLoad}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Sin enlace para este evento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
