import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle2, Share, Plus, ArrowRight, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-display tracking-wider text-white">¡App Instalada!</h1>
          <p className="text-white/60">
            FluxoTV ya está instalada en tu dispositivo. Puedes acceder desde tu pantalla de inicio.
          </p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold hover:opacity-90 transition-opacity"
          >
            Ir a la App
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-8">
          {/* Logo */}
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary via-purple-600 to-accent flex items-center justify-center shadow-2xl shadow-primary/30 relative">
              <Sparkles className="w-12 h-12 text-white" />
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary to-accent opacity-30 blur-xl" />
            </div>
            <h1 className="text-4xl font-display tracking-wider gradient-text">FluxoTV</h1>
            <p className="text-lg text-white/60">Tu plataforma de streaming premium</p>
          </div>

          {/* Install card */}
          <div className="glass-panel rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Instalar App</h2>
                <p className="text-sm text-white/60">Acceso rápido desde tu pantalla de inicio</p>
              </div>
            </div>

            {isIOS ? (
              /* iOS Instructions */
              <div className="space-y-4">
                <p className="text-white/70 text-sm">
                  Para instalar en iPhone o iPad, sigue estos pasos:
                </p>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</span>
                    <div className="flex items-center gap-2 text-white/80">
                      Toca el botón <Share className="w-4 h-4 text-blue-400" /> Compartir
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</span>
                    <div className="flex items-center gap-2 text-white/80">
                      Selecciona <Plus className="w-4 h-4 text-white" /> "Añadir a pantalla de inicio"
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">3</span>
                    <span className="text-white/80">Toca "Añadir" para confirmar</span>
                  </li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              /* Android/Desktop with install prompt */
              <button
                onClick={handleInstall}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/30 glow-primary"
              >
                <Download className="w-5 h-5" />
                Instalar App
              </button>
            ) : (
              /* Fallback instructions */
              <div className="space-y-4">
                <p className="text-white/70 text-sm">
                  Para instalar la app en Android:
                </p>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</span>
                    <span className="text-white/80">Abre el menú del navegador (⋮)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</span>
                    <span className="text-white/80">Selecciona "Instalar app" o "Añadir a pantalla de inicio"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">3</span>
                    <span className="text-white/80">Confirma la instalación</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Features */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Beneficios</h3>
              <ul className="grid grid-cols-2 gap-3">
                {[
                  "Acceso rápido",
                  "Sin navegador",
                  "Pantalla completa",
                  "Notificaciones"
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Back link */}
          <a 
            href="/"
            className="block text-center text-white/50 hover:text-white transition-colors"
          >
            ← Volver a la app
          </a>
        </div>
      </div>
    </div>
  );
};

export default Install;
