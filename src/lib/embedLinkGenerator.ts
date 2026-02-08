/**
 * Generates embed links for sports events based on team names
 * Combines links from multiple sources:
 * - embedsports.top: https://embedsports.top/embed/{source}/ppv-{team1}-vs-{team2}/{stream}
 * - moviebite.cc: https://app.moviebite.cc/live/{source}/{team1}-vs-{team2}
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
 * Generates combined links from embedsports.top AND moviebite.cc
 * Distribution:
 * - url1: embedsports.top/admin
 * - url2: moviebite.cc/admin
 * - url3: moviebite.cc/delta
 *
 * @param homeTeam Home team name
 * @param awayTeam Away team name
 * @returns Object with 3 URLs from different sources
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Pattern for embedsports: ppv-{away}-vs-{home}
  const embedsportsSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  // Pattern for moviebite: {away}-vs-{home} (sin el prefijo "ppv-")
  const moviebiteSlug = `${awaySlug}-vs-${homeSlug}`;

  return {
    // URL 1: embedsports.top - admin
    url1: `https://embedsports.top/embed/admin/${embedsportsSlug}/1`,

    // URL 2: moviebite.cc - admin
    url2: `https://app.moviebite.cc/live/admin/${moviebiteSlug}`,

    // URL 3: moviebite.cc - delta
    url3: `https://app.moviebite.cc/live/delta/${moviebiteSlug}`,
  };
}

/**
 * Generates alternative link variants (home-vs-away instead of away-vs-home)
 * Same distribution strategy but with reversed team order
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Alternative pattern: ppv-{home}-vs-{away}
  const embedsportsSlug = `ppv-${homeSlug}-vs-${awaySlug}`;
  const moviebiteSlug = `${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${embedsportsSlug}/1`,
    url2: `https://app.moviebite.cc/live/admin/${moviebiteSlug}`,
    url3: `https://app.moviebite.cc/live/delta/${moviebiteSlug}`,
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
 * Generates ALL links from both platforms and all sources
 * @returns Array with all possible combinations
 */
export function generateAllSourceLinks(homeTeam: string, awayTeam: string): string[] {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const embedsportsSlug = `ppv-${awaySlug}-vs-${homeSlug}`;
  const moviebiteSlug = `${awaySlug}-vs-${homeSlug}`;

  const links: string[] = [];

  // Generate embedsports.top links for each source
  SOURCES.forEach((source) => {
    links.push(`https://embedsports.top/embed/${source}/${embedsportsSlug}/1`);
  });

  // Generate moviebite.cc links for each source
  SOURCES.forEach((source) => {
    links.push(`https://app.moviebite.cc/live/${source}/${moviebiteSlug}`);
  });

  return links;
}

/**
 * Generates links ONLY from embedsports.top
 */
export function generateEmbedsportsOnlyLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
  };
}

/**
 * Generates links ONLY from moviebite.cc
 */
export function generateMoviebiteOnlyLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://app.moviebite.cc/live/admin/${matchSlug}`,
    url2: `https://app.moviebite.cc/live/delta/${matchSlug}`,
    url3: `https://app.moviebite.cc/live/golf/${matchSlug}`,
  };
}
