import { useState, useMemo, useEffect } from "react";
import { Heart } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface EventCardProps {
  event: ESPNEvent;
  leagueInfo: { key: string; name: string; sub: string; logo?: string };
  hasLink: boolean;
  isFavorite: boolean;
  isFeatured?: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  formatTime: (iso: string) => string;
}

type TeamData = ESPNEvent["competitions"][number]["competitors"][number]["team"];

function getSportSegment(leagueKey: string) {
  if (["nba", "wnba", "ncaab"].includes(leagueKey)) return "nba";
  if (leagueKey.startsWith("mlb")) return "mlb";
  if (leagueKey === "nhl") return "nhl";
  if (leagueKey === "ufc" || leagueKey === "boxing" || leagueKey === "wwe") return "mma";
  return "soccer";
}

function getTeamLogoCandidates(team: TeamData | undefined, leagueKey: string): string[] {
  if (!team) return [];
  const sport = getSportSegment(leagueKey);
  const candidates: string[] = [];
  if (team.logo) candidates.push(team.logo);
  if (team.id) {
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500/${team.id}.png`);
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500-dark/${team.id}.png`);
    candidates.push(`https://a.espncdn.com/combiner/i?img=/i/teamlogos/${sport}/500/${team.id}.png&h=100&w=100`);
  }
  return candidates;
}

const teamSearchCache = new Map<string, string | null>();

async function searchTeamLogoFromESPN(teamName: string): Promise<string | null> {
  if (!teamName) return null;
  const key = teamName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (teamSearchCache.has(key)) return teamSearchCache.get(key) || null;

  const queries = Array.from(new Set([
    teamName,
    teamName.replace(/\b(Baseball|Basketball|Football|Hockey|Rugby)\b/gi, "").trim(),
    teamName.replace(/\b(Fc|CF|SC|SK|AC|Club)\b/gi, "").trim(),
  ].filter(Boolean)));

  for (const q of queries) {
    try {
      const { data, error } = await supabase.functions.invoke("team-logo-search", {
        body: { t: q },
      });
      if (error) continue;
      const logo = data?.logo || null;
      if (logo) {
        teamSearchCache.set(key, logo);
        return logo;
      }
    } catch {
      // continue
    }
  }

  teamSearchCache.set(key, null);
  return null;
}

function TeamLogo({ team, leagueKey }: { team: TeamData | undefined; leagueKey: string }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [searchedLogo, setSearchedLogo] = useState<string | null>(null);
  const [searchTried, setSearchTried] = useState(false);
  const baseLogos = useMemo(() => getTeamLogoCandidates(team, leagueKey), [team, leagueKey]);
  const logos = useMemo(() => (searchedLogo ? [...baseLogos, searchedLogo] : baseLogos), [baseLogos, searchedLogo]);
  const logoUrl = logos[candidateIndex];
  const abbr = (team?.abbreviation || team?.shortDisplayName || "?").slice(0, 3);

  useEffect(() => {
    let cancelled = false;
    if (searchTried || searchedLogo) return;
    if (logoUrl) return;
    const name = team?.displayName || team?.shortDisplayName;
    if (!name) return;
    setSearchTried(true);
    searchTeamLogoFromESPN(name).then((url) => {
      if (!cancelled && url) setSearchedLogo(url);
    });
    return () => { cancelled = true; };
  }, [logoUrl, searchedLogo, searchTried, team?.displayName, team?.shortDisplayName]);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={team?.displayName || ""}
        className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
        onError={() => setCandidateIndex((prev) => prev + 1)}
        loading="lazy"
      />
    );
  }

  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-display text-white/70 text-lg bg-white/10 border border-white/10">
      {abbr}
    </div>
  );
}

export function EventCard({
  event,
  leagueInfo,
  hasLink,
  isFavorite,
  onToggleFavorite,
  onClick,
  formatTime,
}: EventCardProps) {
  const comp = event.competitions?.[0];
  const status = comp?.status?.type;
  const isLive = status?.state === "in";
  const isFinal = status?.state === "post";
  const isPre = status?.state === "pre";
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[0];
  const home = competitors.find((c) => c.homeAway === "home") || competitors[1];

  let statusText = "";
  if (isLive) {
    const period = comp?.status?.period ? `Q${comp.status.period}` : "";
    const clock = comp?.status?.displayClock || "";
    statusText = [period, clock].filter(Boolean).join(" · ");
  } else if (isFinal) {
    statusText = status?.shortDetail || "Final";
  } else {
    statusText = formatTime(comp?.date || event.date);
  }

  const channelName = leagueInfo.sub || leagueInfo.name;

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        "bg-[#1a1a2e] hover:bg-[#1f1f35]",
        "border border-white/[0.06] hover:border-white/[0.12]",
        hasLink ? "cursor-pointer hover:-translate-y-0.5" : "opacity-50"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={cn(
          "absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all",
          isFavorite
            ? "bg-red-500/20 text-red-400"
            : "bg-black/40 text-white/20 opacity-0 group-hover:opacity-100"
        )}
      >
        <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
      </button>

      {/* Thumbnail area - team logos on dark bg */}
      <div className="relative h-[120px] sm:h-[140px] bg-gradient-to-b from-[#252545] to-[#1a1a2e] flex items-center justify-center gap-6 px-4">
        <TeamLogo team={away?.team} leagueKey={leagueInfo.key} />
        <TeamLogo team={home?.team} leagueKey={leagueInfo.key} />

        {/* Channel overlay at bottom of thumbnail */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-[10px] text-white/30 font-medium tracking-wide">
            {channelName}
          </span>
        </div>

        {/* Live indicator top-left */}
        {isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/90">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="px-3 py-2.5 space-y-1.5">
        {/* Match title */}
        <h3 className="text-[13px] font-semibold text-white/90 leading-tight line-clamp-2">
          {away?.team?.displayName || "TBD"} vs. {home?.team?.displayName || "TBD"}
        </h3>

        {/* Bottom row: channel + status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider truncate max-w-[70%]">
            {channelName}
          </span>
          <div className="flex items-center gap-1">
            {isLive && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-green-400 font-medium">
                  {statusText || "LIVE"}
                </span>
              </>
            )}
            {isPre && (
              <span className="text-[10px] text-white/30 font-medium">
                {statusText}
              </span>
            )}
            {isFinal && (
              <span className="text-[10px] text-white/25 font-medium">
                {statusText}
              </span>
            )}
          </div>
        </div>

        {/* Score for live/final */}
        {(isLive || isFinal) && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className={cn("text-xs font-bold", isLive ? "text-white" : "text-white/40")}>
              {away?.team?.abbreviation} {away?.score ?? 0}
            </span>
            <span className="text-[10px] text-white/20">-</span>
            <span className={cn("text-xs font-bold", isLive ? "text-white" : "text-white/40")}>
              {home?.score ?? 0} {home?.team?.abbreviation}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
