import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { Section } from "./Section";
import { ChannelCard } from "./channels/ChannelCard";
import { SkeletonChannelCard } from "./Skeleton";
import { RefreshCw, WifiOff, Radio, Tv, Search, Filter } from "lucide-react";
import { Chips } from "./Chips";

interface ExternalChannel {
  name: string;
  logo: string | null;
  stream_url: string;
  category: string;
  country: string;
  source: string;
}

interface DbChannel {
  id: string;
  key: string;
  name: string;
  logo: string | null;
  stream: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
  is_active: boolean;
}

const CATEGORY_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Deportes", value: "sports" },
  { label: "Noticias", value: "news" },
  { label: "Entretenimiento", value: "entertainment" },
  { label: "Películas", value: "movies" },
  { label: "Música", value: "music" },
  { label: "Infantil", value: "kids" },
  { label: "Documentales", value: "documentary" },
  { label: "General", value: "general" },
];

export function ChannelsView({ initialTab = "247" }: { initialTab?: "247" | "normal" }) {
  const { openPlayer } = usePlayerModal();
  const [dbChannels, setDbChannels] = useState<DbChannel[]>([]);
  const [channels247, setChannels247] = useState<ExternalChannel[]>([]);
  const [channelsNormal, setChannelsNormal] = useState<ExternalChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExternal, setLoadingExternal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"247" | "normal">(initialTab);
  const [visibleCount, setVisibleCount] = useState(60);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // Fetch DB channels
  const fetchDbChannels = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("channels")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (fetchError) throw new Error(fetchError.message);
      setDbChannels(data || []);
    } catch (err) {
      console.error("DB channels error:", err);
    }
  }, []);

  // Fetch external channels
  const fetchExternalChannels = useCallback(async () => {
    setLoadingExternal(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-channels", {
        body: null,
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.success) {
        setChannels247(data.channels_247 || []);
        setChannelsNormal(data.channels_normal || []);
      }
    } catch (err) {
      console.error("External channels error:", err);
      setError("Error al cargar canales externos");
    } finally {
      setLoadingExternal(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchDbChannels(), fetchExternalChannels()]).finally(() => setLoading(false));
  }, [fetchDbChannels, fetchExternalChannels]);

  const handleRetry = () => {
    setRetrying(true);
    setLoading(true);
    setError(null);
    Promise.all([fetchDbChannels(), fetchExternalChannels()]).finally(() => {
      setLoading(false);
      setRetrying(false);
    });
  };

  const handleDbChannelClick = (channel: DbChannel) => {
    if (channel.stream) {
      openPlayer(channel.name, {
        url1: channel.stream,
        url2: channel.stream_url_2 || undefined,
        url3: channel.stream_url_3 || undefined,
      });
    }
  };

  const handleExternalClick = (channel: ExternalChannel) => {
    if (channel.stream_url) {
      openPlayer(channel.name, { url1: channel.stream_url });
    }
  };

  // Filter channels
  const filtered247 = useMemo(() => {
    let list = channels247;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((ch) => ch.name.toLowerCase().includes(q));
    }
    if (activeCategory !== "all") {
      list = list.filter((ch) => ch.category.includes(activeCategory));
    }
    return list;
  }, [channels247, searchQuery, activeCategory]);

  const filteredNormal = useMemo(() => {
    let list = channelsNormal;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((ch) => ch.name.toLowerCase().includes(q));
    }
    if (activeCategory !== "all") {
      list = list.filter((ch) => ch.category.includes(activeCategory));
    }
    return list;
  }, [channelsNormal, searchQuery, activeCategory]);

  if (loading) {
    return (
      <Section title="Canales" emoji="📺" badge="Cargando">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonChannelCard key={i} />
          ))}
        </div>
      </Section>
    );
  }

  if (error && channels247.length === 0 && channelsNormal.length === 0 && dbChannels.length === 0) {
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

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar canales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("247")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "247"
                ? "bg-red-500/20 border border-red-500/40 text-red-400"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="w-4 h-4" />
            24/7
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">
              {channels247.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("normal")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "normal"
                ? "bg-primary/20 border border-primary/40 text-primary"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tv className="w-4 h-4" />
            Canales IPTV
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
              {channelsNormal.length}
            </span>
          </button>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.value
                  ? "bg-primary/20 border border-primary/40 text-primary"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* DB Channels (admin-managed) */}
      {dbChannels.length > 0 && (
        <Section title="Canales Premium" emoji="⭐" badge={`${dbChannels.length}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {dbChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onClick={() => handleDbChannelClick(channel)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* 24/7 Channels */}
      {activeTab === "247" && (
        <Section
          title="Canales 24/7"
          emoji="🔴"
          badge={loadingExternal ? "Cargando..." : `${filtered247.length} canales`}
        >
          {loadingExternal ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonChannelCard key={i} />
              ))}
            </div>
          ) : filtered247.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No se encontraron canales 24/7
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered247.map((ch, i) => (
                <ExternalChannelCard
                  key={`247-${i}-${ch.name}`}
                  channel={ch}
                  is247
                  onClick={() => handleExternalClick(ch)}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Normal IPTV Channels */}
      {activeTab === "normal" && (
        <Section
          title="Canales IPTV"
          emoji="📡"
          badge={loadingExternal ? "Cargando..." : `${filteredNormal.length} canales`}
        >
          {loadingExternal ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonChannelCard key={i} />
              ))}
            </div>
          ) : filteredNormal.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No se encontraron canales IPTV
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredNormal.slice(0, 100).map((ch, i) => (
                <ExternalChannelCard
                  key={`iptv-${i}-${ch.name}`}
                  channel={ch}
                  onClick={() => handleExternalClick(ch)}
                />
              ))}
              {filteredNormal.length > 100 && (
                <div className="col-span-full text-center py-4 text-muted-foreground text-xs">
                  Mostrando 100 de {filteredNormal.length} canales. Usa el buscador para filtrar.
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

// ── External Channel Card ──
function ExternalChannelCard({
  channel,
  is247,
  onClick,
}: {
  channel: ExternalChannel;
  is247?: boolean;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const sourceLabel =
    channel.source === "ppv247" ? "PPV" :
    channel.source === "iptv-org" ? "IPTV" :
    channel.source === "ipstreet" ? "IPStreet" :
    channel.source === "tvgarden" ? "TVG" : channel.source;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-border hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_hsl(var(--primary)/0.25)]"
    >
      {/* Background glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      <div className="relative p-3.5 flex items-center gap-3.5">
        {/* Logo */}
        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-white/[0.12] transition-colors">
          {channel.logo && !imgError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xl">{is247 ? "🔴" : "📺"}</span>
          )}
          {is247 && (
            <div className="absolute -top-1 -right-1">
              <div className="relative w-4 h-4 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                <Radio className="w-2 h-2 text-white relative z-10" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground/90 truncate group-hover:text-foreground transition-colors">
            {channel.name}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {is247 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/20 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                24/7
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider">
                IPTV
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-muted-foreground bg-muted/50">
              {sourceLabel}
            </span>
            {channel.category && channel.category !== "general" && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-muted-foreground bg-muted/50 capitalize hidden sm:inline">
                {channel.category}
              </span>
            )}
          </div>
        </div>

        {/* Play indicator */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border backdrop-blur-sm bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 text-primary group-hover:from-primary/30 group-hover:to-primary/20 group-hover:scale-105">
          <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
