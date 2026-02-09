/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{away}-vs-{home}/{stream}
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string; // Añadido el tercer link que mencionaste
}

const SOURCES = ["admin", "delta", "golf", "echo"] as const;

/**
 * Convierte el nombre de un equipo a un slug amigable para URL
 */
function teamToSlug(team: string): string {
  return team
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
}

/**
 * Genera los links con el orden: AWAY vs HOME
 */
export function generateEmbedLinks(
  homeTeam: string,
  awayTeam: string,
  source: (typeof SOURCES)[number] = "admin",
): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Formato solicitado: ppv-away-vs-home
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/${source}/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/${source}/${matchSlug}/2`,
    url3: `https://embedsports.top/embed/${source}/${matchSlug}/3`,
  };
}

/**
 * Variante con el orden: HOME vs AWAY
 */
export function generateAlternativeLinks(
  homeTeam: string,
  awayTeam: string,
  source: (typeof SOURCES)[number] = "admin",
): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/${source}/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/${source}/${matchSlug}/2`,
    url3: `https://embedsports.top/embed/${source}/${matchSlug}/3`,
  };
}

/**
 * ESTA ES LA FUNCIÓN QUE SOLUCIONA EL ERROR DE LA IMAGEN
 * Exporta ambas variantes para que el componente las encuentre
 */
export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam), // Este dará Away vs Home
    alternative: generateAlternativeLinks(homeTeam, awayTeam), // Este dará Home vs Away
  };
}
