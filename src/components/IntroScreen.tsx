import { useState, useEffect } from "react";
import { Sparkles, Play, Zap } from "lucide-react";

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [isHiding, setIsHiding] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = () => {
    if (!isHiding) {
      setIsHiding(true);
      setTimeout(onComplete, 600);
    }
  };

  useEffect(() => {
    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 100));
    }, 40);

    const timer = setTimeout(() => {
      if (!isHiding) {
        setIsHiding(true);
        setTimeout(onComplete, 600);
      }
    }, 2200);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        handleClick();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isHiding, onComplete]);

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer transition-all duration-600 ${
        isHiding ? "opacity-0 scale-105 pointer-events-none" : ""
      }`}
      style={{
        background: "radial-gradient(ellipse at 50% 30%, hsl(270 60% 15% / 0.4), hsl(220 20% 4%) 70%)",
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative w-[min(520px,90vw)]">
        {/* Main card */}
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Top shine */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          
          {/* Rotating glow */}
          <div className="absolute inset-[-100px] animate-spin-glow opacity-40 blur-[40px] bg-[conic-gradient(from_180deg,transparent,hsl(270_100%_65%_/_0.3),transparent_120deg)]" />
          
          <div className="relative p-8 flex flex-col items-center text-center">
            {/* Logo container */}
            <div className="relative mb-6">
              <div className="absolute inset-0 scale-150 bg-primary/20 blur-3xl rounded-full animate-glow-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(220_20%_15%)] to-[hsl(220_20%_8%)] border border-white/15 flex items-center justify-center p-3 shadow-xl">
                <img 
                  src="https://images.seeklogo.com/logo-png/48/1/fluxo-logo-png_seeklogo-485780.png" 
                  alt="Fluxo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-primary animate-float" />
            </div>
            
            {/* Title */}
            <h1 className="font-display text-4xl tracking-wider font-bold gradient-text mb-2">
              FLUXO
            </h1>
            
            <p className="text-white/60 text-sm mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Stream • Movies • Sports
            </p>
            
            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-2 rounded-full border border-white/10 bg-black/40 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary via-purple-400 to-primary transition-all duration-100 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-white/40 text-xs flex items-center justify-center gap-2">
                <Play className="w-3 h-3" />
                Cargando experiencia…
              </p>
            </div>
          </div>
        </div>
        
        {/* Skip hint */}
        <p className="text-center mt-4 text-white/30 text-xs">
          Presiona cualquier tecla o haz clic para continuar
        </p>
      </div>
    </div>
  );
}
