import { 
  Play, Pause, Rewind, FastForward, Volume2, VolumeX, 
  Subtitles, Maximize2, Minimize2, Settings, Share2,
  PictureInPicture2, BarChart3, Moon, Cast, Music, Signal,
  SkipBack, SkipForward, Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PremiumControlBarProps {
  isVisible: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLiveContent: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
  showStats: boolean;
  subtitlesEnabled: boolean;
  playbackSpeed: number;
  sleepTimerActive?: boolean;
  sleepTimerRemaining?: string;
  // Actions
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (seconds: number) => void;
  onSeekTo: (time: number) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onToggleStats: () => void;
  onToggleSubtitles: () => void;
  // Menu toggles
  onShowQuality: () => void;
  onShowAudio: () => void;
  onShowSleepTimer: () => void;
  onShowCast: () => void;
  onShowShare: () => void;
  onShowSettings: () => void;
}

export function PremiumControlBar({
  isVisible,
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  isLiveContent,
  isFullscreen,
  isPiP,
  showStats,
  subtitlesEnabled,
  playbackSpeed,
  sleepTimerActive,
  sleepTimerRemaining,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSeek,
  onSeekTo,
  onToggleFullscreen,
  onTogglePiP,
  onToggleStats,
  onToggleSubtitles,
  onShowQuality,
  onShowAudio,
  onShowSleepTimer,
  onShowCast,
  onShowShare,
  onShowSettings,
}: PremiumControlBarProps) {
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

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

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setHoverTime(percent * duration);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeekTo(percent * duration);
  };

  const ControlButton = ({ 
    onClick, 
    active, 
    children, 
    title,
    size = "normal" 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    children: React.ReactNode; 
    title?: string;
    size?: "small" | "normal" | "large";
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-xl flex items-center justify-center border backdrop-blur-sm transition-all duration-200 group",
        size === "small" && "w-9 h-9",
        size === "normal" && "w-10 h-10",
        size === "large" && "w-12 h-12",
        active
          ? "bg-primary/25 border-primary/40 text-primary hover:bg-primary/35"
          : "bg-white/[0.08] border-white/[0.08] text-white/80 hover:bg-white/15 hover:border-white/15 hover:text-white"
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      
      <div className="relative z-10 px-4 pb-4 pt-16">
        {/* Progress bar - for VOD content */}
        {!isLiveContent && duration > 0 && (
          <div 
            className="mb-4 group/progress cursor-pointer"
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => setIsHoveringProgress(false)}
            onMouseMove={handleProgressHover}
            onClick={handleProgressClick}
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono text-white/60 tabular-nums w-12">
                {formatTime(currentTime)}
              </span>
              
              {/* Progress track */}
              <div className="flex-1 relative h-1.5 rounded-full overflow-hidden bg-white/10 group-hover/progress:h-2.5 transition-all">
                {/* Buffered */}
                <div 
                  className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
                  style={{ width: `${Math.min(100, (currentTime / duration) * 100 + 10)}%` }}
                />
                
                {/* Progress */}
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-purple-500 to-accent rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                
                {/* Hover preview */}
                {isHoveringProgress && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-primary shadow-lg shadow-primary/50 transition-transform scale-100"
                    style={{ left: `${(hoverTime / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                )}
                
                {/* Current position thumb */}
                <div 
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg transition-all",
                    isHoveringProgress ? "scale-0" : "scale-100"
                  )}
                  style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
              
              <span className="text-xs font-mono text-white/60 tabular-nums w-12 text-right">
                {formatTime(duration)}
              </span>
            </div>
            
            {/* Hover time tooltip */}
            {isHoveringProgress && (
              <div 
                className="absolute -top-8 bg-black/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10 text-xs font-mono text-white pointer-events-none"
                style={{ left: `${(hoverTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>
        )}

        {/* Main controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Playback controls */}
          <div className="flex items-center gap-1.5">
            {!isLiveContent && (
              <ControlButton onClick={() => onSeek(-10)} title="Retroceder 10s">
                <SkipBack className="w-4 h-4" />
              </ControlButton>
            )}
            
            <ControlButton onClick={onTogglePlay} size="large">
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </ControlButton>
            
            {!isLiveContent && (
              <ControlButton onClick={() => onSeek(10)} title="Adelantar 10s">
                <SkipForward className="w-4 h-4" />
              </ControlButton>
            )}

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol ml-2">
              <ControlButton onClick={onToggleMute}>
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </ControlButton>
              <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                />
              </div>
            </div>

            {/* Subtitles */}
            <ControlButton onClick={onToggleSubtitles} active={subtitlesEnabled} title="Subtítulos IA">
              <Subtitles className="w-4 h-4" />
            </ControlButton>

            {/* Favorite */}
            <ControlButton onClick={() => setIsFavorite(!isFavorite)} active={isFavorite} title="Favorito">
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </ControlButton>
          </div>

          {/* Center: Live badge / Speed indicator */}
          <div className="flex items-center gap-2">
            {isLiveContent && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">En vivo</span>
              </div>
            )}
            
            {playbackSpeed !== 1 && (
              <div className="px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/30 text-xs font-bold text-primary">
                {playbackSpeed}x
              </div>
            )}

            {sleepTimerActive && sleepTimerRemaining && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm">
                <Moon className="w-3 h-3 text-purple-400" />
                <span className="text-xs font-mono text-purple-400">{sleepTimerRemaining}</span>
              </div>
            )}
          </div>

          {/* Right: Feature controls */}
          <div className="flex items-center gap-1.5">
            <ControlButton onClick={onShowQuality} size="small" title="Calidad">
              <Signal className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onShowAudio} size="small" title="Audio">
              <Music className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onShowSleepTimer} size="small" title="Temporizador">
              <Moon className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onShowCast} size="small" title="Transmitir">
              <Cast className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onShowShare} size="small" title="Compartir">
              <Share2 className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onToggleStats} active={showStats} size="small" title="Estadísticas">
              <BarChart3 className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onTogglePiP} active={isPiP} size="small" title="Picture-in-Picture">
              <PictureInPicture2 className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onShowSettings} size="small" title="Ajustes">
              <Settings className="w-4 h-4" />
            </ControlButton>
            
            <ControlButton onClick={onToggleFullscreen} title="Pantalla completa">
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}
