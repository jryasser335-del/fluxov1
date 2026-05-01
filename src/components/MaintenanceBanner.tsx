import { useEffect, useRef, useState } from "react";
import { Sparkles, Zap, Star, Flame, ArrowRight } from "lucide-react";

interface MaintenanceBannerProps {
  onSkip?: () => void;
}

export function MaintenanceBanner({ onSkip }: MaintenanceBannerProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [count, setCount] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // Fake countdown that just looks alive
  useEffect(() => {
    const target = Date.now() + 1000 * 60 * 60 * 24 * 7;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCount({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Reactive particle field + lightning bolts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove);

    type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number; a: number };
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const particles: P[] = [];
    for (let i = 0; i < 160; i++) {
      particles.push({
        x: Math.random() * W(),
        y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        r: Math.random() * 2.6 + 0.4,
        hue: 250 + Math.random() * 130,
        a: Math.random() * 0.7 + 0.2,
      });
    }

    // Lightning bolts
    let bolts: { points: { x: number; y: number }[]; life: number; hue: number }[] = [];
    const spawnBolt = () => {
      const startX = Math.random() * W();
      const points = [{ x: startX, y: 0 }];
      let x = startX;
      let y = 0;
      while (y < H()) {
        x += (Math.random() - 0.5) * 60;
        y += 20 + Math.random() * 30;
        points.push({ x, y });
      }
      bolts.push({ points, life: 1, hue: 270 + Math.random() * 80 });
    };
    const boltInterval = setInterval(() => {
      if (Math.random() < 0.6) spawnBolt();
    }, 1800);

    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 0.006;
      ctx.fillStyle = "rgba(2,2,10,0.22)";
      ctx.fillRect(0, 0, W(), H());

      // Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // mouse repulsion
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 22500) {
          const f = (1 - d2 / 22500) * 0.6;
          p.vx += (dx / Math.sqrt(d2 + 0.01)) * f;
          p.vy += (dy / Math.sqrt(d2 + 0.01)) * f;
        }
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx + Math.sin(t + i) * 0.18;
        p.y += p.vy + Math.cos(t + i) * 0.18;
        if (p.x < 0) p.x = W();
        if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H();
        if (p.y > H()) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.a})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,72%,${p.a * 0.07})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ddx = p.x - q.x;
          const ddy = p.y - q.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2},100%,72%,${(1 - d / 130) * 0.2})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Lightning
      bolts = bolts.filter((b) => b.life > 0);
      for (const b of bolts) {
        ctx.strokeStyle = `hsla(${b.hue},100%,75%,${b.life})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = `hsl(${b.hue},100%,70%)`;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(b.points[0].x, b.points[0].y);
        for (let i = 1; i < b.points.length; i++) ctx.lineTo(b.points[i].x, b.points[i].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        b.life -= 0.04;
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      clearInterval(boltInterval);
    };
  }, []);

  const headline = "TRABAJANDO";
  const headline2 = "EN ALGO NUEVO";

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden bg-black select-none cursor-none">
      {/* Particle / lightning canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Aurora blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[760px] h-[760px] rounded-full blur-[160px] opacity-50"
          style={{
            background: "radial-gradient(circle, hsl(280 100% 60%) 0%, transparent 60%)",
            animation: "blob-float 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/4 -right-40 w-[680px] h-[680px] rounded-full blur-[160px] opacity-50"
          style={{
            background: "radial-gradient(circle, hsl(190 100% 55%) 0%, transparent 60%)",
            animation: "blob-float 18s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute -bottom-40 left-1/4 w-[760px] h-[760px] rounded-full blur-[180px] opacity-50"
          style={{
            background: "radial-gradient(circle, hsl(330 100% 60%) 0%, transparent 60%)",
            animation: "blob-float 16s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "radial-gradient(circle, hsl(50 100% 60%) 0%, transparent 60%)",
            animation: "blob-float 20s ease-in-out infinite",
          }}
        />
      </div>

      {/* SVG noise + grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(280 100% 80%) 1px, transparent 1px), linear-gradient(90deg, hsl(280 100% 80%) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
          maskImage: "radial-gradient(ellipse at center, black 25%, transparent 78%)",
          animation: "grid-move 30s linear infinite",
        }}
      />

      {/* Animated wave SVG bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[40vh] pointer-events-none opacity-30"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wg1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(280 100% 65%)" />
            <stop offset="50%" stopColor="hsl(190 100% 60%)" />
            <stop offset="100%" stopColor="hsl(330 100% 65%)" />
          </linearGradient>
          <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(330 100% 65%)" />
            <stop offset="100%" stopColor="hsl(280 100% 65%)" />
          </linearGradient>
        </defs>
        <path fill="url(#wg1)" fillOpacity="0.5">
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="M0,160 C320,240 640,80 1440,180 L1440,320 L0,320 Z;
                    M0,180 C420,100 720,260 1440,160 L1440,320 L0,320 Z;
                    M0,160 C320,240 640,80 1440,180 L1440,320 L0,320 Z"
          />
        </path>
        <path fill="url(#wg2)" fillOpacity="0.35">
          <animate
            attributeName="d"
            dur="11s"
            repeatCount="indefinite"
            values="M0,200 C360,140 780,260 1440,200 L1440,320 L0,320 Z;
                    M0,220 C480,300 820,140 1440,240 L1440,320 L0,320 Z;
                    M0,200 C360,140 780,260 1440,200 L1440,320 L0,320 Z"
          />
        </path>
      </svg>

      {/* Concentric rotating rings (SVG) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg className="w-[140vmin] h-[140vmin] opacity-20" viewBox="0 0 800 800">
          <defs>
            <linearGradient id="ringg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(280 100% 70%)" />
              <stop offset="50%" stopColor="hsl(190 100% 60%)" />
              <stop offset="100%" stopColor="hsl(330 100% 65%)" />
            </linearGradient>
          </defs>
          {[280, 220, 160, 100].map((r, i) => (
            <g key={r} style={{ transformOrigin: "400px 400px", animation: `rot-${i} ${20 + i * 6}s linear infinite ${i % 2 ? "reverse" : ""}` }}>
              <circle
                cx="400"
                cy="400"
                r={r}
                fill="none"
                stroke="url(#ringg)"
                strokeWidth="1"
                strokeDasharray={`${20 + i * 8} ${10 + i * 4}`}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Center content */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6">
        {/* 3D rotating orb */}
        <div
          className="relative mb-8"
          style={{ animation: "float-y 5s ease-in-out infinite", perspective: "800px" }}
        >
          <div className="absolute inset-[-40px] rounded-full border border-white/10 animate-[ping_3s_ease-out_infinite]" />
          <div className="absolute inset-[-20px] rounded-full border border-white/5 animate-[ping_3s_ease-out_infinite_0.7s]" />

          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_80px_hsl(280_100%_60%/0.6)] overflow-hidden"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(280 100% 60%), hsl(190 100% 55%), hsl(330 100% 60%), hsl(50 100% 60%), hsl(280 100% 60%))",
              animation: "spin 8s linear infinite",
            }}
          >
            <div className="absolute inset-2 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center">
              <Flame className="w-12 h-12 text-white drop-shadow-[0_0_20px_hsl(280_100%_70%)]" style={{ animation: "spin 8s linear infinite reverse" }} />
            </div>
          </div>

          <div className="absolute inset-[-12px] animate-[spin_5s_linear_infinite]">
            <Sparkles className="absolute -top-3 left-1/2 w-5 h-5 text-fuchsia-300 drop-shadow-[0_0_10px_hsl(300_100%_70%)]" />
          </div>
          <div className="absolute inset-[-12px] animate-[spin_7s_linear_infinite_reverse]">
            <Zap className="absolute top-1/2 -right-3 w-5 h-5 text-cyan-300 drop-shadow-[0_0_10px_hsl(190_100%_60%)]" />
          </div>
          <div className="absolute inset-[-12px] animate-[spin_9s_linear_infinite]">
            <Star className="absolute -bottom-3 left-1/2 w-4 h-4 text-amber-200 drop-shadow-[0_0_10px_hsl(50_100%_70%)]" />
          </div>
        </div>

        {/* Tag chip */}
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-400" />
          </span>
          <span className="text-[10px] tracking-[0.4em] uppercase text-white/70 font-tech">
            En construcción
          </span>
        </div>

        {/* MASSIVE liquid chrome headline */}
        <div className="relative w-full max-w-[1400px]">
          {[headline, headline2].map((line, lineIdx) => (
            <div key={lineIdx} className="relative text-center">
              {/* Glow echo */}
              <h1
                aria-hidden
                className="absolute inset-0 font-display text-center font-bold leading-[0.9] blur-3xl opacity-50 -z-10"
                style={{
                  fontSize: "clamp(3.5rem, 13vw, 13rem)",
                  color: lineIdx ? "hsl(190 100% 60%)" : "hsl(280 100% 60%)",
                }}
              >
                {line}
              </h1>

              <h1
                className="font-display font-bold leading-[0.9] tracking-[0.04em]"
                style={{
                  fontSize: "clamp(3.5rem, 13vw, 13rem)",
                  backgroundImage:
                    "linear-gradient(120deg, hsl(280 100% 80%) 0%, hsl(190 100% 75%) 20%, hsl(330 100% 75%) 40%, hsl(50 100% 75%) 60%, hsl(280 100% 80%) 80%, hsl(190 100% 75%) 100%)",
                  backgroundSize: "300% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: `gradient-shift 5s ease-in-out infinite ${lineIdx * 0.3}s`,
                  filter: "drop-shadow(0 0 30px hsl(280 100% 60% / 0.4))",
                }}
              >
                {line.split("").map((ch, i) => (
                  <span
                    key={i}
                    className="inline-block"
                    style={{
                      animation: `letter-float 3.5s ease-in-out ${(lineIdx * 8 + i) * 0.05}s infinite`,
                    }}
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </span>
                ))}
              </h1>
            </div>
          ))}
        </div>

        {/* Subline with shimmer */}
        <div className="mt-10 flex items-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/40" />
          <span
            className="text-[11px] sm:text-xs tracking-[0.6em] uppercase font-tech bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, hsl(280 100% 80%), hsl(190 100% 75%), hsl(330 100% 80%), hsl(280 100% 80%))",
              backgroundSize: "200% 100%",
              animation: "gradient-shift 4s linear infinite",
            }}
          >
            Una nueva era de Fluxo
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/40" />
        </div>

        {/* Countdown */}
        <div className="mt-10 flex items-center gap-3 sm:gap-5">
          {[
            { v: count.d, l: "Días" },
            { v: count.h, l: "Horas" },
            { v: count.m, l: "Min" },
            { v: count.s, l: "Seg" },
          ].map((seg, i) => (
            <div key={seg.l} className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-fuchsia-500/40 via-cyan-500/30 to-amber-500/30 blur-md opacity-70" />
              <div className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(280 100% 80%), transparent)" }}
                />
                <div
                  key={seg.v}
                  className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums"
                  style={{ animation: "flip-in 0.5s ease-out" }}
                >
                  {String(seg.v).padStart(2, "0")}
                </div>
                <div className="text-[9px] tracking-[0.3em] uppercase text-white/40 font-tech mt-1">
                  {seg.l}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 max-w-2xl">
          {["Nuevo Diseño", "Más Rápido", "4K HDR", "Multi Stream", "Premium"].map((label, i) => (
            <div
              key={label}
              className="relative group px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-xs text-white/70 tracking-[0.2em] uppercase overflow-hidden"
              style={{ animation: `float-y 5s ease-in-out ${i * 0.4}s infinite` }}
            >
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(280 100% 80% / 0.25), transparent)",
                }}
              />
              <span className="relative">{label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="h-px w-10 bg-white/20" />
          <span className="text-[10px] tracking-[0.5em] uppercase text-white/30 font-tech">
            Fluxo TV · {new Date().getFullYear()}
          </span>
          <div className="h-px w-10 bg-white/20" />
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
          50% { transform: translateY(-12px); }
        }
        @keyframes letter-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(-1deg); }
        }
        @keyframes blob-float {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(50px,-40px) scale(1.12); }
          66% { transform: translate(-40px,50px) scale(0.92); }
        }
        @keyframes grid-move {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 70px 70px, 70px 70px; }
        }
        @keyframes flip-in {
          0% { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes rot-0 { to { transform: rotate(360deg); } }
        @keyframes rot-1 { to { transform: rotate(360deg); } }
        @keyframes rot-2 { to { transform: rotate(360deg); } }
        @keyframes rot-3 { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
