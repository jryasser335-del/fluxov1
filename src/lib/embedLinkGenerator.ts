/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{team1}-vs-{team2}/{stream}
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

const SOURCES = ["admin", "delta", "golf", "echo"] as const;

/**
 * Convierte el nombre de un equipo a un slug amigable para URL
 * Ejemplo: "Real Madrid" -> "real-madrid"
 */
function teamToSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/[^a-z0-9\s-]/g, "") // Quita caracteres especiales
    .replace(/\s+/g, "-") // Espacios por guiones
    .replace(/-+/g, "-") // Evita guiones dobles
    .replace(/^-|-$/g, ""); // Limpia extremos
}

export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Formato exacto solicitado: ppv-home-vs-away
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Formato inverso: ppv-away-vs-home
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Esta es la función que te faltaba y causaba el error TS2305
 */
export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
