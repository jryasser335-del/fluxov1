import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, User, Lock, Eye, EyeOff, Zap, Sparkles, Play } from "lucide-react";

export default function AppLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);
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
      {/* Premium animated background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[200px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[180px] animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-[250px]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white/20 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), 
                             linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      <div className="w-full max-w-md relative z-10 px-4">
        {/* Logo / Brand */}
        <div className="text-center mb-12">
          {/* Animated logo container */}
          <div className="relative inline-flex items-center justify-center mb-8">
            {/* Outer glow ring */}
            <div className="absolute w-28 h-28 rounded-[2rem] bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-2xl animate-pulse" />
            
            {/* Main logo box */}
            <div className="relative w-24 h-24 rounded-[1.5rem] bg-gradient-to-br from-primary via-accent to-primary p-[2px] animate-float shadow-2xl shadow-primary/30">
              <div className="w-full h-full rounded-[1.4rem] bg-black/80 backdrop-blur-xl flex items-center justify-center">
                <Zap className="w-12 h-12 text-white" />
              </div>
            </div>
            
            {/* Orbiting accent */}
            <div className="absolute inset-0 animate-[spin_10s_linear_infinite]">
              <Sparkles className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-primary/60" />
            </div>
          </div>
          
          <h1 className="font-display text-5xl tracking-[0.3em] text-white mb-3 animate-fade-in">
            FLUXO
          </h1>
          <p className="text-white/30 text-sm tracking-[0.4em] uppercase font-medium animate-fade-in [animation-delay:200ms]">
            Streaming Premium
          </p>
        </div>

        {/* Login Card */}
        <div className="relative animate-fade-in [animation-delay:400ms]">
          {/* Card glow effect */}
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-xl opacity-60" />
          
          <div className="relative rounded-[2rem] bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/[0.08] p-8 md:p-10 shadow-2xl overflow-hidden">
            {/* Inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-white/50 text-xs font-semibold tracking-wider uppercase pl-2">
                  Usuario
                </label>
                <div className={`relative group transition-all duration-300 ${isFocused === 'username' ? 'scale-[1.02]' : ''}`}>
                  {/* Input glow */}
                  <div className={`absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/40 to-accent/30 opacity-0 blur-sm transition-opacity duration-300 ${isFocused === 'username' ? 'opacity-100' : ''}`} />
                  
                  <div className="relative flex items-center">
                    <div className="absolute left-4 w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center pointer-events-none">
                      <User className={`w-5 h-5 transition-colors duration-300 ${isFocused === 'username' ? 'text-primary' : 'text-white/30'}`} />
                    </div>
                    <Input
                      type="text"
                      placeholder="Tu nombre de usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setIsFocused('username')}
                      onBlur={() => setIsFocused(null)}
                      className="pl-16 h-14 rounded-2xl bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:border-primary/50 focus:bg-white/[0.05] transition-all duration-300"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-white/50 text-xs font-semibold tracking-wider uppercase pl-2">
                  Contraseña
                </label>
                <div className={`relative group transition-all duration-300 ${isFocused === 'password' ? 'scale-[1.02]' : ''}`}>
                  {/* Input glow */}
                  <div className={`absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/40 to-accent/30 opacity-0 blur-sm transition-opacity duration-300 ${isFocused === 'password' ? 'opacity-100' : ''}`} />
                  
                  <div className="relative flex items-center">
                    <div className="absolute left-4 w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center pointer-events-none">
                      <Lock className={`w-5 h-5 transition-colors duration-300 ${isFocused === 'password' ? 'text-primary' : 'text-white/30'}`} />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsFocused('password')}
                      onBlur={() => setIsFocused(null)}
                      className="pl-16 pr-14 h-14 rounded-2xl bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:border-primary/50 focus:bg-white/[0.05] transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-all duration-200"
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
                className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-xl shadow-primary/20 text-white font-semibold text-base transition-all duration-500 mt-6 group overflow-hidden"
                disabled={isLoading}
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Iniciar Sesión
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-white/20 text-xs uppercase tracking-widest">Premium</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Footer */}
            <div className="text-center space-y-3">
              <p className="text-white/20 text-xs">
                ¿No tienes cuenta?
              </p>
              <p className="text-white/40 text-xs">
                Contacta al administrador para obtener acceso
              </p>
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="mt-12 text-center animate-fade-in [animation-delay:600ms]">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-white/10" />
            <Zap className="w-4 h-4 text-white/15" />
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-white/10" />
          </div>
          <p className="text-white/10 text-xs tracking-[0.3em] uppercase">
            © 2026 Fluxo Entertainment
          </p>
        </div>
      </div>
    </div>
  );
}
