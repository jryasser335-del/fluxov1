import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tv, Film, Clapperboard, Search, Loader2, ChevronLeft, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { cn } from "@/lib/utils";

type Tab = "live" | "vod" | "series";

interface Category { category_id: string; category_name: string }
interface LiveItem { stream_id: number; name: string; stream_icon?: string; category_id?: string }
interface VodItem { stream_id: number; name: string; stream_icon?: string; container_extension?: string; rating?: string; category_id?: string }
interface SeriesItem { series_id: number; name: string; cover?: string; plot?: string; rating?: string; category_id?: string }
interface Episode { id: string; title: string; container_extension?: string; info?: { plot?: string; movie_image?: string } }

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "live", label: "Canales", icon: Tv, color: "from-blue-500 to-cyan-400" },
  { id: "vod", label: "Películas", icon: Film, color: "from-fuchsia-500 to-rose-500" },
  { id: "series", label: "Series", icon: Clapperboard, color: "from-amber-400 to-orange-500" },
];

async function callXtream(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const { data, error } = await supabase.functions.invoke(`xtream-proxy?${qs}`, { method: "GET" });
  if (error) throw error;
  return data;
}

async function getPlayUrl(type: "live" | "movie" | "series", id: string | number, ext = "m3u8") {
  const data = await callXtream({ action: "play", type, id: String(id), ext });
  return data?.url as string;
}

export function MiTVView() {
  const [tab, setTab] = useState<Tab>("live");
  const [cats, setCats] = useState<Record<Tab, Category[]>>({ live: [], vod: [], series: [] });
  const [activeCat, setActiveCat] = useState<string>("");
  const [items, setItems] = useState<(LiveItem | VodItem | SeriesItem)[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [seriesOpen, setSeriesOpen] = useState<SeriesItem | null>(null);
  const { openPlayer } = usePlayerModal();

  // Load categories per tab once
  useEffect(() => {
    if (cats[tab].length > 0) return;
    const actionMap: Record<Tab, string> = { live: "live_cats", vod: "vod_cats", series: "series_cats" };
    setLoading(true);
    callXtream({ action: actionMap[tab] })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCats((c) => ({ ...c, [tab]: list }));
        if (list[0]) setActiveCat(list[0].category_id);
      })
      .catch(() => setCats((c) => ({ ...c, [tab]: [] })))
      .finally(() => setLoading(false));
  }, [tab]); // eslint-disable-line

  // Set first category when tab changes
  useEffect(() => {
    if (cats[tab][0]) setActiveCat(cats[tab][0].category_id);
    setSearch("");
  }, [tab, cats]);

  // Load items when category changes
  useEffect(() => {
    if (!activeCat) { setItems([]); return; }
    const actionMap: Record<Tab, string> = { live: "live", vod: "vod", series: "series" };
    setLoading(true);
    callXtream({ action: actionMap[tab], category_id: activeCat })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeCat, tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((it) => (it as any).name?.toLowerCase().includes(q));
  }, [items, search]);

  const handleClick = async (it: any) => {
    if (tab === "live") {
      const url = await getPlayUrl("live", it.stream_id);
      openPlayer(it.name, { url1: url });
    } else if (tab === "vod") {
      const url = await getPlayUrl("movie", it.stream_id, it.container_extension || "mp4");
      openPlayer(it.name, { url1: url }, "movie");
    } else {
      setSeriesOpen(it);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
              Mi TV
            </h1>
            <p className="text-xs text-white/40 mt-0.5">Canales · Películas · Series</p>
          </div>
          <div className="relative max-w-[260px] w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-fit">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                  active ? "text-white" : "text-white/40 hover:text-white/70"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="mitv-tab"
                    className={cn("absolute inset-0 rounded-xl bg-gradient-to-br shadow-lg", t.color)}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories chips */}
      {cats[tab].length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {cats[tab].map((c) => (
            <button
              key={c.category_id}
              onClick={() => setActiveCat(c.category_id)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                activeCat === c.category_id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/30"
                  : "bg-white/[0.03] text-white/60 border-white/10 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              {c.category_name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">Sin resultados</div>
      ) : tab === "live" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((it: any) => (
            <button
              key={it.stream_id}
              onClick={() => handleClick(it)}
              className="group relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-primary/50 transition-all hover:scale-[1.03]"
            >
              <div className="absolute inset-0 flex items-center justify-center p-3">
                {it.stream_icon ? (
                  <img src={it.stream_icon} alt={it.name} loading="lazy" className="max-w-full max-h-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <Tv className="w-8 h-8 text-white/30" />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <p className="text-[11px] font-medium text-white truncate">{it.name}</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                <Play className="w-8 h-8 text-white" fill="white" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((it: any) => {
            const cover = it.stream_icon || it.cover;
            const key = it.stream_id || it.series_id;
            return (
              <button
                key={key}
                onClick={() => handleClick(it)}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-primary/50 transition-all hover:scale-[1.03]"
              >
                {cover ? (
                  <img src={cover} alt={it.name} loading="lazy" className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-10 h-10 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                  <p className="text-[11px] font-semibold text-white line-clamp-2">{it.name}</p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/50">
                  <Play className="w-9 h-9 text-white" fill="white" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {seriesOpen && <SeriesModal series={seriesOpen} onClose={() => setSeriesOpen(null)} />}
    </div>
  );
}

function SeriesModal({ series, onClose }: { series: SeriesItem; onClose: () => void }) {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<string>("");
  const { openPlayer } = usePlayerModal();

  useEffect(() => {
    setLoading(true);
    callXtream({ action: "series_info", id: String(series.series_id) })
      .then((data) => {
        setInfo(data);
        const seasons = data?.episodes ? Object.keys(data.episodes) : [];
        if (seasons[0]) setSeason(seasons[0]);
      })
      .finally(() => setLoading(false));
  }, [series.series_id]);

  const seasons: string[] = info?.episodes ? Object.keys(info.episodes) : [];
  const episodes: Episode[] = season && info?.episodes?.[season] ? info.episodes[season] : [];

  const playEp = async (ep: Episode) => {
    const url = await getPlayUrl("series", ep.id, ep.container_extension || "mp4");
    openPlayer(`${series.name} — ${ep.title}`, { url1: url }, "series");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl overflow-hidden my-8">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>

        {(series.cover || (info?.info?.cover)) && (
          <div className="relative h-48 sm:h-64 overflow-hidden">
            <img src={info?.info?.cover || series.cover} alt={series.name} className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <h2 className="text-2xl font-display font-bold text-white">{series.name}</h2>
              {info?.info?.plot && <p className="text-sm text-white/60 line-clamp-2 mt-1">{info.info.plot}</p>}
            </div>
          </div>
        )}

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : seasons.length === 0 ? (
            <p className="text-center text-white/40 py-6 text-sm">Sin episodios disponibles</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto mb-4 no-scrollbar">
                {seasons.map((s) => (
                  <button key={s} onClick={() => setSeason(s)}
                    className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap",
                      season === s ? "bg-primary text-white border-primary" : "bg-white/5 text-white/60 border-white/10")}>
                    Temp {s}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {episodes.map((ep) => (
                  <button key={ep.id} onClick={() => playEp(ep)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-primary/40 transition text-left">
                    <div className="w-16 h-10 rounded bg-black/60 shrink-0 overflow-hidden flex items-center justify-center">
                      {ep.info?.movie_image ? (
                        <img src={ep.info.movie_image} alt="" className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : <Play className="w-4 h-4 text-white/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ep.title}</p>
                      {ep.info?.plot && <p className="text-xs text-white/40 line-clamp-1">{ep.info.plot}</p>}
                    </div>
                    <Play className="w-4 h-4 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
