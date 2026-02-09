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
  // Actualizado a 4 opciones para soportar el servidor Echo
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

  // Get current URL based on active option (Soporte para url4 añadido)
  const getCurrentUrl = () => {
    if (activeOption === 2 && urls.url2) return urls.url2;
    if (activeOption === 3 && urls.url3) return urls.url3;
    if (activeOption === 4 && (urls as any).url4) return (urls as any).url4;
    return urls.url1;
  };

  const url = getCurrentUrl();
  // Variable definida para el iframe
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

  // Available options (Incluyendo url4)
  const availableOptions = [
    { num: 1 as const, url: urls.url1 },
    { num: 2 as const, url: urls.url2 },
    { num: 3 as const, url: urls.url3 },
    { num: 4 as const, url: (urls as any).url4 },
  ].filter((opt) => opt.url);

  const hasMultipleOptions = availableOptions.length > 1;

  // Add to watch history
  useEffect(() => {
    if (isOpen && title && urls.url1) {
      addToHistory({
        id: urls.url1,
        title,
        url: urls.url1,
      });
    }
  }, [isOpen, title, urls.url1, addToHistory]);

  // Reset states
  useEffect(() => {
    if (isOpen) {
      setActiveOption(1);
      setShowKeyboardShortcuts(false);
      setShowQuickSettings(false);
      setShowShareMenu(false);
      setShowSleepTimer(false);
      setShowCastMenu(false);
      setShowAudioMixer(false);
      setShowQualitySelector(false);
      setShowGestureGuide(false);
    }
  }, [isOpen]);

  const handleSleepTimeout = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      const video = videoRef.current;
      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          if (video) {
            if (video.paused) {
              video.play();
              setIsPlaying(true);
            } else {
              video.pause();
              setIsPlaying(false);
            }
          }
          break;
        case "m":
          if (video) {
            video.muted = !video.muted;
            setIsMuted(!video.muted);
          }
          break;
        case "f":
          toggleFullscreen();
          break;
        case "p":
          togglePiP();
          break;
        case "t":
          setIsTheaterMode(!isTheaterMode);
          break;
        case "arrowleft":
          if (video && !isLiveContent) video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "arrowright":
          if (video && !isLiveContent) video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
        case "arrowup":
          e.preventDefault();
          if (video) {
            video.volume = Math.min(1, video.volume + 0.1);
            setVolume(video.volume);
          }
          break;
        case "arrowdown":
          e.preventDefault();
          if (video) {
            video.volume = Math.max(0, video.volume - 0.1);
            setVolume(video.volume);
          }
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          const optNum = parseInt(e.key) as 1 | 2 | 3 | 4;
          if (availableOptions.find((o) => o.num === optNum)) {
            setActiveOption(optNum);
            toast.success(`Cambiado a Opción ${optNum}`);
          }
          break;
        case "escape":
          closePlayer();
          break;
        case "?":
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
      }
    },
    [isOpen, isTheaterMode, isLiveContent, duration, availableOptions, showKeyboardShortcuts, closePlayer],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handlePiPChange = () => setIsPiP(document.pictureInPictureElement === videoRef.current);
    document.addEventListener("enterpictureinpicture", handlePiPChange);
    document.addEventListener("leavepictureinpicture", handlePiPChange);
    return () => {
      document.removeEventListener("enterpictureinpicture", handlePiPChange);
      document.removeEventListener("leavepictureinpicture", handlePiPChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setIsPlaying(true);
    setLoadError(null);
    fatalErrorCount.current = 0;

    if (isEmbedUrl || isYouTube) {
      if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
      loadingWatchdog.current = setTimeout(() => {
        setIsLoading(false);
        setLoadError(null);
        if (iframeRef.current) iframeRef.current.focus();
      }, 2000);
      return () => {
        if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
      };
    }

    if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
    loadingWatchdog.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) {
        setIsLoading(false);
        return;
      }
      const isWorking = video.readyState >= 1 || !video.paused || video.currentTime > 0 || video.buffered.length > 0;
      if (isWorking) {
        setIsLoading(false);
        setLoadError(null);
        return;
      }
      setIsLoading(false);
    }, 15000);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
    };
  }, [isOpen, url, activeOption, isEmbedUrl, isYouTube]);

  useEffect(() => {
    if (!isOpen || !isHlsStream || !videoRef.current || !url) return;
    const video = videoRef.current;
    let cancelled = false;

    const getProxiedUrl = (streamUrl: string) => {
      if (streamUrl.includes("token=") || streamUrl.includes("ip=")) return streamUrl;
      if (!streamUrl.includes(window.location.hostname) && !streamUrl.includes("supabase.co")) {
        return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
      }
      return streamUrl;
    };

    const proxiedStreamUrl = getProxiedUrl(url);

    if (Hls.isSupported()) {
      const boot = async () => {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (cancelled) return;
        const hls = new Hls({
          enableWorker: true,
          xhrSetup: (xhr, requestUrl) => {
            xhr.withCredentials = false;
            if (accessToken && typeof requestUrl === "string" && requestUrl.includes("/functions/v1/stream-proxy")) {
              xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
              xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
            }
          },
        });
        hlsRef.current = hls;
        hls.loadSource(proxiedStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(() => {});
        });
      };
      boot().catch(() => setIsLoading(false));
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = proxiedStreamUrl;
      video.addEventListener("loadedmetadata", () => setIsLoading(false));
    }
    return () => {
      cancelled = true;
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [isOpen, isHlsStream, url]);

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
  const seek = (s: number) => {
    if (videoRef.current && !isLiveContent) videoRef.current.currentTime += s;
  };
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };
  const handleSeekBar = (e: any) => {
    if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
  };
  const handleVolumeChange = (e: any) => {
    const v = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setVolume(v);
      setIsMuted(v === 0);
    }
  };
  const handleSpeedChange = (s: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = s;
      setPlaybackSpeed(s);
    }
  };
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
  };

  const togglePiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) await videoRef.current.requestPictureInPicture();
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

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && closePlayer()}
      className="fixed inset-0 z-[9990] flex items-center justify-center animate-in fade-in duration-200"
    >
      <div className="absolute inset-0 bg-black" />
      {ambientEnabled && ambientMode.colors && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] blur-[250px] opacity-30 transition-all duration-1000"
            style={{ background: `radial-gradient(ellipse, ${ambientMode.colors.dominant}, transparent 60%)` }}
          />
        </div>
      )}
      <button
        onClick={closePlayer}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-[60] w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md bg-black/60 hover:bg-red-500/80 border border-white/20 text-white shadow-lg transition-all"
      >
        <X className="w-5 h-5" />
      </button>

      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        <div
          className={cn(
            "absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 pr-20 transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          )}
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isLiveContent && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/30 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">EN VIVO</span>
              </div>
            )}
            <h2 className="font-display text-base md:text-xl text-white truncate drop-shadow-lg">
              {title || "Reproductor"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAmbientEnabled(!ambientEnabled)}
              className={cn(
                "hidden sm:flex w-10 h-10 rounded-full items-center justify-center transition-all",
                ambientEnabled ? "bg-accent/30 text-accent" : "bg-white/10 text-white/70",
              )}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={cn(
                "hidden sm:flex w-10 h-10 rounded-full items-center justify-center transition-all",
                isTheaterMode ? "bg-primary/30 text-primary" : "bg-white/10 text-white/70",
              )}
            >
              <MonitorPlay className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-full h-full">
          <div className="relative w-full h-full overflow-hidden bg-black group" onMouseMove={handleMouseMove}>
            <StreamStats
              isVisible={showStats}
              quality={streamStats.quality}
              bitrate={streamStats.bitrate}
              buffered={streamStats.buffered}
            />
            <KeyboardShortcuts isOpen={showKeyboardShortcuts} onClose={() => setShowKeyboardShortcuts(false)} />

            {isLoading && !loadError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="text-center mt-5">
                  <h3 className="text-white/80 tracking-wider truncate max-w-[260px]">{title || "Cargando..."}</h3>
                  <span className="text-sm text-white/40">Conectando</span>
                </div>
              </div>
            )}

            {loadError && !isEmbedUrl && !isYouTube && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20 p-6">
                <p className="text-white/80 font-medium">No se pudo cargar el stream</p>
                <div className="flex gap-3">
                  <button onClick={retryLoad} className="px-4 py-2 rounded-xl bg-white/10 text-white">
                    Reintentar
                  </button>
                  {hasMultipleOptions && activeOption < availableOptions.length && (
                    <button
                      onClick={() => setActiveOption((activeOption + 1) as any)}
                      className="px-4 py-2 rounded-xl bg-primary/20 text-primary"
                    >
                      Probar Opción {activeOption + 1}
                    </button>
                  )}
                </div>
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
                  onTimeUpdate={handleTimeUpdate}
                />
                {subtitlesEnabled && currentSubtitle && (
                  <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-30">
                    <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-lg max-w-[80%] border border-white/10">
                      <p className="text-white text-lg md:text-xl font-medium text-center">{currentSubtitle}</p>
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-16 pt-20 transition-all duration-300",
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none",
                  )}
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)" }}
                >
                  {!isLiveContent && duration > 0 && (
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-xs text-white/70 w-12 tabular-nums font-mono">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1 relative h-1.5 group/progress">
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          value={currentTime}
                          onChange={handleSeekBar}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="h-1 bg-white/20 rounded-full overflow-hidden transition-all">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-white/70 w-12 text-right tabular-nums font-mono">
                        {formatTime(duration)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(-10)}
                          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white"
                        >
                          <Rewind className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 text-white"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </button>
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(10)}
                          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white"
                        >
                          <FastForward className="w-5 h-5" />
                        </button>
                      )}
                      <div className="flex items-center gap-2 group/volume ml-2">
                        <button
                          onClick={toggleMute}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-0 group-hover/volume:w-24 h-1 bg-white/30 rounded-full appearance-none transition-all"
                        />
                      </div>
                      <button
                        onClick={toggleSubtitles}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          subtitlesEnabled ? "bg-white/30 text-white" : "bg-white/10 text-white/70",
                        )}
                      >
                        <Subtitles className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowQualitySelector(!showQualitySelector)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white"
                        >
                          <Signal className="w-4 h-4" />
                        </button>
                        <QualitySelector
                          isOpen={showQualitySelector}
                          onClose={() => setShowQualitySelector(false)}
                          currentQuality={currentQuality}
                          availableQualities={availableQualities}
                          onSelectQuality={(q) => {
                            setCurrentQuality(q);
                            toast.success(`Calidad: ${q}`);
                          }}
                        />
                      </div>
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowAudioMixer(!showAudioMixer)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white"
                        >
                          <Music className="w-4 h-4" />
                        </button>
                        <AudioMixer isOpen={showAudioMixer} onClose={() => setShowAudioMixer(false)} />
                      </div>
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowSleepTimer(!showSleepTimer)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            sleepTimer.isActive ? "bg-purple-500/40" : "bg-white/10",
                          )}
                        >
                          <Moon className="w-4 h-4" />
                        </button>
                        <SleepTimerMenu
                          isOpen={showSleepTimer}
                          onClose={() => setShowSleepTimer(false)}
                          isActive={sleepTimer.isActive}
                          remainingTime={sleepTimer.remainingTime}
                          formatTime={sleepTimer.formatTime}
                          onSetTimer={(mins) => sleepTimer.startTimer(mins, handleSleepTimeout)}
                          onCancelTimer={sleepTimer.cancelTimer}
                        />
                      </div>
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowCastMenu(!showCastMenu)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white"
                        >
                          <Cast className="w-4 h-4" />
                        </button>
                        <CastMenu isOpen={showCastMenu} onClose={() => setShowCastMenu(false)} />
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setShowShareMenu(!showShareMenu)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <ShareMenu title={title || ""} isOpen={showShareMenu} onClose={() => setShowShareMenu(false)} />
                      </div>
                      <button
                        onClick={() => setShowStats(!showStats)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          showStats ? "bg-white/30" : "bg-white/10",
                        )}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={togglePiP}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          isPiP ? "bg-white/30" : "bg-white/10",
                        )}
                      >
                        <PictureInPicture2 className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowQuickSettings(!showQuickSettings)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            showQuickSettings ? "bg-white/30" : "bg-white/10",
                          )}
                        >
                          <Settings
                            className={cn("w-4 h-4 text-white transition-transform", showQuickSettings && "rotate-90")}
                          />
                        </button>
                        <QuickSettings
                          isOpen={showQuickSettings}
                          onClose={() => setShowQuickSettings(false)}
                          isMuted={isMuted}
                          onToggleMute={toggleMute}
                          isFullscreen={isFullscreen}
                          onToggleFullscreen={toggleFullscreen}
                          isPiP={isPiP}
                          onTogglePiP={togglePiP}
                          isTheaterMode={isTheaterMode}
                          onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
                          showStats={showStats}
                          onToggleStats={() => setShowStats(!showStats)}
                          playbackSpeed={playbackSpeed}
                          onSpeedChange={handleSpeedChange}
                          onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
                          onShowShare={() => setShowShareMenu(true)}
                        />
                      </div>
                      <button
                        onClick={toggleFullscreen}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white"
                      >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : isEmbedUrl || isYouTube || url ? (
              <iframe
                ref={iframeRef}
                src={streamUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                // ATRIBUTO CRÍTICO PARA EVITAR BLOQUEOS
                referrerPolicy="no-referrer"
                onLoad={handleIframeLoad}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Play className="w-10 h-10 text-white/20" />
                <span className="text-sm text-white/40">Sin enlace disponible</span>
              </div>
            )}
          </div>
        </div>

        {hasMultipleOptions && (
          <div
            className={cn(
              "absolute bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 transition-all",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            {availableOptions.map((opt) => (
              <button
                key={opt.num}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveOption(opt.num as any);
                }}
                className={cn(
                  "h-14 px-8 rounded-full text-base font-bold transition-all border-2 backdrop-blur-xl",
                  activeOption === opt.num
                    ? "bg-white text-black border-white scale-110"
                    : "bg-black/90 text-white border-white/50",
                )}
              >
                Opción {opt.num}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-40 px-4 md:px-6 py-3 transition-all",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden sm:inline">{isLiveContent ? "En tiempo real" : "Conectado"}</span>
            </div>
            <div className="flex items-center gap-3">
              {streamStats.quality !== "Auto" && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium text-white/70">
                  {streamStats.quality}
                </span>
              )}
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/50"
              >
                <Keyboard className="w-3.5 h-3.5" /> <span className="text-xs">Atajos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
