import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Radio, X, Tv, ChevronRight } from "lucide-react";
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
        // Fetch streams in batch for matches kicking off within next 36h
        const ids = (data || [])
          .filter((m) => new Date(m.kickoff_at).getTime() < Date.now() + 36 * 3600 * 1000)
          .map((m) => m.id);
        if (ids.length) {
          const ors = `in.(${ids.join(",")})`;
          const r2 = await fetch(
            `${LC_URL}/match_streams?select=id,match_id,embed_name,embed_url&match_id=${ors}`,
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

  if (matches.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Mundial header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-500/30 to-red-500/30 blur-md" />
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 via-green-500/20 to-red-500/20 border border-yellow-500/30 flex items-center justify-center text-xl">
            🏆
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Mundial 2026 — Partidos
          </h2>
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Streams en vivo · Multi-canal
          </p>
        </div>
      </div>

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
            <div key={day} className="mb-6">
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-white/35 font-semibold mb-3 pl-1">
                {label}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      <WCPlayerModal
        match={openMatch}
        streams={openMatch ? streams[openMatch.id] || [] : []}
        onClose={() => setOpenMatch(null)}
      />
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
  const t = new Date(match.kickoff_at).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      onClick={onOpen}
      disabled={!hasStreams && !isLive}
      className={cn(
        "group relative w-full text-left rounded-2xl p-4 border transition-all duration-300 overflow-hidden",
        "bg-gradient-to-br from-white/[0.025] to-white/[0.005] hover:from-white/[0.05] hover:to-white/[0.01]",
        "border-white/[0.05] hover:border-white/[0.12]",
        isLive && "border-red-500/30 from-red-500/[0.06] to-transparent",
        !hasStreams && !isLive && "opacity-60 cursor-not-allowed"
      )}
    >
      {isLive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-red-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          EN VIVO
        </div>
      )}
      {isFinished && (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-white/10 text-white/60 text-[10px] font-bold uppercase tracking-wider">
          FINAL
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2.5">
          <Side flag={match.home_flag} name={es(match.home_team)} score={match.home_score} live={isLive || isFinished} />
          <Side flag={match.away_flag} name={es(match.away_team)} score={match.away_score} live={isLive || isFinished} />
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1.5 min-w-[90px]">
          {!isLive && !isFinished && (
            <span className="font-display text-xl font-bold text-white tabular-nums">
              {t}
            </span>
          )}
          {match.venue_name && (
            <span className="text-[10px] text-white/30 leading-tight text-right max-w-[110px]">
              {match.venue_name}
              {match.venue_city ? ` · ${match.venue_city}` : ""}
            </span>
          )}
          {hasStreams && (
            <span className="flex items-center gap-1 text-[10px] text-primary/80 font-semibold">
              <Tv className="w-3 h-3" /> Ver
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Side({
  flag,
  name,
  score,
  live,
}: {
  flag: string | null;
  name: string;
  score: number | null;
  live: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {flag ? (
        <img src={flag} alt={name} className="w-6 h-6 rounded object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-6 h-6 rounded bg-white/5 shrink-0" />
      )}
      <span className="font-medium text-white/90 text-sm truncate flex-1">{name}</span>
      {live && (
        <span className="font-display font-bold text-white text-lg tabular-nums">
          {score ?? 0}
        </span>
      )}
    </div>
  );
}

function WCPlayerModal({
  match,
  streams,
  onClose,
}: {
  match: LCMatch | null;
  streams: LCStream[];
  onClose: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (match && streams.length > 0) setActive(streams[0].id);
    else setActive(null);
  }, [match, streams]);

  if (!match) return null;
  const current = streams.find((s) => s.id === active);

  return (
    <AnimatePresence>
      {match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                {match.home_flag && <img src={match.home_flag} className="w-7 h-7 rounded" alt="" />}
                <span className="font-display font-bold text-white truncate">
                  {es(match.home_team)} <span className="text-white/40">vs</span>{" "}
                  {es(match.away_team)}
                </span>
                {match.away_flag && <img src={match.away_flag} className="w-7 h-7 rounded" alt="" />}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* channel tabs */}
            {streams.length > 0 && (
              <div className="flex gap-2 overflow-x-auto p-3 border-b border-white/5 scrollbar-hide">
                {streams.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition border",
                      active === s.id
                        ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30"
                        : "bg-white/[0.03] text-white/70 hover:bg-white/[0.08] border-white/5"
                    )}
                  >
                    <Radio className="w-3 h-3 inline mr-1.5 -mt-0.5" />
                    {s.embed_name}
                  </button>
                ))}
              </div>
            )}

            {/* player */}
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
                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                  Sin transmisiones disponibles aún
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
