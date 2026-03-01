import { Cast, Tv, Monitor, Wifi, WifiOff, ExternalLink, Chrome, Apple } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";

interface CastMenuProps {
  isOpen: boolean;
  onClose: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  currentUrl?: string;
}

export function CastMenu({ isOpen, onClose, videoRef, currentUrl }: CastMenuProps) {
  const [remoteAvailable, setRemoteAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const ua = navigator.userAgent;
    setIsChrome(/Chrome/.test(ua) && !/Edge/.test(ua));
    setIsSafari(/Safari/.test(ua) && !/Chrome/.test(ua));

    // Check Remote Playback API availability
    const video = videoRef?.current;
    if (video && 'remote' in video) {
      const remote = (video as any).remote;
      remote.watchAvailability?.((available: boolean) => {
        setRemoteAvailable(available);
      }).catch(() => setRemoteAvailable(false));
    }
  }, [isOpen, videoRef]);

  const handleRemotePlayback = useCallback(async () => {
    const video = videoRef?.current;
    if (!video || !('remote' in video)) {
      toast.error("Tu navegador no soporta transmisión remota");
      return;
    }
    try {
      const remote = (video as any).remote;
      await remote.prompt();
      setIsCasting(true);
      toast.success("Conectado a dispositivo externo");
      
      remote.addEventListener('disconnect', () => {
        setIsCasting(false);
        toast.info("Desconectado del dispositivo");
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast.info("Transmisión cancelada");
      } else {
        toast.error("No se encontraron dispositivos disponibles");
      }
    }
  }, [videoRef]);

  const handleChromecastBrowser = useCallback(() => {
    toast.info("Usa el menú de Chrome ⋮ → Transmitir", {
      description: "O presiona Ctrl+Shift+U para abrir las opciones de transmisión",
      duration: 6000,
    });
  }, []);

  const handleAirPlay = useCallback(() => {
    const video = videoRef?.current;
    if (video && (video as any).webkitShowPlaybackTargetPicker) {
      (video as any).webkitShowPlaybackTargetPicker();
      return;
    }
    toast.info("Activa AirPlay desde el Centro de Control de tu Mac", {
      description: "O busca el ícono de AirPlay en la barra de menú",
      duration: 5000,
    });
  }, [videoRef]);

  const handleStopCasting = useCallback(async () => {
    const video = videoRef?.current;
    if (video && 'remote' in video) {
      try {
        const remote = (video as any).remote;
        // Disconnecting isn't directly available, prompt again
        await remote.prompt();
      } catch {}
    }
    setIsCasting(false);
  }, [videoRef]);

  if (!isOpen) return null;

  const castOptions = [
    {
      id: "remote",
      name: "Enviar a TV",
      description: "Chromecast, Smart TV, etc.",
      icon: Tv,
      available: true,
      highlight: true,
      onClick: handleRemotePlayback,
    },
    ...(isChrome ? [{
      id: "chrome-cast",
      name: "Transmitir pestaña",
      description: "Envía toda la pestaña a tu TV",
      icon: Chrome,
      available: true,
      highlight: false,
      onClick: handleChromecastBrowser,
    }] : []),
    {
      id: "airplay",
      name: "AirPlay",
      description: isSafari ? "Enviar a Apple TV" : "Disponible en Safari/Mac",
      icon: Monitor,
      available: true,
      highlight: false,
      onClick: handleAirPlay,
    },
  ];

  return (
    <div
      className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <Cast className="w-4 h-4 text-white/60" />
        <span className="text-sm font-medium text-white">Enviar a TV</span>
        {isCasting && (
          <span className="ml-auto text-[10px] font-bold text-green-400 bg-green-400/20 px-2 py-0.5 rounded-full animate-pulse">
            Conectado
          </span>
        )}
      </div>

      {/* Casting active banner */}
      {isCasting && (
        <div className="p-3 bg-green-500/10 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-300">Transmitiendo...</span>
            </div>
            <button
              onClick={handleStopCasting}
              className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              Detener
            </button>
          </div>
        </div>
      )}

      {/* Scanning indicator */}
      {!isCasting && (
        <div className="p-3 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs text-white/60">
              {remoteAvailable ? "Dispositivos encontrados" : "Buscando dispositivos..."}
            </span>
          </div>
        </div>
      )}

      {/* Cast options */}
      <div className="p-2 space-y-1">
        {castOptions.map((option) => (
          <button
            key={option.id}
            onClick={option.onClick}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
              option.highlight
                ? "bg-primary/10 hover:bg-primary/20 border border-primary/20 text-white"
                : "hover:bg-white/10 text-white/80"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              option.highlight ? "bg-primary/20" : "bg-white/10"
            )}>
              <option.icon className={cn("w-4 h-4", option.highlight && "text-primary")} />
            </div>
            <div className="text-left flex-1">
              <span className="text-sm font-medium block">{option.name}</span>
              <span className="text-[10px] text-white/40">{option.description}</span>
            </div>
            <ExternalLink className="w-3 h-3 text-white/30" />
          </button>
        ))}
      </div>

      {/* Footer tip */}
      <div className="p-3 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center">
          {isChrome 
            ? "💡 Tip: Ctrl+Shift+U abre transmisión en Chrome"
            : "Asegúrate de que tu TV esté en la misma red WiFi"
          }
        </p>
      </div>
    </div>
  );
}
