import { useState, useEffect } from "react";

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [isHiding, setIsHiding] = useState(false);

  const handleClick = () => {
    if (!isHiding) {
      setIsHiding(true);
      setTimeout(onComplete, 700);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isHiding) {
        setIsHiding(true);
        setTimeout(onComplete, 700);
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
      document.removeEventListener("keydown", handleKey);
    };
  }, [isHiding, onComplete]);

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black cursor-pointer transition-all duration-700 ${
        isHiding ? "opacity-0 scale-[1.02] pointer-events-none" : ""
      }`}
    >
      <div className="w-[min(980px,92vw)] rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] shadow-cinema overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute inset-[-140px] animate-spin-glow opacity-60 blur-[48px] bg-[conic-gradient(from_210deg,transparent,rgba(255,255,255,0.20),rgba(255,255,255,0.10),transparent)]" />
        
        <div className="relative p-7 flex gap-5 items-center max-md:flex-col max-md:text-center">
          {/* Orb */}
          <div className="w-[76px] h-[76px] rounded-3xl shrink-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_55%),linear-gradient(135deg,rgba(255,255,255,0.28),rgba(255,255,255,0.10))] border border-white/15 shadow-[0_20px_70px_rgba(255,255,255,0.08)]" />
          
          <div className="flex-1">
            <h1 className="font-display text-[28px] tracking-wider font-bold">FLUXO</h1>
            <p className="mt-1.5 text-white/70 text-sm leading-relaxed">
              Sports + Movies • Interfaz estilo cine.
            </p>
            
            {/* Loading bar */}
            <div className="mt-3.5 h-2.5 rounded-full border border-white/10 bg-black/35 overflow-hidden">
              <div className="h-full w-0 bg-gradient-to-r from-white/60 to-white/20 shadow-[0_0_26px_rgba(255,255,255,0.10)] animate-load-bar" />
            </div>
            
            <p className="mt-2.5 text-white/55 text-xs">
              Cargando… (clic para saltar)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
