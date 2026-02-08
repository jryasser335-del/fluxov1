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
