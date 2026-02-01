import { Play, Link2Off, Radio } from "lucide-react";
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
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        "bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent",
        "border border-white/[0.08] hover:border-primary/35",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-10px_hsl(270_100%_50%/0.2)]",
        "p-3 flex items-center gap-3 cursor-pointer"
      )}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
      </div>

      {/* Logo container */}
      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
        {channel.logo ? (
          <img
            src={getProxiedLogoUrl(channel.logo) || ""}
            alt={channel.name}
            className="w-full h-full object-contain p-1.5"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.parentElement!.innerHTML = '<span class="text-lg">📺</span>';
            }}
          />
        ) : (
          <span className="text-lg">📺</span>
        )}
        
        {/* Live indicator dot */}
        {hasStream && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate group-hover:text-foreground transition-colors">
          {channel.name}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <Radio className="w-3 h-3" />
          {hasStream ? "En vivo" : "Sin señal"}
        </div>
      </div>

      {/* Play button */}
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
          "border",
          hasStream
            ? "bg-primary/15 border-primary/30 text-primary group-hover:bg-primary/25"
            : "bg-white/[0.04] border-white/10 text-muted-foreground"
        )}
      >
        {hasStream ? (
          <Play className="w-4 h-4 fill-current" />
        ) : (
          <Link2Off className="w-4 h-4" />
        )}
      </div>
    </div>
  );
}
