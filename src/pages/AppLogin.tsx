import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, User, Lock, Eye, EyeOff, Ghost, Sparkles } from "lucide-react";

/* ===== Animated Gengar SVG ===== */
function GengarMascot() {
  return (
    <div className="relative w-44 h-44 mx-auto animate-ghost-float">
      {/* aura halo */}
      <div className="absolute inset-[-30px] rounded-full bg-[radial-gradient(circle,hsl(275_90%_55%/.55),transparent_65%)] blur-2xl animate-shadow-pulse" />
      {/* rotating aurora ring */}
      <div className="absolute inset-[-18px] rounded-full opacity-50 animate-aurora"
        style={{ background: "conic-gradient(from 0deg, transparent, hsl(280 90% 60% / .5), transparent, hsl(320 90% 60% / .4), transparent)" }} />

      <svg viewBox="0 0 200 200" className="relative w-full h-full drop-shadow-[0_20px_40px_hsl(275_90%_40%/.7)] animate-gengar-laugh">
        <defs>
          <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(280 55% 40%)" />
            <stop offset="60%" stopColor="hsl(275 60% 22%)" />
            <stop offset="100%" stopColor="hsl(270 70% 10%)" />
          </radialGradient>
          <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(0 100% 90%)" />
            <stop offset="60%" stopColor="hsl(0 100% 60%)" />
            <stop offset="100%" stopColor="hsl(350 100% 40%)" />
          </radialGradient>
        </defs>

        {/* spikes on top */}
        <path d="M40 60 L55 30 L65 55 M75 50 L90 22 L100 50 M110 50 L125 22 L135 50 M145 55 L160 30 L155 65"
          fill="url(#bodyGrad)" stroke="hsl(270 50% 8%)" strokeWidth="2" strokeLinejoin="round" />

        {/* body */}
        <ellipse cx="100" cy="115" rx="72" ry="68" fill="url(#bodyGrad)" stroke="hsl(270 50% 8%)" strokeWidth="2" />

        {/* ears */}
        <path d="M30 80 L18 55 L48 70 Z" fill="url(#bodyGrad)" stroke="hsl(270 50% 8%)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M170 80 L182 55 L152 70 Z" fill="url(#bodyGrad)" stroke="hsl(270 50% 8%)" strokeWidth="2" strokeLinejoin="round" />

        {/* back spikes silhouette */}
        <path d="M30 150 L20 175 L45 160 M155 160 L180 175 L170 150" fill="hsl(270 60% 15%)" opacity=".8" />

        {/* eyes - glowing red */}
        <g className="origin-center" style={{ transformBox: "fill-box" }}>
          <g className="animate-eye-glow">
            <ellipse cx="72" cy="100" rx="14" ry="16" fill="url(#eyeGrad)" />
            <ellipse cx="128" cy="100" rx="14" ry="16" fill="url(#eyeGrad)" />
            <circle cx="72" cy="102" r="4" fill="hsl(270 80% 8%)" />
            <circle cx="128" cy="102" r="4" fill="hsl(270 80% 8%)" />
            <circle cx="74" cy="98" r="1.6" fill="white" />
            <circle cx="130" cy="98" r="1.6" fill="white" />
          </g>
        </g>

        {/* mischievous grin */}
        <g className="animate-grin-pulse origin-center" style={{ transformBox: "fill-box", transformOrigin: "100px 140px" }}>
          <path d="M55 135 Q100 175 145 135 Q140 158 100 162 Q60 158 55 135 Z"
            fill="hsl(270 80% 6%)" stroke="hsl(270 50% 4%)" strokeWidth="1.5" />
          {/* teeth */}
          <path d="M65 138 L72 152 L79 138 M82 140 L89 156 L96 140 M100 141 L107 157 L114 141 M118 140 L125 156 L132 140 M135 138 L142 152 L149 138"
            fill="white" stroke="hsl(270 30% 70%)" strokeWidth=".5" />
          {/* tongue hint */}
          <ellipse cx="100" cy="152" rx="14" ry="5" fill="hsl(330 70% 45%)" opacity=".7" />
        </g>
      </svg>
    </div>
  );
}

/* ===== Floating spectral particles ===== */
function GhostParticles() {
  const items = Array.from({ length: 14 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((_, i) => {
        const left = (i * 73) % 100;
        const delay = (i * 0.7) % 8;
        const dur = 9 + (i % 5) * 2;
        const size = 10 + (i % 4) * 6;
        const dx = ((i * 37) % 160) - 80;
        return (
          <div
            key={i}
            className="absolute bottom-[-40px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size + 4,
              ["--dx" as any]: `${dx}px`,
              animation: `spectral-drift ${dur}s linear ${delay}s infinite`,
            }}
          >
            <svg viewBox="0 0 24 28" className="w-full h-full opacity-70">
              <path
                d="M4 12 C4 5 20 5 20 12 V24 L17 21 L14 24 L11 21 L8 24 L4 21 Z"
                fill="hsl(280 80% 55% / .55)"
                stroke="hsl(290 90% 75% / .6)"
                strokeWidth=".8"
              />
              <circle cx="9" cy="13" r="1.4" fill="hsl(0 100% 75%)" />
              <circle cx="15" cy="13" r="1.4" fill="hsl(0 100% 75%)" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

export default function AppLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { appUser, isLoading, login, checkAccess } = useAppAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (appUser && checkAccess()) navigate("/");
  }, [appUser, navigate, checkAccess]);

  // 3D tilt on mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  };
  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (el) el.style.transform = "perspective(1200px) rotateY(0) rotateX(0)";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Ingresa usuario y contraseña");
      return;
    }
    const { error } = await login(username, password);
    if (error) toast.error(error);
    else {
      toast.success("¡Bienvenido al inframundo!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Deep void background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(275_60%_14%),hsl(265_45%_4%)_60%,hsl(260_50%_2%))]" />

      {/* Aurora orbs */}
      <div className="absolute top-1/4 -left-32 w-[520px] h-[520px] rounded-full bg-primary/25 blur-[140px] animate-orb-drift" />
      <div className="absolute bottom-0 -right-32 w-[520px] h-[520px] rounded-full bg-accent/20 blur-[140px] animate-orb-drift-reverse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[hsl(290_90%_50%/.08)] blur-[160px]" />

      {/* Animated grid */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(280 80% 60% / .25) 1px, transparent 1px), linear-gradient(90deg, hsl(280 80% 60% / .25) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Floating ghosts */}
      <GhostParticles />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Mascot */}
        <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6"}`}>
          <GengarMascot />
        </div>

        {/* Brand */}
        <div className={`text-center mt-2 mb-6 transition-all duration-700 delay-150 ${mounted ? "opacity-100" : "opacity-0"}`}>
          <h1 className="font-display text-5xl tracking-[0.3em] text-gengar-gradient drop-shadow-[0_0_30px_hsl(280_90%_55%/.5)]">
            FLUXO
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Ghost className="w-3 h-3 text-primary-glow animate-pulse" />
            <span className="text-[10px] tracking-[0.45em] uppercase text-primary-glow/70 font-tech">
              Shadow Streaming
            </span>
            <Ghost className="w-3 h-3 text-primary-glow animate-pulse" />
          </div>
        </div>

        {/* Card */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`relative transition-all duration-700 delay-300 will-change-transform ${
            mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Conic glow border */}
          <div className="absolute -inset-[2px] rounded-3xl opacity-80 animate-aurora"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(275 95% 60%), hsl(320 90% 60%), hsl(260 90% 55%), hsl(290 100% 65%), hsl(275 95% 60%))",
              filter: "blur(8px)",
            }}
          />
          <div className="absolute -inset-[1px] rounded-3xl bg-[conic-gradient(from_180deg,hsl(275_95%_60%),hsl(320_90%_60%),hsl(275_95%_60%))] opacity-60" />

          <div className="relative rounded-3xl bg-[hsl(268_40%_5%/.85)] backdrop-blur-2xl border border-primary/15 p-7 shadow-[0_30px_80px_-20px_hsl(275_90%_30%/.6)]">
            {/* corner sparkles */}
            <Sparkles className="absolute -top-3 -right-3 w-5 h-5 text-primary-glow animate-pulse" />
            <Sparkles className="absolute -bottom-3 -left-3 w-4 h-4 text-accent animate-pulse [animation-delay:.5s]" />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-primary-glow/70 text-xs font-tech tracking-[0.25em] uppercase pl-1">Invocador</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/40 to-accent/40 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-300" />
                  <div className="relative flex items-center">
                    <User className="absolute left-4 w-4 h-4 text-primary-glow/50" />
                    <Input
                      type="text"
                      placeholder="Tu nombre espectral"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-11 h-14 py-3 rounded-xl bg-[hsl(270_40%_8%/.7)] border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:bg-[hsl(270_40%_10%/.9)] transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-primary-glow/70 text-xs font-tech tracking-[0.25em] uppercase pl-1">Conjuro</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/40 to-accent/40 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-300" />
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-4 h-4 text-primary-glow/50" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-12 h-14 py-3 rounded-xl bg-[hsl(270_40%_8%/.7)] border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:bg-[hsl(270_40%_10%/.9)] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-primary-glow/60" /> : <Eye className="w-4 h-4 text-primary-glow/60" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="relative w-full h-14 py-3 rounded-xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] text-white font-bold tracking-wider shadow-[0_10px_40px_-10px_hsl(275_90%_50%/.7)] hover:shadow-[0_15px_50px_-10px_hsl(320_90%_55%/.8)] transition-all duration-500 overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="relative flex items-center justify-center gap-2">
                    <Ghost className="w-4 h-4" />
                    ENTRAR A LA SOMBRA
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground/50 text-[11px] tracking-wide">
                Sin cuenta? Susurra al administrador.
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-8 text-center transition-opacity duration-1000 delay-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
          <p className="text-primary-glow/30 text-[10px] tracking-[0.4em] uppercase font-tech">
            © 2026 · Fluxo Spectral Entertainment
          </p>
        </div>
      </div>
    </div>
  );
}
