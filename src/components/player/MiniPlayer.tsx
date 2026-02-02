import { X, Maximize2, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniPlayerProps {
  isVisible: boolean;
  title: string;
  isPlaying: boolean;
  isMuted: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onExpand: () => void;
  onClose: () => void;
}

export function MiniPlayer({
  isVisible,
  title,
  isPlaying,
  isMuted,
  onTogglePlay,
  onToggleMute,
  onExpand,
  onClose,
}: MiniPlayerProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9985] animate-slide-in-right">
      <div className="w-80 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl">
        {/* Video placeholder */}
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative flex items-center justify-center">
          <span className="text-4xl">📺</span>
          
          {/* Overlay controls */}
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between p-3 bg-black/60">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-sm font-medium text-white truncate">{title}</p>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleMute}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/60" />
              ) : (
                <Volume2 className="w-4 h-4 text-white/60" />
              )}
            </button>
            <button
              onClick={onExpand}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-white/60" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
