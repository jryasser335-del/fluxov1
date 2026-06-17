import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, User, Lock, Eye, EyeOff, Ghost, Sparkles } from "lucide-react";
import gengarMascot from "@/assets/gengar-mascot.png";

/* ===== Floating spectral particles ===== */
function GhostParticles() {
  const items = Array.from({ length: 18 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((_, i) => {
        const left = (i * 73) % 100;
        const delay = (i * 0.7) % 8;
        const dur = 10 + (i % 5) * 2;
        const size = 8 + (i % 4) * 5;
        const dx = ((i * 37) % 160) - 80;
        return (
          <div
            key={i}
            className="absolute bottom-[-40px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size + 4,
              ["--dx" as never]: `${dx}px`,
              animation: `spectral-drift ${dur}s linear ${delay}s infinite`,
            }}
          >
            <svg viewBox="0 0 24 28" className="w-full h-full opacity-60">
              <path
                d="M4 12 C4 5 20 5 20 12 V24 L17 21 L14 24 L11 21 L8 24 L4 21 Z"
                fill="hsl(280 90% 55% / .5)"
                stroke="hsl(290 95% 75% / .55)"
                strokeWidth=".8"
              />
              <circle cx="9" cy="13" r="1.4" fill="hsl(0 100% 70%)" />
              <circle cx="15" cy="13" r="1.4" fill="hsl(0 100% 70%)" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

/* ===== Gengar mascot with floating aura ===== */
function GengarMascot() {
  return (
    <div className="relative w-52 h-52 mx-auto animate-ghost-float">
      {/* Outer aura */}
      <div className="absolute inset-[-50px] rounded-full bg-[radial-gradient(circle,hsl(280_100%_55%/.55),transparent_60%)] blur-3xl animate-shadow-pulse" />
      {/* Inner aura */}
      <div className="absolute inset-[-20px] rounded-full bg-[radial-gradient(circle,hsl(290_100%_60%/.4),transparent_65%)] blur-2xl" />
      {/* Rotating conic ring */}
      <div
        className="absolute inset-[-12px] rounded-full opacity-60 animate-aurora"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, hsl(280 100% 60% / .65), transparent, hsl(310 100% 60% / .45), transparent)",
          filter: "blur(6px)",
        }}
      />
      {/* Eye glow underlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-24 h-6 rounded-full bg-red-500/40 blur-2xl animate-pulse" style={{ transform: "translateY(-6px)" }} />
      </div>
      {/* Floor shadow */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-3 rounded-full bg-purple-900/80 blur-md" />
      {/* Mascot */}
      <img
        src={gengarMascot}
        alt="Gengar"
        width={256}
        height={256}
        className="relative w-full h-full object-contain drop-shadow-[0_25px_45px_hsl(280_100%_45%/.7)] select-none"
        draggable={false}
      />
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
    el.style.transform = `perspective(1200px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-black">
      {/* Pure black base */}
      <div className="absolute inset-0 bg-black" />

      {/* Subtle purple vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(275_90%_18%/.45),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(290_90%_15%/.35),transparent_60%)]" />

      {/* Slow drifting purple orbs */}
      <div className="absolute top-1/4 -left-40 w-[480px] h-[480px] rounded-full bg-[hsl(275_90%_45%/.18)] blur-[140px] animate-orb-drift" />
      <div className="absolute bottom-0 -right-40 w-[480px] h-[480px] rounded-full bg-[hsl(310_90%_45%/.12)] blur-[140px] animate-orb-drift-reverse" />

      {/* Faint grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(280 90% 60% / .35) 1px, transparent 1px), linear-gradient(90deg, hsl(280 90% 60% / .35) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
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
        <div className={`text-center mt-3 mb-7 transition-all duration-700 delay-150 ${mounted ? "opacity-100" : "opacity-0"}`}>
          <h1 className="font-display text-5xl tracking-[0.32em] font-black bg-clip-text text-transparent bg-[linear-gradient(180deg,hsl(0_0%_100%),hsl(280_90%_75%))] drop-shadow-[0_0_25px_hsl(280_100%_55%/.55)]">
            FLUXO
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Ghost className="w-3 h-3 text-[hsl(280_100%_70%)] animate-pulse" />
            <span className="text-[10px] tracking-[0.5em] uppercase text-[hsl(280_80%_75%/.7)] font-tech">
              Shadow Streaming
            </span>
            <Ghost className="w-3 h-3 text-[hsl(280_100%_70%)] animate-pulse" />
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
          <div
            className="absolute -inset-[2px] rounded-3xl opacity-70 animate-aurora"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(275 100% 55%), hsl(310 90% 55%), hsl(260 90% 50%), hsl(290 100% 60%), hsl(275 100% 55%))",
              filter: "blur(10px)",
            }}
          />

          <div className="relative rounded-3xl bg-black/85 backdrop-blur-2xl border border-[hsl(280_80%_50%/.18)] p-7 shadow-[0_30px_80px_-20px_hsl(280_100%_30%/.7)]">
            {/* Corner sparkles */}
            <Sparkles className="absolute -top-3 -right-3 w-5 h-5 text-[hsl(280_100%_70%)] animate-pulse" />
            <Sparkles className="absolute -bottom-3 -left-3 w-4 h-4 text-[hsl(310_100%_70%)] animate-pulse [animation-delay:.5s]" />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[hsl(280_80%_75%/.8)] text-xs font-tech tracking-[0.28em] uppercase pl-1">
                  Invocador
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-[linear-gradient(90deg,hsl(275_100%_55%/.5),hsl(310_100%_55%/.5))] opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-300" />
                  <div className="relative flex items-center">
                    <User className="absolute left-4 w-4 h-4 text-[hsl(280_70%_70%/.65)]" />
                    <Input
                      type="text"
                      placeholder="Tu nombre espectral"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-11 h-14 py-3 rounded-xl bg-black/70 border-[hsl(280_80%_50%/.25)] text-foreground placeholder:text-muted-foreground/50 focus:border-[hsl(280_100%_60%/.7)] focus:bg-black/90 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[hsl(280_80%_75%/.8)] text-xs font-tech tracking-[0.28em] uppercase pl-1">
                  Conjuro
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-[linear-gradient(90deg,hsl(275_100%_55%/.5),hsl(310_100%_55%/.5))] opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-300" />
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-4 h-4 text-[hsl(280_70%_70%/.65)]" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-12 h-14 py-3 rounded-xl bg-black/70 border-[hsl(280_80%_50%/.25)] text-foreground placeholder:text-muted-foreground/50 focus:border-[hsl(280_100%_60%/.7)] focus:bg-black/90 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1.5 hover:bg-[hsl(280_100%_60%/.1)] rounded-lg transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-[hsl(280_70%_70%/.7)]" />
                      ) : (
                        <Eye className="w-4 h-4 text-[hsl(280_70%_70%/.7)]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="relative w-full h-14 py-3 rounded-xl bg-[linear-gradient(90deg,hsl(275_100%_45%),hsl(310_100%_50%),hsl(275_100%_45%))] bg-[length:200%_100%] hover:bg-[position:100%_0] text-white font-bold tracking-[0.2em] shadow-[0_10px_40px_-10px_hsl(280_100%_50%/.8)] hover:shadow-[0_15px_55px_-10px_hsl(310_100%_55%/.9)] transition-all duration-500 overflow-hidden group border border-[hsl(280_100%_60%/.3)]"
              >
                <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,hsl(0_0%_100%/.25),transparent)] -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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
          <p className="text-[hsl(280_80%_70%/.35)] text-[10px] tracking-[0.45em] uppercase font-tech">
            © 2026 · Fluxo Spectral Entertainment
          </p>
        </div>
      </div>
    </div>
  );
}
