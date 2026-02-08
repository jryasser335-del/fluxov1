//**
 * Generates embed links for sports events based on team names
 * Pattern: https://streamed.pk/embed/{team1}-vs-{team2}/{stream}
 */
export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
}

/**
 * Available streaming sources (Channels/Variants)
 */
const SOURCES = ["", "1", "2", "3"] as const;

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
 * Generates streamed.pk links for a match with different sources
 * @param homeTeam Home team name
 * @param awayTeam Away team name
 * @returns Object with url1 (main), url2 (v1), url3 (v2)
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Pattern: {home}-vs-{away}
  const matchSlug = `${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://streamed.pk/embed/${matchSlug}`,
    url2: `https://streamed.pk/embed/${matchSlug}/1`,
    url3: `https://streamed.pk/embed/${matchSlug}/2`,
  };
}

/**
 * Generates alternative link variants (away-vs-home instead of home-vs-away)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Alternative pattern: {away}-vs-{home}
  const matchSlug = `${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://streamed.pk/embed/${matchSlug}`,
    url2: `https://streamed.pk/embed/${matchSlug}/1`,
    url3: `https://streamed.pk/embed/${matchSlug}/2`,
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
 * Generates links from all available sources
 * @returns Array of all possible links
 */
export function generateAllSourceLinks(homeTeam: string, awayTeam: string): string[] {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `${homeSlug}-vs-${awaySlug}`;

  const links: string[] = [];

  // Generate links for each source variant
  SOURCES.forEach((source) => {
    const suffix = source === "" ? "" : `/${source}`;
    links.push(`https://streamed.pk/embed/${matchSlug}${suffix}`);
  });

  return links;
}