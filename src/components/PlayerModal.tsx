import { useEffect, useRef, useState } from "react";
import { X, Loader2, Maximize2, Volume2, VolumeX, Play, Pause, Rewind, FastForward, Subtitles } from "lucide-react";
import Hls from "hls.js";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { useRealtimeSubtitles } from "@/hooks/useRealtimeSubtitles";

export function PlayerModal() {
  const { isOpen, title, url, contentType, closePlayer } = usePlayerModal();
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();

  const {
    isEnabled: subtitlesEnabled,
    currentSubtitle,
    isProcessing: subtitlesProcessing,
    toggleSubtitles,
  } = useRealtimeSubtitles(videoRef);

  const isHlsStream = url?.includes(".m3u8");
  const isYouTube = url?.includes("youtube.com") || url?.includes("youtu.be");
  const isLiveContent = contentType === "live";

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

    // Use proxy for external streams to bypass CORS
    const getProxiedUrl = (streamUrl: string) => {
      // Skip proxy for streams with IP-bound tokens (they won't work through proxy)
      const hasIpToken = streamUrl.includes("token=") || streamUrl.includes("ip=");
      if (hasIpToken) {
        console.log("Stream has IP-bound token, loading directly:", streamUrl);
        return streamUrl;
      }
      
      // Check if it's an external stream that needs proxying
      const isExternalStream = !streamUrl.includes(window.location.hostname) && 
                               !streamUrl.includes("supabase.co");
      if (isExternalStream) {
        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
        return proxyUrl;
      }
      return streamUrl;
    };

    const streamUrl = getProxiedUrl(url);
    console.log("Loading stream:", streamUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
        // More permissive settings for various stream sources
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 6,
        manifestLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 30000,
        levelLoadingMaxRetry: 4,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn("HLS error:", data.type, data.details);
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          // Try to recover from fatal errors
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.log("Trying to recover from network error...");
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.log("Trying to recover from media error...");
            hls.recoverMediaError();
          } else {
            setIsLoading(false);
          }
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

  const seek = (seconds: number) => {
    if (videoRef.current && !isLiveContent) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current && !isLiveContent) {
      videoRef.current.currentTime = Number(e.target.value);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const hours = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if already in fullscreen
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (video as any).webkitDisplayingFullscreen
    );

    if (isCurrentlyFullscreen) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((video as any).webkitExitFullscreen) {
        (video as any).webkitExitFullscreen();
      }
      return;
    }

    // iOS Safari - use webkitEnterFullscreen directly on video element
    // This is the ONLY method that works on iPhone
    if ((video as any).webkitEnterFullscreen) {
      try {
        (video as any).webkitEnterFullscreen();
        return;
      } catch (e) {
        console.log("webkitEnterFullscreen failed, trying alternatives");
      }
    }

    // iOS Safari alternative - webkitSetPresentationMode
    if ((video as any).webkitSetPresentationMode) {
      try {
        (video as any).webkitSetPresentationMode("fullscreen");
        return;
      } catch (e) {
        console.log("webkitSetPresentationMode failed");
      }
    }

    // Standard Fullscreen API for desktop browsers
    const container = video.parentElement;
    if (container) {
      if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if (container.requestFullscreen) {
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
            {isLiveContent && <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />}
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
                  crossOrigin="anonymous"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                />

                {/* AI Subtitles Overlay */}
                {subtitlesEnabled && currentSubtitle && (
                  <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-30">
                    <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-lg max-w-[80%] border border-white/10">
                      <p className="text-white text-lg md:text-xl font-medium text-center leading-relaxed">
                        {currentSubtitle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Subtitle processing indicator */}
                {subtitlesEnabled && subtitlesProcessing && !currentSubtitle && (
                  <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-30">
                    <div className="bg-black/60 px-4 py-2 rounded-lg flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-white/60 text-sm">Procesando audio...</span>
                    </div>
                  </div>
                )}

                {/* Custom controls for HLS */}
                <div
                  className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* Progress bar for movies/series */}
                  {!isLiveContent && duration > 0 && (
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-xs text-white/60 w-12">{formatTime(currentTime)}</span>
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        value={currentTime}
                        onChange={handleSeekBar}
                        className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="text-xs text-white/60 w-12 text-right">{formatTime(duration)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {/* Rewind button for non-live content */}
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(-10)}
                          className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200"
                        >
                          <Rewind className="w-5 h-5 text-white" />
                        </button>
                      )}
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
                      {/* Fast forward button for non-live content */}
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(10)}
                          className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200"
                        >
                          <FastForward className="w-5 h-5 text-white" />
                        </button>
                      )}
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
                      
                      {/* AI Subtitles button */}
                      <button
                        onClick={toggleSubtitles}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                          subtitlesEnabled
                            ? "bg-primary/30 border-primary/50 hover:bg-primary/40"
                            : "bg-white/10 border-white/10 hover:bg-white/20"
                        }`}
                        title={subtitlesEnabled ? "Desactivar subtítulos IA" : "Activar subtítulos IA (Español)"}
                      >
                        <Subtitles className={`w-5 h-5 ${subtitlesEnabled ? "text-primary" : "text-white"}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Only show "En vivo" badge for live content */}
                      {isLiveContent && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/20 border border-destructive/30">
                          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                          <span className="text-xs font-bold text-destructive uppercase tracking-wider">En vivo</span>
                        </div>
                      )}
                      
                      {/* Subtitle status indicator */}
                      {subtitlesEnabled && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30">
                          <Subtitles className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-primary">SUB ES</span>
                        </div>
                      )}
                      
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
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen; accelerometer; gyroscope; clipboard-write"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
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
          <span className="text-xs text-white/40">
            {isLiveContent ? "Stream en tiempo real" : "Reproduciendo película"}
          </span>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Conectado
          </div>
        </div>
      </div>
    </div>
  );
}
