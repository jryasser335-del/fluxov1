import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, ExternalLink, Copy, Check, Wifi, Zap, X } from "lucide-react";
import { AD_BLOCKING_DNS } from "@/hooks/useAdBlocker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AdBlockBannerProps {
  compact?: boolean;
}

export function AdBlockBanner({ compact = false }: AdBlockBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedDNS, setCopiedDNS] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("fluxo-adblock-banner-dismissed") === "true";
  });

  const handleCopyDNS = (dns: string, name: string) => {
    navigator.clipboard.writeText(dns);
    setCopiedDNS(dns);
    toast.success(`DNS de ${name} copiado`);
    setTimeout(() => setCopiedDNS(null), 2000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("fluxo-adblock-banner-dismissed", "true");
  };

  if (isDismissed) return null;

  if (compact) {
    return (
      <div className="relative group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            AdBlock
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-emerald-400" />
          )}
        </button>

        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 w-80 p-4 rounded-2xl bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <DNSList onCopy={handleCopyDNS} copiedDNS={copiedDNS} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mb-6 rounded-3xl overflow-hidden">
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/30 via-green-500/20 to-emerald-500/30 animate-gradient-shift" style={{ padding: "1px" }} />
      
      {/* Main content */}
      <div className="relative rounded-3xl bg-gradient-to-br from-emerald-950/50 via-black to-green-950/30 backdrop-blur-xl border border-emerald-500/20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]" />
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all duration-200 text-white/40 hover:text-white z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-green-600/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 flex items-center justify-center border-2 border-black">
                <Zap className="w-2.5 h-2.5 text-black" />
              </div>
            </div>
            <div className="flex-1 pr-8">
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                Bloqueador de Anuncios
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Premium
                </span>
              </h3>
              <p className="text-sm text-white/50 mt-1">
                Configura DNS anti-anuncios para una experiencia sin interrupciones
              </p>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-white/70">Protección activa</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="text-[11px] font-medium text-white/70">DNS Seguro</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-medium text-white/70">Sin trackers</span>
            </div>
          </div>

          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 group"
          >
            <span className="text-sm font-medium text-white/80 group-hover:text-white">
              {isExpanded ? "Ocultar servidores DNS" : "Ver servidores DNS recomendados"}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-white/40 group-hover:text-emerald-400 transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-emerald-400 transition-colors" />
            )}
          </button>
        </div>

        {/* Expandable DNS list */}
        {isExpanded && (
          <div className="relative px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <DNSList onCopy={handleCopyDNS} copiedDNS={copiedDNS} />
            
            {/* Instructions */}
            <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h4 className="text-sm font-bold text-white mb-2">¿Cómo configurar?</h4>
              <ol className="text-xs text-white/50 space-y-1.5">
                <li className="flex gap-2">
                  <span className="text-emerald-400 font-bold">1.</span>
                  Abre la configuración de red de tu dispositivo
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 font-bold">2.</span>
                  Busca la opción de DNS o servidores DNS
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 font-bold">3.</span>
                  Introduce los DNS primario y secundario
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 font-bold">4.</span>
                  Guarda y reinicia tu conexión
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DNSList({ onCopy, copiedDNS }: { onCopy: (dns: string, name: string) => void; copiedDNS: string | null }) {
  return (
    <div className="space-y-3">
      {AD_BLOCKING_DNS.map((dns) => (
        <div
          key={dns.name}
          className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-300 group"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h4 className="font-semibold text-white text-sm group-hover:text-emerald-300 transition-colors">
                {dns.name}
              </h4>
              <p className="text-[11px] text-white/40 mt-0.5">{dns.description}</p>
            </div>
            <a
              href={dns.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5 text-white/40" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onCopy(dns.primary, dns.name)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200",
                copiedDNS === dns.primary
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-black/30 border-white/10 hover:border-white/20 text-white/70 hover:text-white"
              )}
            >
              <div className="text-left">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Primario</div>
                <div className="font-mono text-xs">{dns.primary}</div>
              </div>
              {copiedDNS === dns.primary ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-50" />
              )}
            </button>

            <button
              onClick={() => onCopy(dns.secondary, dns.name)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200",
                copiedDNS === dns.secondary
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-black/30 border-white/10 hover:border-white/20 text-white/70 hover:text-white"
              )}
            >
              <div className="text-left">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Secundario</div>
                <div className="font-mono text-xs">{dns.secondary}</div>
              </div>
              {copiedDNS === dns.secondary ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-50" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
