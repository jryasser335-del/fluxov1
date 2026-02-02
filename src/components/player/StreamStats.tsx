import { Signal, Wifi, WifiOff, Activity, Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamStatsProps {
  isVisible: boolean;
  quality?: string;
  bitrate?: number;
  buffered?: number;
  latency?: number;
  viewers?: number;
}

export function StreamStats({ isVisible, quality, bitrate, buffered, latency, viewers }: StreamStatsProps) {
  if (!isVisible) return null;

  const stats = [
    { 
      icon: Signal, 
      label: "Calidad", 
      value: quality || "Auto",
      color: "text-green-400"
    },
    { 
      icon: Activity, 
      label: "Bitrate", 
      value: bitrate ? `${(bitrate / 1000).toFixed(1)} Mbps` : "—",
      color: "text-blue-400"
    },
    { 
      icon: Clock, 
      label: "Latencia", 
      value: latency ? `${latency}ms` : "—",
      color: latency && latency < 100 ? "text-green-400" : latency && latency < 300 ? "text-yellow-400" : "text-red-400"
    },
    { 
      icon: Wifi, 
      label: "Buffer", 
      value: buffered ? `${buffered.toFixed(1)}s` : "—",
      color: buffered && buffered > 5 ? "text-green-400" : "text-yellow-400"
    },
  ];

  return (
    <div className="absolute top-4 left-4 z-30 animate-fade-in">
      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Stream Stats</span>
        </div>

        {/* Stats */}
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              <span className="text-[10px] text-white/50 uppercase">{stat.label}</span>
            </div>
            <span className={cn("text-xs font-mono font-medium", stat.color)}>
              {stat.value}
            </span>
          </div>
        ))}

        {/* Viewers */}
        {viewers && viewers > 0 && (
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-white/50 uppercase">Viendo</span>
            </div>
            <span className="text-xs font-mono font-medium text-purple-400">
              {viewers.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
