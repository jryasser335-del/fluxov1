import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Loader2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Rewind,
  FastForward,
  Subtitles,
  Settings,
  Share2,
  PictureInPicture2,
  MonitorPlay,
  Keyboard,
  BarChart3,
  Moon,
  Cast,
  Music,
  Smartphone,
  Signal,
} from "lucide-react";
import Hls from "hls.js";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { useRealtimeSubtitles } from "@/hooks/useRealtimeSubtitles";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { useAmbientMode } from "@/hooks/useAmbientMode";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { KeyboardShortcuts } from "./player/KeyboardShortcuts";
import { QuickSettings } from "./player/QuickSettings";
import { StreamStats } from "./player/StreamStats";
import { ShareMenu } from "./player/ShareMenu";
import { SleepTimerMenu } from "./player/SleepTimerMenu";
import { CastMenu } from "./player/CastMenu";
import { AudioMixer } from "./player/AudioMixer";
import { QualitySelector } from "./player/QualitySelector";
import { GestureGuide } from "./player/GestureGuide";
import { toast } from "sonner";

export function PlayerModal() {
  const { isOpen, title, urls, contentType, closePlayer } = usePlayerModal();
  const { addToHistory } = useWatchHistory();

  // Core states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Actualizado para soportar hasta 4 opciones
  const [activeOption, setActiveOption] = useState<1 | 2 | 3 | 4>(1);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Premium features states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showCastMenu, setShowCastMenu] = useState(false);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [showGestureGuide, setShowGestureGuide] = useState(false);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [streamStats, setStreamStats] = useState({ quality: "Auto", bitrate: 0, buffered: 0 });
  const [availableQualities, setAvailableQualities] = useState<string[]>(["Auto", "1080p", "720p", "480p", "360p"]);
  const [currentQuality, setCurrentQuality] = useState("Auto");

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const loadingWatchdog = useRef<NodeJS.Timeout>();
  const fatalErrorCount = useRef(0);

  // Premium hooks
  const sleepTimer = useSleepTimer();
  const ambientMode = useAmbientMode(videoRef);

  const {
    isEnabled: subtitlesEnabled,
    currentSubtitle,
    isProcessing: subtitlesProcessing,
    toggleSubtitles,
  } = useRealtimeSubtitles(videoRef);

  // Get current URL based on active option (Soporta URL 4)
  const getCurrentUrl = () => {
    if (activeOption === 2 && urls.url2) return urls.url2;
    if (activeOption === 3 && urls.url3) return urls.url3;
    if (activeOption === 4 && (urls as any).url4) return (urls as any).url4;
    return urls.url1;
  };

  const url = getCurrentUrl();
  // Definimos streamUrl para evitar errores de referencia
  const streamUrl = url;

  // Detect URL type
  const isHlsStream = url?.includes(".m3u8") && !url?.includes("/embed/");
  const isYouTube = url?.includes("youtube.com") || url?.includes("youtu.be");
  const isEmbedUrl =
    url?.includes("/embed/") ||
    url?.includes("embed.") ||
    url?.includes("/player/") ||
    url?.includes("player.") ||
    url?.includes("#player=") ||
    (url && !url.includes(".m3u8") && !url.includes(".mp4") && !isYouTube);
  const isLiveContent = contentType === "live";

  // Available options (Incluye URL 4)
  const availableOptions = [
    { num: 1 as const, url: urls.url1 },
    { num: 2 as const, url: urls.url2 },
    { num: 3 as const, url: urls.url3 },
    { num: 4 as const, url: (urls as any).url4 },
  ].filter((opt) => opt.url);

  const hasMultipleOptions = availableOptions.length > 1;

  // Reset y History
  useEffect(() => {
    if (isOpen && title && urls.url1) {
      addToHistory({
        id: urls.url1,
        title,
        url: urls.url1,
      });
    }
  }, [isOpen, title, urls.url1, addToHistory]);

  useEffect(() => {
    if (isOpen) {
      setActiveOption(1);
    }
  }, [isOpen]);

  // Handlers (Play, Mute, Seek, etc...)
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
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const togglePiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && closePlayer()}
      className="fixed inset-0 z-[9990] flex items-center justify-center animate-in fade-in duration-200"
    >
      <div className="absolute inset-0 bg-black" />

      {/* Botón Cerrar */}
      <button
        onClick={closePlayer}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-[60] w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md bg-black/60 hover:bg-red-500/80 border border-white/20 transition-all text-white shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>

      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        {/* Header */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 transition-all duration-300",
            showControls ? "opacity-100" : "opacity-0",
          )}
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
        >
          <h2 className="text-white font-display text-lg md:text-xl truncate">{title}</h2>
        </div>

        <div className="w-full h-full">
          <div className="relative w-full h-full bg-black" onMouseMove={handleMouseMove}>
            {isLoading && !loadError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}

            {loadError && !isEmbedUrl && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black">
                <p className="text-white/70">{loadError}</p>
                <button onClick={retryLoad} className="px-6 py-2 bg-primary rounded-full text-white">
                  Reintentar
                </button>
              </div>
            )}

            {isHlsStream ? (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                autoPlay
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
              />
            ) : isEmbedUrl || isYouTube || url ? (
              <iframe
                ref={iframeRef}
                src={streamUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                // SOLUCIÓN AL ERROR DE MANIFEST Y BLOQUEO
                referrerPolicy="no-referrer"
                onLoad={() => setIsLoading(false)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">Sin enlace disponible</div>
            )}
          </div>
        </div>

        {/* Opciones de Stream (BARRA INFERIOR) */}
        {hasMultipleOptions && (
          <div
            className={cn(
              "absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 transition-all duration-300",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            {availableOptions.map((opt) => (
              <button
                key={opt.num}
                onClick={() => setActiveOption(opt.num as any)}
                className={cn(
                  "h-12 px-6 rounded-full text-sm font-bold transition-all backdrop-blur-xl border-2",
                  activeOption === opt.num
                    ? "bg-white text-black border-white scale-110"
                    : "bg-black/60 text-white border-white/30 hover:bg-white/10",
                )}
              >
                Opción {opt.num}
              </button>
            ))}
          </div>
        )}

        {/* Controles del Jugador (Solo para HLS) */}
        {isHlsStream && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 p-6 transition-all duration-300",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
          >
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white">
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <div className="flex-1 h-1 bg-white/20 rounded-full">
                <div className="h-full bg-primary" style={{ width: `${(currentTime / duration) * 100}%` }} />
              </div>
              <span className="text-white text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button onClick={toggleMute} className="text-white">
                {isMuted ? <VolumeX /> : <Volume2 />}
              </button>
              <button onClick={toggleFullscreen} className="text-white">
                <Maximize2 />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
