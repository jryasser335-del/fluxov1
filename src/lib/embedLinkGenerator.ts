/**
 * Generates embed links for sports events
 * URL 1: MovieBite Admin con Autoplay
 * URL 2 & 3: MovieBite Admin señales de respaldo
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Detects if the string is a real numeric ID from the scraper
 */
function isRealId(text: string): boolean {
  if (!text) return false;
  return /\d+$/.test(text);
}

/**
 * Generates embedsports.top links for a match
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const isDirectId = isRealId(homeTeam);

  // Si es ID directo lo usamos, si no, generamos slug ppv-{away}-vs-{home}
  const matchSlug = isDirectId ? homeTeam : `ppv-${teamToSlug(awayTeam)}-vs-${teamToSlug(homeTeam)}`;

  return {
    // URL 1: Solo esta tiene Autoplay (MovieBite Admin)
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1?autoplay=1`,

    // URL 2 y 3: Sin autoplay
    url2: `https://embedsports.top/embed/admin/${matchSlug}/2`,
    url3: `https://embedsports.top/embed/admin/${matchSlug}/3`,
  };
}

/**
 * Generates alternative link variants (home-vs-away)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const isDirectId = isRealId(homeTeam);

  if (isDirectId) {
    return generateEmbedLinks(homeTeam, awayTeam);
  }

  const matchSlug = `ppv-${teamToSlug(homeTeam)}-vs-${teamToSlug(awayTeam)}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/admin/${matchSlug}/2`,
    url3: `https://embedsports.top/embed/admin/${matchSlug}/3`,
  };
}

/**
 * Generates all possible link variants
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
