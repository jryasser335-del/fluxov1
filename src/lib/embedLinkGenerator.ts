/**
 * Generates embed links for sports events based on team names or direct IDs
 * Pattern: https://embedsports.top/embed/admin/ppv-{team1}-vs-{team2}/{source}
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
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
 * Genera los links detectando si se le pasa un ID real (con números)
 * o si debe construir el slug con los nombres de los equipos.
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  // Verificamos si homeTeam ya es un ID real de MovieBite (termina en números: ej 1391048)
  const isDirectId = /\d+$/.test(homeTeam || "");

  // Si es ID directo lo usamos tal cual, si no, generamos el slug automático ppv-
  const finalId = isDirectId ? homeTeam : `ppv-${teamToSlug(homeTeam)}-vs-${teamToSlug(awayTeam)}`;

  return {
    url1: `https://embedsports.top/embed/admin/${finalId}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/${finalId}/1?autoplay=1`,
    url3: `https://embedsports.top/embed/echo/${finalId}/1?autoplay=1`,
  };
}

/**
 * Genera variante alternativa (Invirtiendo el orden de los equipos)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  // Si ya tenemos un ID directo con números, devolvemos lo mismo (no se puede invertir un ID único)
  if (/\d+$/.test(homeTeam || "")) {
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
} {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
