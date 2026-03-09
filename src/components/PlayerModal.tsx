import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { 
  X, Play, Pause, Maximize2, Minimize2, Volume2, VolumeX, 
  Rewind, FastForward, Settings, Share2, PictureInPicture2, Clock,
  BarChart3, Moon, Cast, Music, Signal, Radio, AlertTriangle
} from "lucide-react";
import Hls from "hls.js";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { StreamStats } from "./player/StreamStats";
import { ShareMenu } from "./player/ShareMenu";
import { SleepTimerMenu } from "./player/SleepTimerMenu";
import { CastMenu } from "./player/CastMenu";
import { AudioMixer } from "./player/AudioMixer";
import { QualitySelector } from "./player/QualitySelector";
import { toast } from "sonner";

export function PlayerModal() {
  const { isOpen, title, urls, contentType, closePlayer } = usePlayerModal();
  const { addToHistory } = useWatchHistory();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeOption, setActiveOption] = useState<1 | 2 | 3>(1);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showCastMenu, setShowCastMenu] = useState(false);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [streamStats, setStreamStats] = useState({ quality: "Auto", bitrate: 0, buffered: 0 });
  const [currentQuality, setCurrentQuality] = useState("Auto");
  const [availableQualities] = useState<string[]>(["Auto", "1080p", "720p", "480p", "360p"]);
  // Key to force re-mount of video/iframe when switching sources
  const [sourceKey, setSourceKey] = useState(0);
  
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const loadingWatchdog = useRef<NodeJS.Timeout>();
  const fatalErrorCount = useRef(0);

  const sleepTimer = useSleepTimer();

  const isPendingMessage = !urls.url1 || urls.url1 === "";

  const getCurrentUrl = useCallback(() => {
    if (activeOption === 2 && urls.url2) return urls.url2;
    if (activeOption === 3 && urls.url3) return urls.url3;
    return urls.url1;
  }, [activeOption, urls]);

  const url = getCurrentUrl();
  
  const isHlsStream = url?.includes(".m3u8") && !url?.includes("/embed/");
  const isYouTube = url?.includes("youtube.com") || url?.includes("youtu.be");
  const isEmbedUrl = url?.includes("/embed/") || 
                     url?.includes("embed.") || 
                     url?.includes("/player/") ||
                     url?.includes("player.") ||
                     url?.includes("#player=") ||
                     (url && !url.includes(".m3u8") && !url.includes(".mp4") && !isYouTube);
  const isLiveContent = contentType === "live";

  const availableOptions = useMemo(() => [
    { num: 1 as const, url: urls.url1, label: "Servidor 1" },
    { num: 2 as const, url: urls.url2, label: "Servidor 2" },
    { num: 3 as const, url: urls.url3, label: "Servidor 3" },
  ].filter(opt => opt.url), [urls]);

  const hasMultipleOptions = availableOptions.length > 1;

  // ── Source switching: force re-mount ──
  const switchSource = useCallback((num: 1 | 2 | 3) => {
    if (num === activeOption) return;
    // Destroy current HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setLoadError(null);
    setIsLoading(true);
    fatalErrorCount.current = 0;
    setActiveOption(num);
    setSourceKey(prev => prev + 1); // Force re-mount
    toast.success(`Cambiado a ${availableOptions.find(o => o.num === num)?.label || `Servidor ${num}`}`);
  }, [activeOption, availableOptions]);

  useEffect(() => {
    if (isOpen && title && urls.url1) {
      addToHistory({ id: urls.url1, title, url: urls.url1 });
    }
  }, [isOpen, title, urls.url1, addToHistory]);

  useEffect(() => {
    if (isOpen) {
      setActiveOption(1);
      setSourceKey(0);
      setShowShareMenu(false);
      setShowSleepTimer(false);
      setShowCastMenu(false);
      setShowAudioMixer(false);
      setShowQualitySelector(false);
    }
  }, [isOpen]);

  const handleSleepTimeout = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    const video = videoRef.current;
    switch (e.key.toLowerCase()) {
      case " ":
        e.preventDefault();
        if (video) { if (video.paused) { video.play(); setIsPlaying(true); } else { video.pause(); setIsPlaying(false); } }
        break;
      case "m": if (video) { video.muted = !video.muted; setIsMuted(!video.muted); } break;
      case "f": toggleFullscreen(); break;
      case "p": togglePiP(); break;
      case "arrowleft": if (video && !isLiveContent) video.currentTime = Math.max(0, video.currentTime - 10); break;
      case "arrowright": if (video && !isLiveContent) video.currentTime = Math.min(duration, video.currentTime + 10); break;
      case "arrowup": e.preventDefault(); if (video) { video.volume = Math.min(1, video.volume + 0.1); setVolume(video.volume); } break;
      case "arrowdown": e.preventDefault(); if (video) { video.volume = Math.max(0, video.volume - 0.1); setVolume(video.volume); } break;
      case "1": case "2": case "3":
        const optNum = parseInt(e.key) as 1 | 2 | 3;
        if (availableOptions.find(o => o.num === optNum)) switchSource(optNum);
        break;
      case "escape": closePlayer(); break;
    }
  }, [isOpen, isLiveContent, duration, availableOptions, closePlayer, switchSource]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => { document.removeEventListener("fullscreenchange", handler); document.removeEventListener("webkitfullscreenchange", handler); };
  }, []);

  useEffect(() => {
    const handler = () => setIsPiP(document.pictureInPictureElement === videoRef.current);
    document.addEventListener("enterpictureinpicture", handler);
    document.addEventListener("leavepictureinpicture", handler);
    return () => { document.removeEventListener("enterpictureinpicture", handler); document.removeEventListener("leavepictureinpicture", handler); };
  }, []);

  // Loading/error management
  useEffect(() => {
    if (!isOpen || isPendingMessage) return;
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
      return () => { if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current); };
    }

    if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
    loadingWatchdog.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) { setIsLoading(false); return; }
      const ok = video.readyState >= 1 || !video.paused || video.currentTime > 0 || video.buffered.length > 0;
      if (ok) { setIsLoading(false); setLoadError(null); return; }
      setIsLoading(false);
    }, 15000);

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current);
    };
  }, [isOpen, url, sourceKey, isEmbedUrl, isYouTube, isPendingMessage]);

  // HLS setup
  useEffect(() => {
    if (!isOpen || !isHlsStream || !videoRef.current || !url) return;
    const video = videoRef.current;
    let cancelled = false;

    const getProxiedUrl = (streamUrl: string) => {
      const hasIpToken = streamUrl.includes("token=") || streamUrl.includes("ip=");
      if (hasIpToken) return streamUrl;
      const isExternal = !streamUrl.includes(window.location.hostname) && !streamUrl.includes("supabase.co");
      if (isExternal) return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
      return streamUrl;
    };

    const streamUrl = getProxiedUrl(url);

    if (Hls.isSupported()) {
      const boot = async () => {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (cancelled) return;

        const hls = new Hls({
          enableWorker: true, lowLatencyMode: false,
          xhrSetup: (xhr, requestUrl) => {
            xhr.withCredentials = false;
            if (accessToken && typeof requestUrl === "string" && requestUrl.includes("/functions/v1/stream-proxy")) {
              xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
              xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
            }
          },
          maxBufferLength: 30, maxMaxBufferLength: 600,
          fragLoadingTimeOut: 30000, fragLoadingMaxRetry: 6,
          manifestLoadingTimeOut: 30000, manifestLoadingMaxRetry: 4,
        });
        hlsRef.current = hls;

        const stopLoading = () => {
          if (loadingWatchdog.current) { clearTimeout(loadingWatchdog.current); loadingWatchdog.current = undefined; }
          setIsLoading(false);
        };

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          setLoadError(null); stopLoading();
          video.play().catch(() => {});
          if (data.levels?.length > 0) {
            const level = data.levels[hls.currentLevel] || data.levels[0];
            setStreamStats(prev => ({ ...prev, quality: level.height ? `${level.height}p` : "Auto", bitrate: level.bitrate || 0 }));
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => { setLoadError(null); stopLoading(); });
        video.addEventListener('playing', () => { setLoadError(null); stopLoading(); });
        video.addEventListener('canplay', () => { setLoadError(null); stopLoading(); });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (video.buffered.length > 0) {
            const buffered = video.buffered.end(video.buffered.length - 1) - video.currentTime;
            setStreamStats(prev => ({ ...prev, buffered }));
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) setStreamStats(prev => ({ ...prev, quality: level.height ? `${level.height}p` : "Auto", bitrate: level.bitrate || 0 }));
        });

        hls.on(Hls.Events.ERROR, (_, err) => {
          if (!err.fatal) return;
          fatalErrorCount.current += 1;
          if (fatalErrorCount.current <= 1) {
            if (err.type === Hls.ErrorTypes.NETWORK_ERROR) { hls.startLoad(); return; }
            if (err.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); return; }
          }
          stopLoading();
          setLoadError(`No se pudo cargar el stream (${err.type}).`);
        });
      };
      boot().catch(() => { setIsLoading(false); setLoadError("No se pudo iniciar el reproductor HLS."); });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      const onLoaded = () => { if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current); setLoadError(null); setIsLoading(false); video.play().catch(() => {}); };
      const onError = () => { if (loadingWatchdog.current) clearTimeout(loadingWatchdog.current); setIsLoading(false); setLoadError("No se pudo cargar el stream."); };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
      return () => { video.removeEventListener("loadedmetadata", onLoaded); video.removeEventListener("error", onError); };
    }

    return () => { cancelled = true; if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [isOpen, isHlsStream, url, sourceKey]);

  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    const ytMatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1`;
    try {
      const urlObj = new URL(rawUrl);
      if (!urlObj.searchParams.has('autoplay')) urlObj.searchParams.set('autoplay', '1');
      if (!urlObj.searchParams.has('auto_play')) urlObj.searchParams.set('auto_play', 'true');
      if (!urlObj.searchParams.has('muted')) urlObj.searchParams.set('muted', '0');
      if (!urlObj.searchParams.has('playsinline')) urlObj.searchParams.set('playsinline', '1');
      if (!urlObj.searchParams.has('ads')) urlObj.searchParams.set('ads', '0');
      return urlObj.toString();
    } catch { const sep = rawUrl.includes('?') ? '&' : '?'; return `${rawUrl}${sep}autoplay=1&auto_play=true&playsinline=1`; }
  };

  const toggleMute = () => { if (videoRef.current) { videoRef.current.muted = !videoRef.current.muted; setIsMuted(!isMuted); } };
  const togglePlay = () => { if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); } else { videoRef.current.pause(); setIsPlaying(false); } } };
  const seek = (seconds: number) => { if (videoRef.current && !isLiveContent) videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration)); };
  const handleTimeUpdate = () => { if (videoRef.current) { setCurrentTime(videoRef.current.currentTime); setDuration(videoRef.current.duration || 0); } };
  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => { if (videoRef.current && !isLiveContent) videoRef.current.currentTime = Number(e.target.value); };
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => { const v = Number(e.target.value); if (videoRef.current) { videoRef.current.volume = v; setVolume(v); setIsMuted(v === 0); } };

  const formatTimeStr = (time: number) => {
    if (isNaN(time)) return "0:00";
    const h = Math.floor(time / 3600); const m = Math.floor((time % 3600) / 60); const s = Math.floor(time % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current; const video = videoRef.current;
    if (!video && !container) return;
    if (document.fullscreenElement) { document.exitFullscreen?.(); return; }
    if ((video as any)?.webkitEnterFullscreen) { try { (video as any).webkitEnterFullscreen(); return; } catch {} }
    if (container?.requestFullscreen) container.requestFullscreen();
    else if ((container as any)?.webkitRequestFullscreen) (container as any).webkitRequestFullscreen();
  };

  const togglePiP = async () => {
    const video = videoRef.current; if (!video) return;
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else if (document.pictureInPictureEnabled) { await video.requestPictureInPicture(); toast.success("PiP activado"); } } catch { toast.error("PiP no disponible"); }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const retryLoad = () => {
    setLoadError(null); setIsLoading(true); fatalErrorCount.current = 0;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setSourceKey(prev => prev + 1);
  };

  // Find next available server for error fallback suggestion
  const nextAvailableServer = useMemo(() => {
    return availableOptions.find(o => o.num !== activeOption);
  }, [availableOptions, activeOption]);

  if (!isOpen) return null;

  // ── PENDING MESSAGE ──
  if (isPendingMessage) {
    return (
      <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black animate-in fade-in duration-300">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[hsl(200,100%,50%)]/[0.03] blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-primary/[0.02] blur-[80px]" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <button onClick={closePlayer} className="absolute top-5 right-5 z-50 w-11 h-11 rounded-2xl flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.15] backdrop-blur-xl transition-all duration-300 text-white/50 hover:text-white group">
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="relative flex flex-col items-center gap-8 text-center px-8 max-w-lg">
          {/* Animated clock icon */}
          <div className="relative">
            {/* Outer ring pulse */}
            <div className="absolute -inset-6 rounded-full border border-primary/10 animate-[ping_3s_ease-in-out_infinite]" />
            <div className="absolute -inset-3 rounded-full border border-primary/15" />
            {/* Main circle */}
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(200 100% 50% / 0.1))' }}>
              <div className="absolute inset-[2px] rounded-full bg-black/80 backdrop-blur-xl" />
              <Clock className="relative w-11 h-11 text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
            </div>
            {/* Glow */}
            <div className="absolute -inset-8 rounded-full bg-primary/[0.08] blur-3xl" />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              {title}
            </h3>
            <div className="w-16 h-[2px] mx-auto rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <p className="text-white/40 text-sm sm:text-base leading-relaxed font-body">
              El link estará disponible <span className="text-primary font-semibold drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]">30 minutos antes</span> de que comience el partido
            </p>
          </div>

          {/* Status pill */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 to-[hsl(200,100%,50%)]/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary shadow-lg shadow-primary/50" />
              </span>
              <span className="text-sm font-medium text-white/50 tracking-wide">Esperando transmisión</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-white/20 animate-[pulse_1.5s_ease-in-out_infinite]" />
                <span className="w-1 h-1 rounded-full bg-white/20 animate-[pulse_1.5s_ease-in-out_0.3s_infinite]" />
                <span className="w-1 h-1 rounded-full bg-white/20 animate-[pulse_1.5s_ease-in-out_0.6s_infinite]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.target === e.currentTarget && closePlayer()} className="fixed inset-0 z-[9990] flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black" />
      
      <button onClick={closePlayer} className="absolute top-3 right-3 md:top-5 md:right-5 z-[60] w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-red-500/80 border border-white/15 hover:border-red-500/50 backdrop-blur-md transition-all text-white/80 hover:text-white">
        <X className="w-5 h-5" />
      </button>

      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        {/* ── HEADER: Title ── */}
        <div className={cn("absolute top-0 left-0 right-0 z-50 transition-all duration-300", showControls ? "opacity-100" : "opacity-0 pointer-events-none")} style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)' }}>
          <div className="px-4 md:px-6 pt-3 pb-2 pr-16">
            <div className="flex items-center gap-3">
              {isLiveContent && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/30 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE</span>
                </div>
              )}
              <h2 className="font-display text-sm md:text-lg text-white truncate">{title}</h2>
            </div>
          </div>
        </div>

        {/* ── SERVER TABS: Always visible when multiple options ── */}
        {hasMultipleOptions && (
          <div className="absolute top-3 left-3 z-[55] flex items-center gap-1.5 p-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
            {availableOptions.map((opt) => (
              <button
                key={opt.num}
                onClick={(e) => { e.stopPropagation(); switchSource(opt.num); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 touch-manipulation",
                  activeOption === opt.num
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "text-white/50 hover:text-white hover:bg-white/10 active:bg-white/20"
                )}
              >
                {opt.num}
              </button>
            ))}
          </div>
        )}

        {/* ── VIDEO AREA ── */}
        <div className="w-full h-full">
          <div className="relative w-full h-full overflow-hidden bg-black group" onMouseMove={handleMouseMove} onMouseLeave={() => setShowControls(false)} onTouchStart={() => setShowControls(true)}>
            <StreamStats isVisible={showStats} quality={streamStats.quality} bitrate={streamStats.bitrate} buffered={streamStats.buffered} />

            {/* Loading overlay removed - stream loads directly */}

            {/* Error with fallback suggestion */}
            {loadError && !isEmbedUrl && !isYouTube && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-400/60" />
                </div>
                <p className="text-white/70 font-medium">No se pudo cargar el stream</p>
                <p className="text-sm text-white/40">{loadError}</p>
                
                {/* Fallback suggestion */}
                {nextAvailableServer && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Prueba cambiar a <strong>{nextAvailableServer.label}</strong></span>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button onClick={retryLoad} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm text-white transition-all">Reintentar</button>
                  {nextAvailableServer && (
                    <button onClick={() => switchSource(nextAvailableServer.num)} className="px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-sm text-red-300 transition-all">
                      {nextAvailableServer.label}
                    </button>
                  )}
                </div>
              </div>
            )}


            {/* Video/Iframe with key for re-mount */}
            {isHlsStream ? (
              <video
                key={`hls-${sourceKey}`}
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                playsInline autoPlay muted={isMuted} crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate}
              />
            ) : isEmbedUrl || isYouTube || url ? (
              <iframe
                key={`embed-${sourceKey}`}
                ref={iframeRef}
                src={getEmbedUrl(url)}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen; accelerometer; gyroscope; clipboard-write"
                allowFullScreen referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => { setIsLoading(false); setLoadError(null); }}
                onError={() => { setIsLoading(false); }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center"><Play className="w-10 h-10 text-white/20" /></div>
                <span className="text-sm text-white/40">Sin enlace disponible</span>
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM CONTROLS ── */}
        <div className={cn("absolute bottom-0 left-0 right-0 z-50 transition-all duration-300", showControls ? "opacity-100" : "opacity-0 pointer-events-none")} style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}>
          <div className="px-4 md:px-6 pb-4 pt-12">
            {!isLiveContent && duration > 0 && (
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[10px] text-white/50 w-10 tabular-nums font-mono">{formatTimeStr(currentTime)}</span>
                <div className="flex-1 relative h-1 group/prog cursor-pointer">
                  <input type="range" min={0} max={duration} value={currentTime} onChange={handleSeekBar} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="h-0.5 group-hover/prog:h-1 bg-white/20 rounded-full overflow-hidden transition-all">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-white/50 w-10 text-right tabular-nums font-mono">{formatTimeStr(duration)}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {!isLiveContent && (<button onClick={() => seek(-10)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"><Rewind className="w-4 h-4 text-white" /></button>)}
                <button onClick={togglePlay} className="w-11 h-11 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition-all">
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                </button>
                {!isLiveContent && (<button onClick={() => seek(10)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"><FastForward className="w-4 h-4 text-white" /></button>)}
                <div className="flex items-center gap-1 group/vol ml-1">
                  <button onClick={toggleMute} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                  </button>
                  <input type="range" min={0} max={1} step={0.1} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover/vol:w-20 h-0.5 bg-white/30 rounded-full appearance-none cursor-pointer transition-all duration-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
                </div>
                {isLiveContent && (<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/30 ml-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-[10px] font-bold text-white uppercase">Live</span></div>)}
                {sleepTimer.isActive && sleepTimer.remainingTime && (<div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 ml-1"><Moon className="w-3 h-3 text-purple-300" /><span className="text-[10px] font-mono text-purple-300">{sleepTimer.formatTime(sleepTimer.remainingTime)}</span></div>)}
              </div>

              <div className="flex items-center gap-1">
                <div className="relative hidden sm:block"><button onClick={() => setShowQualitySelector(!showQualitySelector)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all" title="Calidad"><Signal className="w-3.5 h-3.5 text-white" /></button><QualitySelector isOpen={showQualitySelector} onClose={() => setShowQualitySelector(false)} currentQuality={currentQuality} availableQualities={availableQualities} onSelectQuality={(q) => { setCurrentQuality(q); toast.success(`Calidad: ${q}`); }} /></div>
                <div className="relative hidden sm:block"><button onClick={() => setShowAudioMixer(!showAudioMixer)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all" title="Audio"><Music className="w-3.5 h-3.5 text-white" /></button><AudioMixer isOpen={showAudioMixer} onClose={() => setShowAudioMixer(false)} /></div>
                <div className="relative hidden sm:block"><button onClick={() => setShowSleepTimer(!showSleepTimer)} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all", sleepTimer.isActive ? "bg-purple-500/30 text-white" : "bg-white/10 hover:bg-white/20 text-white")} title="Sleep Timer"><Moon className="w-3.5 h-3.5" /></button><SleepTimerMenu isOpen={showSleepTimer} onClose={() => setShowSleepTimer(false)} isActive={sleepTimer.isActive} remainingTime={sleepTimer.remainingTime} formatTime={sleepTimer.formatTime} onSetTimer={(mins) => sleepTimer.startTimer(mins, handleSleepTimeout)} onCancelTimer={sleepTimer.cancelTimer} /></div>
                <div className="relative"><button onClick={(e) => { e.stopPropagation(); setShowCastMenu(!showCastMenu); }} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all" title="Enviar a TV"><Cast className="w-3.5 h-3.5 text-white" /></button><CastMenu isOpen={showCastMenu} onClose={() => setShowCastMenu(false)} videoRef={videoRef} currentUrl={url} /></div>
                <div className="relative"><button onClick={() => setShowShareMenu(!showShareMenu)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"><Share2 className="w-3.5 h-3.5 text-white" /></button><ShareMenu title={title || ""} isOpen={showShareMenu} onClose={() => setShowShareMenu(false)} /></div>
                <button onClick={() => setShowStats(!showStats)} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all", showStats ? "bg-white/25" : "bg-white/10 hover:bg-white/20")}><BarChart3 className="w-3.5 h-3.5 text-white" /></button>
                <button onClick={togglePiP} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all", isPiP ? "bg-white/25" : "bg-white/10 hover:bg-white/20")} title="PiP"><PictureInPicture2 className="w-3.5 h-3.5 text-white" /></button>
                <button onClick={toggleFullscreen} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all" title="Fullscreen">{isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
