import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { Section } from "./Section";
import { Loader2 } from "lucide-react";

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

export function ChannelsView() {
  const { openPlayer } = usePlayerModal();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setChannels(data);
      }
      setLoading(false);
    };

    fetchChannels();
  }, []);

  const handleChannelClick = (channel: Channel) => {
    if (channel.stream) {
      openPlayer(channel.name, channel.stream);
    } else {
      console.log(`No stream available for ${channel.name}`);
    }
  };

  if (loading) {
    return (
      <Section title="Canales" emoji="📺" badge="En vivo">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Section>
    );
  }

  return (
    <Section title="Canales" emoji="📺" badge="En vivo">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {channels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => handleChannelClick(channel)}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/25"
          >
            <div className="flex items-center gap-2.5">
              {/* Logo */}
              <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden">
                {channel.logo ? (
                  <img
                    src={getProxiedLogoUrl(channel.logo) || ""}
                    alt={channel.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.textContent = "📺";
                    }}
                  />
                ) : (
                  <span>📺</span>
                )}
              </div>
              
              {/* Info */}
              <div>
                <span className="block text-sm font-semibold">{channel.name}</span>
                <span className="text-muted-foreground text-xs">
                  {channel.stream ? "Listo" : "Sin link"}
                </span>
              </div>
            </div>

            {/* Tag */}
            <span className="text-[11px] px-2.5 py-1.5 rounded-full border border-white/10 bg-black/25 text-white/85">
              {channel.stream ? "PLAY" : "NO LINK"}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}