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
 * e.g., "Oklahoma City Thunder" -> "oklahoma-city-thunder"
 */
function teamToSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .trim()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, ""); // Trim hyphens from ends
}

/**
 * Generates direct embed links for a match with different sources
 * @param homeTeam Home team name
 * @param awayTeam Away team name
 * @returns Object with url1 (admin), url2 (delta), url3 (golf)
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Pattern: ppv-{away}-vs-{home}
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
  };
}

/**
 * Generates alternative link variants (home-vs-away instead of away-vs-home)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Alternative pattern: ppv-{home}-vs-{away}
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
  };
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

/**
 * Generates links from all available sources (admin, delta, golf, echo)
 * @returns Array of all possible links
 */
export function generateAllSourceLinks(homeTeam: string, awayTeam: string): string[] {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  const links: string[] = [];

  // Generate links for each source
  SOURCES.forEach((source) => {
    links.push(`https://embedsports.top/embed/${source}/${matchSlug}/1`);
  });

  return links;
}
