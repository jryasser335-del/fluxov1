import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

interface PremiumOverlayProps {
  isLoading: boolean;
  title: string;
}

export function PremiumOverlay({ isLoading, title }: PremiumOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/20 via-purple-600/10 to-accent/20 blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[80px] animate-[pulse_3s_ease-in-out_infinite]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Premium loader */}
        <div className="relative">
          {/* Outer ring */}
          <div className="w-24 h-24 rounded-full border-2 border-primary/20">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          
          {/* Inner glow */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          
          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
          </div>
          <div className="absolute inset-0 animate-[spin_3s_linear_infinite_reverse]">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent shadow-lg shadow-accent/50" />
          </div>
        </div>

        {/* Title and status */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-display tracking-wider text-white/90 max-w-[280px] truncate">
            {title || "Cargando..."}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-sm text-white/50">Conectando al stream</span>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <span className="text-xs text-white/40">
            Presiona <kbd className="px-1.5 py-0.5 mx-1 rounded bg-white/10 font-mono">?</kbd> para ver atajos
          </span>
        </div>
      </div>
    </div>
  );
}
