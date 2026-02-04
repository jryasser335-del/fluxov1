import { Play, Link2Off, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPABASE_URL = "https://tizmocegplamrmpfxvdu.supabase.co";

function getProxiedLogoUrl(logoUrl: string | null): string | null {
  if (!logoUrl) return null;
  return `${SUPABASE_URL}/functions/v1/logo-proxy?url=${encodeURIComponent(logoUrl)}`;
}

interface Channel {
  id: string;
  key: string;
  name: string;
  logo: string | null;
  stream: string | null;
  is_active: boolean;
}

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
}

export function ChannelCard({ channel, onClick }: ChannelCardProps) {
  const hasStream = !!channel.stream;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-3xl overflow-hidden transition-all duration-500 cursor-pointer",
        "bg-gradient-to-br from-white/[0.06] to-white/[0.02]",
        "border border-white/[0.08] hover:border-primary/40",
        "hover:-translate-y-1.5 hover:shadow-[0_25px_50px_-12px_hsl(270_100%_50%/0.3)]"
      )}
    >
      {/* Multi-layer background effects */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

      {/* Animated corner glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700" />

      <div className="relative p-4 flex items-center gap-4">
        {/* Logo container with premium styling */}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.1] to-white/[0.03] border border-white/[0.1] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-primary/30 transition-all duration-500">
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          {channel.logo ? (
            <img
              src={getProxiedLogoUrl(channel.logo) || ""}
              alt={channel.name}
              className="w-full h-full object-contain p-2.5 transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.parentElement!.innerHTML = '<span class="text-2xl">📺</span>';
              }}
            />
          ) : (
            <span className="text-2xl">📺</span>
          )}
          
          {/* Live indicator with premium animation */}
          {hasStream && (
            <div className="absolute -top-1.5 -right-1.5">
              <div className="relative w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-black flex items-center justify-center shadow-lg shadow-green-500/50">
                <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                <Wifi className="w-2.5 h-2.5 text-white relative z-10" />
              </div>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white/90 truncate group-hover:text-white transition-colors duration-300">
            {channel.name}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {hasStream ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/15 border border-green-500/30 text-[10px] font-bold text-green-400 uppercase tracking-wider shadow-sm shadow-green-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                En vivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[10px] font-medium text-white/40 uppercase tracking-wider">
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Play button with premium styling */}
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
            "border backdrop-blur-sm",
            hasStream
              ? "bg-gradient-to-br from-primary/30 to-accent/20 border-primary/40 text-primary group-hover:from-primary/40 group-hover:to-accent/30 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30"
              : "bg-white/[0.05] border-white/[0.1] text-white/30"
          )}
        >
          {hasStream ? (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          ) : (
            <Link2Off className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
}

