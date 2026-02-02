import { X, Hand, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface GestureGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const gestures = [
  {
    icon: "👆",
    action: "Doble toque izquierdo",
    description: "Retroceder 10 segundos",
  },
  {
    icon: "👆",
    action: "Doble toque derecho",
    description: "Adelantar 10 segundos",
  },
  {
    icon: "👆",
    action: "Toque simple",
    description: "Mostrar/ocultar controles",
  },
  {
    icon: "↕️",
    action: "Deslizar vertical (izq)",
    description: "Ajustar brillo",
  },
  {
    icon: "↕️",
    action: "Deslizar vertical (der)",
    description: "Ajustar volumen",
  },
  {
    icon: "↔️",
    action: "Deslizar horizontal",
    description: "Buscar en video",
  },
  {
    icon: "🤏",
    action: "Pellizcar",
    description: "Zoom in/out",
  },
];

export function GestureGuide({ isOpen, onClose }: GestureGuideProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-3xl overflow-hidden border border-white/10 bg-black/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white">Gestos táctiles</h3>
              <p className="text-xs text-white/50">Controla el reproductor con gestos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Gestures list */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {gestures.map((gesture, index) => (
            <div
              key={index}
              className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-2xl">{gesture.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{gesture.action}</p>
                <p className="text-xs text-white/50">{gesture.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">Disponible en dispositivos táctiles</p>
        </div>
      </div>
    </div>
  );
}
