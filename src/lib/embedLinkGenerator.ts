/**
 * GENERADOR DE LINKS INTEGRADO PARA TU WEB
 * Versión optimizada y lista para producción
 *
 * CARACTERÍSTICAS:
 * ✅ Compatible con tu código original
 * ✅ Extrae IDs reales de MovieBite y Streamed
 * ✅ Maneja ambos tipos de IDs (ppv-team-vs-team y team-vs-team-sport-123456)
 * ✅ Función de búsqueda de partidos en vivo
 * ✅ Cache para evitar múltiples peticiones
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
  source?: "moviebite" | "streamed";
}

// ============================================
// CONFIGURACIÓN
// ============================================

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || "http://localhost:3001";
const CACHE_DURATION = 60000; // 1 minuto
let cachedMatches: MatchInfo[] | null = null;
let cacheTimestamp = 0;

// ============================================
// FUNCIONES HELPER
// ============================================

/**
 * Convierte nombre de equipo a slug URL-friendly
 */
function teamToSlug(teamName: string): string {
  if (!teamName) return "";
  return teamName
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Detecta si un string es un ID de MovieBite
 */
function isMovieBiteId(text: string): boolean {
  // Es un ID si tiene guiones y contiene "vs" o termina en números
  return text.includes("-") && (text.includes("-vs-") || /\d{4,}$/.test(text));
}

// ============================================
// FUNCIONES PRINCIPALES (TU CÓDIGO ORIGINAL)
// ============================================

/**
 * Genera los links (COMPATIBLE CON TU CÓDIGO ORIGINAL)
 *
 * USO:
 * generateEmbedLinks('Real Madrid', 'Barcelona') // Modo manual
 * generateEmbedLinks('ppv-villarreal-vs-espanyol', '') // Con ID de MovieBite
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const isDirectId = isMovieBiteId(homeTeam);

  // Si es ID directo de MovieBite, usarlo tal cual
  // Si no, generar slug automático con ppv-
  const finalId = isDirectId ? homeTeam : `ppv-${teamToSlug(homeTeam)}-vs-${teamToSlug(awayTeam)}`;

  return {
    url1: `https://embedsports.top/embed/admin/${finalId}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/${finalId}/1?autoplay=1`,
    url3: `https://embedsports.top/embed/echo/${finalId}/1?autoplay=1`,
  };
}

/**
 * Genera variante alternativa (COMPATIBLE CON TU CÓDIGO ORIGINAL)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  if (isMovieBiteId(homeTeam)) {
    return generateEmbedLinks(homeTeam, awayTeam);
  }
  return generateEmbedLinks(awayTeam, homeTeam);
}

/**
 * Genera todas las variantes (COMPATIBLE CON TU CÓDIGO ORIGINAL)
 */
export function generateAllLinkVariants(
  homeTeam: string,
  awayTeam: string,
): {
  primary: GeneratedLinks;
  alternative: GeneratedLinks;
  allTypes?: Record<string, string>;
} {
  const isDirectId = isMovieBiteId(homeTeam);

  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
    allTypes: isDirectId ? generateAllEmbedTypes(homeTeam) : undefined,
  };
}

// ============================================
// NUEVAS FUNCIONES (EXTRAS)
// ============================================

/**
 * Genera TODOS los tipos de embed (admin, delta, echo, charlie, alpha, bravo)
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
 * Obtiene partidos en vivo desde el proxy
 */
export async function fetchLiveMatches(): Promise<MatchInfo[]> {
  const now = Date.now();

  // Usar cache si está disponible
  if (cachedMatches && now - cacheTimestamp < CACHE_DURATION) {
    return cachedMatches;
  }

  try {
    const response = await fetch(`${PROXY_URL}/api/all-matches`);
    const data = await response.json();

    if (data.success) {
      cachedMatches = data.matches;
      cacheTimestamp = now;
      return data.matches;
    }

    return [];
  } catch (error) {
    console.error("Error fetching live matches:", error);
    return [];
  }
}

/**
 * Busca un partido por nombre de equipo
 */
export async function findMatch(teamName: string): Promise<MatchInfo | null> {
  const matches = await fetchLiveMatches();
  const search = teamName.toLowerCase();

  return (
    matches.find((m) => m.homeTeam.toLowerCase().includes(search) || m.awayTeam.toLowerCase().includes(search)) || null
  );
}

/**
 * Busca partidos por deporte
 */
export async function findMatchesBySport(sport: string): Promise<MatchInfo[]> {
  const matches = await fetchLiveMatches();
  return matches.filter((m) => m.sport === sport);
}

/**
 * Genera links automáticamente buscando el partido en vivo
 */
export async function generateLinksFromSearch(teamName: string): Promise<GeneratedLinks | null> {
  const match = await findMatch(teamName);

  if (match) {
    return generateEmbedLinks(match.id, "");
  }

  return null;
}

// ============================================
// VERSIÓN SIN PROXY (FALLBACK)
// ============================================

/**
 * Intenta obtener partidos directamente (puede fallar por CORS)
 * Solo usar como fallback si el proxy no está disponible
 */
export async function fetchLiveMatchesDirect(): Promise<MatchInfo[]> {
  try {
    const response = await fetch("https://app.moviebite.cc/");
    const html = await response.text();

    const matches: MatchInfo[] = [];
    const regex = /\/embed\/([\w]+)\/([\w-]+)\/\d+/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const embedType = match[1];
      const matchId = match[2];

      if (matchId.includes("-vs-")) {
        const parts = matchId.split("-");
        const vsIndex = parts.indexOf("vs");
        const startIndex = parts[0] === "ppv" ? 1 : 0;

        matches.push({
          id: matchId,
          homeTeam: parts.slice(startIndex, vsIndex).join(" "),
          awayTeam: parts
            .slice(vsIndex + 1)
            .filter((p) => !/^\d+$/.test(p))
            .join(" "),
          isLive: true,
          source: "moviebite",
        });
      }
    }

    return matches;
  } catch (error) {
    console.error("Direct fetch failed (CORS?):", error);
    return [];
  }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Limpia la cache de partidos
 */
export function clearMatchesCache(): void {
  cachedMatches = null;
  cacheTimestamp = 0;
}

/**
 * Verifica si el proxy está disponible
 */
export async function checkProxyHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PROXY_URL}/health`);
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Parsea un ID de MovieBite para extraer equipos
 */
export function parseMovieBiteId(id: string): { homeTeam: string; awayTeam: string } | null {
  if (!id.includes("-vs-")) return null;

  const parts = id.split("-");
  const vsIndex = parts.indexOf("vs");
  const startIndex = parts[0] === "ppv" ? 1 : 0;

  return {
    homeTeam: parts.slice(startIndex, vsIndex).join(" "),
    awayTeam: parts
      .slice(vsIndex + 1)
      .filter((p) => !/^\d+$/.test(p))
      .join(" "),
  };
}

// ============================================
// EXPORTACIONES LEGACY (compatibilidad)
// ============================================

export { teamToSlug, isMovieBiteId, type MatchInfo as ScrapedMatch };
