import { Cast, Tv, Smartphone, Monitor, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CastMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const castDevices = [
  { id: "chromecast", name: "Chromecast", icon: Tv, available: false },
  { id: "airplay", name: "AirPlay", icon: Monitor, available: false },
  { id: "miracast", name: "Smart TV", icon: Tv, available: false },
];

export function CastMenu({ isOpen, onClose }: CastMenuProps) {
  if (!isOpen) return null;

  const handleCast = (deviceName: string) => {
    toast.info(`Transmitir a ${deviceName}`, {
      description: "Esta función requiere dispositivos compatibles en tu red"
    });
  };

  return (
    <div
      className="absolute bottom-full right-0 mb-2 w-56 rounded-2xl overflow-hidden border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <Cast className="w-4 h-4 text-white/60" />
        <span className="text-sm font-medium text-white">Transmitir a</span>
      </div>

      {/* Scanning message */}
      <div className="p-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs text-white/60">Buscando dispositivos...</span>
        </div>
      </div>

      {/* Devices list */}
      <div className="p-2 space-y-1">
        {castDevices.map((device) => (
          <button
            key={device.id}
            onClick={() => handleCast(device.name)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
              device.available
                ? "hover:bg-white/10 text-white/80"
                : "text-white/30 cursor-not-allowed"
            )}
          >
            <device.icon className="w-4 h-4" />
            <span className="text-sm">{device.name}</span>
            {!device.available && (
              <WifiOff className="w-3 h-3 ml-auto" />
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center">
          Asegúrate de que los dispositivos estén en la misma red
        </p>
      </div>
    </div>
  );
}
