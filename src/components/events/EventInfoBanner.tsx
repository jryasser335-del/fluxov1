import { Info, Clock, Zap, Sparkles, Shield, Bell } from "lucide-react";

export function EventInfoBanner() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl">
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl opacity-50 animate-gradient-shift" />
      
      {/* Inner container */}
      <div className="relative bg-black/90 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-32 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-purple-500/20 rounded-full blur-[60px] animate-pulse delay-500" />
        </div>
        
        {/* Top shine */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        
        {/* Content */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-400 uppercase tracking-wider">
                Información importante
              </span>
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
              Los enlaces de streaming se activan <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">30 minutos antes</span> del inicio de cada partido. Activa las notificaciones para no perderte ningún evento.
            </p>
          </div>
          
          {/* Feature badges */}
          <div className="flex sm:flex-col gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">HD</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">Auto-sync</span>
            </div>
          </div>
        </div>
        
        {/* Bottom shine */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    </div>
  );
}
