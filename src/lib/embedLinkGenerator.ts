/**
 * Generates embed links for sports events based on team names
 * Pattern: https://streamed.pk/watch/{team1}-vs-{team2}
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
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generates streamed.pk links for a match with different quality options
 * @param homeTeam Home team name
 * @param awayTeam Away team name
 * @returns Object with url1, url2, url3 from streamed.pk
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://streamed.pk/watch/${matchSlug}-1`,
    url2: `https://streamed.pk/watch/${matchSlug}-2`,
    url3: `https://streamed.pk/watch/${matchSlug}-3`,
  };
}

/**
 * Generates alternative link variants (home-vs-away instead of away-vs-home)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://streamed.pk/watch/${matchSlug}-1`,
    url2: `https://streamed.pk/watch/${matchSlug}-2`,
    url3: `https://streamed.pk/watch/${matchSlug}-3`,
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
 * @returns Array of all possible links from streamed.pk
 */
export function generateAllSourceLinks(homeTeam: string, awayTeam: string): string[] {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `${awaySlug}-vs-${homeSlug}`;

  const links: string[] = [];

  SOURCES.forEach((_, index) => {
    links.push(`https://streamed.pk/watch/${matchSlug}-${index + 1}`);
  });

  return links;
}
