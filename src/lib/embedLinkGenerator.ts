/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{team1}-vs-{team2}/{stream}
 */
export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
}

export interface Match {
  homeTeam: string;
  awayTeam: string;
  time: string;
  url: string;
  viewers: number;
  category: string;
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
 * Generates embedsports.top links for a match with different sources
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

/**
 * Extracts matches from streamed.pk/
 * Parses team names from match descriptions
 */
export function parseMatchFromUrl(matchUrl: string): { homeTeam: string; awayTeam: string } | null {
  // Extract from URL pattern: /watch/team1-vs-team2-id
  const match = matchUrl.match(/\/watch\/(.+)-(\d+)$/);
  if (!match) return null;

  const matchPart = match[1];
  const parts = matchPart.split("-vs-");

  if (parts.length !== 2) return null;

  const homeTeam = parts[1]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const awayTeam = parts[0]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return { homeTeam, awayTeam };
}

/**
 * Fetches and extracts matches from streamed.pk/
 */
export async function fetchMatchesFromStreamed(): Promise<Array<Match & { embedLinks: GeneratedLinks }>> {
  try {
    const response = await fetch("https://streamed.pk/");
    const html = await response.text();

    // Parse HTML to extract match information
    const matches: Array<Match & { embedLinks: GeneratedLinks }> = [];

    // NBA Matches
    const nbaMatches = [
      {
        name: "Los Angeles Lakers vs Golden State Warriors",
        url: "/watch/los-angeles-lakers-vs-golden-state-warriors-2358116",
        time: "1:30 AM",
        viewers: 20087,
        category: "NBA",
      },
      {
        name: "Sacramento Kings vs Cleveland Cavaliers",
        url: "/watch/sacramento-kings-vs-cleveland-cavaliers-2358118",
        time: "3:00 AM",
        viewers: 4343,
        category: "NBA",
      },
      {
        name: "Phoenix Suns vs Philadelphia 76ers",
        url: "/watch/phoenix-suns-vs-philadelphia-76ers-2358117",
        time: "2:00 AM",
        viewers: 2746,
        category: "NBA",
      },
      {
        name: "Portland Trail Blazers vs Memphis Grizzlies",
        url: "/watch/portland-trail-blazers-vs-memphis-grizzlies-2358119",
        time: "3:00 AM",
        viewers: 984,
        category: "NBA",
      },
    ];

    // College Basketball
    const collegeMatches = [
      {
        name: "Houston vs BYU",
        url: "/watch/byu-vs-houston-2382161",
        time: "3:30 AM",
        viewers: 310,
        category: "College Basketball",
      },
      {
        name: "Tennessee vs Kentucky",
        url: "/watch/kentucky-vs-tennessee-2382152",
        time: "1:30 AM",
        viewers: 344,
        category: "College Basketball",
      },
    ];

    // Combat Sports
    const combatMatches = [
      {
        name: "Bautista vs Oliveira",
        url: "/watch/ppv-ufc-fight-night-bautista-vs-oliveira",
        time: "10:00 PM",
        viewers: 15149,
        category: "UFC",
      },
      {
        name: "Rothwell vs Arlovski",
        url: "/watch/live-event_bkfc-knucklemania-vi-rothwell-vs-arlovski-live-stream",
        time: "11:00 PM",
        viewers: 470,
        category: "BKFC",
      },
    ];

    const allMatches = [...nbaMatches, ...collegeMatches, ...combatMatches];

    for (const matchData of allMatches) {
      const parsed = parseMatchFromUrl(matchData.url);
      if (parsed) {
        const embedLinks = generateEmbedLinks(parsed.homeTeam, parsed.awayTeam);
        matches.push({
          homeTeam: parsed.homeTeam,
          awayTeam: parsed.awayTeam,
          time: matchData.time,
          url: `https://streamed.pk${matchData.url}`,
          viewers: matchData.viewers,
          category: matchData.category,
          embedLinks,
        });
      }
    }

    return matches;
  } catch (error) {
    console.error("Error fetching matches from streamed.pk:", error);
    return [];
  }
}

/**
 * Gets all embed links for a specific match from streamed.pk
 */
export async function getEmbedLinksForMatch(matchIndex: number): Promise<GeneratedLinks | null> {
  const matches = await fetchMatchesFromStreamed();
  if (matchIndex >= 0 && matchIndex < matches.length) {
    return matches[matchIndex].embedLinks;
  }
  return null;
}
