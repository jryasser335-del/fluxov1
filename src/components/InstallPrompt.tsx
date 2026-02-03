import { useState, useEffect } from "react";
import { X, Download, Smartphone, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) return; // Don't show for 24 hours after dismiss
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Show prompt after delay
    const showTimer = setTimeout(() => {
      if (isIOSDevice) {
        setIsVisible(true);
      }
    }, 3000);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    
    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  if (!isVisible || isInstalled) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9995] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-[9996] p-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full animate-in slide-in-from-bottom duration-500 md:slide-in-from-bottom-0 md:fade-in md:zoom-in-95">
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[hsl(240_20%_12%)] to-[hsl(240_20%_6%)] shadow-2xl shadow-black/50 overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-accent" />
          
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20">
                  <img 
                    src="/pwa-192x192.png" 
                    alt="FluxoTV" 
                    className="w-14 h-14 rounded-xl"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-[hsl(240_20%_8%)] flex items-center justify-center">
                  <Download className="w-3.5 h-3.5 text-white" />
                </div>
                <Sparkles className="absolute -top-2 -left-2 w-5 h-5 text-primary animate-pulse" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-display tracking-wider text-white mb-2">
                Instalar FluxoTV
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">
                Obtén acceso rápido desde tu pantalla de inicio. Sin tiendas, sin esperas.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { icon: "⚡", label: "Acceso rápido" },
                { icon: "📱", label: "Pantalla completa" },
                { icon: "🔔", label: "Notificaciones" },
                { icon: "💾", label: "Modo offline" },
              ].map((benefit) => (
                <div 
                  key={benefit.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5"
                >
                  <span className="text-lg">{benefit.icon}</span>
                  <span className="text-xs text-white/70">{benefit.label}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            {isIOS ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowIOSGuide(!showIOSGuide)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
                >
                  <Smartphone className="w-5 h-5" />
                  Ver cómo instalar
                  <ChevronRight className={cn("w-4 h-4 transition-transform", showIOSGuide && "rotate-90")} />
                </button>
                
                {showIOSGuide && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-in slide-in-from-top duration-300">
                    <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Instrucciones para iPhone/iPad:</p>
                    <ol className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-white/80">
                        <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary shrink-0">1</span>
                        Toca el botón <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Compartir ↗</span> en Safari
                      </li>
                      <li className="flex items-start gap-2 text-sm text-white/80">
                        <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary shrink-0">2</span>
                        Selecciona "Añadir a pantalla de inicio"
                      </li>
                      <li className="flex items-start gap-2 text-sm text-white/80">
                        <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary shrink-0">3</span>
                        Toca "Añadir" para confirmar
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-accent text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/30 group"
              >
                <Download className="w-5 h-5 group-hover:animate-bounce" />
                Instalar Ahora
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Instrucciones para Android:</p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-white/80">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary shrink-0">1</span>
                    Abre el menú del navegador <span className="text-white/50">(⋮)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-white/80">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary shrink-0">2</span>
                    Selecciona "Instalar app" o "Añadir a inicio"
                  </li>
                </ol>
              </div>
            )}

            {/* Skip */}
            <button
              onClick={handleDismiss}
              className="w-full mt-3 py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Ahora no, gracias
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
