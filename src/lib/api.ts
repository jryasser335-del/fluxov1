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
 * Obtiene eventos de cualquier liga y cualquier fecha.
 * Si no pasas una fecha, el sistema busca automáticamente los partidos de HOY.
 */
export async function fetchESPNScoreboard(leagueKey: string, dateOffset: number = 0): Promise<ESPNResponse> {
  // Calculamos la fecha según el offset (0 para hoy, 1 para mañana, etc.)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dateOffset);

  const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, "0")}${String(targetDate.getDate()).padStart(2, "0")}`;

  let sportPath = "";
  const key = leagueKey.toLowerCase().trim();

  // Mapeo inteligente de deportes y ligas
  switch (key) {
    case "nba":
    case "wnba":
      sportPath = `basketball/${key}`;
      break;
    case "nfl":
    case "ncaa football":
      sportPath = `football/${key === "ncaa football" ? "college-football" : "nfl"}`;
      break;
    case "mlb":
      sportPath = "baseball/mlb";
      break;
    case "nhl":
      sportPath = "hockey/nhl";
      break;
    case "ufc":
    case "mma":
      sportPath = "mma/ufc";
      break;
    case "f1":
    case "formula 1":
      sportPath = "racing/f1";
      break;
    default:
      // Por defecto para todas las ligas de fútbol (Champions, LaLiga, etc.)
      sportPath = `soccer/${key}`;
      break;
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard?dates=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error en liga: ${leagueKey}`);

  return await res.json();
}
