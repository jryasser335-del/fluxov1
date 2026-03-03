import { useState, useEffect, useRef } from "react";
import { Sparkles, Zap, Trophy, Radio } from "lucide-react";

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<"logo" | "reveal" | "exit">("logo");
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSkip = () => {
    if (phase !== "exit") {
      setPhase("exit");
      setTimeout(onComplete, 600);
    }
  };

  // Particle system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; hue: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
        hue: 260 + Math.random() * 60,
      });
    }

    let raf: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha * 0.15})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Timeline
  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 1.2, 100));
    }, 25);

    const revealTimer = setTimeout(() => setPhase("reveal"), 800);
    const exitTimer = setTimeout(() => {
      setPhase("exit");
      setTimeout(onComplete, 600);
    }, 3000);

    const handleKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " "].includes(e.key)) handleSkip();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(revealTimer);
      clearTimeout(exitTimer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onComplete]);

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer transition-all duration-700 ${
        phase === "exit" ? "opacity-0 scale-105 blur-sm pointer-events-none" : ""
      }`}
    >
      {/* Deep black base */}
      <div className="absolute inset-0 bg-black" />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

      {/* Cinematic light beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[200px] h-[140%] opacity-[0.04]"
          style={{
            background: "linear-gradient(180deg, hsl(270 100% 65%), transparent)",
            transform: "translateX(-50%) rotate(-15deg)",
            animation: "beam-sway 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[150px] h-[140%] opacity-[0.03]"
          style={{
            background: "linear-gradient(180deg, hsl(300 80% 60%), transparent)",
            transform: "translateX(-30%) rotate(10deg)",
            animation: "beam-sway 6s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Central orb glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`rounded-full transition-all duration-1000 ${
            phase === "logo"
              ? "w-[100px] h-[100px] bg-primary/30 blur-[80px]"
              : "w-[500px] h-[500px] bg-primary/15 blur-[150px]"
          }`}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div
          className={`relative transition-all duration-700 ease-out ${
            phase === "logo" ? "scale-100 opacity-100" : phase === "reveal" ? "scale-90 opacity-100 -translate-y-4" : "scale-75 opacity-0"
          }`}
        >
          {/* Ring pulse */}
          <div className="absolute inset-[-16px] rounded-full border border-primary/20 animate-[ping_2s_ease-out_infinite]" />
          <div className="absolute inset-[-8px] rounded-full border border-primary/10 animate-[ping_2s_ease-out_infinite_0.5s]" />

          {/* Logo container */}
          <div className="relative w-28 h-28 rounded-[28px] bg-gradient-to-br from-[hsl(240_20%_12%)] to-[hsl(240_20%_6%)] border border-white/[0.08] flex items-center justify-center shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" />
            <div className="absolute inset-0 animate-[spin_8s_linear_infinite] opacity-20">
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,hsl(270_100%_65%_/_0.3)_90deg,transparent_180deg)]" />
            </div>
            <img
              src="/pwa-192x192.png"
              alt="FluxoTV"
              className="w-20 h-20 relative z-10 rounded-2xl drop-shadow-2xl"
            />
          </div>

          {/* Orbiting sparkle */}
          <div className="absolute inset-[-4px] animate-[spin_5s_linear_infinite]">
            <Sparkles className="absolute -top-3 left-1/2 w-4 h-4 text-primary drop-shadow-[0_0_8px_hsl(270_100%_65%)]" />
          </div>
        </div>

        {/* Brand text */}
        <div
          className={`mt-8 text-center transition-all duration-700 delay-200 ${
            phase !== "logo" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h1 className="font-display text-6xl md:text-7xl tracking-[0.25em] font-bold leading-none">
            <span className="bg-gradient-to-r from-white via-primary-foreground to-white/80 bg-clip-text text-transparent drop-shadow-[0_0_30px_hsl(270_100%_65%_/_0.3)]">
              FLUXO
            </span>
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary/50" />
            <span className="text-[10px] text-white/40 tracking-[0.4em] uppercase font-tech">
              Premium Streaming
            </span>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </div>

        {/* Feature pills */}
        <div
          className={`mt-8 flex items-center gap-3 transition-all duration-700 delay-500 ${
            phase === "reveal" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {[
            { icon: Trophy, label: "Sports" },
            { icon: Radio, label: "Live" },
            { icon: Zap, label: "4K HDR" },
          ].map(({ icon: Icon, label }, i) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm"
              style={{ animationDelay: `${600 + i * 150}ms` }}
            >
              <Icon className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-white/60 font-medium tracking-wider uppercase">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          className={`mt-10 w-48 transition-all duration-700 delay-300 ${
            phase !== "logo" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full relative overflow-hidden transition-all duration-75 ease-linear"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, hsl(270 100% 65%), hsl(290 80% 60%), hsl(310 70% 60%))",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_0.8s_infinite]" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:100ms]" />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:200ms]" />
            </div>
            <span className="text-[10px] text-white/30 font-tech">Cargando experiencia</span>
          </div>
        </div>
      </div>

      {/* Skip hint */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-700 ${
          phase === "reveal" ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-[10px] text-white/15 tracking-[0.3em] uppercase font-tech">
          Toca para continuar
        </span>
      </div>
    </div>
  );
}
