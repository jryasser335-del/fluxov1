import { Info, Clock, Zap } from "lucide-react";

export function EventInfoBanner() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/5 to-primary/10">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
      
      {/* Glass overlay */}
      <div className="absolute inset-0 backdrop-blur-sm" />
      
      {/* Top shine */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      {/* Content */}
      <div className="relative flex items-center gap-4 p-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Información importante</span>
          </div>
          <p className="text-sm text-foreground/80">
            Los enlaces de streaming se activan <span className="font-bold text-primary">30 minutos antes</span> del inicio de cada partido.
          </p>
        </div>
        
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Auto-sync</span>
        </div>
      </div>
      
      {/* Bottom shine */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
