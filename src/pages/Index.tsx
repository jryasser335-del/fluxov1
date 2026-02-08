import { TMDB_KEY } from "./constants";
import { useState, useEffect } from "react";
import { fetchESPNScoreboard, getTimeUntilEvent, formatCountdown, ESPNEvent } from "./api";

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
}

export interface TMDBResponse {
  results: TMDBResult[];
  total_pages: number;
  page: number;
}

const tmdbCache = new Map<string, { data: TMDBResponse; timestamp: number }>();
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

export async function fetchTMDB(path: string): Promise<TMDBResponse> {
  const cacheKey = path;
  const cached = tmdbCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const separator = path.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3/${path}${separator}api_key=${TMDB_KEY}&language=es-ES`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB error");

  const data = await res.json();
  tmdbCache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}

export interface ESPNEvent {
  id: string;
  date: string;
  competitions: {
    id: string;
    date: string;
    status: {
      type: {
        state: "pre" | "in" | "post";
        detail?: string;
        shortDetail?: string;
      };
      displayClock?: string;
      period?: number;
    };
    competitors: {
      homeAway: "home" | "away";
      score?: string;
      team: {
        displayName: string;
        shortDisplayName: string;
        abbreviation: string;
        logo: string;
        color?: string;
        alternateColor?: string;
      };
    }[];
  }[];
}

export interface ESPNResponse {
  events: ESPNEvent[];
  leagues?: {
    name: string;
    abbreviation: string;
  }[];
}

// Función para formatear fechas en formato YYYYMMDD
function formatDateForESPN(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Función para obtener eventos de un rango de fechas
export async function fetchESPNScoreboard(leagueKey: string, daysAhead: number = 7): Promise<ESPNResponse> {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  const startDateStr = formatDateForESPN(today);
  const endDateStr = formatDateForESPN(endDate);

  const sport = leagueKey === "nba" ? "basketball/nba" : `soccer/${leagueKey}`;
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/scoreboard?dates=${startDateStr}-${endDateStr}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("ESPN error");

  return await res.json();
}

// Función auxiliar para obtener el tiempo restante hasta un evento
export function getTimeUntilEvent(eventDate: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  isPast: boolean;
} {
  const now = new Date().getTime();
  const event = new Date(eventDate).getTime();
  const diff = event - now;

  if (diff < 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isLive: false, isPast: false };
}

// Función para formatear el contador
export function formatCountdown(timeUntil: ReturnType<typeof getTimeUntilEvent>): string {
  if (timeUntil.isPast) return "Finalizado";
  if (timeUntil.isLive) return "EN VIVO";

  const parts: string[] = [];

  if (timeUntil.days > 0) {
    parts.push(`${timeUntil.days}d`);
  }
  if (timeUntil.hours > 0 || timeUntil.days > 0) {
    parts.push(`${timeUntil.hours}h`);
  }
  parts.push(`${timeUntil.minutes}m`);

  return parts.join(" ");
}

// Componente EventCard
function EventCard({ event }: { event: ESPNEvent }) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const competition = event.competitions[0];
      const timeUntil = getTimeUntilEvent(competition.date);
      setCountdown(formatCountdown(timeUntil));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [event]);

  const competition = event.competitions[0];
  const status = competition.status.type.state;

  return (
    <div className="event-card">
      <div className="countdown-badge">{status === "in" ? "EN VIVO" : countdown}</div>
      {/* Resto de tu card */}
    </div>
  );
}
