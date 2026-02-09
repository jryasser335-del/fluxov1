/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{away}-vs-{home}/{stream}
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
}

const SOURCES = ["admin", "delta", "golf", "echo"] as const;

/**
 * Limpia y formatea los nombres de los equipos
 */
function teamToSlug(team: string): string {
  return team
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Espacios por guiones
    .replace(/[^\w\-]+/g, ""); // Elimina caracteres especiales
}

/**
 * Generador principal: Ahora usa AWAY vs HOME como pediste
 */
export function generateEmbedLinks(
  homeTeam: string,
  awayTeam: string,
  source: (typeof SOURCES)[number] = "admin",
): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Cambio clave aquí: awaySlug primero
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/${source}/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/${source}/${matchSlug}/2`,
  };
}

/**
 * Variante alternativa (por si necesitas el orden inverso original)
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
  };
}
