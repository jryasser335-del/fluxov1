import { Moon, Clock, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SleepTimerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  remainingTime: number | null;
  formatTime: (seconds: number) => string;
  onSetTimer: (minutes: number) => void;
  onCancelTimer: () => void;
}

const timerOptions = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 hora" },
  { minutes: 90, label: "1.5 horas" },
  { minutes: 120, label: "2 horas" },
];

export function SleepTimerMenu({
  isOpen,
  onClose,
  isActive,
  remainingTime,
  formatTime,
  onSetTimer,
  onCancelTimer,
}: SleepTimerMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-full right-0 mb-2 w-56 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <Moon className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white">Temporizador</span>
      </div>

      {/* Active timer */}
      {isActive && remainingTime !== null && (
        <div className="p-3 bg-purple-500/10 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-sm text-white font-mono">{formatTime(remainingTime)}</span>
            </div>
            <button
              onClick={onCancelTimer}
              className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>
        </div>
      )}

      {/* Timer options */}
      <div className="p-2 space-y-1">
        {timerOptions.map((option) => (
          <button
            key={option.minutes}
            onClick={() => {
              onSetTimer(option.minutes);
              onClose();
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors",
              "hover:bg-white/10 text-white/80"
            )}
          >
            <span className="text-sm">{option.label}</span>
            {isActive && remainingTime && Math.ceil(remainingTime / 60) === option.minutes && (
              <Check className="w-4 h-4 text-purple-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
