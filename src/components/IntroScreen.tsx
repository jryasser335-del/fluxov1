import { useState, useEffect } from "react";
import { Sparkles, Play, Zap, Tv, Film, Trophy } from "lucide-react";

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [isHiding, setIsHiding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    { icon: Tv, label: "Canales en Vivo" },
    { icon: Film, label: "Películas HD" },
    { icon: Trophy, label: "Eventos Deportivos" },
  ];

  const handleClick = () => {
    if (!isHiding) {
      setIsHiding(true);
      setTimeout(onComplete, 800);
    }
  };

  useEffect(() => {
    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1.5, 100));
    }, 30);

    // Cycle features
    const featureInterval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length);
    }, 800);

    const timer = setTimeout(() => {
      if (!isHiding) {
        setIsHiding(true);
        setTimeout(onComplete, 800);
      }
    }, 2500);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        handleClick();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      clearInterval(featureInterval);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isHiding, onComplete]);

  const CurrentIcon = features[currentFeature].icon;

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer transition-all duration-800 ${
        isHiding ? "opacity-0 scale-110 pointer-events-none" : ""
      }`}
    >
      {/* Premium dark gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 20%, hsl(270 80% 20% / 0.4), transparent),
            radial-gradient(ellipse 60% 40% at 80% 80%, hsl(300 70% 15% / 0.3), transparent),
            radial-gradient(ellipse 50% 30% at 20% 60%, hsl(250 60% 15% / 0.3), transparent),
            linear-gradient(180deg, hsl(240 20% 4%) 0%, hsl(240 25% 2%) 100%)
          `,
        }}
      />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="relative w-[min(480px,90vw)]">
        {/* Main card with premium glass effect */}
        <div className="relative rounded-[32px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.01] backdrop-blur-3xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          
          {/* Rotating glow ring */}
          <div className="absolute inset-[-150px] animate-[spin_10s_linear_infinite] opacity-30">
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,hsl(270_100%_65%_/_0.4)_60deg,transparent_120deg)]" />
          </div>
          
          <div className="relative p-10 flex flex-col items-center text-center">
            {/* Logo with premium effects */}
            <div className="relative mb-8">
              {/* Outer glow */}
              <div className="absolute inset-0 scale-[2] bg-primary/20 blur-[60px] rounded-full animate-pulse" />
              
              {/* Logo container */}
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[hsl(240_20%_18%)] to-[hsl(240_20%_8%)] border border-white/10 flex items-center justify-center shadow-2xl shadow-primary/30 overflow-hidden">
                  {/* Inner gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  
                  {/* Logo image */}
                  <img 
                    src="/pwa-192x192.png" 
                    alt="FluxoTV" 
                    className="w-16 h-16 relative z-10 rounded-xl"
                  />
                </div>
                
                {/* Orbiting sparkle */}
                <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                  <Sparkles className="absolute -top-2 right-0 w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
            
            {/* Brand */}
            <h1 className="font-display text-5xl tracking-[0.2em] font-bold mb-2">
              <span className="bg-gradient-to-r from-white via-primary-foreground to-white bg-clip-text text-transparent">
                FLUXO
              </span>
            </h1>
            
            <p className="text-sm text-white/50 tracking-widest uppercase mb-8">
              Streaming Premium
            </p>
            
            {/* Animated feature showcase */}
            <div className="flex items-center gap-3 mb-8 h-8">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/30">
                <CurrentIcon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-white/70 text-sm font-medium animate-in fade-in duration-300" key={currentFeature}>
                {features[currentFeature].label}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-1.5 rounded-full border border-white/10 bg-black/40 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-100 ease-out relative overflow-hidden"
                  style={{ 
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, hsl(270 100% 65%), hsl(280 90% 60%), hsl(300 80% 60%))"
                  }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_infinite]" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:100ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:200ms]" />
                </div>
                <span className="text-white/40 text-xs">Preparando tu experiencia</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Skip hint */}
        <p className="text-center mt-6 text-white/20 text-xs tracking-wider">
          Toca para continuar
        </p>
      </div>
    </div>
  );
}
