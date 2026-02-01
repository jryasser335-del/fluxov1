import { TMDB_KEY } from "./constants";

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

export async function fetchESPNScoreboard(leagueKey: string): Promise<ESPNResponse> {
  const today = new Date();
  const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  
  const sport = leagueKey === "nba" ? "basketball/nba" : `soccer/${leagueKey}`;
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/scoreboard?dates=${date}`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error("ESPN error");
  
  return await res.json();
}
