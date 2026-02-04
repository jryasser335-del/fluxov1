import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, User, Lock, ArrowLeft, Sparkles, Eye, EyeOff } from "lucide-react";

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
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-emerald-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 text-white/60 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-8">
          {/* Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full blur-3xl opacity-30" />
          
          {/* Header */}
          <div className="text-center mb-8 relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-white/50 text-sm">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/80">Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Tu nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-white/10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-white/40" />
                  ) : (
                    <Eye className="w-4 h-4 text-white/40" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-emerald-500 hover:opacity-90 shadow-lg shadow-purple-500/25 text-white font-semibold py-5"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-white/30 text-xs">
              ¿No tienes cuenta? Contacta al administrador
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
