import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, Tv, Film, Clapperboard, Radio, Search, ChevronLeft, Play, Loader2, Star,
} from "lucide-react";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { supabase } from "@/integrations/supabase/client";

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/iptv-xtream`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const streamUrl = (kind: "live" | "movie" | "series", id: number | string, ext = "m3u8") =>
  `${FN}?op=stream&kind=${kind}&id=${id}&ext=${ext}&apikey=${ANON}`;

const logoUrl = (raw?: string) =>
  raw ? `${FN}?op=logo&url=${encodeURIComponent(raw)}&apikey=${ANON}` : "";

type Tab = "live" | "movies" | "series";

interface Category { category_id: string; category_name: string }
interface LiveItem { stream_id: number; name: string; stream_icon?: string; epg_channel_id?: string }
interface VodItem { stream_id: number; name: string; stream_icon?: string; container_extension?: string; rating?: string }
interface SeriesItem { series_id: number; name: string; cover?: string; rating?: string }
interface SeriesInfo {
  episodes?: Record<string, Array<{ id: string; title: string; container_extension?: string; info?: { movie_image?: string } }>>;
}

async function api<T>(params: Record<string, string>): Promise<T> {
  const u = new URL(FN);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  return r.json();
}

const tabs: Array<{ id: Tab; label: string; icon: typeof Radio; color: string; op: string }> = [
  { id: "live", label: "Canales", icon: Radio, color: "from-red-500 to-orange-500", op: "live_categories" },
  { id: "movies", label: "Películas", icon: Film, color: "from-fuchsia-500 to-purple-500", op: "vod_categories" },
  { id: "series", label: "Series", icon: Clapperboard, color: "from-cyan-500 to-blue-500", op: "series_categories" },
];

export function IPTVView() {
  const { openPlayer } = usePlayerModal();
  const [tab, setTab] = useState<Tab>("live");
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<Category | null>(null);
  const [items, setItems] = useState<Array<LiveItem | VodItem | SeriesItem>>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [search, setSearch] = useState("");
  const [seriesOpen, setSeriesOpen] = useState<SeriesItem | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);

  // Load categories on tab change
  useEffect(() => {
    setActiveCat(null); setItems([]); setSearch("");
    setLoadingCats(true);
    const op = tabs.find((t) => t.id === tab)!.op;
    api<Category[]>({ op })
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .finally(() => setLoadingCats(false));
  }, [tab]);

  // Load items when category selected
  useEffect(() => {
    if (!activeCat) return;
    setLoadingItems(true); setItems([]);
    const op = tab === "live" ? "live" : tab === "movies" ? "vod" : "series";
    api<Array<LiveItem | VodItem | SeriesItem>>({ op, cat: activeCat.category_id })
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoadingItems(false));
  }, [activeCat, tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, search]);

  const filteredCats = useMemo(() => {
    if (!search.trim() || activeCat) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.category_name.toLowerCase().includes(q));
  }, [categories, search, activeCat]);

  const playLive = (it: LiveItem) => {
    openPlayer(it.name, { url1: streamUrl("live", it.stream_id, "m3u8") }, "live");
  };
  const playVod = (it: VodItem) => {
    const ext = it.container_extension || "mp4";
    openPlayer(it.name, { url1: streamUrl("movie", it.stream_id, ext) }, "movie");
  };
  const openSeries = async (it: SeriesItem) => {
    setSeriesOpen(it); setSeriesInfo(null);
    const info = await api<SeriesInfo>({ op: "series_info", id: String(it.series_id) });
    setSeriesInfo(info);
  };
  const playEpisode = (ep: { id: string; title: string; container_extension?: string }, seriesName: string) => {
    const ext = ep.container_extension || "mp4";
    openPlayer(`${seriesName} — ${ep.title}`, { url1: streamUrl("series", ep.id, ext) }, "series");
  };

  return (
    <div className="relative">
      {/* Hero — sin credenciales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl mb-6 border border-white/10"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-fuchsia-500/15 to-cyan-500/20" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, hsl(45 100% 60% / 0.4), transparent 50%), radial-gradient(circle at 80% 70%, hsl(280 100% 60% / 0.4), transparent 50%)",
          }} />
        </div>
        <div className="relative p-6 md:p-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur-md">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-200">IPTV Premium</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-200">En vivo</span>
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-wider"
            style={{
              backgroundImage: "linear-gradient(120deg, hsl(45 100% 75%), hsl(280 100% 80%), hsl(190 100% 75%), hsl(45 100% 75%))",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradient-shift 5s ease-in-out infinite",
            }}
          >
            FLUXO IPTV
          </h1>
          <p className="mt-2 text-white/60 font-tech text-sm tracking-wide">
            Miles de canales · Películas y Series bajo demanda · Reproducción instantánea
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-tech text-sm tracking-wider transition-all shrink-0 ${
                active ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="iptv-tab-pill"
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${t.color} shadow-lg`}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              )}
              <span className="relative flex items-center gap-2.5">
                <t.icon className="w-4 h-4" />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + breadcrumb */}
      <div className="flex items-center gap-3 mb-5">
        {activeCat && (
          <button
            onClick={() => { setActiveCat(null); setItems([]); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" /> Categorías
          </button>
        )}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeCat ? `Buscar en ${activeCat.category_name}…` : "Buscar categoría…"}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/40 transition-colors"
          />
        </div>
        {activeCat && (
          <span className="text-xs text-white/40 shrink-0">{filtered.length} items</span>
        )}
      </div>

      {/* Content */}
      {loadingCats && !activeCat ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : !activeCat ? (
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        >
          {filteredCats.map((c, i) => (
            <motion.button
              key={c.category_id}
              onClick={() => setActiveCat(c)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.01, 0.4) }}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-3 hover:border-amber-400/30 hover:bg-white/[0.04] transition-all text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center">
                  {tab === "live" ? <Tv className="w-4 h-4 text-amber-300" /> :
                   tab === "movies" ? <Film className="w-4 h-4 text-fuchsia-300" /> :
                   <Clapperboard className="w-4 h-4 text-cyan-300" />}
                </div>
                <span className="text-xs text-white/85 leading-tight line-clamp-2 font-medium">
                  {c.category_name}
                </span>
              </div>
            </motion.button>
          ))}
          {filteredCats.length === 0 && (
            <div className="col-span-full text-center text-white/40 py-12 text-sm">Sin categorías</div>
          )}
        </motion.div>
      ) : loadingItems ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : tab === "live" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(filtered as LiveItem[]).map((it, i) => (
            <motion.button
              key={it.stream_id}
              onClick={() => playLive(it)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.3) }}
              className="group aspect-video relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-amber-400/40 transition-all"
            >
              {it.stream_icon ? (
                <img src={it.stream_icon} alt={it.name} loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-110 transition-transform" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Tv className="w-8 h-8 text-white/20" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <p className="text-[11px] text-white/90 truncate font-medium">{it.name}</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-amber-500/90 flex items-center justify-center">
                  <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                </div>
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center text-white/40 py-12 text-sm">Sin canales</div>}
        </div>
      ) : tab === "movies" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(filtered as VodItem[]).map((it, i) => (
            <motion.button
              key={it.stream_id}
              onClick={() => playVod(it)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.3) }}
              className="group aspect-[2/3] relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-fuchsia-400/40 transition-all"
            >
              {it.stream_icon ? (
                <img src={it.stream_icon} alt={it.name} loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"><Film className="w-10 h-10 text-white/20" /></div>
              )}
              {it.rating && parseFloat(it.rating) > 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-bold text-amber-300">{parseFloat(it.rating).toFixed(1)}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2.5">
                <p className="text-xs text-white font-medium line-clamp-2">{it.name}</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center text-white/40 py-12 text-sm">Sin películas</div>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(filtered as SeriesItem[]).map((it, i) => (
            <motion.button
              key={it.series_id}
              onClick={() => openSeries(it)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.3) }}
              className="group aspect-[2/3] relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/40 transition-all"
            >
              {it.cover ? (
                <img src={it.cover} alt={it.name} loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"><Clapperboard className="w-10 h-10 text-white/20" /></div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2.5">
                <p className="text-xs text-white font-medium line-clamp-2">{it.name}</p>
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center text-white/40 py-12 text-sm">Sin series</div>}
        </div>
      )}

      {/* Series episodes modal */}
      {seriesOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSeriesOpen(null)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white truncate">{seriesOpen.name}</h2>
              <button onClick={() => setSeriesOpen(null)} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-4">
              {!seriesInfo ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
              ) : !seriesInfo.episodes ? (
                <p className="text-white/50 text-center py-8 text-sm">Sin episodios disponibles</p>
              ) : (
                Object.entries(seriesInfo.episodes).map(([season, eps]) => (
                  <div key={season} className="mb-6">
                    <h3 className="text-sm font-bold text-cyan-300 mb-2 tracking-wider">TEMPORADA {season}</h3>
                    <div className="space-y-1.5">
                      {eps.map((ep) => (
                        <button key={ep.id} onClick={() => playEpisode(ep, seriesOpen.name)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-cyan-400/30 transition-all text-left">
                          <div className="w-8 h-8 rounded-md bg-cyan-500/20 flex items-center justify-center shrink-0">
                            <Play className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300 ml-0.5" />
                          </div>
                          <span className="text-sm text-white/90 flex-1 truncate">{ep.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
