// ============= TMDB Types & Functions =============

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  original_language?: string;
}

export interface TMDBResponse {
  results: TMDBResult[];
  page: number;
  total_pages: number;
  total_results: number;
}

const TMDB_API_KEY = "3fd2be6f0c70a2a598f084ddfb75487c";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function fetchTMDB(path: string): Promise<TMDBResponse> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE_URL}/${path}${separator}api_key=${TMDB_API_KEY}&language=es-ES`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error TMDB: ${res.status}`);
  
  return await res.json();
}

export async function searchTMDB(query: string, type: "movie" | "tv" = "movie"): Promise<TMDBResponse> {
  return fetchTMDB(`search/${type}?query=${encodeURIComponent(query)}`);
}

// ============= ESPN Types & Functions =============

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

/**
 * Obtiene los eventos de ESPN detectando automáticamente el deporte según la liga.
 * Soporta NFL (Super Bowl), NBA, MLB, NHL, MMA, Tennis y todas tus ligas de Fútbol.
 */
export async function fetchESPNScoreboard(leagueKey: string): Promise<ESPNResponse> {
  const today = new Date();
  const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  let sportPath = "";
  const key = leagueKey.toLowerCase().trim();

  // Mapeo exhaustivo basado en tus ligas de navegación
  switch (key) {
    case "nba":
    case "wnba":
    case "ncaa basketball":
      sportPath = `basketball/${key === "ncaa basketball" ? "mens-college-basketball" : key}`;
      break;

    case "nfl":
    case "ncaa football":
      sportPath = `football/${key === "ncaa football" ? "college-football" : "nfl"}`;
      break;

    case "mlb":
      sportPath = "baseball/mlb";
      break;

    case "nhl":
    case "khl":
    case "shl":
    case "ahl":
      sportPath = `hockey/${key}`;
      break;

    case "ufc":
    case "bellator mma":
    case "pfl":
    case "boxing":
      sportPath = "mma/ufc"; // ESPN agrupa la mayoría bajo mma o ufc scoreboard
      break;

    case "atp tour":
    case "wta tour":
    case "grand slam":
      sportPath = "tennis/atp";
      break;

    case "formula 1":
    case "motogp":
    case "nascar":
    case "indycar":
      sportPath = `racing/${key.replace(/\s+/g, "-")}`;
      break;

    default:
      // Para todas las ligas de fútbol (LaLiga, Premier, Champions, etc.)
      sportPath = `soccer/${key}`;
      break;
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard?dates=${date}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error cargando liga: ${leagueKey}`);

  return await res.json();
}
