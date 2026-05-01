import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, Copy, Check, Tv, Film, Clapperboard, Zap, Shield,
  Calendar, Server, Globe, Radio, Star, Sparkles, Lock, Wifi,
} from "lucide-react";
import { toast } from "sonner";

const ACCOUNT = {
  user: "murnnopccm",
  pass: "bnaggtvRtwHh",
  status: "Active",
  active: 0,
  max: 6,
  created: "05/03/2026",
  expiration: "05/04/2027",
  server: "http://starlatino.tv:8880",
  timezone: "America/Santiago",
  scanType: "M3U Scanner",
  hitBy: "FLUXO",
  m3u: "http://starlatino.tv:8880/get.php?username=murnnopccm&password=bnaggtvRtwHh&type=m3u_plus",
};

const LIVE_CATEGORIES = [
  "⭐️ U CATOLICA VS BARCELOLA 20:00 HRS ⭐️", "✨ COPA SUDAMERICANA 2026 ✨", "⭐️ COPA LIBERTADORES 2026 ⭐️",
  "⭐️ EVENTOS DIARIOS", "⭐ Ufc-Boxeo-LuchaLibre ⭐", "✅ 24/7 Música (EXCLUSIVO GOLD TV)",
  "⭐️ CHILE", "⚽ FÚTBOL CHILE", "⭐️ CHILE DEPORTE", "⭐️ DEPORTE VIP", "⭐️ PERU", "⭐️ DEPORTE PERÚ",
  "⭐ PPV Exclusivos Disney", "⭐️ CINE PREMIUM", "✅ 24/7 VIP", "⭐️ CHILE REGIONALES", "⭐️ CULTURA",
  "⭐️ Paraguay", "⭐️ Futbol Paraguay", "⭐️ NBA Exclusivo ⭐️", "⭐️ NFL Exclusivo ⭐️", "⭐️ MLS Exclusivo ⭐️",
  "⭐️ XTREMA TV", "⭐️ LMP Liga ARCO", "⭐️ Argentina", "⭐️ Deporte Argentina", "⭐️ Colombia",
  "⭐️ Deporte Colombia", "⭐️ COSTA RICA", "⭐️ DEPORTE COSTA RICA", "⭐️ Telenovelas", "⭐️ Infantiles",
  "⭐️ Musica", "⭐ Zona Retro", "⭐️ Noticias", "⭐️ Tv Religiosos",
  "⭐️ Telemundo - Univision - Galavision - Unimas y más", "⭐️ Ecuador", "⭐️ Deporte Ecuador",
  "⭐️ México", "⭐️ El Salvador", "⭐️ Venezuela", "⭐️ República Dominicana", "⭐️ Brasil",
  "⭐️ Puerto Rico", "⭐️ Uruguay", "⭐️ Deportes Uruguay", "⭐️ Bolivia", "⭐️ Deporte Bolivia",
  "⭐️ Canadá", "⭐️ Guatemala", "⭐️ Nicaragua", "⭐️ Honduras", "⭐️ Usa Childish", "⭐️ Usa Movies",
  "⭐️ Usa News", "⭐️ TV Usa", "⭐️ Usa Entertainment", "⭐️ Usa Fox", "⭐️ Panama",
  "⭐️ Argentina Regionales", "⭐️ Italia", "⭐️ Portugal", "⭐️ RADIOS CHILE", "⭐️ RADIO PERU",
  "⭐️ RADIOS ARGENTINA", "⭐️ RADIOS COLOMBIA", "⭐️ RADIOS MEXICO",
  "⭐️ Canales \"Conexiones Lentas\"", "Goldtv",
];

const MOVIE_CATEGORIES = [
  "⭐️ Estrenos 2026 ⭐️", "⭐️ Películas 2025", "⭐️ Películas 2024", "⭐️ Películas 2023",
  "⭐️ Películas 2022", "⭐️ Películas 2021", "⭐️ Cine Chileno", "⭐️ Acción", "⭐️ Anime",
  "⭐️ Aventura", "⭐️ Artes Marciales", "⭐️ Crímen y Suspenso", "⭐️ Cine WWE", "⭐️ Cine Clásicos",
  "⭐️ Comedía", "⭐️ Conciertos", "⭐️ Navidad 2025", "⭐️ Películas Mexicanas", "⭐️ Cine Familiar",
  "⭐️ Ciencia Ficción", "⭐️ Drama", "⭐️ Documentales", "⭐️ Desastres Naturales", "⭐️ Fantasía",
  "⭐️ Terror", "⭐️ Guerra", "⭐️ Cine Colombiano", "⭐️ Películas Peruanas", "⭐️ Películas Indu",
  "⭐️ Cine Retro", "⭐️ Infantiles", "⭐️ Romance", "⭐️ Western", "⭐️ Humor Chile",
  "⭐️ Documentales de Animales", "⭐️ Marvel", "⭐️ DC Universe", "⭐️ Netflix (DUAL)",
  "⭐️ Amazon Prime", "⭐️ Cine Audio España", "⭐️ Bromas Callejeras", "⭐️ Cine Cantinflas",
  "⭐️ Películas Musicales", "⭐️ Películas LGBT", "⭐️ Karaokes", "✝️ Semana Santa ✝️",
  "⭐️ Saga 007", "⭐️ Saga Alien", "⭐️ Saga American Pie", "⭐️ Saga Arma Mortal",
  "⭐️ Saga Bad Boys", "⭐️ Saga Chucky", "⭐️ Saga Creed", "⭐️ Saga Crepúsculo",
  "⭐️ Saga Destino Final", "⭐️ Saga Duro de Matar", "⭐️ Saga El Padrino",
  "⭐️ Saga Planeta de los Simios", "⭐️ Saga Rey Escorpión", "⭐️ Saga El Transportador",
  "⭐️ Saga El Exorcista", "⭐️ Saga Godzilla", "⭐️ Saga Harry Potter", "⭐️ Saga Mi Pobre Angelito",
  "⭐️ Saga Hombre Araña", "⭐️ Saga Hombres de Negro", "⭐️ Festival Viña 2026",
  "⭐️ Saga Indiana Jones", "⭐️ Gala Viña 2025", "⭐️ Saga Minions", "⭐️ Festival Viña 2025",
  "⭐️ Festival Viña 2024", "⭐️ Saga Ip Man", "⭐️ Saga Jason Bourne", "⭐️ Saga La Momia",
  "⭐️ Saga After", "⭐️ Trilogía Divergente", "⭐️ Saga Liberen a Willy", "⭐️ Saga Locademia",
  "⭐️ Saga Los Fockers", "⭐️ Saga Los Mercenarios", "⭐️ Saga Mad Max", "⭐️ Saga Matrix",
  "⭐️ Saga Misión Imposible", "⭐️ Saga Monster High", "⭐️ Saga Millennium", "⭐️ Saga Narnia",
  "⭐️ Saga Piratas del Caribe", "⭐️ Saga Plan de Escape", "⭐️ Saga John Wick", "⭐️ Saga Pokemon",
  "⭐️ Saga Rambo", "⭐️ Saga Rápidos y Furiosos", "⭐️ Saga [Rec]", "⭐️ Saga Resident Evil",
  "⭐️ Saga Rocky", "⭐️ Saga Star Wars", "⭐️ Saga Starship Troopers", "⭐️ Saga Terminator",
  "⭐️ Saga Tiburón", "⭐️ Saga Tomb Raider", "⭐️ Saga Transformers",
  "⭐️ Saga Una Noche en el Museo", "⭐️ Saga Una Pareja Explosiva", "⭐️ Saga Volver al Futuro",
  "⭐️ Saga xXx", "⭐️ Saga Jigsaw", "⭐️ Saga Insidious", "⭐️ Saga Hellraiser",
  "⭐️ Saga Jeepers Creepers", "⭐️ Saga Jurassic Park", "⭐️ Saga El Señor de los Anillos",
];

const SERIES_CATEGORIES = [
  "⭐️ Series Netflix", "⭐️ Series Amazon", "⭐️ Series HBO", "⭐️ Series Disney",
  "⭐️ Series Narcos", "⭐️ Series Chilenas", "⭐️ Telenovelas Top", "⭐️ Series Turcas",
  "⭐️ Doramas", "⭐️ Series Peruanas", "⭐️ Series Colombianas", "⭐️ Series Paramount",
  "⭐️ Series Apple TV", "⭐️ Series Fox", "⭐️ Series Star Plus", "⭐️ Series Starz",
  "⭐️ Series Hulu", "⭐️ Series DragonBall", "⭐️ Series Anime", "⭐️ Series Acción",
  "⭐️ Series Comedia", "⭐️ Series Los Simpsons", "⭐️ Series Ciencia Ficción", "⭐️ Series Drama",
  "⭐️ Series Infantiles", "⭐️ Series Documentales", "⭐️ Series Animadas Del Recuerdo",
  "⭐️ Series Retro", "⭐️ Series Policiales", "⭐️ Series Religiosas", "⭐️ Series Mexicanas",
  "⭐️ Series Argentinas",
];

type Tab = "live" | "movies" | "series";

export function IPTVView() {
  const [tab, setTab] = useState<Tab>("live");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(null), 1500);
  };

  const lists = { live: LIVE_CATEGORIES, movies: MOVIE_CATEGORIES, series: SERIES_CATEGORIES };
  const tabs = [
    { id: "live" as Tab, label: "Live", count: LIVE_CATEGORIES.length, icon: Radio, color: "from-red-500 to-orange-500" },
    { id: "movies" as Tab, label: "Movies", count: MOVIE_CATEGORIES.length, icon: Film, color: "from-fuchsia-500 to-purple-500" },
    { id: "series" as Tab, label: "Series", count: SERIES_CATEGORIES.length, icon: Clapperboard, color: "from-cyan-500 to-blue-500" },
  ];

  return (
    <div className="relative">
      {/* Hero header — Premium IPTV */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl mb-8 border border-white/10"
      >
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-fuchsia-500/15 to-cyan-500/20" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, hsl(45 100% 60% / 0.4), transparent 50%), radial-gradient(circle at 80% 70%, hsl(280 100% 60% / 0.4), transparent 50%)",
          }} />
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }} />
        </div>

        <div className="relative p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur-md">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-200">IPTV Premium</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-200">{ACCOUNT.status}</span>
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
                STARLATINO TV
              </h1>
              <p className="mt-2 text-white/60 font-tech text-sm tracking-wide">
                Acceso ilimitado · 71 canales en vivo · 131 categorías de películas · 34 categorías de series
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Conexiones", value: `${ACCOUNT.active}/${ACCOUNT.max}`, icon: Wifi },
                { label: "Expira", value: ACCOUNT.expiration, icon: Calendar },
                { label: "Hit by", value: ACCOUNT.hitBy, icon: Sparkles },
              ].map((s) => (
                <div key={s.label} className="px-4 py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
                  <div className="flex items-center gap-2 text-white/40 mb-1">
                    <s.icon className="w-3 h-3" />
                    <span className="text-[9px] tracking-[0.25em] uppercase">{s.label}</span>
                  </div>
                  <div className="font-tech font-bold text-white text-sm">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "user", label: "Usuario", value: ACCOUNT.user, icon: Crown, mask: false },
              { key: "pass", label: "Contraseña", value: ACCOUNT.pass, icon: Lock, mask: true },
              { key: "server", label: "Servidor", value: ACCOUNT.server, icon: Server, mask: false },
              { key: "m3u", label: "Lista M3U", value: ACCOUNT.m3u, icon: Globe, mask: false },
            ].map((f) => (
              <div key={f.key} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-4 hover:border-amber-400/30 transition-all">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(120deg, transparent, hsl(45 100% 60% / 0.05), transparent)" }} />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-white/40 mb-1.5">
                      <f.icon className="w-3.5 h-3.5" />
                      <span className="text-[10px] tracking-[0.3em] uppercase font-tech">{f.label}</span>
                    </div>
                    <div className="font-mono text-sm text-white/90 truncate">
                      {f.mask ? "••••••••••••" : f.value}
                    </div>
                  </div>
                  <button
                    onClick={() => copy(f.value, f.key)}
                    className="shrink-0 h-9 w-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center hover:bg-amber-500/20 hover:border-amber-400/40 transition-colors"
                  >
                    {copied === f.key ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-white/60" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
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
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${active ? "bg-black/30" : "bg-white/5"}`}>
                  {t.count}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Categories grid */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      >
        {lists[tab].map((cat, i) => (
          <motion.div
            key={cat + i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.01, 0.4) }}
            className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-3 hover:border-amber-400/30 hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            <div className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-md"
              style={{ background: "linear-gradient(120deg, hsl(45 100% 50% / 0.3), hsl(280 100% 50% / 0.3))" }} />
            <div className="relative flex items-center gap-2.5">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center">
                <Tv className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <span className="text-xs text-white/80 leading-tight line-clamp-2 font-medium">
                {cat}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer info */}
      <div className="mt-10 flex items-center justify-center gap-3 text-white/30 text-[10px] tracking-[0.4em] uppercase font-tech">
        <Shield className="w-3 h-3" />
        Powered by FLUXO · App by Ishiro
        <Star className="w-3 h-3" />
      </div>

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
