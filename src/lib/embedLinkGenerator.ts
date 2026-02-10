/**
 * Generates specific sports embed links
 * URL 1: Admin (embedsports.top + autoplay)
 * URL 2: Delta (embedsports.top)
 * URL 3: Echo (embedsports.top)
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
}

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
 * Generador principal con la lógica de dominios y parámetros solicitada
 * AHORA: El orden es Home vs Away (ej: manchester-united-vs-west-ham-united)
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Orden modificado según tu solicitud: ppv-home-vs-away
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    // URL 1: Admin con Autoplay en embedsports.top
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1?autoplay=1`,

    // URL 2: Delta en embedsports.top (sin autoplay)
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,

    // URL 3: Echo en embedsports.top (sin autoplay)
    url3: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Variante con orden inverso (Away vs Home)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // En la alternativa invertimos el orden: ppv-away-vs-home
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Exportación para Lovable
 */
export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
