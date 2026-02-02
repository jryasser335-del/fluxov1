import { Check, Sparkles, Zap, Signal } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuality: string;
  availableQualities: string[];
  onSelectQuality: (quality: string) => void;
}

const qualityIcons: Record<string, React.ReactNode> = {
  "Auto": <Sparkles className="w-4 h-4 text-primary" />,
  "1080p": <Zap className="w-4 h-4 text-green-400" />,
  "720p": <Signal className="w-4 h-4 text-blue-400" />,
  "480p": <Signal className="w-4 h-4 text-yellow-400" />,
  "360p": <Signal className="w-4 h-4 text-orange-400" />,
};

const qualityLabels: Record<string, string> = {
  "Auto": "Automática",
  "1080p": "Full HD",
  "720p": "HD",
  "480p": "SD",
  "360p": "Baja",
};

export function QualitySelector({
  isOpen,
  onClose,
  currentQuality,
  availableQualities,
  onSelectQuality,
}: QualitySelectorProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Calidad de video</p>
      </div>

      {/* Quality options */}
      <div className="p-2 space-y-1">
        {availableQualities.map((quality) => (
          <button
            key={quality}
            onClick={() => {
              onSelectQuality(quality);
              onClose();
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors",
              currentQuality === quality
                ? "bg-primary/20 text-primary"
                : "hover:bg-white/10 text-white/80"
            )}
          >
            <div className="flex items-center gap-3">
              {qualityIcons[quality] || <Signal className="w-4 h-4 text-white/40" />}
              <div className="text-left">
                <span className="text-sm font-medium">{quality}</span>
                {qualityLabels[quality] && (
                  <p className="text-[10px] text-white/40">{qualityLabels[quality]}</p>
                )}
              </div>
            </div>
            {currentQuality === quality && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
