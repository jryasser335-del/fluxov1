/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{team1}-vs-{team2}/{stream}
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string; // Añadida url4 para el servidor echo
}

/**
 * Available streaming sources
 */
const SOURCES = ["admin", "delta", "golf", "echo"] as const;

/**
 * Converts a team name to URL-friendly slug
 */
function teamToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Genera links en el orden CORRECTO (Home-vs-Away)
 * Ejemplo: https://embedsports.top/embed/admin/ppv-atalanta-vs-cremonese/1
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // CORRECCIÓN: Usamos home-vs-away como primario para que se reproduzcan
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Genera links alternativos (Away-vs-Home) por si el servidor falla
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Genera todas las variantes posibles
 */
export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}

/**
 * Genera una lista simple de todos los links disponibles incluyendo el servidor ECHO
 */
export function generateAllSourceLinks(homeTeam: string, awayTeam: string): string[] {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return SOURCES.map((source) => `https://embedsports.top/embed/${source}/${matchSlug}/1`);
}
