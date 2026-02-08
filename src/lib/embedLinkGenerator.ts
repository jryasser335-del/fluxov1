/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{team1}-vs-{team2}/{stream}
 */
export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
}

/**
 * Available streaming sources
 */
const SOURCES = ["admin", "delta", "golf", "echo"] as const;

/**
 * Converts a team name to URL-friendly slug
 * e.g., "Philadelphia 76ers" -> "philadelphia-76ers"
 */
function teamToSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .trim()
    .replace(/['']/g, "") // Remueve apostrofes
    .replace(/[^a-z0-9\s-]/g, "") // Remueve caracteres especiales
    .replace(/\s+/g, "-") // Espacios a guiones
    .replace(/-+/g, "-") // Evita múltiples guiones
    .replace(/^-|-$/g, ""); // Limpia extremos
}

/**
 * Generates embedsports.top links using the match structure
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Pattern exacto solicitado: ppv-{away}-vs-{home}
  // Nota: A veces el error es porque el orden en el servidor es distinto
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
  };
}

/**
 * Generates alternative link variants (home-vs-away)
 * ÚSALO SI EL PRIMERO DA ERROR: A veces el servidor invierte los equipos
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
  };
}

/**
 * Función principal para generar todas las variantes
 */
export function generateAllLinkVariants(
  homeTeam: string,
  awayTeam: string,
): {
  primary: GeneratedLinks;
  alternative: GeneratedLinks;
} {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
