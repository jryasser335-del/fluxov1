/**
 * Generates specific sports embed links
 * URL 1: Admin (moviebite.to + autoplay)
 * URL 2: Delta (embedsports.top)
 * URL 3: Echo (embedsports.top)
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
}

/**
 * Limpia los nombres de los equipos para las URLs
 */
function teamToSlug(team: string): string {
  return team
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
}

/**
 * Generador principal con lógica de dominios por servidor
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Orden principal solicitado: ppv-away-vs-home
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    // URL 1: Admin en Moviebite con Autoplay
    url1: `https://moviebite.to/embed/admin/${matchSlug}/1?autoplay=1`,

    // URL 2: Delta en Embedsports (Streamed)
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,

    // URL 3: Echo en Embedsports (Streamed)
    url3: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Variante con orden inverso (Home vs Away) manteniendo los mismos dominios
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://moviebite.to/embed/admin/${matchSlug}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Exportación para solucionar el error de Lovable
 */
export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
