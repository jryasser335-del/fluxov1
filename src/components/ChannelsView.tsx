import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { Section } from "./Section";
import { ChannelCard } from "./channels/ChannelCard";
import { SkeletonChannelCard } from "./Skeleton";
import { RefreshCw, WifiOff } from "lucide-react";

interface Channel {
  id: string;
  key: string;
  name: string;
  logo: string | null;
  stream: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
  is_active: boolean;
}

export function ChannelsView() {
  const { openPlayer } = usePlayerModal();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchChannels = useCallback(async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("channels")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setChannels(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar canales");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleRetry = () => {
    setRetrying(true);
    setLoading(true);
    fetchChannels();
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.stream) {
      openPlayer(channel.name, {
        url1: channel.stream,
        url2: channel.stream_url_2 || undefined,
        url3: channel.stream_url_3 || undefined,
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <Section title="Canales" emoji="📺" badge="En vivo">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonChannelCard key={i} />
          ))}
        </div>
      </Section>
    );
  }

  // Error state
  if (error) {
    return (
      <Section title="Canales" emoji="📺" badge="Error">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium mb-1">Error de conexión</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
            Reintentar
          </button>
        </div>
      </Section>
    );
  }

  // Empty state
  if (channels.length === 0) {
    return (
      <Section title="Canales" emoji="📺" badge="0 canales">
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-white/10 flex items-center justify-center text-2xl">
            📺
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Sin canales</p>
            <p className="text-muted-foreground text-sm">No hay canales disponibles en este momento.</p>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Canales" emoji="📺" badge={`${channels.length} canales`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onClick={() => handleChannelClick(channel)}
          />
        ))}
      </div>
    </Section>
  );
}
