import { useEffect, useRef, useState, useCallback } from "react";
import { 
  X, Loader2, Maximize2, Minimize2, Volume2, VolumeX, Play, Pause, 
  Rewind, FastForward, Subtitles, Settings, Share2, PictureInPicture2,
  MonitorPlay, Keyboard, BarChart3, Moon, Cast, Music, Smartphone, Signal,
  Sparkles, Zap
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
  const [ambientEnabled, setAmbientEnabled] = useState(true);
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
  const isEmbedUrl = url?.includes("/embed/") || 
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
  ].filter(opt => opt.url);

  const hasMultipleOptions = availableOptions.length > 1;

  // FIXED: Handle close with stopPropagation
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    closePlayer();
  }, [closePlayer]);

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

    if (isEmbedUrl || isYouTube) {
      if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
      loadingWatchdog.current = setTimeout(() => {
        setIsLoading(false);
        setLoadError(null);
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

    if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
    loadingWatchdog.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) {
        setIsLoading(false);
        return;
      }
      
      const hasVideoData = video.readyState >= 1;
      const isVideoPlaying = !video.paused;
      const hasCurrentTime = video.currentTime > 0;
      const hasBuffered = video.buffered.length > 0;
      
      if (hasVideoData || isVideoPlaying || hasCurrentTime || hasBuffered) {
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
        
        video.addEventListener('playing', () => {
          setLoadError(null);
          stopLoading();
        });
        
        video.addEventListener('canplay', () => {
          setLoadError(null);
          stopLoading();
        });

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
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&showinfo=0&playsinline=1`;
    }
    try {
      const urlObj = new URL(rawUrl);
      if (!urlObj.searchParams.has('autoplay')) {
        urlObj.searchParams.set('autoplay', '1');
      }
      if (!urlObj.searchParams.has('auto_play')) {
        urlObj.searchParams.set('auto_play', 'true');
      }
      if (!urlObj.searchParams.has('muted')) {
        urlObj.searchParams.set('muted', '0');
      }
      if (!urlObj.searchParams.has('playsinline')) {
        urlObj.searchParams.set('playsinline', '1');
      }
      if (!urlObj.searchParams.has('ads')) {
        urlObj.searchParams.set('ads', '0');
      }
      return urlObj.toString();
    } catch {
      const separator = rawUrl.includes('?') ? '&' : '?';
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

    if ((video as any)?.webkitEnterFullscreen) {
      try {
        (video as any).webkitEnterFullscreen();
        return;
      } catch {}
    }

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
    <div className="fixed inset-0 z-[9999] animate-in fade-in duration-300">
      {/* Ultra-black cinematic backdrop */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Premium ambient glow effect */}
      {ambientEnabled && ambientMode.colors && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] h-[250%] blur-[300px] opacity-20 transition-all duration-[2000ms]"
            style={{ background: `radial-gradient(ellipse, ${ambientMode.colors.dominant}, transparent 50%)` }}
          />
          <div 
            className="absolute bottom-0 left-1/4 w-[60%] h-[60%] blur-[200px] opacity-15 transition-all duration-[2000ms]"
            style={{ background: `radial-gradient(circle, ${ambientMode.colors.secondary || ambientMode.colors.dominant}, transparent 60%)` }}
          />
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="relative w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
        onTouchStart={() => setShowControls(true)}
      >
        {/* Floating Premium Header */}
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 z-[60] transition-all duration-500 ease-out",
            showControls 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 -translate-y-4 pointer-events-none"
          )}
        >
          {/* Gradient overlay for header */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
              height: '150px'
            }}
          />
          
          <div className="relative flex items-center justify-between px-4 md:px-8 py-4 md:py-6">
            {/* Left: Title section */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {isLiveContent && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600/40 to-red-500/30 backdrop-blur-xl border border-red-500/30 shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">EN VIVO</span>
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-lg md:text-2xl tracking-wide text-white truncate">
                  {title || "Reproductor"}
                </h2>
                <p className="text-xs text-white/40 mt-0.5 hidden md:block">Streaming Premium</p>
              </div>
            </div>
            
            {/* Right: Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Ambient mode toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setAmbientEnabled(!ambientEnabled); }}
                className={cn(
                  "hidden sm:flex w-11 h-11 rounded-2xl items-center justify-center backdrop-blur-xl transition-all duration-300",
                  ambientEnabled 
                    ? "bg-gradient-to-br from-primary/30 to-accent/20 text-primary border border-primary/30 shadow-lg shadow-primary/20" 
                    : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10"
                )}
                title="Modo Ambiente"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              
              {/* Theater mode toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsTheaterMode(!isTheaterMode); }}
                className={cn(
                  "hidden sm:flex w-11 h-11 rounded-2xl items-center justify-center backdrop-blur-xl transition-all duration-300",
                  isTheaterMode 
                    ? "bg-gradient-to-br from-primary/30 to-accent/20 text-primary border border-primary/30 shadow-lg shadow-primary/20" 
                    : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10"
                )}
                title="Modo Teatro (T)"
              >
                <MonitorPlay className="w-4 h-4" />
              </button>
              
              {/* FIXED: Close button with proper event handling */}
              <button
                onClick={handleClose}
                className="w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-xl bg-white/5 hover:bg-red-500/30 border border-white/10 hover:border-red-500/50 transition-all duration-300 text-white/60 hover:text-white group"
                title="Cerrar (ESC)"
              >
                <X className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Player Area */}
        <div className="w-full h-full">
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

          {/* Ultra Premium Loading Overlay */}
          {isLoading && !loadError && (
            <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black">
              {/* Animated background orbs */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/10 via-accent/5 to-transparent blur-[200px] animate-pulse" />
                <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-[150px] animate-pulse [animation-delay:500ms]" />
                <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-primary/8 to-transparent blur-[100px] animate-pulse [animation-delay:1000ms]" />
              </div>

              <div className="relative z-10 flex flex-col items-center gap-8">
                {/* Premium animated loader */}
                <div className="relative w-28 h-28">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                  {/* Spinning gradient ring */}
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin [animation-duration:3s]" style={{ borderTopColor: 'hsl(var(--primary))', borderRightColor: 'hsl(var(--accent))' }} />
                  {/* Inner glow circle */}
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent backdrop-blur-sm" />
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  {/* Orbiting particles */}
                  <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
                  </div>
                  <div className="absolute inset-0 animate-[spin_6s_linear_infinite_reverse]">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 rounded-full bg-accent shadow-lg shadow-accent/50" />
                  </div>
                </div>

                <div className="text-center space-y-3">
                  <h3 className="font-display text-xl tracking-wider text-white/90 max-w-[300px] truncate">
                    {title || "Conectando..."}
                  </h3>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-sm text-white/30 font-medium">Estableciendo conexión</span>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                  <kbd className="text-xs text-white/25">
                    Presiona <span className="text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded mx-1">?</span> para atajos de teclado
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {loadError && !isEmbedUrl && !isYouTube && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black z-[70] p-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/20 to-transparent blur-xl" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center">
                  <X className="w-10 h-10 text-white/30" />
                </div>
              </div>
              <div className="max-w-[560px]">
                <p className="text-white/80 font-medium text-lg">No se pudo cargar el stream</p>
                <p className="text-sm text-white/40 mt-2">{loadError}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={retryLoad}
                  className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 text-sm font-medium text-white"
                >
                  Reintentar
                </button>
                {hasMultipleOptions && activeOption < 3 && (
                  <button
                    onClick={() => setActiveOption((activeOption + 1) as 1 | 2 | 3)}
                    className="h-12 px-6 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 border border-primary/30 transition-all duration-300 text-sm font-medium text-white"
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
                crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleTimeUpdate}
                webkit-playsinline="true"
                x-webkit-airplay="allow"
              />

              {/* AI Subtitles Overlay */}
              {subtitlesEnabled && currentSubtitle && (
                <div className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none z-30">
                  <div className="bg-black/90 backdrop-blur-md px-8 py-4 rounded-2xl max-w-[80%] border border-white/10 shadow-2xl">
                    <p className="text-white text-lg md:text-xl font-medium text-center leading-relaxed">
                      {currentSubtitle}
                    </p>
                  </div>
                </div>
              )}

              {/* Subtitle processing indicator */}
              {subtitlesEnabled && subtitlesProcessing && !currentSubtitle && (
                <div className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none z-30">
                  <div className="bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-white/50 text-sm">Procesando audio...</span>
                  </div>
                </div>
              )}

              {/* Premium Control Bar */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 z-[60] transition-all duration-500 ease-out",
                  showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}
              >
                {/* Gradient background */}
                <div 
                  className="absolute inset-0"
                  style={{ 
                    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)',
                    height: '200px',
                    bottom: 0,
                    top: 'auto'
                  }}
                />
                
                <div className="relative px-4 md:px-8 pb-6 pt-12">
                  {/* Progress bar for movies/series */}
                  {!isLiveContent && duration > 0 && (
                    <div className="mb-5 flex items-center gap-4">
                      <span className="text-xs text-white/50 w-14 tabular-nums font-mono">{formatTime(currentTime)}</span>
                      <div className="flex-1 relative h-1 group/progress cursor-pointer">
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          value={currentTime}
                          onChange={handleSeekBar}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="h-1 group-hover/progress:h-1.5 bg-white/10 rounded-full overflow-hidden transition-all duration-200">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-100 relative"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-white/50 w-14 tabular-nums font-mono text-right">{formatTime(duration)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    {/* Left controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-200 border border-white/10"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>

                      {!isLiveContent && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); seek(-10); }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-200"
                          >
                            <Rewind className="w-4 h-4 text-white/70" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); seek(10); }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-200"
                          >
                            <FastForward className="w-4 h-4 text-white/70" />
                          </button>
                        </>
                      )}

                      {/* Volume */}
                      <div className="hidden sm:flex items-center gap-2 ml-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-200"
                        >
                          {isMuted ? (
                            <VolumeX className="w-4 h-4 text-white/70" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-white/70" />
                          )}
                        </button>
                        <div className="w-20 relative group/vol">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
                          />
                        </div>
                      </div>

                      {/* AI Subtitles */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSubtitles(); }}
                        className={cn(
                          "hidden sm:flex w-10 h-10 rounded-xl items-center justify-center transition-all duration-200",
                          subtitlesEnabled
                            ? "bg-primary/30 text-primary border border-primary/30"
                            : "bg-white/5 hover:bg-white/10 text-white/50"
                        )}
                      >
                        <Subtitles className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Center badges */}
                    <div className="flex items-center gap-2">
                      {isLiveContent && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-red-600/30 to-red-500/20 backdrop-blur-xl border border-red-500/20">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">En vivo</span>
                        </div>
                      )}

                      {playbackSpeed !== 1 && (
                        <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xl text-xs font-bold text-white border border-white/10">
                          {playbackSpeed}x
                        </div>
                      )}

                      {sleepTimer.isActive && sleepTimer.remainingTime && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/20 backdrop-blur-xl border border-purple-500/20">
                          <Moon className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-xs font-mono text-white">{sleepTimer.formatTime(sleepTimer.remainingTime)}</span>
                        </div>
                      )}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-1.5">
                      {/* Quality selector */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowQualitySelector(!showQualitySelector); }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-200"
                          title="Calidad"
                        >
                          <Signal className="w-4 h-4 text-white/70" />
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
                          onClick={(e) => { e.stopPropagation(); setShowAudioMixer(!showAudioMixer); }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-200"
                          title="Audio"
                        >
                          <Music className="w-4 h-4 text-white/70" />
                        </button>
                        <AudioMixer isOpen={showAudioMixer} onClose={() => setShowAudioMixer(false)} />
                      </div>

                      {/* Sleep timer */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSleepTimer(!showSleepTimer); }}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                            sleepTimer.isActive
                              ? "bg-purple-500/30 text-purple-400 border border-purple-500/30"
                              : "bg-white/5 hover:bg-white/10 text-white/70"
                          )}
                          title="Temporizador"
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
                          onClick={(e) => { e.stopPropagation(); setShowCastMenu(!showCastMenu); }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-200"
                          title="Transmitir"
                        >
                          <Cast className="w-4 h-4 text-white/70" />
                        </button>
                        <CastMenu isOpen={showCastMenu} onClose={() => setShowCastMenu(false)} />
                      </div>

                      {/* Share button */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu); }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-200"
                        >
                          <Share2 className="w-4 h-4 text-white/70" />
                        </button>
                        <ShareMenu 
                          title={title || ""} 
                          isOpen={showShareMenu} 
                          onClose={() => setShowShareMenu(false)} 
                        />
                      </div>

                      {/* Stats toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                          showStats
                            ? "bg-white/20 text-white"
                            : "bg-white/5 hover:bg-white/10 text-white/70"
                        )}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>

                      {/* PiP */}
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                          isPiP
                            ? "bg-white/20 text-white"
                            : "bg-white/5 hover:bg-white/10 text-white/70"
                        )}
                        title="Picture-in-Picture (P)"
                      >
                        <PictureInPicture2 className="w-4 h-4" />
                      </button>

                      {/* Settings */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowQuickSettings(!showQuickSettings); }}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                            showQuickSettings
                              ? "bg-white/20 text-white"
                              : "bg-white/5 hover:bg-white/10 text-white/70"
                          )}
                        >
                          <Settings className={cn("w-4 h-4 transition-transform duration-300", showQuickSettings && "rotate-90")} />
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
                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-200 border border-white/10"
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
              </div>
            </>
          ) : isEmbedUrl || isYouTube || url ? (
            <iframe
              ref={iframeRef}
              src={getEmbedUrl(url)}
              className="w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen; accelerometer; gyroscope; clipboard-write"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 'none', background: '#000' }}
              onLoad={() => {
                setIsLoading(false);
                setLoadError(null);
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-muted-foreground bg-black">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-transparent blur-xl" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white/20" />
                </div>
              </div>
              <span className="text-sm text-white/30 font-medium">Sin enlace disponible</span>
            </div>
          )}
        </div>

        {/* Floating Bottom Bar - Stream options */}
        {hasMultipleOptions && (
          <div 
            className={cn(
              "absolute bottom-24 left-1/2 -translate-x-1/2 z-[55] transition-all duration-500 ease-out",
              showControls 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10">
              {availableOptions.map((opt) => (
                <button
                  key={opt.num}
                  onClick={(e) => { e.stopPropagation(); setActiveOption(opt.num); }}
                  className={cn(
                    "h-9 px-5 rounded-xl text-xs font-semibold transition-all duration-300",
                    activeOption === opt.num
                      ? "bg-white text-black shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  Opción {opt.num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connection status indicator */}
        <div 
          className={cn(
            "absolute bottom-6 left-6 z-[55] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/5 transition-all duration-500",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
            {isLiveContent ? "En tiempo real" : "Conectado"}
          </span>
        </div>

        {/* Keyboard shortcut hint */}
        <div 
          className={cn(
            "absolute bottom-6 right-6 z-[55] transition-all duration-500",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowKeyboardShortcuts(true); }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            <Keyboard className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Atajos</span>
          </button>
        </div>
      </div>
    </div>
  );
}
