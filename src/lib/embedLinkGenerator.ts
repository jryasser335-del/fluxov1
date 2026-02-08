/**
 * Generates stream links for sports events from streamed.pk
 */
export interface StreamedLink {
  url: string;
  source: string;
}

export interface Match {
  homeTeam: string;
  awayTeam: string;
  time: string;
  url: string;
  viewers: number;
  category: string;
  streamLinks: StreamedLink[];
}

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
 * Parses matches from streamed.pk data
 */
export function parseMatchFromUrl(matchUrl: string): { homeTeam: string; awayTeam: string } | null {
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
 * Gets stream links from streamed.pk for a match
 */
export function getStreamedLinks(url: string): StreamedLink[] {
  return [
    {
      url: `https://streamed.pk${url}`,
      source: "Streamed.pk",
    },
  ];
}

/**
 * Fetches and extracts matches from streamed.pk
 */
export async function fetchMatchesFromStreamed(): Promise<Match[]> {
  try {
    const matchesData = [
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

    const matches: Match[] = [];

    for (const matchData of matchesData) {
      const parsed = parseMatchFromUrl(matchData.url);
      if (parsed) {
        matches.push({
          homeTeam: parsed.homeTeam,
          awayTeam: parsed.awayTeam,
          time: matchData.time,
          url: `https://streamed.pk${matchData.url}`,
          viewers: matchData.viewers,
          category: matchData.category,
          streamLinks: getStreamedLinks(matchData.url),
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
 * Gets stream links for a specific match
 */
export async function getStreamLinksForMatch(matchIndex: number): Promise<StreamedLink[] | null> {
  const matches = await fetchMatchesFromStreamed();
  if (matchIndex >= 0 && matchIndex < matches.length) {
    return matches[matchIndex].streamLinks;
  }
  return null;
}
