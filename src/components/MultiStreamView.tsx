import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  X,
  Maximize2,
  Minimize2,
  Grid2X2,
  LayoutGrid,
  Search,
  Trophy,
  Play,
  Monitor,
  Radio,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MatchEvent {
  id: string;
  name: string;
  url: string;
  leagueName: string;
  isLive: boolean;
  hasLink: boolean;
}

interface StreamSlot {
  id: number;
  eventId: string | null;
  title: string;
  url: string;
  isActive: boolean;
  leagueName?: string;
  isLive?: boolean;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function MultiStreamView() {
  const [layout, setLayout] = useState<2 | 4>(4);
  const [slots, setSlots] = useState<StreamSlot[]>([
    { id: 1, eventId: null, title: "", url: "", isActive: false },
    { id: 2, eventId: null, title: "", url: "", isActive: false },
    { id: 3, eventId: null, title: "", url: "", isActive: false },
    { id: 4, eventId: null, title: "", url: "", isActive: false },
  ]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPicker, setShowPicker] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Load only from DB (instant) — only events with links ────
  const load = async () => {
    setLoading(true);
    try {
      const { data: dbRows, error } = await supabase
        .from("events")
        .select("id,espn_id,name,team_home,team_away,stream_url,pending_url,is_active,sport,league,is_live,event_date")
        .eq("is_active", true)
        .not("stream_url", "is", null);

      if (error) throw error;

      const all: MatchEvent[] = (dbRows ?? [])
        .filter((row) => row.stream_url || row.pending_url)
        .map((row) => ({
          id: row.id,
          name: row.name || `${row.team_home ?? "TBD"} vs ${row.team_away ?? "TBD"}`,
          url: row.stream_url || row.pending_url || "",
          leagueName: row.league ?? row.sport ?? "Sport",
          isLive: row.is_live ?? false,
          hasLink: true,
        }))
        .sort((a, b) => (a.isLive === b.isLive ? 0 : a.isLive ? -1 : 1));

      setEvents(all);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando partidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedIds = useMemo(() => new Set(slots.map((s) => s.eventId).filter(Boolean) as string[]), [slots]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (selectedIds.has(e.id)) return false;
      if (!q) return true;
      return `${e.name} ${e.leagueName}`.toLowerCase().includes(q);
    });
  }, [events, search, selectedIds]);

  const withLink = filtered.filter((e) => e.hasLink);
  const noLink = filtered.filter((e) => !e.hasLink);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const pick = (slotId: number, ev: MatchEvent) => {
    if (!ev.hasLink) return;
    setSlots((p) =>
      p.map((s) =>
        s.id === slotId
          ? {
              ...s,
              eventId: ev.id,
              url: ev.url,
              title: ev.name,
              leagueName: ev.leagueName,
              isLive: ev.isLive,
              isActive: true,
            }
          : s,
      ),
    );
    setShowPicker(null);
    setSearch("");
  };

  const remove = (slotId: number) => {
    setSlots((p) =>
      p.map((s) =>
        s.id === slotId
          ? { ...s, eventId: null, url: "", title: "", isActive: false, leagueName: undefined, isLive: undefined }
          : s,
      ),
    );
  };

  const fmt = (url: string) => {
    if (!url) return "";
    if (!url.startsWith("http")) url = "https://" + url;
    return url + (url.includes("?") ? "&" : "?") + "autoplay=1&muted=0";
  };

  const activeCount = slots.filter((s) => s.isActive).length;
  const displaySlots = layout === 2 ? slots.slice(0, 2) : slots;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={cn("min-h-screen", isFullscreen && "fixed inset-0 z-50 bg-background p-3")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            {activeCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold">Multi Stream</h1>
            <p className="text-[11px] text-muted-foreground/50">
              {loading
                ? "Cargando partidos..."
                : activeCount > 0
                  ? `${activeCount} de ${layout} activos`
                  : `${withLink.length + (events.filter((e) => e.hasLink).length - withLink.length)} con enlace · ${events.length} total`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            {([2, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setLayout(n)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  layout === n
                    ? "bg-primary text-white shadow-lg"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04]",
                )}
              >
                {n === 2 ? <Grid2X2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        className={cn(
          layout === 2
            ? "flex items-center justify-center gap-3 max-w-4xl mx-auto"
            : "grid grid-cols-2 gap-3"
        )}
      >
        {displaySlots.map((slot) => (
          <div
            key={slot.id}
            className={cn(
              "relative rounded-2xl overflow-hidden group aspect-video",
              layout === 2 && "w-[calc(50%-6px)] flex-shrink-0",
              "relative rounded-2xl overflow-hidden group aspect-video",
              slot.isActive
                ? "border border-white/[0.08] bg-card shadow-xl"
                : "border border-dashed border-white/[0.06] bg-white/[0.01] hover:border-primary/20",
            )}
          >
            {slot.isActive ? (
              <>
                <iframe
                  src={fmt(slot.url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute inset-x-0 top-0 p-2.5 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex items-center gap-2">
                    {slot.isLive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary">
                        <Radio className="w-2.5 h-2.5 text-white animate-pulse" />
                        <span className="text-[9px] font-bold text-white uppercase">Live</span>
                      </div>
                    )}
                    <span className="text-[11px] font-semibold text-white truncate">{slot.title}</span>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 w-6 h-6 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-white/50">{slot.id}</span>
                </div>
                <button
                  onClick={() => remove(slot.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 hover:bg-red-600 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all z-10 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <AnimatePresence mode="wait">
                {showPicker === slot.id ? (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col p-3 bg-card"
                  >
                    <div className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar partido..."
                          autoFocus
                          className="pl-9 h-9 bg-white/[0.02] border-white/[0.06] text-sm rounded-xl"
                        />
                      </div>
                      <button
                        onClick={load}
                        className="h-9 w-9 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-muted-foreground/40 hover:text-foreground shrink-0"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 min-h-0" style={{ scrollbarWidth: "none" }}>
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/30">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-[11px]">Cargando partidos...</span>
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground/30">
                          <Trophy className="w-5 h-5" />
                          <span className="text-[11px]">No hay partidos hoy</span>
                        </div>
                      ) : (
                        <>
                          {/* Events with links */}
                          {withLink.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => pick(slot.id, ev)}
                              className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-primary/[0.06] border border-white/[0.04] hover:border-primary/20 transition-all text-left"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                                  <Play className="w-3 h-3 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-[12px] font-semibold truncate">{ev.name}</span>
                                    {ev.isLive && (
                                      <span className="px-1 py-0.5 rounded bg-primary/20 text-[8px] font-bold text-primary uppercase shrink-0">
                                        Live
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-primary/50">{ev.leagueName}</span>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                              </div>
                            </button>
                          ))}

                          {/* Events without links — greyed out */}
                          {noLink.length > 0 && (
                            <>
                              <div className="pt-1 pb-0.5 px-1">
                                <span className="text-[10px] text-muted-foreground/25 uppercase tracking-wider font-semibold">
                                  Sin enlace
                                </span>
                              </div>
                              {noLink.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="w-full p-2 rounded-xl bg-white/[0.01] border border-white/[0.02] opacity-35"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                                      <Play className="w-3 h-3 text-muted-foreground/20" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[12px] font-semibold truncate block">{ev.name}</span>
                                      <span className="text-[10px] text-muted-foreground/30">{ev.leagueName}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowPicker(null);
                        setSearch("");
                      }}
                      className="mt-2 w-full py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-muted-foreground/50 text-xs hover:bg-white/[0.05] transition-all"
                    >
                      Cancelar
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowPicker(slot.id)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 group/add"
                  >
                    <div className="absolute top-3 left-3 w-6 h-6 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground/20">{slot.id}</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-primary/[0.05] border border-dashed border-primary/15 flex items-center justify-center group-hover/add:border-primary/30 transition-all">
                      <Plus className="w-6 h-6 text-muted-foreground/25 group-hover/add:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-medium text-muted-foreground/30 group-hover/add:text-foreground/60 transition-colors">
                        Añadir Stream
                      </span>
                      <span className="block text-[10px] text-muted-foreground/20 mt-0.5">
                        {loading
                          ? "Cargando..."
                          : events.filter((e) => e.hasLink && !selectedIds.has(e.id)).length > 0
                            ? `${events.filter((e) => e.hasLink && !selectedIds.has(e.id)).length} con enlace`
                            : "Toca para ver partidos"}
                      </span>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
