import { 
  Settings, Volume2, VolumeX, Maximize2, Minimize2, 
  PictureInPicture2, MonitorPlay, Keyboard, BarChart3,
  Share2, Clock, ChevronRight, Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isPiP: boolean;
  onTogglePiP: () => void;
  isTheaterMode: boolean;
  onToggleTheater: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onShowKeyboardShortcuts: () => void;
  onShowShare: () => void;
}

const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function QuickSettings({
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  isPiP,
  onTogglePiP,
  isTheaterMode,
  onToggleTheater,
  showStats,
  onToggleStats,
  playbackSpeed,
  onSpeedChange,
  onShowKeyboardShortcuts,
  onShowShare,
}: QuickSettingsProps) {
  if (!isOpen) return null;

  const toggleSettings = [
    {
      icon: isMuted ? VolumeX : Volume2,
      label: isMuted ? "Activar sonido" : "Silenciar",
      active: isMuted,
      onClick: onToggleMute,
    },
    {
      icon: isFullscreen ? Minimize2 : Maximize2,
      label: isFullscreen ? "Salir de pantalla completa" : "Pantalla completa",
      active: isFullscreen,
      onClick: onToggleFullscreen,
      shortcut: "F",
    },
    {
      icon: PictureInPicture2,
      label: "Picture-in-Picture",
      active: isPiP,
      onClick: onTogglePiP,
      shortcut: "P",
    },
    {
      icon: MonitorPlay,
      label: "Modo teatro",
      active: isTheaterMode,
      onClick: onToggleTheater,
      shortcut: "T",
    },
    {
      icon: BarChart3,
      label: "Estadísticas de stream",
      active: showStats,
      onClick: onToggleStats,
    },
  ];

  return (
    <div 
      className="absolute bottom-full right-0 mb-2 w-72 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <Settings className="w-4 h-4 text-white/60" />
        <span className="text-sm font-medium text-white">Ajustes rápidos</span>
      </div>

      {/* Toggle settings */}
      <div className="p-2 space-y-1 border-b border-white/10">
        {toggleSettings.map((setting) => (
          <button
            key={setting.label}
            onClick={() => { setting.onClick(); }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors",
              setting.active ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-white/80"
            )}
          >
            <div className="flex items-center gap-3">
              <setting.icon className="w-4 h-4" />
              <span className="text-sm">{setting.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {setting.shortcut && (
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/50">
                  {setting.shortcut}
                </kbd>
              )}
              <div className={cn(
                "w-4 h-4 rounded-full border-2 transition-colors",
                setting.active ? "bg-primary border-primary" : "border-white/30"
              )} />
            </div>
          </button>
        ))}
      </div>

      {/* Playback speed */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">Velocidad</span>
          <span className="ml-auto text-xs text-primary font-bold">{playbackSpeed}x</span>
        </div>
        <div className="flex gap-1">
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                playbackSpeed === speed
                  ? "bg-primary text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              )}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Additional options */}
      <div className="p-2">
        <button
          onClick={() => { onShowKeyboardShortcuts(); onClose(); }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-white/80"
        >
          <div className="flex items-center gap-3">
            <Keyboard className="w-4 h-4" />
            <span className="text-sm">Atajos de teclado</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </button>

        <button
          onClick={() => { onShowShare(); onClose(); }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-white/80"
        >
          <div className="flex items-center gap-3">
            <Share2 className="w-4 h-4" />
            <span className="text-sm">Compartir</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </button>
      </div>
    </div>
  );
}
