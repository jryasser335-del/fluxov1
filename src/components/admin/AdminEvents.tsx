import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { generateAllLinkVariants } from "@/lib/embedLinkGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Save, Trash2, Loader2, X, 
  RefreshCw, Trophy, Search, Calendar,
  Zap, Globe, Filter, ChevronDown, ChevronRight,
  Circle, Radio, Eye, EyeOff, Link2, Sparkles, Clock, Wand2,
  Rocket, ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EventLink {
  id: string;
  espn_id: string | null;
  name: string;
  event_date: string;
  sport: string | null;
  league: string | null;
  team_home: string | null;
  team_away: string | null;
  stream_url: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
  thumbnail: string | null;
  is_live: boolean;
  is_active: boolean;
}

interface LeagueCategory {
  name: string;
  icon: string;
  leagues: { key: string; name: string; sport: string; flag?: string }[];
}

const LEAGUE_CATEGORIES: LeagueCategory[] = [
  {
    name: "🏀 Basketball",
    icon: "🏀",
    leagues: [
      { key: "nba", name: "NBA", sport: "Basketball", flag: "🇺🇸" },
      { key: "wnba", name: "WNBA", sport: "Basketball", flag: "🇺🇸" },
      { key: "ncaab", name: "NCAA Basketball", sport: "Basketball", flag: "🇺🇸" },
      { key: "euroleague", name: "EuroLeague", sport: "Basketball", flag: "🇪🇺" },
    ]
  },
  {
    name: "🏈 Football Americano",
    icon: "🏈",
    leagues: [
      { key: "nfl", name: "NFL", sport: "Football", flag: "🇺🇸" },
      { key: "ncaaf", name: "NCAA Football", sport: "Football", flag: "🇺🇸" },
      { key: "xfl", name: "XFL", sport: "Football", flag: "🇺🇸" },
    ]
  },
  {
    name: "🏒 Hockey",
    icon: "🏒",
    leagues: [
      { key: "nhl", name: "NHL", sport: "Hockey", flag: "🇺🇸" },
      { key: "khl", name: "KHL (Rusia)", sport: "Hockey", flag: "🇷🇺" },
      { key: "shl", name: "SHL (Suecia)", sport: "Hockey", flag: "🇸🇪" },
      { key: "ahl", name: "AHL", sport: "Hockey", flag: "🇺🇸" },
      { key: "liiga", name: "Liiga (Finlandia)", sport: "Hockey", flag: "🇫🇮" },
      { key: "del", name: "DEL (Alemania)", sport: "Hockey", flag: "🇩🇪" },
    ]
  },
  {
    name: "⚾ Baseball",
    icon: "⚾",
    leagues: [
      { key: "mlb", name: "MLB", sport: "Baseball", flag: "🇺🇸" },
      { key: "npb", name: "NPB (Japón)", sport: "Baseball", flag: "🇯🇵" },
      { key: "kbo", name: "KBO (Corea)", sport: "Baseball", flag: "🇰🇷" },
    ]
  },
  {
    name: "⚽ Ligas Top Europeas",
    icon: "⚽",
    leagues: [
      { key: "eng.1", name: "Premier League", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "esp.1", name: "LaLiga", sport: "Soccer", flag: "🇪🇸" },
      { key: "ger.1", name: "Bundesliga", sport: "Soccer", flag: "🇩🇪" },
      { key: "ita.1", name: "Serie A", sport: "Soccer", flag: "🇮🇹" },
      { key: "fra.1", name: "Ligue 1", sport: "Soccer", flag: "🇫🇷" },
      { key: "ned.1", name: "Eredivisie", sport: "Soccer", flag: "🇳🇱" },
      { key: "por.1", name: "Liga Portugal", sport: "Soccer", flag: "🇵🇹" },
      { key: "sco.1", name: "Scottish Premiership", sport: "Soccer", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
      { key: "bel.1", name: "Pro League (Bélgica)", sport: "Soccer", flag: "🇧🇪" },
      { key: "tur.1", name: "Süper Lig (Turquía)", sport: "Soccer", flag: "🇹🇷" },
    ]
  },
  {
    name: "🏆 Competiciones UEFA",
    icon: "🏆",
    leagues: [
      { key: "uefa.champions", name: "Champions League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.europa", name: "Europa League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.conference", name: "Conference League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.nations", name: "UEFA Nations League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.euro", name: "UEFA Euro", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.super_cup", name: "Supercopa de Europa", sport: "Soccer", flag: "🇪🇺" },
    ]
  },
  {
    name: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Copas Inglaterra",
    icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    leagues: [
      { key: "eng.fa", name: "FA Cup", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.league_cup", name: "Carabao Cup (EFL)", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.community_shield", name: "Community Shield", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.2", name: "Championship", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.3", name: "League One", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    ]
  },
  {
    name: "🇪🇸 Copas España",
    icon: "🇪🇸",
    leagues: [
      { key: "esp.copa_del_rey", name: "Copa del Rey", sport: "Soccer", flag: "🇪🇸" },
      { key: "esp.super_cup", name: "Supercopa de España", sport: "Soccer", flag: "🇪🇸" },
      { key: "esp.2", name: "LaLiga 2", sport: "Soccer", flag: "🇪🇸" },
    ]
  },
  {
    name: "🇩🇪 Copas Alemania",
    icon: "🇩🇪",
    leagues: [
      { key: "ger.dfb_pokal", name: "DFB-Pokal", sport: "Soccer", flag: "🇩🇪" },
      { key: "ger.super_cup", name: "DFL-Supercup", sport: "Soccer", flag: "🇩🇪" },
      { key: "ger.2", name: "2. Bundesliga", sport: "Soccer", flag: "🇩🇪" },
    ]
  },
  {
    name: "🇮🇹 Copas Italia",
    icon: "🇮🇹",
    leagues: [
      { key: "ita.coppa_italia", name: "Coppa Italia", sport: "Soccer", flag: "🇮🇹" },
      { key: "ita.super_cup", name: "Supercoppa Italiana", sport: "Soccer", flag: "🇮🇹" },
      { key: "ita.2", name: "Serie B", sport: "Soccer", flag: "🇮🇹" },
    ]
  },
  {
    name: "🇫🇷 Copas Francia",
    icon: "🇫🇷",
    leagues: [
      { key: "fra.coupe_de_france", name: "Coupe de France", sport: "Soccer", flag: "🇫🇷" },
      { key: "fra.coupe_de_la_ligue", name: "Coupe de la Ligue", sport: "Soccer", flag: "🇫🇷" },
      { key: "fra.2", name: "Ligue 2", sport: "Soccer", flag: "🇫🇷" },
    ]
  },
  {
    name: "🌎 Américas",
    icon: "🌎",
    leagues: [
      { key: "mls", name: "MLS", sport: "Soccer", flag: "🇺🇸" },
      { key: "mex.1", name: "Liga MX", sport: "Soccer", flag: "🇲🇽" },
      { key: "mex.cup", name: "Copa MX", sport: "Soccer", flag: "🇲🇽" },
      { key: "arg.1", name: "Liga Argentina", sport: "Soccer", flag: "🇦🇷" },
      { key: "arg.cup", name: "Copa Argentina", sport: "Soccer", flag: "🇦🇷" },
      { key: "bra.1", name: "Brasileirão", sport: "Soccer", flag: "🇧🇷" },
      { key: "bra.cup", name: "Copa do Brasil", sport: "Soccer", flag: "🇧🇷" },
      { key: "col.1", name: "Liga Colombiana", sport: "Soccer", flag: "🇨🇴" },
      { key: "chi.1", name: "Primera División Chile", sport: "Soccer", flag: "🇨🇱" },
      { key: "per.1", name: "Liga 1 Perú", sport: "Soccer", flag: "🇵🇪" },
      { key: "conmebol.libertadores", name: "Copa Libertadores", sport: "Soccer", flag: "🌎" },
      { key: "conmebol.sudamericana", name: "Copa Sudamericana", sport: "Soccer", flag: "🌎" },
      { key: "conmebol.copa_america", name: "Copa América", sport: "Soccer", flag: "🌎" },
      { key: "concacaf.champions", name: "Concacaf Champions Cup", sport: "Soccer", flag: "🌎" },
      { key: "concacaf.nations", name: "Concacaf Nations League", sport: "Soccer", flag: "🌎" },
    ]
  },
  {
    name: "🌍 Internacionales",
    icon: "🌍",
    leagues: [
      { key: "fifa.world", name: "FIFA World Cup", sport: "Soccer", flag: "🌍" },
      { key: "fifa.wwc", name: "FIFA Women's World Cup", sport: "Soccer", flag: "🌍" },
      { key: "fifa.club_world_cup", name: "FIFA Club World Cup", sport: "Soccer", flag: "🌍" },
      { key: "afc.asian_cup", name: "AFC Asian Cup", sport: "Soccer", flag: "🌏" },
      { key: "caf.afcon", name: "Africa Cup of Nations", sport: "Soccer", flag: "🌍" },
    ]
  },
  {
    name: "🌏 Ligas Asia",
    icon: "🌏",
    leagues: [
      { key: "jpn.1", name: "J1 League (Japón)", sport: "Soccer", flag: "🇯🇵" },
      { key: "kor.1", name: "K League 1 (Corea)", sport: "Soccer", flag: "🇰🇷" },
      { key: "chn.1", name: "Chinese Super League", sport: "Soccer", flag: "🇨🇳" },
      { key: "sau.1", name: "Saudi Pro League", sport: "Soccer", flag: "🇸🇦" },
      { key: "aus.1", name: "A-League (Australia)", sport: "Soccer", flag: "🇦🇺" },
      { key: "ind.1", name: "Indian Super League", sport: "Soccer", flag: "🇮🇳" },
    ]
  },
  {
    name: "🥊 Boxing & MMA",
    icon: "🥊",
    leagues: [
      { key: "ufc", name: "UFC", sport: "MMA", flag: "🇺🇸" },
      { key: "boxing", name: "Boxing", sport: "Boxing", flag: "🥊" },
      { key: "bellator", name: "Bellator MMA", sport: "MMA", flag: "🇺🇸" },
      { key: "pfl", name: "PFL", sport: "MMA", flag: "🇺🇸" },
      { key: "one", name: "ONE Championship", sport: "MMA", flag: "🌏" },
    ]
  },
  {
    name: "🎾 Tenis",
    icon: "🎾",
    leagues: [
      { key: "atp", name: "ATP Tour", sport: "Tennis", flag: "🎾" },
      { key: "wta", name: "WTA Tour", sport: "Tennis", flag: "🎾" },
      { key: "grand.slam", name: "Grand Slam", sport: "Tennis", flag: "🏆" },
      { key: "davis.cup", name: "Copa Davis", sport: "Tennis", flag: "🏆" },
    ]
  },
  {
    name: "🏎️ Motorsports",
    icon: "🏎️",
    leagues: [
      { key: "f1", name: "Formula 1", sport: "Motorsports", flag: "🏎️" },
      { key: "motogp", name: "MotoGP", sport: "Motorsports", flag: "🏍️" },
      { key: "nascar", name: "NASCAR", sport: "Motorsports", flag: "🇺🇸" },
      { key: "indycar", name: "IndyCar", sport: "Motorsports", flag: "🇺🇸" },
      { key: "wrc", name: "WRC Rally", sport: "Motorsports", flag: "🚗" },
      { key: "formula.e", name: "Formula E", sport: "Motorsports", flag: "⚡" },
    ]
  },
  {
    name: "⛳ Golf",
    icon: "⛳",
    leagues: [
      { key: "pga", name: "PGA Tour", sport: "Golf", flag: "🇺🇸" },
      { key: "lpga", name: "LPGA Tour", sport: "Golf", flag: "🇺🇸" },
      { key: "european.tour", name: "DP World Tour", sport: "Golf", flag: "🇪🇺" },
      { key: "liv", name: "LIV Golf", sport: "Golf", flag: "🌍" },
    ]
  },
];

// Flat list for quick lookup
const ALL_LEAGUES = LEAGUE_CATEGORIES.flatMap(cat => cat.leagues);

export function AdminEvents() {
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
 <ScrollArea className="h-full">
  <div className="space-y-1 pr-4">
    {(() => {
      const filter = moviebiteFilter.toLowerCase();
      
      // 1. Combinamos resultados de partidos (matches) y canales
      const allItems = [
        ...moviebiteResults.map(m => ({ ...m, type: 'match' })),
        ...moviebiteChannels
          .filter(l => l.includes("/channel/"))
          .map(l => {
            const name = decodeURIComponent(l.split("/channel/")[1] || "").replace(/%20/g, " ");
            return { name: `📺 Canal: ${name}`, url: l, source: "channels", type: 'channel' };
          }),
      ].filter(item => !filter || item.name.toLowerCase().includes(filter));

      if (allItems.length === 0) {
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>No se encontraron resultados</p>
          </div>
        );
      }

      return allItems.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            let finalUrl = item.url;
            
            // 2. Lógica de transformación para el ADMIN
            if (item.url.includes("moviebite.cc/")) {
              // Extraemos el slug (ej: detroit-pistons-vs-charlotte-hornets)
              const parts = item.url.split("/");
              const slug = parts[parts.length - 1];
              
              if (item.type === 'match') {
                // Formato para partidos: ppv-[slug]
                finalUrl = `https://embedsports.top/embed/admin/ppv-${slug}/1?autoplay=1`;
              } else {
                // Formato para canales: tv-[slug]
                finalUrl = `https://embedsports.top/embed/admin/tv-${slug}/1?autoplay=1`;
              }
            }

            navigator.clipboard.writeText(finalUrl);
            toast.success(`📋 Link de Admin copiado: ${item.name}`);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group border border-transparent hover:border-border"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
            <p className="text-xs text-primary truncate">Transformará a: embedsports.top...</p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Copiar Admin
          </Badge>
        </button>
      ));
    })()}
  </div>
</ScrollArea>
      </Dialog>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon, 
  color,
  pulse 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color} ${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold font-tech ${color}`}>{value}</p>
    </div>
  );
}

// Filter Button Component
function FilterButton({ 
  active, 
  onClick, 
  label, 
  count 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string; 
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
        active 
          ? 'bg-primary/20 text-primary border border-primary/30' 
          : 'bg-card/50 text-muted-foreground hover:bg-card border border-transparent'
      }`}
    >
      {label}
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
        active ? 'bg-primary/30' : 'bg-muted'
      }`}>
        {count}
      </span>
    </button>
  );
}

// Event Row Component
interface EventRowProps {
  event: EventLink;
  saving: boolean;
  onUpdateStreams: (urls: { stream_url?: string; stream_url_2?: string; stream_url_3?: string }) => void;
  onToggleLive: (live: boolean) => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
  index: number;
}

function EventRow({ event, saving, onUpdateStreams, onToggleLive, onToggleActive, onDelete, index }: EventRowProps) {
  const [streamUrl, setStreamUrl] = useState(event.stream_url || "");
  const [streamUrl2, setStreamUrl2] = useState(event.stream_url_2 || "");
  const [streamUrl3, setStreamUrl3] = useState(event.stream_url_3 || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLink = Boolean(event.stream_url);
  
  const isModified = 
    streamUrl !== (event.stream_url || "") ||
    streamUrl2 !== (event.stream_url_2 || "") ||
    streamUrl3 !== (event.stream_url_3 || "");

  const handleSave = () => {
    onUpdateStreams({
      stream_url: streamUrl || undefined,
      stream_url_2: streamUrl2 || undefined,
      stream_url_3: streamUrl3 || undefined,
    });
  };

  return (
    <div 
      className={`glass-panel rounded-xl overflow-hidden transition-all duration-300 animate-fade-in ${
        !event.is_active ? 'opacity-50' : ''
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header Row */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status indicator */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          event.is_live 
            ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' 
            : hasLink 
              ? 'bg-green-500 shadow-lg shadow-green-500/30' 
              : 'bg-yellow-500 shadow-lg shadow-yellow-500/30'
        }`} />
        
        {/* Thumbnail */}
        {event.thumbnail ? (
          <img src={event.thumbnail} alt="" className="w-10 h-10 object-contain shrink-0 rounded-lg bg-black/20 p-1" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        
        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{event.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.event_date).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
            {event.league && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {event.league}
              </Badge>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 shrink-0">
          {hasLink ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
              <Link2 className="w-3 h-3 mr-1" />
              Link
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
              Sin Link
            </Badge>
          )}
          
          {event.is_live && (
            <Badge variant="destructive" className="animate-pulse">
              🔴 LIVE
            </Badge>
          )}
        </div>

        {/* Expand icon */}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 animate-fade-in">
          {/* Controls Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                checked={event.is_live}
                onCheckedChange={onToggleLive}
              />
              <Label className="text-sm cursor-pointer" onClick={() => onToggleLive(!event.is_live)}>
                {event.is_live ? "🔴 EN VIVO" : "No en vivo"}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={event.is_active}
                onCheckedChange={onToggleActive}
              />
              <Label className="text-sm cursor-pointer flex items-center gap-1" onClick={() => onToggleActive(!event.is_active)}>
                {event.is_active ? (
                  <><Eye className="w-3 h-3" /> Visible</>
                ) : (
                  <><EyeOff className="w-3 h-3" /> Oculto</>
                )}
              </Label>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/20 ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar
            </Button>
          </div>

          {/* Stream URLs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0">1</div>
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="Stream principal..."
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0">2</div>
              <Input
                value={streamUrl2}
                onChange={(e) => setStreamUrl2(e.target.value)}
                placeholder="Stream alternativo 1..."
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0">3</div>
              <Input
                value={streamUrl3}
                onChange={(e) => setStreamUrl3(e.target.value)}
                placeholder="Stream alternativo 2..."
                className="flex-1"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || !isModified}
              className={`${isModified ? 'bg-gradient-to-r from-primary to-accent' : ''}`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
