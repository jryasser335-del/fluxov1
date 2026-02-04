import { Shield, Sparkles, ExternalLink, Chrome, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const AD_BLOCKERS = [
  {
    name: "uBlock Origin",
    icon: "🛡️",
    description: "El mejor bloqueador de anuncios",
    url: "https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm",
    color: "from-red-500/20 to-orange-500/20",
    borderColor: "border-red-500/30",
  },
  {
    name: "AdBlock Plus",
    icon: "🔒",
    description: "Popular y fácil de usar",
    url: "https://chrome.google.com/webstore/detail/adblock-plus-free-ad-bloc/cfhdojbkjhnklbpkdaibdccddilifddb",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
  },
];

export function AdBlockerBanner() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl">
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl opacity-40 animate-gradient-shift" />
      
      {/* Inner container */}
      <div className="relative bg-black/95 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-48 h-24 bg-emerald-500/10 rounded-full blur-[50px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-48 h-24 bg-cyan-500/10 rounded-full blur-[50px] animate-pulse delay-300" />
        </div>
        
        {/* Top shine */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        
        {/* Content */}
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 uppercase tracking-wider">
                  Mejora tu experiencia
                </span>
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Instala una extensión <span className="font-semibold text-emerald-400">AdBlocker</span> para disfrutar del contenido sin anuncios ni interrupciones.
              </p>
            </div>
          </div>
          
          {/* AdBlocker options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AD_BLOCKERS.map((blocker) => (
              <a
                key={blocker.name}
                href={blocker.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${blocker.color} border ${blocker.borderColor} hover:scale-[1.02] transition-all duration-300`}
              >
                <span className="text-2xl">{blocker.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{blocker.name}</p>
                  <p className="text-xs text-white/60">{blocker.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
              </a>
            ))}
          </div>
          
          {/* Browser icons */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Chrome className="w-4 h-4" />
              <span>Chrome</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Globe className="w-4 h-4" />
              <span>Firefox</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Globe className="w-4 h-4" />
              <span>Edge</span>
            </div>
          </div>
        </div>
        
        {/* Bottom shine */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}
