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

  // Detect URL type - embed URLs should use iframe, HLS uses video player
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

  // Available options
  const availableOptions = [
    { num: 1 as const, url: urls.url1 },
    { num: 2 as const, url: urls.url2 },
    { num: 3 as const, url: urls.url3 },
  ].filter((opt) => opt.url);

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

    // For embed/iframe content, just set loading to false after a short delay
    // Don't show any error messages for iframe content since we can't detect errors
    if (isEmbedUrl || isYouTube) {
      if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
      // Short timeout just for loading indicator, no error messages for iframes
      loadingWatchdog.current = setTimeout(() => {
        setIsLoading(false);
        // Never show error for iframe content - we can't detect if it's working
        setLoadError(null);

        // Try to autoplay iframe content by focusing on it
        if (iframeRef.current) {
          iframeRef.current.focus();
        }
      }, 2000);
      return () => {
        if (loadingWatchdog.current) {
          clearTimeout(loadingWatchdog.current);
          loadingWatchdog.current = undefined;
        }
      };
    }

    // For HLS streams, use watchdog but be very careful about false positives
    if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
    loadingWatchdog.current = setTimeout(() => {
      // Only show error if video element exists and has definitively failed
      const video = videoRef.current;
      if (!video) {
        setIsLoading(false);
        return;
      }

      // Check multiple conditions - don't show error if any sign of playback
      const hasVideoData = video.readyState >= 1;
      const isVideoPlaying = !video.paused;
      const hasCurrentTime = video.currentTime > 0;
      const hasBuffered = video.buffered.length > 0;

      // If ANY indication that video is working, don't show error
      if (hasVideoData || isVideoPlaying || hasCurrentTime || hasBuffered) {
        setIsLoading(false);
        setLoadError(null);
        return;
      }

      // Only show error if absolutely nothing is working after 15 seconds
      setIsLoading(false);
      // Don't set error - let the player try to recover
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
  }, [isOpen, url, activeOption, isEmbedUrl, isYouTube]);

  useEffect(() => {
    if (!isOpen || !isHlsStream || !videoRef.current || !url) return;

    const video = videoRef.current;
    let cancelled = false;

    const getProxiedUrl = (streamUrl: string) => {
      const hasIpToken = streamUrl.includes("token=") || streamUrl.includes("ip=");
      if (hasIpToken) {
        return streamUrl;
      }

      const isExternalStream = !streamUrl.includes(window.location.hostname) && !streamUrl.includes("supabase.co");
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
            if (accessToken && typeof requestUrl === "string" && requestUrl.includes("/functions/v1/stream-proxy")) {
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
            setStreamStats((prev) => ({
              ...prev,
              quality: level.height ? `${level.height}p` : "Auto",
              bitrate: level.bitrate || 0,
            }));
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          setLoadError(null);
          stopLoading();
        });

        // Also clear error when video starts playing
        video.addEventListener("playing", () => {
          setLoadError(null);
          stopLoading();
        });

        video.addEventListener("canplay", () => {
          setLoadError(null);
          stopLoading();
        });

        // Track buffer and bitrate
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (video.buffered.length > 0) {
            const buffered = video.buffered.end(video.buffered.length - 1) - video.currentTime;
            setStreamStats((prev) => ({ ...prev, buffered }));
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) {
            setStreamStats((prev) => ({
              ...prev,
              quality: level.height ? `${level.height}p` : "Auto",
              bitrate: level.bitrate || 0,
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
    // Handle YouTube URLs
    const ytMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&showinfo=0&playsinline=1`;
    }
    // For other embed URLs, add autoplay parameter if not present
    try {
      const urlObj = new URL(rawUrl);
      // Add multiple autoplay parameters to maximize compatibility
      if (!urlObj.searchParams.has("autoplay")) {
        urlObj.searchParams.set("autoplay", "1");
      }
      if (!urlObj.searchParams.has("auto_play")) {
        urlObj.searchParams.set("auto_play", "true");
      }
      if (!urlObj.searchParams.has("muted")) {
        urlObj.searchParams.set("muted", "0");
      }
      if (!urlObj.searchParams.has("playsinline")) {
        urlObj.searchParams.set("playsinline", "1");
      }
      // Disable ads where possible
      if (!urlObj.searchParams.has("ads")) {
        urlObj.searchParams.set("ads", "0");
      }
      return urlObj.toString();
    } catch {
      // If URL parsing fails, add params manually
      const separator = rawUrl.includes("?") ? "&" : "?";
      return `${rawUrl}${separator}autoplay=1&auto_play=true&playsinline=1`;
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(null);
  };

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
      className="fixed inset-0 z-[9990] flex items-center justify-center animate-in fade-in duration-200"
    >
      {/* Ultra-premium seamless backdrop */}
      <div className="absolute inset-0 bg-black" />

      {/* Subtle ambient glow effect */}
      {ambientEnabled && ambientMode.colors && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] blur-[250px] opacity-30 transition-all duration-1000"
            style={{ background: `radial-gradient(ellipse, ${ambientMode.colors.dominant}, transparent 60%)` }}
          />
        </div>
      )}

      {/* Always visible close button - top right corner */}
      <button
        onClick={closePlayer}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-[60] w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md bg-black/60 hover:bg-red-500/80 border border-white/20 hover:border-red-500/50 transition-all duration-200 text-white/90 hover:text-white shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>

      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        {/* Floating Header - Overlays video */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 pr-20 md:pr-24 transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
          )}
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isLiveContent && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/30 backdrop-blur-sm shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">EN VIVO</span>
              </div>
            )}
            <h2 className="font-display text-base md:text-xl tracking-wide text-white truncate drop-shadow-lg">
              {title || "Reproductor"}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Ambient mode toggle */}
            <button
              onClick={() => setAmbientEnabled(!ambientEnabled)}
              className={cn(
                "hidden sm:flex w-10 h-10 rounded-full items-center justify-center backdrop-blur-md transition-all duration-200",
                ambientEnabled
                  ? "bg-accent/30 text-accent"
                  : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white",
              )}
              title="Modo Ambiente"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* Theater mode toggle */}
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={cn(
                "hidden sm:flex w-10 h-10 rounded-full items-center justify-center backdrop-blur-md transition-all duration-200",
                isTheaterMode
                  ? "bg-primary/30 text-primary"
                  : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white",
              )}
              title="Modo Teatro (T)"
            >
              <MonitorPlay className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player Container - Full screen, no padding, no borders */}
        <div className="w-full h-full">
          <div
            className="relative w-full h-full overflow-hidden bg-black group"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
            onTouchStart={() => setShowControls(true)}
          >
            {/* Stream stats overlay */}
            <StreamStats
              isVisible={showStats}
              quality={streamStats.quality}
              bitrate={streamStats.bitrate}
              buffered={streamStats.buffered}
            />

            {/* Keyboard shortcuts modal */}
            <KeyboardShortcuts isOpen={showKeyboardShortcuts} onClose={() => setShowKeyboardShortcuts(false)} />

            {/* Premium Loading Overlay */}
            {isLoading && !loadError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
                {/* Animated background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/15 via-purple-600/10 to-accent/15 blur-[150px] animate-pulse" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-5">
                  {/* Premium loader */}
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                    {/* Orbiting dot */}
                    <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-base font-display tracking-wider text-white/80 max-w-[260px] truncate">
                      {title || "Cargando..."}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-sm text-white/40">Conectando</span>
                    </div>
                  </div>

                  <kbd className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/30">
                    Presiona <span className="font-mono text-white/50">?</span> para atajos
                  </kbd>
                </div>
              </div>
            )}

            {/* Error overlay - Never show for embed/iframe content */}
            {loadError && !isEmbedUrl && !isYouTube && (
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

                {/* Custom controls - Premium borderless design */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-16 pt-20 transition-all duration-300",
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none",
                  )}
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)",
                  }}
                >
                  {/* Progress bar for movies/series */}
                  {!isLiveContent && duration > 0 && (
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-xs text-white/70 w-12 tabular-nums font-mono">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1 relative h-1.5 group/progress cursor-pointer">
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          value={currentTime}
                          onChange={handleSeekBar}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="h-1 group-hover/progress:h-1.5 bg-white/20 rounded-full overflow-hidden transition-all">
                          <div
                            className="h-full bg-white rounded-full transition-all"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          />
                        </div>
                        <div
                          className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-all scale-0 group-hover/progress:scale-100"
                          style={{ left: `${(currentTime / duration) * 100}%`, transform: "translate(-50%, -50%)" }}
                        />
                      </div>
                      <span className="text-xs text-white/70 w-12 text-right tabular-nums font-mono">
                        {formatTime(duration)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    {/* Left controls */}
                    <div className="flex items-center gap-2">
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(-10)}
                          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                        >
                          <Rewind className="w-5 h-5 text-white" />
                        </button>
                      )}
                      <button
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white ml-0.5" />
                        )}
                      </button>
                      {!isLiveContent && (
                        <button
                          onClick={() => seek(10)}
                          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                        >
                          <FastForward className="w-5 h-5 text-white" />
                        </button>
                      )}

                      {/* Volume control */}
                      <div className="flex items-center gap-2 group/volume ml-2">
                        <button
                          onClick={toggleMute}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-5 h-5 text-white" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-white" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-0 group-hover/volume:w-24 h-1 bg-white/30 rounded-full appearance-none cursor-pointer transition-all duration-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                      </div>

                      {/* Subtitles */}
                      <button
                        onClick={toggleSubtitles}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
                          subtitlesEnabled
                            ? "bg-white/30 text-white"
                            : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white",
                        )}
                        title="Subtítulos IA"
                      >
                        <Subtitles className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Center badges */}
                    <div className="flex items-center gap-2">
                      {/* Live badge */}
                      {isLiveContent && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/30 backdrop-blur-md">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">En vivo</span>
                        </div>
                      )}

                      {/* Speed indicator */}
                      {playbackSpeed !== 1 && (
                        <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white">
                          {playbackSpeed}x
                        </div>
                      )}

                      {/* Sleep timer indicator */}
                      {sleepTimer.isActive && sleepTimer.remainingTime && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/30 backdrop-blur-md">
                          <Moon className="w-3.5 h-3.5 text-white" />
                          <span className="text-xs font-mono text-white">
                            {sleepTimer.formatTime(sleepTimer.remainingTime)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-1.5">
                      {/* Quality selector */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowQualitySelector(!showQualitySelector)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
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
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
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
                            "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
                            sleepTimer.isActive
                              ? "bg-purple-500/40 text-white"
                              : "bg-white/10 hover:bg-white/20 text-white",
                          )}
                          title="Temporizador de sueño"
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

                      {/* Cast */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowCastMenu(!showCastMenu)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
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
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                        >
                          <Share2 className="w-4 h-4 text-white" />
                        </button>
                        <ShareMenu title={title || ""} isOpen={showShareMenu} onClose={() => setShowShareMenu(false)} />
                      </div>

                      {/* Stats toggle */}
                      <button
                        onClick={() => setShowStats(!showStats)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
                          showStats ? "bg-white/30" : "bg-white/10 hover:bg-white/20",
                        )}
                      >
                        <BarChart3 className="w-4 h-4 text-white" />
                      </button>

                      {/* PiP */}
                      <button
                        onClick={togglePiP}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
                          isPiP ? "bg-white/30" : "bg-white/10 hover:bg-white/20",
                        )}
                        title="Picture-in-Picture (P)"
                      >
                        <PictureInPicture2 className="w-4 h-4 text-white" />
                      </button>

                      {/* Settings */}
                      <div className="relative">
                        <button
                          onClick={() => setShowQuickSettings(!showQuickSettings)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
                            showQuickSettings ? "bg-white/30" : "bg-white/10 hover:bg-white/20",
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

                      {/* Fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                        title="Pantalla completa (F)"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="w-5 h-5 text-white" />
                        ) : (
                          <Maximize2 className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : isEmbedUrl || isYouTube || url ? (
              <iframe
                src={streamUrl} // o la variable que use tu código
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                // ESTA ES LA LÍNEA QUE EVITA EL ERROR DE MANIFEST
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <Play className="w-10 h-10 text-white/20" />
                </div>
                <span className="text-sm text-white/40">Sin enlace disponible</span>
              </div>
            )}
          </div>
        </div>

        {/* Floating Bottom Bar - Stream options - ALWAYS VISIBLE when multiple options - CENTERED */}
        {hasMultipleOptions && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 pointer-events-auto">
            {availableOptions.map((opt) => (
              <button
                key={opt.num}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveOption(opt.num);
                }}
                className={cn(
                  "h-14 px-8 rounded-full text-base font-bold transition-all duration-200 backdrop-blur-xl shadow-2xl border-2 pointer-events-auto",
                  activeOption === opt.num
                    ? "bg-white text-black border-white scale-110"
                    : "bg-black/90 text-white hover:bg-white hover:text-black hover:scale-105 border-white/50",
                )}
              >
                Opción {opt.num}
              </button>
            ))}
          </div>
        )}

        {/* Status and controls bar */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-40 px-4 md:px-6 py-3 transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
          )}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="hidden sm:inline">{isLiveContent ? "En tiempo real" : "Conectado"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quality badge */}
              {streamStats.quality !== "Auto" && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium text-white/70">
                  {streamStats.quality}
                </span>
              )}

              {/* Keyboard shortcut hint */}
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5 text-white/50" />
                <span className="text-xs text-white/50">Atajos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
