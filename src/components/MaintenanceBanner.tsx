import { useEffect, useRef, useState } from "react";
import { Sparkles, Zap, Rocket } from "lucide-react";

export function MaintenanceBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [time, setTime] = useState(0);

  // Animated particle / orb field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number; a: number };
    const particles: P[] = [];
    for (let i = 0; i < 110; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2.4 + 0.4,
        hue: 250 + Math.random() * 110,
        a: Math.random() * 0.6 + 0.2,
      });
    }

    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 0.005;
      ctx.fillStyle = "rgba(2,2,8,0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // connect lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(t + i) * 0.15;
        p.y += p.vy + Math.cos(t + i) * 0.15;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.a})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.a * 0.08})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2},100%,70%,${(1 - d / 120) * 0.18})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    const tick = setInterval(() => setTime((s) => s + 1), 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      clearInterval(tick);
    };
  }, []);

  const text = "TRABAJANDO EN ALGO NUEVO";

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden bg-black select-none">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Aurora gradient meshes */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[140px] opacity-40"
          style={{
            background: "radial-gradient(circle, hsl(270 100% 60%) 0%, transparent 60%)",
            animation: "blob-float 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-40"
          style={{
            background: "radial-gradient(circle, hsl(190 100% 55%) 0%, transparent 60%)",
            animation: "blob-float 18s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] rounded-full blur-[160px] opacity-40"
          style={{
            background: "radial-gradient(circle, hsl(330 100% 60%) 0%, transparent 60%)",
            animation: "blob-float 16s ease-in-out infinite",
          }}
        />
      </div>

      {/* Scanning lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, hsl(270 100% 80%) 0px, hsl(270 100% 80%) 1px, transparent 1px, transparent 4px)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(270 100% 80%) 1px, transparent 1px), linear-gradient(90deg, hsl(270 100% 80%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Light beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] left-1/2 w-[300px] h-[160%] opacity-[0.06]"
          style={{
            background: "linear-gradient(180deg, hsl(270 100% 70%), transparent)",
            transform: "translateX(-50%) rotate(-12deg)",
            animation: "beam-sway 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[-20%] left-1/3 w-[200px] h-[160%] opacity-[0.05]"
          style={{
            background: "linear-gradient(180deg, hsl(190 100% 60%), transparent)",
            transform: "rotate(15deg)",
            animation: "beam-sway 12s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Center content */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6">
        {/* Floating logo */}
        <div className="relative mb-10" style={{ animation: "float-y 4s ease-in-out infinite" }}>
          <div className="absolute inset-[-30px] rounded-full border border-white/10 animate-[ping_3s_ease-out_infinite]" />
          <div className="absolute inset-[-15px] rounded-full border border-white/5 animate-[ping_3s_ease-out_infinite_0.7s]" />
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-[hsl(270_30%_15%)] to-[hsl(240_30%_8%)] border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,hsl(270_100%_65%/.5),transparent_180deg)] animate-[spin_6s_linear_infinite]" />
            <Rocket className="relative z-10 w-12 h-12 text-white drop-shadow-[0_0_20px_hsl(270_100%_70%)]" />
          </div>
          {/* Orbiting sparkle */}
          <div className="absolute inset-[-8px] animate-[spin_5s_linear_infinite]">
            <Sparkles className="absolute -top-3 left-1/2 w-5 h-5 text-primary drop-shadow-[0_0_10px_hsl(270_100%_70%)]" />
          </div>
          <div className="absolute inset-[-8px] animate-[spin_7s_linear_infinite_reverse]">
            <Zap className="absolute top-1/2 -right-3 w-4 h-4 text-cyan-300 drop-shadow-[0_0_10px_hsl(190_100%_60%)]" />
          </div>
        </div>

        {/* Headline with animated gradient + glitch shadow */}
        <div className="relative">
          <h1
            className="font-display text-center text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-[0.08em] font-bold leading-[0.95]"
            style={{
              backgroundImage:
                "linear-gradient(110deg, hsl(270 100% 75%) 0%, hsl(190 100% 70%) 25%, hsl(330 100% 70%) 50%, hsl(50 100% 70%) 75%, hsl(270 100% 75%) 100%)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gradient-shift 6s ease-in-out infinite",
              filter: "drop-shadow(0 0 40px hsl(270 100% 60% / 0.45))",
            }}
          >
            {text.split(" ").map((word, i) => (
              <span
                key={i}
                className="inline-block mr-3"
                style={{
                  animation: `float-word 4s ease-in-out ${i * 0.25}s infinite`,
                }}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* Echoed glow text behind */}
          <h1
            aria-hidden
            className="absolute inset-0 font-display text-center text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-[0.08em] font-bold leading-[0.95] blur-2xl opacity-40 -z-10"
            style={{ color: "hsl(270 100% 65%)" }}
          >
            {text}
          </h1>
        </div>

        {/* Subline */}
        <div className="mt-8 flex items-center gap-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/40" />
          <span className="text-[11px] sm:text-xs tracking-[0.5em] uppercase text-white/60 font-tech">
            Pronto disponible
          </span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/40" />
        </div>

        {/* Animated dots loader */}
        <div className="mt-10 flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: `hsl(${270 + i * 20} 100% 65%)`,
                boxShadow: `0 0 12px hsl(${270 + i * 20} 100% 65%)`,
                animation: `dot-bounce 1.4s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {["Nuevo Diseño", "Más Rápido", "Mejor Experiencia"].map((label, i) => (
            <div
              key={label}
              className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md text-xs text-white/70 tracking-wider uppercase"
              style={{ animation: `float-y 5s ease-in-out ${i * 0.4}s infinite` }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Footer brand */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="h-px w-8 bg-white/20" />
          <span className="text-[10px] tracking-[0.5em] uppercase text-white/30 font-tech">
            Fluxo TV · {new Date().getFullYear()}
          </span>
          <div className="h-px w-8 bg-white/20" />
        </div>
      </div>

      {/* Local keyframes */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-word {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes blob-float {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-30px) scale(1.1); }
          66% { transform: translate(-30px,40px) scale(0.95); }
        }
        @keyframes beam-sway {
          0%, 100% { transform: translateX(-50%) rotate(-12deg); }
          50% { transform: translateX(-30%) rotate(-5deg); }
        }
      `}</style>
    </div>
  );
}
