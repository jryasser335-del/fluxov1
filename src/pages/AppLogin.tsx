import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, User, Lock, Eye, EyeOff, Zap } from "lucide-react";

export default function AppLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { appUser, isLoading, login, checkAccess } = useAppAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (appUser && checkAccess()) {
      navigate("/");
    }
  }, [appUser, navigate, checkAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Ingresa usuario y contraseña");
      return;
    }

    const { error } = await login(username, password);
    
    if (error) {
      toast.error(error);
    } else {
      toast.success("¡Bienvenido!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects - Negro total */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-zinc-950" />
      
      {/* Glowing orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[80px]" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
      
      <div className="w-full max-w-sm relative z-10 px-4">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-accent to-primary mb-6 shadow-2xl shadow-primary/30 animate-float">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-4xl tracking-wider text-white mb-2">
            FLUXO
          </h1>
          <p className="text-white/40 text-sm tracking-wide">
            STREAMING PREMIUM
          </p>
        </div>

        {/* Login Card */}
        <div className="relative">
          {/* Card glow effect */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-xl opacity-50" />
          
          <div className="relative rounded-3xl bg-zinc-900/80 backdrop-blur-2xl border border-white/[0.08] p-8 shadow-2xl">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-white/60 text-sm font-medium pl-1">Usuario</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/30 to-accent/20 opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                  <div className="relative flex items-center">
                    <User className="absolute left-4 w-5 h-5 text-white/30 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Tu nombre de usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-12 h-14 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/25 focus:border-primary/50 focus:bg-white/[0.05] transition-all duration-300"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-white/60 text-sm font-medium pl-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/30 to-accent/20 opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-5 h-5 text-white/30 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-14 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/25 focus:border-primary/50 focus:bg-white/[0.05] transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-white/40" />
                      ) : (
                        <Eye className="w-5 h-5 text-white/40" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/25 text-white font-semibold text-base transition-all duration-300 mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-white/25 text-xs">
                ¿No tienes cuenta? Contacta al administrador
              </p>
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="mt-10 text-center">
          <p className="text-white/15 text-xs tracking-widest uppercase">
            © 2024 Fluxo Entertainment
          </p>
        </div>
      </div>
    </div>
  );
}
