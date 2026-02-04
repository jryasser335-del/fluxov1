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
        "group relative rounded-2xl overflow-hidden transition-all duration-400 cursor-pointer",
        "bg-gradient-to-br from-white/[0.05] to-white/[0.01]",
        "border border-white/[0.06] hover:border-primary/30",
        "hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_hsl(270_100%_50%/0.25)]"
      )}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      <div className="relative p-3.5 flex items-center gap-3.5">
        {/* Logo container */}
        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-white/[0.12] transition-colors">
          {channel.logo ? (
            <img
              src={getProxiedLogoUrl(channel.logo) || ""}
              alt={channel.name}
              className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.parentElement!.innerHTML = '<span class="text-xl">📺</span>';
              }}
            />
          ) : (
            <span className="text-xl">📺</span>
          )}
          
          {/* Live indicator */}
          {hasStream && (
            <div className="absolute -top-1 -right-1">
              <div className="relative w-4 h-4 rounded-full bg-green-500 border-2 border-[hsl(240_20%_6%)] flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                <Wifi className="w-2 h-2 text-white relative z-10" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white/90 truncate group-hover:text-white transition-colors">
            {channel.name}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {hasStream ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/15 border border-green-500/20 text-[10px] font-bold text-green-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Play button */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
            "border backdrop-blur-sm",
            hasStream
              ? "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 text-primary group-hover:from-primary/30 group-hover:to-primary/20 group-hover:scale-105"
              : "bg-white/[0.04] border-white/[0.08] text-white/30"
          )}
        >
          {hasStream ? (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          ) : (
            <Link2Off className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
}

