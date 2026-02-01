import { useEffect, useRef, useState } from "react";
import { X, Loader2, Maximize2, Volume2, VolumeX, Play, Pause } from "lucide-react";
import Hls from "hls.js";
import { usePlayerModal } from "@/hooks/usePlayerModal";

export function PlayerModal() {
  const { isOpen, title, url, closePlayer } = usePlayerModal();
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();

  const isHlsStream = url?.includes(".m3u8");
  const isYouTube = url?.includes("youtube.com") || url?.includes("youtu.be");

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setIsPlaying(true);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, url]);

  useEffect(() => {
    if (!isOpen || !isHlsStream || !videoRef.current || !url) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, isHlsStream, url]);

  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    const ytMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&controls=1&rel=0`;
    }
    return rawUrl;
  };

  const handleIframeLoad = () => setIsLoading(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && closePlayer()}
      className="fixed inset-0 z-[9990] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="w-[min(1200px,96vw)] rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-cinema overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <h2 className="font-display text-lg tracking-wider text-white/90">{title || "Reproductor"}</h2>
          </div>
          <button
            onClick={closePlayer}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/[0.05] hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
          >
            <X className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Player */}
        <div className="p-4">
          <div
            className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black aspect-video group"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-radial from-primary/10 via-black/80 to-black z-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                </div>
                <span className="text-sm text-white/60 font-medium">Conectando al stream…</span>
              </div>
            )}

            {isHlsStream ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain bg-black"
                  playsInline
                  autoPlay
                  muted={isMuted}
                />

                {/* Custom controls for HLS */}
                <div
                  className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlay}
                        className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={toggleMute}
                        className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200"
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5 text-white" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/20 border border-destructive/30">
                        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                        <span className="text-xs font-bold text-destructive uppercase tracking-wider">En vivo</span>
                      </div>
                      <button
                        onClick={toggleFullscreen}
                        className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200"
                      >
                        <Maximize2 className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : isYouTube || url ? (
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
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                  <Play className="w-8 h-8 text-white/30" />
                </div>
                <span className="text-sm">Sin enlace disponible</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-black/20 flex items-center justify-between">
          <span className="text-xs text-white/40">Stream en tiempo real</span>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Conectado
          </div>
        </div>
      </div>
    </div>
  );
}
