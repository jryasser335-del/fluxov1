import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Radio, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const LC_URL = "https://nmaopmcugunecbclfwzs.supabase.co/rest/v1";
const LC_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYW9wbWN1Z3VuZWNiY2xmd3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODc5ODEsImV4cCI6MjA5Njc2Mzk4MX0.Z2-LSY83JtAgX3mtR3_wxNfzUwkLJPyvhuIb2xT_eVM";

const lcHeaders = { apikey: LC_KEY, Authorization: `Bearer ${LC_KEY}` };

interface LCMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  time_elapsed: string | null;
  venue_name: string | null;
  venue_city: string | null;
  stage: string | null;
  group_name: string | null;
}

interface LCStream {
  id: string;
  match_id: string;
  embed_name: string;
  embed_url: string;
}

const TEAM_ES: Record<string, string> = {
  "South Africa": "Sudáfrica", "Mexico": "México", "United States": "Estados Unidos",
  "Canada": "Canadá", "England": "Inglaterra", "Spain": "España", "Germany": "Alemania",
  "Italy": "Italia", "Brazil": "Brasil", "Belgium": "Bélgica", "Netherlands": "Países Bajos",
  "Switzerland": "Suiza", "Saudi Arabia": "Arabia Saudita", "Cape Verde": "Cabo Verde",
  "Uruguay": "Uruguay", "Argentina": "Argentina", "Croatia": "Croacia", "Egypt": "Egipto",
  "Iran": "Irán", "New Zealand": "Nueva Zelanda", "Panama": "Panamá", "Ghana": "Ghana",
  "Colombia": "Colombia", "Portugal": "Portugal", "Algeria": "Argelia", "Austria": "Austria",
  "Jordan": "Jordania", "Norway": "Noruega", "France": "Francia", "Senegal": "Senegal",
  "Iraq": "Irak", "Morocco": "Marruecos", "Japan": "Japón", "South Korea": "Corea del Sur",
  "Australia": "Australia", "Qatar": "Qatar", "Ecuador": "Ecuador", "Paraguay": "Paraguay",
  "DR Congo": "R.D. Congo", "Uzbekistan": "Uzbekistán", "Tunisia": "Túnez",
  "Ivory Coast": "Costa de Marfil", "Cameroon": "Camerún", "Nigeria": "Nigeria",
  "Türkiye": "Turquía", "Turkey": "Turquía", "Denmark": "Dinamarca", "Sweden": "Suecia",
  "Poland": "Polonia", "Greece": "Grecia", "Czech Republic": "República Checa",
  "Serbia": "Serbia", "Wales": "Gales", "Scotland": "Escocia", "Ireland": "Irlanda",
  "Northern Ireland": "Irlanda del Norte", "Hungary": "Hungría", "Slovakia": "Eslovaquia",
};
const es = (n: string) => TEAM_ES[n] || n;

// Color hint por equipo para el gradiente del card
const TEAM_HUE: Record<string, string> = {
  "Saudi Arabia": "#0a6b3a", "Cape Verde": "#1e3a8a", "Spain": "#c8102e", "Uruguay": "#1e3a8a",
  "Iran": "#239f40", "Egypt": "#c8102e", "Belgium": "#c8102e", "New Zealand": "#1e1e1e",
  "France": "#1e3a8a", "Norway": "#c8102e", "Iraq": "#c8102e", "Senegal": "#00853f",
  "Argentina": "#74acdf", "Brazil": "#009c3b", "Germany": "#1a1a1a", "England": "#c8102e",
  "Italy": "#0066a4", "Portugal": "#006400", "Croatia": "#c8102e", "Mexico": "#006847",
  "United States": "#1e3a8a", "Canada": "#c8102e", "Netherlands": "#ff6b00",
};
const hue = (n: string) => TEAM_HUE[n] || "#374151";

export function WorldCupView() {
  const [matches, setMatches] = useState<LCMatch[]>([]);
  const [streams, setStreams] = useState<Record<string, LCStream[]>>({});
  const [loading, setLoading] = useState(true);
  const [openMatch, setOpenMatch] = useState<LCMatch | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const since = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
        const res = await fetch(
          `${LC_URL}/matches?select=*&competition=eq.World%20Cup&kickoff_at=gte.${since}&order=kickoff_at.asc&limit=60`,
          { headers: lcHeaders }
        );
        const data: LCMatch[] = await res.json();
        setMatches(data || []);
        const ids = (data || [])
          .filter((m) => new Date(m.kickoff_at).getTime() < Date.now() + 36 * 3600 * 1000)
          .map((m) => m.id);
        if (ids.length) {
          const r2 = await fetch(
            `${LC_URL}/match_streams?select=id,match_id,embed_name,embed_url&match_id=in.(${ids.join(",")})`,
            { headers: lcHeaders }
          );
          const sdata: LCStream[] = await r2.json();
          const grouped: Record<string, LCStream[]> = {};
          (sdata || []).forEach((s) => {
            (grouped[s.match_id] ||= []).push(s);
          });
          setStreams(grouped);
        }
      } catch (e) {
        console.error("WorldCup fetch error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, LCMatch[]> = {};
    matches.forEach((m) => {
      const d = new Date(m.kickoff_at);
      const key = d.toISOString().slice(0, 10);
      (g[key] ||= []).push(m);
    });
    return g;
  }, [matches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-5xl mb-3">🏆</span>
        <p className="text-foreground/60 font-semibold">Sin partidos del Mundial por ahora</p>
      </div>
    );
  }

  if (openMatch) {
    return (
      <WCInlinePlayer
        match={openMatch}
        streams={streams[openMatch.id] || []}
        onClose={() => setOpenMatch(null)}
      />
    );
  }

  return (
    <div className="mb-8">
      {Object.keys(grouped)
        .sort()
        .map((day) => {
          const dayDate = new Date(day + "T12:00:00");
          const label = dayDate.toLocaleDateString("es", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          return (
            <div key={day} className="mb-7">
              <h3 className="text-[11px] uppercase tracking-[0.22em] text-white/35 font-bold mb-3 pl-1">
                {label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[day].map((m) => (
                  <WCMatchCard
                    key={m.id}
                    match={m}
                    hasStreams={(streams[m.id]?.length ?? 0) > 0}
                    onOpen={() => setOpenMatch(m)}
                  />
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function WCMatchCard({
  match,
  hasStreams,
  onOpen,
}: {
  match: LCMatch;
  hasStreams: boolean;
  onOpen: () => void;
}) {
  const isLive = match.status === "live" || match.status === "in_play";
  const isFinished = match.status === "finished";
  const isUpcoming = !isLive && !isFinished;

  const d = new Date(match.kickoff_at);
  const dayLabel = d.toLocaleDateString("es", { weekday: "short" });
  const timeLabel = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  // Viewers deterministic-ish based on id
  const viewers = useMemo(() => {
    if (!isLive) return 0;
    const seed = match.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return 3000 + (seed % 15000);
  }, [match.id, isLive]);

  const homeHue = hue(match.home_team);
  const awayHue = hue(match.away_team);

  return (
    <button
      onClick={onOpen}
      disabled={!hasStreams && !isLive}
      className={cn(
        "group relative w-full text-left rounded-2xl overflow-hidden border transition-all duration-300",
        "border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1 hover:shadow-2xl",
        !hasStreams && !isLive && "opacity-70 cursor-not-allowed hover:translate-y-0"
      )}
    >
      {/* Banner with team-color gradient */}
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{
          background: `linear-gradient(125deg, ${homeHue}80 0%, #0a0a0a 50%, ${awayHue}80 100%)`,
        }}
      >
        {/* dark vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 z-10">
          {isLive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-red-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          ) : isFinished ? (
            <div className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white/80 text-[10px] font-bold uppercase tracking-wider">
              FINAL
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white/80 text-[10px] font-bold uppercase tracking-wider">
              {dayLabel}, {timeLabel}
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10">
          {isLive ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-white/90 text-[10px] font-semibold tabular-nums">
              <Eye className="w-3 h-3" />
              {viewers.toLocaleString()}
            </div>
          ) : hasStreams && isUpcoming ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Señal
            </div>
          ) : null}
        </div>

        {/* Center: flags + score */}
        <div className="absolute inset-0 flex items-center justify-center gap-5 sm:gap-7 px-5">
          <Flag src={match.home_flag} name={match.home_team} />

          <div className="flex flex-col items-center min-w-[90px]">
            {isLive || isFinished ? (
              <>
                <div className="font-display text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  {match.home_score ?? 0}
                  <span className="text-white/40 mx-2">:</span>
                  {match.away_score ?? 0}
                </div>
                {isLive && match.time_elapsed && (
                  <div className="mt-1 text-[10px] font-bold text-cyan-300 tracking-wider tabular-nums">
                    {match.time_elapsed}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="font-display text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  {timeLabel}
                </div>
                <div className="mt-0.5 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  {dayLabel}
                </div>
              </>
            )}
          </div>

          <Flag src={match.away_flag} name={match.away_team} />
        </div>

        {/* Watermark */}
        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
          <span className="text-[9px] font-black tracking-[0.35em] text-white/15 uppercase">
            FIFA World Cup
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#0c0c0e] px-4 py-3 space-y-0.5">
        <div className="flex items-center gap-2 text-sm font-bold text-white truncate">
          <span className="truncate">{es(match.home_team)}</span>
          <span className="text-white/35 text-xs font-medium">vs</span>
          <span className="truncate">{es(match.away_team)}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="font-medium">FIFA World Cup</span>
          {isFinished && <><span>·</span><span>FT</span></>}
          {isUpcoming && (
            <>
              <span>·</span>
              <span>{dayLabel}, {timeLabel}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center text-white/40 text-xs font-bold shrink-0">
        {name.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="relative shrink-0">
      <div className="absolute inset-0 bg-black/30 blur-xl scale-125 rounded-lg" />
      <img
        src={src}
        alt={name}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shadow-[0_4px_16px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
        loading="lazy"
      />
    </div>
  );
}

function WCInlinePlayer({
  match,
  streams,
  onClose,
}: {
  match: LCMatch;
  streams: LCStream[];
  onClose: () => void;
}) {
  const [active, setActive] = useState<string | null>(streams[0]?.id ?? null);
  const current = streams.find((s) => s.id === active);
  const isLive = match.status === "live" || match.status === "in_play";

  // viewers
  const viewers = useMemo(() => {
    const seed = match.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return 1000 + (seed % 9000);
  }, [match.id]);

  return (
    <div className="mb-8">
      {/* Back */}
      <button
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition"
      >
        <X className="w-3.5 h-3.5" />
        Volver a partidos
      </button>

      <div className="rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/[0.06] shadow-2xl">
        {/* Channel tabs — on TOP like screenshot */}
        {streams.length > 0 && (
          <div className="flex gap-2 px-3 pt-3 pb-3 overflow-x-auto scrollbar-hide bg-[#0a0a0a]">
            {streams.map((s) => {
              const isAds = /no\s*ads|sin\s*publicidad/i.test(s.embed_name);
              const isHD = /hd|1080|4k|hevc/i.test(s.embed_name);
              const label = s.embed_name.replace(/\s*(hd|1080p?|4k|hevc|no\s*ads|sin\s*publicidad)/gi, "").trim() || s.embed_name;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border",
                    active === s.id
                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/40"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] border-white/[0.06]"
                  )}
                >
                  <span className="truncate max-w-[140px]">{label}</span>
                  {isHD && (
                    <span className="px-1.5 py-0.5 rounded bg-white/15 text-white text-[8px] font-black tracking-wider">HD</span>
                  )}
                  {isAds && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-black tracking-wider">NO ADS</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* LIVE bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111113] border-t border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isLive ? "bg-red-500 animate-pulse" : "bg-white/30"
            )} />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              {isLive ? "Live" : "Stream"}
            </span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 tabular-nums">
              <Eye className="w-3.5 h-3.5" />
              {viewers.toLocaleString()}
            </div>
          )}
        </div>

        {/* Player */}
        <div className="relative bg-black aspect-video">
          {current ? (
            <iframe
              key={current.id}
              src={current.embed_url}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 text-sm gap-2">
              <Radio className="w-8 h-8 opacity-30" />
              Sin transmisiones disponibles aún
            </div>
          )}
          {isLive && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              EN VIVO
            </div>
          )}
        </div>

        {/* Match info bar */}
        <div className="px-4 py-3 flex items-center justify-center gap-3 bg-[#0a0a0a]">
          {match.home_flag && <img src={match.home_flag} className="w-5 h-5 rounded object-cover" alt="" />}
          <span className="text-sm font-bold text-white">{es(match.home_team)}</span>
          {(isLive || match.status === "finished") && (
            <span className="font-display text-lg font-black text-white tabular-nums">
              {match.home_score ?? 0} <span className="text-white/30">:</span> {match.away_score ?? 0}
            </span>
          )}
          <span className="text-sm font-bold text-white">{es(match.away_team)}</span>
          {match.away_flag && <img src={match.away_flag} className="w-5 h-5 rounded object-cover" alt="" />}
        </div>

        {/* DMCA banner */}
        <div className="px-4 py-3 bg-[#0a1828] border-t border-cyan-500/10 text-[11px] text-cyan-200/80">
          <span className="font-bold text-cyan-300">Contenido de terceros · </span>
          Esta señal se transmite desde proveedores externos mediante iframe. No alojamos ni transmitimos directamente.
        </div>
      </div>
    </div>
  );
}
