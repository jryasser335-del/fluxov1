import { useEffect, useMemo, useState, useRef } from "react";
import { Loader2, Radio, X, Tv, Search, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const LC_URL = "https://nmaopmcugunecbclfwzs.supabase.co/rest/v1";
const LC_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYW9wbWN1Z3VuZWNiY2xmd3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODc5ODEsImV4cCI6MjA5Njc2Mzk4MX0.Z2-LSY83JtAgX3mtR3_wxNfzUwkLJPyvhuIb2xT_eVM";
const lcHeaders = { apikey: LC_KEY, Authorization: `Bearer ${LC_KEY}` };

interface LCChannel {
  id: string;
  name: string;
  slug: string;
  stream_param: string;
  logo_url: string | null;
  category_id: string;
  is_active: boolean;
}
interface LCCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

const embedUrl = (param: string) => `https://lacancha.tv/es/embed/${param}`;

// Detección de calidad desde el nombre / slug
type Quality = "4K" | "FHD" | "HD" | "SD";
const detectQuality = (c: LCChannel): Quality => {
  const s = `${c.name} ${c.slug}`.toLowerCase();
  if (/\b(4k|uhd|2160)\b/.test(s)) return "4K";
  if (/\b(fhd|1080)\b/.test(s)) return "FHD";
  if (/\b(hd|720)\b/.test(s)) return "HD";
  // Los canales premium (ESPN, Fox, DAZN, BeIN, Movistar, DSports) se consideran HD por defecto
  if (/\b(espn|fox|dazn|bein|movistar|dsports|tnt sports|tyc|win sports|golperu|liga 1 max|caliente)\b/.test(s))
    return "HD";
  return "SD";
};

const BRAND_HUE: Record<string, string> = {
  espn: "#c8102e", fox: "#013369", tnt: "#fdb913", dsports: "#003da5",
  dazn: "#f8e500", tyc: "#00aef0", bein: "#7b2cbf", win: "#ff7900",
  liga: "#00853f", azteca: "#0066b3", caliente: "#e10600", canal: "#1d4ed8",
  telefe: "#fbbf24", tv: "#374151", vtv: "#2563eb", movistar: "#0a3d62",
  golperu: "#ef4444", cbs: "#0033a0",
};
const brandHue = (name: string) => {
  const l = name.toLowerCase();
  for (const k of Object.keys(BRAND_HUE)) if (l.includes(k)) return BRAND_HUE[k];
  return "#374151";
};

type QualityFilter = "all" | "hd_plus" | "4k";

export function LaCanchaChannelsView() {
  const [channels, setChannels] = useState<LCChannel[]>([]);
  const [categories, setCategories] = useState<LCCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [qFilter, setQFilter] = useState<QualityFilter>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<LCChannel | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rc, rcat] = await Promise.all([
          fetch(`${LC_URL}/channels?select=*&is_active=eq.true&order=name.asc&limit=500`, { headers: lcHeaders }),
          fetch(`${LC_URL}/channel_categories?select=*&order=name.asc`, { headers: lcHeaders }),
        ]);
        setChannels((await rc.json()) || []);
        setCategories((await rcat.json()) || []);
      } catch (e) {
        console.error("LaCancha channels error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Enriquecer con calidad
  const withQuality = useMemo(
    () => channels.map((c) => ({ ...c, quality: detectQuality(c) as Quality })),
    [channels],
  );

  const qualityCounts = useMemo(() => {
    const c = { "4K": 0, FHD: 0, HD: 0, SD: 0 };
    withQuality.forEach((x) => c[x.quality]++);
    return c;
  }, [withQuality]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withQuality.filter((c) => {
      if (activeCat !== "all" && c.category_id !== activeCat) return false;
      if (qFilter === "4k" && c.quality !== "4K") return false;
      if (qFilter === "hd_plus" && !(c.quality === "4K" || c.quality === "FHD" || c.quality === "HD")) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [withQuality, activeCat, qFilter, search]);

  if (open) return <ChannelPlayer channel={open} onClose={() => setOpen(null)} />;

  return (
    <div className="mb-8 space-y-6">
      {/* Hero premium header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-cyan-500/[0.08] via-transparent to-fuchsia-500/[0.05] p-5 sm:p-6">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-fuchsia-500/10 blur-[100px] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/90 mb-2.5">
              <Sparkles className="w-3 h-3" />
              Canales en vivo
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
              Toda la TV en un solo lugar
            </h2>
            <p className="text-xs sm:text-sm text-white/50 mt-1.5 max-w-lg">
              {channels.length} canales · Deportes, entretenimiento y noticias en HD y 4K
            </p>
          </div>
          <div className="flex items-center gap-2">
            <QualityBadge label="4K"  count={qualityCounts["4K"]}  active={qFilter === "4k"}      onClick={() => setQFilter(qFilter === "4k" ? "all" : "4k")} tone="gold" />
            <QualityBadge label="HD+" count={qualityCounts["4K"] + qualityCounts.FHD + qualityCounts.HD} active={qFilter === "hd_plus"} onClick={() => setQFilter(qFilter === "hd_plus" ? "all" : "hd_plus")} tone="cyan" />
          </div>
        </div>
      </div>

      {/* Carrusel horizontal "todos los canales" */}
      <ChannelStrip channels={withQuality} onSelect={setOpen} />

      {/* Search + categories */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/40 transition"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} label={`Todos · ${channels.length}`} />
          {categories.map((cat) => {
            const count = channels.filter((c) => c.category_id === cat.id).length;
            if (!count) return null;
            return (
              <CatChip
                key={cat.id}
                active={activeCat === cat.id}
                onClick={() => setActiveCat(cat.id)}
                label={`${cat.name} · ${count}`}
              />
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Tv className="w-10 h-10 text-white/20 mb-3" />
          <p className="text-white/50 font-semibold">Sin canales</p>
          <p className="text-white/30 text-xs mt-1">Prueba con otro filtro o categoría</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40 font-bold">
            <span>{filtered.length} resultados</span>
            {qFilter !== "all" && (
              <button onClick={() => setQFilter("all")} className="text-cyan-300 hover:text-cyan-200 normal-case tracking-normal">
                Limpiar filtro de calidad
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map((c) => (
              <ChannelCard key={c.id} channel={c} onClick={() => setOpen(c)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Carrusel horizontal ─── */
function ChannelStrip({
  channels,
  onSelect,
}: {
  channels: (LCChannel & { quality: Quality })[];
  onSelect: (c: LCChannel) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
  };
  if (!channels.length) return null;
  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-fuchsia-500" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-white/90">Todos los canales</h3>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll(-1)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-white/70 flex items-center justify-center transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-white/70 flex items-center justify-center transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1"
      >
        {channels.map((c) => {
          const hue = brandHue(c.name);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="snap-start shrink-0 w-[140px] group/item"
            >
              <div
                className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.05] group-hover/item:border-cyan-400/40 transition-all group-hover/item:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${hue}55 0%, #0a0a0a 60%, ${hue}30 100%)` }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.6)_100%)]" />
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.name}
                    className="absolute inset-0 m-auto max-h-10 max-w-[70%] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                    loading="lazy"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white text-center px-2">
                    {c.name}
                  </span>
                )}
                <QualityChip q={c.quality} />
              </div>
              <div className="mt-1 text-[10px] font-bold text-white/70 truncate px-0.5">{c.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QualityBadge({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone: "gold" | "cyan";
}) {
  const colors =
    tone === "gold"
      ? active
        ? "bg-amber-400/20 text-amber-200 border-amber-300/50 shadow-[0_0_20px_-4px_rgba(251,191,36,0.5)]"
        : "bg-white/[0.03] text-amber-200/70 border-amber-400/20 hover:border-amber-300/40"
      : active
        ? "bg-cyan-500/20 text-cyan-200 border-cyan-300/50 shadow-[0_0_20px_-4px_rgba(6,182,212,0.5)]"
        : "bg-white/[0.03] text-cyan-200/70 border-cyan-400/20 hover:border-cyan-300/40";
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-xl border text-[11px] font-black uppercase tracking-[0.18em] transition-all",
        colors,
      )}
    >
      {label} <span className="opacity-60 font-bold">· {count}</span>
    </button>
  );
}

function QualityChip({ q }: { q: Quality }) {
  const map: Record<Quality, string> = {
    "4K": "bg-gradient-to-r from-amber-400 to-amber-600 text-black",
    FHD: "bg-cyan-400/95 text-black",
    HD: "bg-white/85 text-black",
    SD: "bg-white/30 text-white/80",
  };
  return (
    <span
      className={cn(
        "absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
        map[q],
      )}
    >
      {q}
    </span>
  );
}

function CatChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3.5 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition border",
        active
          ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/40"
          : "bg-white/[0.03] text-white/55 hover:text-white border-white/[0.05]",
      )}
    >
      {label}
    </button>
  );
}

function ChannelCard({
  channel,
  onClick,
}: {
  channel: LCChannel & { quality: Quality };
  onClick: () => void;
}) {
  const hue = brandHue(channel.name);
  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-white/[0.05] hover:border-cyan-400/40 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div
        className="relative aspect-video flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${hue}55 0%, #0a0a0a 60%, ${hue}30 100%)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
        {channel.logo_url ? (
          <img
            src={channel.logo_url}
            alt={channel.name}
            className="relative max-h-12 max-w-[70%] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            loading="lazy"
          />
        ) : (
          <span className="relative font-display text-lg font-black text-white tracking-tight text-center px-3 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            {channel.name}
          </span>
        )}
        <QualityChip q={channel.quality} />
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/95 text-white text-[8px] font-black uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          Live
        </div>
      </div>
      <div className="bg-[#0c0c0e] px-3 py-2">
        <div className="text-[12px] font-bold text-white truncate">{channel.name}</div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">{channel.quality} · Español</div>
      </div>
    </button>
  );
}

function ChannelPlayer({ channel, onClose }: { channel: LCChannel; onClose: () => void }) {
  return (
    <div className="mb-8">
      <button
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition"
      >
        <X className="w-3.5 h-3.5" />
        Volver a canales
      </button>

      <div className="rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/[0.06] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2 bg-[#111113] border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">{channel.name}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">HD · ES</span>
        </div>

        <div className="relative bg-black aspect-video">
          <iframe
            key={channel.id}
            src={embedUrl(channel.stream_param)}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="px-4 py-3 bg-[#0a1828] border-t border-cyan-500/10 text-[11px] text-cyan-200/80">
          <span className="font-bold text-cyan-300">Contenido de terceros · </span>
          Señal transmitida desde proveedores externos vía iframe. No alojamos ni retransmitimos.
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-white/40">
        <Radio className="w-3.5 h-3.5" />
        Fuente: lacancha.tv · canal <span className="font-mono text-white/60">{channel.stream_param}</span>
      </div>
    </div>
  );
}
