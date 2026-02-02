import { useEffect, useRef, useState, useCallback } from "react";
import { 
  X, Loader2, Maximize2, Minimize2, Volume2, VolumeX, Play, Pause, 
  Rewind, FastForward, Subtitles, Settings, Share2, PictureInPicture2,
  MonitorPlay, Keyboard, BarChart3, Moon, Cast, Music, Smartphone, Signal
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
  const [activeOption, setActiveOption] = useState<1 | 2 | 3>(1);
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

  // Get current URL based on active option
  const getCurrentUrl = () => {
    if (activeOption === 2 && urls.url2) return urls.url2;
    if (activeOption === 3 && urls.url3) return urls.url3;
    return urls.url1;
  };

  const url = getCurrentUrl();
  const isHlsStream = url?.includes(".m3u8");
  const isYouTube = url?.includes("youtube.com") || url?.includes("youtu.be");
  const isLiveContent = contentType === "live";

  // Available options
  const availableOptions = [
    { num: 1 as const, url: urls.url1 },
    { num: 2 as const, url: urls.url2 },
    { num: 3 as const, url: urls.url3 },
  ].filter(opt => opt.url);

  const hasMultipleOptions = availableOptions.length > 1;

  // Add to watch history when opening
  useEffect(() => {
    if (isOpen && title && urls.url1) {
      addToHistory({
        id: urls.url1,
        title,
        url: urls.url1,
      });
    }
  }, [isOpen, title, urls.url1, addToHistory]);

  // Reset states when modal opens
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

  // Handle sleep timer timeout
  const handleSleepTimeout = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
        if (video && !isLiveContent) {
          video.currentTime = Math.max(0, video.currentTime - 10);
        }
        break;
      case "arrowright":
        if (video && !isLiveContent) {
          video.currentTime = Math.min(duration, video.currentTime + 10);
        }
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
        const optNum = parseInt(e.key) as 1 | 2 | 3;
        if (availableOptions.find(o => o.num === optNum)) {
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
  }, [isOpen, isTheaterMode, isLiveContent, duration, availableOptions, showKeyboardShortcuts, closePlayer]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // PiP change detection
  useEffect(() => {
    const handlePiPChange = () => {
      setIsPiP(document.pictureInPictureElement === videoRef.current);
    };
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

    if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
    loadingWatchdog.current = setTimeout(() => {
      // Only show error if video is not playing and has no data
      const video = videoRef.current;
      const hasVideoData = video && video.readyState >= 2; // HAVE_CURRENT_DATA or higher
      const isVideoPlaying = video && !video.paused && video.currentTime > 0;
      
      if (!hasVideoData && !isVideoPlaying) {
        setIsLoading(false);
        setLoadError(
          "No se pudo conectar al stream. El servidor puede estar bloqueando CORS o el enlace/token expiró."
        );
      } else {
        // Video is actually playing, just stop loading indicator
        setIsLoading(false);
        setLoadError(null);
      }
    }, 15000);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (loadingWatchdog.current) {
        clearTimeout(loadingWatchdog.current);
        loadingWatchdog.current = undefined;
      }
    };
  }, [isOpen, url, activeOption]);

  useEffect(() => {
    if (!isOpen || !isHlsStream || !videoRef.current || !url) return;

    const video = videoRef.current;
    let cancelled = false;

    const getProxiedUrl = (streamUrl: string) => {
      const hasIpToken = streamUrl.includes("token=") || streamUrl.includes("ip=");
      if (hasIpToken) {
        return streamUrl;
      }
      
      const isExternalStream = !streamUrl.includes(window.location.hostname) && 
                               !streamUrl.includes("supabase.co");
      if (isExternalStream) {
        return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
      }
      return streamUrl;
    };

    const streamUrl = getProxiedUrl(url);

    if (Hls.isSupported()) {
      const boot = async () => {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (cancelled) return;

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          xhrSetup: (xhr, requestUrl) => {
            xhr.withCredentials = false;
            if (
              accessToken &&
              typeof requestUrl === "string" &&
              requestUrl.includes("/functions/v1/stream-proxy")
            ) {
              xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
              xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
            }
          },
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

        const stopLoading = () => {
          if (loadingWatchdog.current) {
            clearTimeout(loadingWatchdog.current);
            loadingWatchdog.current = undefined;
          }
          setIsLoading(false);
        };

        const fail = (message: string) => {
          stopLoading();
          setLoadError(message);
        };

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          setLoadError(null);
          stopLoading();
          video.play().catch(() => {});
          
          // Update quality info
          if (data.levels && data.levels.length > 0) {
            const level = data.levels[hls.currentLevel] || data.levels[0];
            setStreamStats(prev => ({
              ...prev,
              quality: level.height ? `${level.height}p` : "Auto",
              bitrate: level.bitrate || 0
            }));
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          setLoadError(null);
          stopLoading();
        });
        
        // Also clear error when video starts playing
        video.addEventListener('playing', () => {
          setLoadError(null);
          stopLoading();
        });
        
        video.addEventListener('canplay', () => {
          setLoadError(null);
          stopLoading();
        });

        // Track buffer and bitrate
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (video.buffered.length > 0) {
            const buffered = video.buffered.end(video.buffered.length - 1) - video.currentTime;
            setStreamStats(prev => ({ ...prev, buffered }));
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) {
            setStreamStats(prev => ({
              ...prev,
              quality: level.height ? `${level.height}p` : "Auto",
              bitrate: level.bitrate || 0
            }));
          }
        });

        hls.on(Hls.Events.ERROR, (_, err) => {
          if (!err.fatal) return;

          fatalErrorCount.current += 1;

          const attempts = fatalErrorCount.current;
          if (attempts <= 1) {
            if (err.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
              return;
            }
            if (err.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              return;
            }
          }

          fail(`No se pudo cargar el stream (${err.type}).`);
        });
      };

      boot().catch(() => {
        setIsLoading(false);
        setLoadError("No se pudo iniciar el reproductor HLS.");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      const onLoaded = () => {
        if (loadingWatchdog.current) {
          clearTimeout(loadingWatchdog.current);
          loadingWatchdog.current = undefined;
        }
        setLoadError(null);
        setIsLoading(false);
        video.play().catch(() => {});
      };
      const onError = () => {
        if (loadingWatchdog.current) {
          clearTimeout(loadingWatchdog.current);
          loadingWatchdog.current = undefined;
        }
        setIsLoading(false);
        setLoadError("No se pudo cargar el stream.");
      };

      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);

      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
      };
    }

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, isHlsStream, url, isLoading]);

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      toast.success(`Velocidad: ${speed}x`);
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
    const container = containerRef.current;
    
    if (!video && !container) return;

    const isCurrentlyFullscreen = !!document.fullscreenElement;

    if (isCurrentlyFullscreen) {
      document.exitFullscreen?.();
      return;
    }

    // iOS Safari
    if ((video as any)?.webkitEnterFullscreen) {
      try {
        (video as any).webkitEnterFullscreen();
        return;
      } catch {}
    }

    // Standard
    if (container?.requestFullscreen) {
      container.requestFullscreen();
    } else if ((container as any)?.webkitRequestFullscreen) {
      (container as any).webkitRequestFullscreen();
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        toast.success("Picture-in-Picture activado");
      }
    } catch (err) {
      toast.error("PiP no disponible en este navegador");
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const retryLoad = () => {
    setLoadError(null);
    setIsLoading(true);
    fatalErrorCount.current = 0;
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && closePlayer()}
      className={cn(
        "fixed inset-0 z-[9990] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200",
        isTheaterMode ? "p-0" : "p-4"
      )}
    >
      <div 
        ref={containerRef}
        className={cn(
          "rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-2xl overflow-hidden transition-all duration-500",
          isTheaterMode 
            ? "w-full h-full rounded-none" 
            : "w-[min(1200px,96vw)]"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl transition-all",
          isTheaterMode && "absolute top-0 left-0 right-0 z-50 opacity-0 hover:opacity-100"
        )}>
          <div className="flex items-center gap-3">
            {isLiveContent && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/20 border border-destructive/30">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-bold text-destructive uppercase">LIVE</span>
              </div>
            )}
            <h2 className="font-display text-lg tracking-wider text-white/90 truncate max-w-[300px] sm:max-w-none">
              {title || "Reproductor"}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theater mode toggle */}
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200",
                isTheaterMode 
                  ? "bg-primary/20 border-primary/40 text-primary" 
                  : "bg-white/[0.05] border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
              )}
              title="Modo Teatro (T)"
            >
              <MonitorPlay className="w-4 h-4" />
            </button>
            
            {/* Close button */}
            <button
              onClick={closePlayer}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/[0.05] hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
            >
              <X className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Player */}
        <div className={cn("p-4", isTheaterMode && "p-0 h-full")}>
          <div
            className={cn(
              "relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black aspect-video group",
              isTheaterMode && "rounded-none border-0 h-full aspect-auto"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Stream stats overlay */}
            <StreamStats 
              isVisible={showStats}
              quality={streamStats.quality}
              bitrate={streamStats.bitrate}
              buffered={streamStats.buffered}
            />

            {/* Keyboard shortcuts modal */}
            <KeyboardShortcuts 
              isOpen={showKeyboardShortcuts} 
              onClose={() => setShowKeyboardShortcuts(false)} 
            />

            {/* Loading overlay */}
            {isLoading && !loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-radial from-primary/10 via-black/80 to-black z-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                </div>
                <span className="text-sm text-white/60 font-medium">Conectando al stream…</span>
                <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-white/40">
                  Presiona ? para atajos
                </kbd>
              </div>
            )}

            {/* Error overlay */}
            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-radial from-primary/10 via-black/85 to-black z-20 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                  <X className="w-8 h-8 text-white/50" />
                </div>
                <div className="max-w-[560px]">
                  <p className="text-white/80 font-medium">No se pudo cargar el stream</p>
                  <p className="text-sm text-white/60 mt-2">{loadError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={retryLoad}
                    className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200 text-sm text-white"
                  >
                    Reintentar
                  </button>
                  {hasMultipleOptions && activeOption < 3 && (
                    <button
                      onClick={() => setActiveOption((activeOption + 1) as 1 | 2 | 3)}
                      className="h-11 px-4 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 transition-all duration-200 text-sm text-primary"
                    >
                      Probar Opción {activeOption + 1}
                    </button>
                  )}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200 text-sm text-white inline-flex items-center"
                    >
                      Abrir enlace
                    </a>
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
                  crossOrigin="anonymous"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                />

                {/* AI Subtitles Overlay */}
                {subtitlesEnabled && currentSubtitle && (
                  <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-30">
                    <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-lg max-w-[80%] border border-white/10">
                      <p className="text-white text-lg md:text-xl font-medium text-center leading-relaxed">
                        {currentSubtitle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Subtitle processing indicator */}
                {subtitlesEnabled && subtitlesProcessing && !currentSubtitle && (
                  <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-30">
                    <div className="bg-black/60 px-4 py-2 rounded-lg flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-white/60 text-sm">Procesando audio...</span>
                    </div>
                  </div>
                )}

                {/* Custom controls */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300",
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  {/* Progress bar for movies/series */}
                  {!isLiveContent && duration > 0 && (
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-xs text-white/60 w-14 tabular-nums">{formatTime(currentTime)}</span>
                      <div className="flex-1 relative h-1 group/progress">
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          value={currentTime}
                          onChange={handleSeekBar}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          />
                        </div>
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                          style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                        />
                      </div>
                      <span className="text-xs text-white/60 w-14 text-right tabular-nums">{formatTime(duration)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    {/* Left controls */}
                    <div className="flex items-center gap-2">
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(-10)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                        >
                          <Rewind className="w-4 h-4 text-white" />
                        </button>
                      )}
                      <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(10)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                        >
                          <FastForward className="w-4 h-4 text-white" />
                        </button>
                      )}
                      
                      {/* Volume control */}
                      <div className="flex items-center gap-2 group/volume">
                        <button
                          onClick={toggleMute}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-4 h-4 text-white" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-white" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-0 group-hover/volume:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer transition-all duration-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                      </div>
                      
                      {/* Subtitles */}
                      <button
                        onClick={toggleSubtitles}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                          subtitlesEnabled
                            ? "bg-primary/30 border-primary/50 hover:bg-primary/40"
                            : "bg-white/10 border-white/10 hover:bg-white/20"
                        )}
                        title="Subtítulos IA"
                      >
                        <Subtitles className={cn("w-4 h-4", subtitlesEnabled ? "text-primary" : "text-white")} />
                      </button>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-1.5">
                      {/* Live badge */}
                      {isLiveContent && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/20 border border-destructive/30 mr-2">
                          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                          <span className="text-xs font-bold text-destructive uppercase tracking-wider">En vivo</span>
                        </div>
                      )}

                      {/* Speed indicator */}
                      {playbackSpeed !== 1 && (
                        <div className="px-2 py-1 rounded-lg bg-primary/20 border border-primary/30 text-xs font-bold text-primary">
                          {playbackSpeed}x
                        </div>
                      )}

                      {/* Sleep timer indicator */}
                      {sleepTimer.isActive && sleepTimer.remainingTime && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30">
                          <Moon className="w-3 h-3 text-purple-400" />
                          <span className="text-xs font-mono text-purple-400">{sleepTimer.formatTime(sleepTimer.remainingTime)}</span>
                        </div>
                      )}

                      {/* Quality selector */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowQualitySelector(!showQualitySelector)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                          title="Calidad"
                        >
                          <Signal className="w-4 h-4 text-white" />
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

                      {/* Audio mixer */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowAudioMixer(!showAudioMixer)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                          title="Audio"
                        >
                          <Music className="w-4 h-4 text-white" />
                        </button>
                        <AudioMixer isOpen={showAudioMixer} onClose={() => setShowAudioMixer(false)} />
                      </div>

                      {/* Sleep timer */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowSleepTimer(!showSleepTimer)}
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                            sleepTimer.isActive
                              ? "bg-purple-500/30 border-purple-500/50"
                              : "bg-white/10 border-white/10 hover:bg-white/20"
                          )}
                          title="Temporizador de sueño"
                        >
                          <Moon className={cn("w-4 h-4", sleepTimer.isActive ? "text-purple-400" : "text-white")} />
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

                      {/* Cast */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowCastMenu(!showCastMenu)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                          title="Transmitir"
                        >
                          <Cast className="w-4 h-4 text-white" />
                        </button>
                        <CastMenu isOpen={showCastMenu} onClose={() => setShowCastMenu(false)} />
                      </div>

                      {/* Share button */}
                      <div className="relative">
                        <button
                          onClick={() => setShowShareMenu(!showShareMenu)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                        >
                          <Share2 className="w-4 h-4 text-white" />
                        </button>
                        <ShareMenu 
                          title={title || ""} 
                          isOpen={showShareMenu} 
                          onClose={() => setShowShareMenu(false)} 
                        />
                      </div>

                      {/* Stats toggle */}
                      <button
                        onClick={() => setShowStats(!showStats)}
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                          showStats
                            ? "bg-primary/30 border-primary/50"
                            : "bg-white/10 border-white/10 hover:bg-white/20"
                        )}
                      >
                        <BarChart3 className={cn("w-4 h-4", showStats ? "text-primary" : "text-white")} />
                      </button>

                      {/* PiP */}
                      <button
                        onClick={togglePiP}
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                          isPiP
                            ? "bg-primary/30 border-primary/50"
                            : "bg-white/10 border-white/10 hover:bg-white/20"
                        )}
                        title="Picture-in-Picture (P)"
                      >
                        <PictureInPicture2 className={cn("w-4 h-4", isPiP ? "text-primary" : "text-white")} />
                      </button>

                      {/* Settings */}
                      <div className="relative">
                        <button
                          onClick={() => setShowQuickSettings(!showQuickSettings)}
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                            showQuickSettings
                              ? "bg-white/20 border-white/20"
                              : "bg-white/10 border-white/10 hover:bg-white/20"
                          )}
                        >
                          <Settings className={cn("w-4 h-4 text-white transition-transform", showQuickSettings && "rotate-90")} />
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

                      {/* Fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                        title="Pantalla completa (F)"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="w-4 h-4 text-white" />
                        ) : (
                          <Maximize2 className="w-4 h-4 text-white" />
                        )}
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

        {/* Footer with stream options */}
        {!isTheaterMode && (
          <div className="px-5 py-3 border-t border-white/[0.06] bg-black/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {hasMultipleOptions ? (
                <div className="flex items-center gap-1.5">
                  {availableOptions.map((opt) => (
                    <button
                      key={opt.num}
                      onClick={() => setActiveOption(opt.num)}
                      className={cn(
                        "h-9 px-4 rounded-xl text-xs font-medium transition-all duration-200",
                        activeOption === opt.num
                          ? "bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/25"
                          : "bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/10"
                      )}
                    >
                      Opción {opt.num}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-white/40">
                  {isLiveContent ? "Stream en tiempo real" : "Reproduciendo"}
                </span>
              )}

              {/* Keyboard shortcut hint */}
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5 text-white/40" />
                <span className="text-xs text-white/40">?</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-white/40">
              {streamStats.quality !== "Auto" && (
                <span className="px-2 py-1 rounded bg-white/10 font-medium text-white/60">
                  {streamStats.quality}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Conectado
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
