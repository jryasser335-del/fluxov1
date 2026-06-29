import { useEffect, useMemo, useState } from "react";
import { Loader2, Radio, X, Tv, Search } from "lucide-react";
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

// Hue por marca para fallback de logo
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

export function LaCanchaChannelsView() {
  const [channels, setChannels] = useState<LCChannel[]>([]);
  const [categories, setCategories] = useState<LCCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("all");
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter(
      (c) =>
        (activeCat === "all" || c.category_id === activeCat) &&
        (!q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)),
    );
  }, [channels, activeCat, search]);

  if (open) return <ChannelPlayer channel={open} onClose={() => setOpen(null)} />;

  return (
    <div className="mb-8">
      {/* Search + categories */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal…"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/40 transition"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} label={`Todos · ${channels.length}`} />
          {categories.map((cat) => {
            const count = channels.filter((c) => c.category_id === cat.id).length;
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
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Tv className="w-10 h-10 text-white/20 mb-3" />
          <p className="text-white/50 font-semibold">Sin canales</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((c) => (
            <ChannelCard key={c.id} channel={c} onClick={() => setOpen(c)} />
          ))}
        </div>
      )}
    </div>
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

function ChannelCard({ channel, onClick }: { channel: LCChannel; onClick: () => void }) {
  const hue = brandHue(channel.name);
  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-white/[0.05] hover:border-white/[0.14] hover:-translate-y-0.5 transition-all duration-300"
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
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/90 text-white text-[8px] font-black uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          Live
        </div>
      </div>
      <div className="bg-[#0c0c0e] px-3 py-2">
        <div className="text-[12px] font-bold text-white truncate">{channel.name}</div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">HD · Español</div>
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
