import { Music, Volume2, Mic, Radio, Waves, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AudioMixerProps {
  isOpen: boolean;
  onClose: () => void;
}

const presets = [
  { id: "normal", name: "Normal", icon: Volume2, description: "Sin ecualización" },
  { id: "movie", name: "Cine", icon: Music, description: "Optimizado para diálogos" },
  { id: "sports", name: "Deportes", icon: Radio, description: "Ambiente de estadio" },
  { id: "music", name: "Música", icon: Waves, description: "Graves y agudos mejorados" },
  { id: "voice", name: "Voz", icon: Mic, description: "Claridad de voz" },
];

export function AudioMixer({ isOpen, onClose }: AudioMixerProps) {
  const [activePreset, setActivePreset] = useState("normal");
  const [bassBoost, setBassBoost] = useState(50);
  const [trebleBoost, setTrebleBoost] = useState(50);

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <Music className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">Audio</span>
      </div>

      {/* Presets */}
      <div className="p-2 border-b border-white/10">
        <p className="text-[10px] text-white/40 uppercase tracking-wider px-2 mb-2">Preajustes</p>
        <div className="space-y-1">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setActivePreset(preset.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                activePreset === preset.id
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-white/10 text-white/80"
              )}
            >
              <preset.icon className="w-4 h-4" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{preset.name}</p>
                <p className="text-[10px] text-white/40">{preset.description}</p>
              </div>
              {activePreset === preset.id && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Manual controls */}
      <div className="p-3 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Graves</span>
            <span className="text-xs text-primary font-mono">{bassBoost}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={bassBoost}
            onChange={(e) => setBassBoost(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Agudos</span>
            <span className="text-xs text-primary font-mono">{trebleBoost}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={trebleBoost}
            onChange={(e) => setTrebleBoost(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
