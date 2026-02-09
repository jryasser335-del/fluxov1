/**
 * Enhanced Embed Link Generator with Live Match Fetching
 * Supports: MovieBite.cc and Streamed.pk
 * Pattern: https://embedsports.top/embed/{type}/{match-id}/{source}
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
}

export interface MatchInfo {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport?: string;
  league?: string;
  time?: string;
  isLive?: boolean;
}

export interface ScrapedMatch extends MatchInfo {
  source: "moviebite" | "streamed";
  embedUrls?: string[];
}

/**
 * Converts a team name to URL-friendly slug
 */
function teamToSlug(teamName: string): string {
  if (!teamName) return "";
  return teamName
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos y tildes
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extrae el ID numérico real de una URL de embedsports
 * Ejemplos:
 * - "canada-w-vs-czech-republic-w-hockey-419993" → "419993"
 * - "pittsburgh-pirates-vs-cincinnati-reds-baseball-165016" → "165016"
 */
function extractRealIdFromUrl(url: string): string | null {
  // Patrón para URLs tipo echo/charlie con ID al final
  const echoPattern = /\/embed\/(?:echo|charlie)\/(.*?-(\d+))\/\d+/;
  const match = url.match(echoPattern);

  if (match) {
    return match[1]; // Retorna el slug completo con ID: "team-vs-team-sport-123456"
  }

  // Si no tiene ID numérico, retorna el slug completo
  const adminPattern = /\/embed\/admin\/([\w-]+)\/\d+/;
  const adminMatch = url.match(adminPattern);

  if (adminMatch) {
    return adminMatch[1];
  }

  return null;
}

/**
 * Detecta el deporte basado en keywords
 */
function detectSport(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("hockey") || lowerText.includes("nhl")) return "hockey";
  if (lowerText.includes("basketball") || lowerText.includes("nba")) return "basketball";
  if (lowerText.includes("football") || lowerText.includes("nfl") || lowerText.includes("soccer")) return "football";
  if (lowerText.includes("baseball") || lowerText.includes("mlb")) return "baseball";
  if (lowerText.includes("tennis")) return "tennis";
  if (lowerText.includes("cricket")) return "cricket";
  if (lowerText.includes("rugby")) return "rugby";
  if (lowerText.includes("mma") || lowerText.includes("ufc")) return "mma";

  return undefined;
}

/**
 * Fetch live matches from MovieBite.cc
 * Uses CORS proxy or direct fetch depending on environment
 */
export async function fetchMovieBiteMatches(): Promise<ScrapedMatch[]> {
  try {
    const response = await fetch("https://app.moviebite.cc/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await response.text();
    const matches: ScrapedMatch[] = [];

    // Buscar iframes con embedsports
    const iframeRegex = /<iframe[^>]*src=["']([^"']*embedsports[^"']*)["']/gi;
    let iframeMatch;

    while ((iframeMatch = iframeRegex.exec(html)) !== null) {
      const embedUrl = iframeMatch[1];
      const realId = extractRealIdFromUrl(embedUrl);

      if (realId) {
        // Intentar extraer nombres de equipos del ID
        const parts = realId.split("-");
        const sport = detectSport(realId);

        // Buscar "vs" en el slug para separar equipos
        const vsIndex = parts.indexOf("vs");
        if (vsIndex > 0) {
          const homeTeamParts = parts.slice(0, vsIndex);
          const awayTeamParts = parts.slice(vsIndex + 1).filter((p) => !/^\d+$/.test(p));

          matches.push({
            id: realId,
            homeTeam: homeTeamParts.join(" "),
            awayTeam: awayTeamParts.join(" "),
            sport,
            source: "moviebite",
            embedUrls: [embedUrl],
            isLive: true,
          });
        }
      }
    }

    // También buscar datos JSON embebidos
    const jsonRegex = /{[^}]*"id"\s*:\s*"?(\d+)"?[^}]*"teams?"[^}]*}/gi;
    let jsonMatch;

    while ((jsonMatch = jsonRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(jsonMatch[0]);
        if (jsonData.id) {
          matches.push({
            id: jsonData.id,
            homeTeam: jsonData.homeTeam || jsonData.team1 || "Unknown",
            awayTeam: jsonData.awayTeam || jsonData.team2 || "Unknown",
            sport: jsonData.sport,
            source: "moviebite",
            isLive: jsonData.live || false,
          });
        }
      } catch (e) {
        // Ignorar errores de parsing JSON
      }
    }

    return matches;
  } catch (error) {
    console.error("Error fetching MovieBite matches:", error);
    return [];
  }
}

/**
 * Fetch live matches from Streamed.pk
 */
export async function fetchStreamedMatches(): Promise<ScrapedMatch[]> {
  try {
    const response = await fetch("https://streamed.pk/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await response.text();
    const matches: ScrapedMatch[] = [];

    // Buscar iframes y enlaces de embedsports
    const embedRegex = /(?:src|href)=["']([^"']*embedsports[^"']*)["']/gi;
    let match;

    while ((match = embedRegex.exec(html)) !== null) {
      const embedUrl = match[1];
      const realId = extractRealIdFromUrl(embedUrl);

      if (realId) {
        const parts = realId.split("-");
        const sport = detectSport(realId);
        const vsIndex = parts.indexOf("vs");

        if (vsIndex > 0) {
          const homeTeamParts = parts.slice(0, vsIndex);
          const awayTeamParts = parts.slice(vsIndex + 1).filter((p) => !/^\d+$/.test(p));

          matches.push({
            id: realId,
            homeTeam: homeTeamParts.join(" "),
            awayTeam: awayTeamParts.join(" "),
            sport,
            source: "streamed",
            embedUrls: [embedUrl],
            isLive: true,
          });
        }
      }
    }

    return matches;
  } catch (error) {
    console.error("Error fetching Streamed matches:", error);
    return [];
  }
}

/**
 * Fetch all live matches from all sources
 */
export async function fetchAllLiveMatches(): Promise<ScrapedMatch[]> {
  const [moviebiteMatches, streamedMatches] = await Promise.all([fetchMovieBiteMatches(), fetchStreamedMatches()]);

  // Combinar y eliminar duplicados basados en ID
  const allMatches = [...moviebiteMatches, ...streamedMatches];
  const uniqueMatches = allMatches.reduce((acc, match) => {
    if (!acc.find((m) => m.id === match.id)) {
      acc.push(match);
    }
    return acc;
  }, [] as ScrapedMatch[]);

  return uniqueMatches;
}

/**
 * Genera los links detectando si se le pasa un ID real o nombres de equipos
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  // Verificamos si homeTeam ya es un ID real (contiene números o guiones)
  const isDirectId = /[\d-]/.test(homeTeam || "") && homeTeam.includes("-");

  // Si es ID directo lo usamos tal cual, si no, generamos el slug automático ppv-
  const finalId = isDirectId ? homeTeam : `ppv-${teamToSlug(homeTeam)}-vs-${teamToSlug(awayTeam)}`;

  return {
    url1: `https://embedsports.top/embed/admin/${finalId}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/${finalId}/1?autoplay=1`,
    url3: `https://embedsports.top/embed/echo/${finalId}/1?autoplay=1`,
  };
}

/**
 * Genera links con TODOS los tipos de embed disponibles
 */
export function generateAllEmbedTypes(matchId: string): Record<string, string> {
  const embedTypes = ["admin", "delta", "echo", "charlie", "alpha", "bravo"];
  const links: Record<string, string> = {};

  embedTypes.forEach((type) => {
    links[type] = `https://embedsports.top/embed/${type}/${matchId}/1?autoplay=1`;
  });

  return links;
}

/**
 * Genera variante alternativa (Invirtiendo el orden de los equipos)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  // Si ya tenemos un ID directo, no invertir
  if (/[\d-]/.test(homeTeam || "") && homeTeam.includes("-")) {
    return generateEmbedLinks(homeTeam, awayTeam);
  }
  return generateEmbedLinks(awayTeam, homeTeam);
}

/**
 * Generates all possible link variants for a match
 */
export function generateAllLinkVariants(
  homeTeam: string,
  awayTeam: string,
): {
  primary: GeneratedLinks;
  alternative: GeneratedLinks;
  allTypes?: Record<string, string>;
} {
  const isDirectId = /[\d-]/.test(homeTeam || "") && homeTeam.includes("-");

  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
    allTypes: isDirectId ? generateAllEmbedTypes(homeTeam) : undefined,
  };
}

/**
 * Busca un partido específico por nombre de equipo en las fuentes live
 */
export async function findMatchByTeam(teamName: string): Promise<ScrapedMatch | null> {
  const allMatches = await fetchAllLiveMatches();
  const searchTerm = teamName.toLowerCase();

  const found = allMatches.find(
    (match) => match.homeTeam.toLowerCase().includes(searchTerm) || match.awayTeam.toLowerCase().includes(searchTerm),
  );

  return found || null;
}

/**
 * Genera links automáticamente buscando el partido en vivo
 */
export async function generateLinksFromLiveMatch(teamName: string): Promise<GeneratedLinks | null> {
  const match = await findMatchByTeam(teamName);

  if (match) {
    return generateEmbedLinks(match.id, "");
  }

  return null;
}
