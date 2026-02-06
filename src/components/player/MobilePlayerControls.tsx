import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Maximize2, Settings, Share2, Subtitles, Signal, X,
  ChevronUp, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MobilePlayerControlsProps {
  isVisible: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isLiveContent: boolean;
  currentTime: number;
  duration: number;
  title: string;
  subtitlesEnabled: boolean;
  hasMultipleOptions: boolean;
  activeOption: 1 | 2 | 3;
  availableOptions: { num: 1 | 2 | 3; url: string | undefined }[];
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSeek: (seconds: number) => void;
  onSeekTo: (time: number) => void;
  onToggleFullscreen: () => void;
  onToggleSubtitles: () => void;
  onShowSettings: () => void;
  onShowShare: () => void;
  onChangeOption: (option: 1 | 2 | 3) => void;
  onClose: () => void;
}

export function MobilePlayerControls({
  isVisible,
  isPlaying,
  isMuted,
  isLiveContent,
  currentTime,
  duration,
  title,
  subtitlesEnabled,
  hasMultipleOptions,
  activeOption,
  availableOptions,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onSeekTo,
  onToggleFullscreen,
  onToggleSubtitles,
  onShowSettings,
  onShowShare,
  onChangeOption,
  onClose,
}: MobilePlayerControlsProps) {
  const [showMoreControls, setShowMoreControls] = useState(false);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeekTo(Number(e.target.value));
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex flex-col justify-between transition-opacity duration-300 md:hidden",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Top gradient overlay */}
      <div 
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
      />
      
      {/* Bottom gradient overlay */}
      <div 
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)' }}
      />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center border border-white/10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-medium truncate text-sm">
              {title || "Reproduciendo"}
            </h2>
            {isLiveContent && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">En vivo</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowShare}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center border border-white/10"
          >
            <Share2 className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Center Play Area - Tap to play/pause */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="flex items-center gap-8">
          {/* Rewind */}
          {!isLiveContent && (
            <button
              onClick={() => onSeek(-10)}
              className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <RotateCcw className="w-6 h-6 text-white/90" />
              <span className="absolute text-[10px] font-bold text-white/70 mt-6">10</span>
            </button>
          )}

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/20 active:scale-90 transition-transform shadow-2xl"
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white ml-1" />
            )}
          </button>

          {/* Forward */}
          {!isLiveContent && (
            <button
              onClick={() => onSeek(10)}
              className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <RotateCcw className="w-6 h-6 text-white/90 -scale-x-100" />
              <span className="absolute text-[10px] font-bold text-white/70 mt-6">10</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 px-4 pb-4 space-y-3">
        {/* Stream Options - Pills */}
        {hasMultipleOptions && (
          <div className="flex items-center justify-center gap-2 pb-2">
            {availableOptions.map((opt) => (
              <button
                key={opt.num}
                onClick={() => onChangeOption(opt.num)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 border",
                  activeOption === opt.num
                    ? "bg-white text-black border-white shadow-lg shadow-white/20"
                    : "bg-black/60 text-white/80 border-white/20 backdrop-blur-xl"
                )}
              >
                Opción {opt.num}
              </button>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {!isLiveContent && duration > 0 && (
          <div className="space-y-2">
            <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/60 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleMute}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                isMuted ? "bg-white/20" : "bg-black/40"
              )}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white/80" />
              )}
            </button>

            <button
              onClick={onToggleSubtitles}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                subtitlesEnabled ? "bg-primary/30 text-primary" : "bg-black/40 text-white/80"
              )}
            >
              <Subtitles className="w-5 h-5" />
            </button>
          </div>

          {/* Center - More options button */}
          <button
            onClick={() => setShowMoreControls(!showMoreControls)}
            className={cn(
              "h-11 px-5 rounded-xl flex items-center gap-2 transition-all",
              showMoreControls ? "bg-white/20" : "bg-black/40"
            )}
          >
            <Settings className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/80">Más</span>
            <ChevronUp className={cn(
              "w-4 h-4 text-white/60 transition-transform",
              showMoreControls && "rotate-180"
            )} />
          </button>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <button
              onClick={onShowSettings}
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-black/40"
            >
              <Signal className="w-5 h-5 text-white/80" />
            </button>

            <button
              onClick={onToggleFullscreen}
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/20"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Expanded More Controls */}
        {showMoreControls && (
          <div className="grid grid-cols-4 gap-2 pt-2 animate-fade-in">
            <button
              onClick={onShowSettings}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-black/40 backdrop-blur-xl"
            >
              <Signal className="w-5 h-5 text-white/80" />
              <span className="text-[10px] text-white/60">Calidad</span>
            </button>
            <button
              onClick={onToggleSubtitles}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 rounded-xl backdrop-blur-xl",
                subtitlesEnabled ? "bg-primary/20" : "bg-black/40"
              )}
            >
              <Subtitles className={cn("w-5 h-5", subtitlesEnabled ? "text-primary" : "text-white/80")} />
              <span className="text-[10px] text-white/60">Subtítulos</span>
            </button>
            <button
              onClick={onShowShare}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-black/40 backdrop-blur-xl"
            >
              <Share2 className="w-5 h-5 text-white/80" />
              <span className="text-[10px] text-white/60">Compartir</span>
            </button>
            <button
              onClick={onToggleFullscreen}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-black/40 backdrop-blur-xl"
            >
              <Maximize2 className="w-5 h-5 text-white/80" />
              <span className="text-[10px] text-white/60">Expandir</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
