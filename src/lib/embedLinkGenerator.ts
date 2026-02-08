/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{team1}-vs-{team2}/{stream}
 */
export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
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
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Generates alternative link variants
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Checks if an iframe URL loads without errors
 */
async function checkUrlWorks(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, 5000); // 5 second timeout

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";

    const cleanup = () => {
      clearTimeout(timeout);
      document.body.removeChild(iframe);
      iframe.removeEventListener("load", onLoad);
      iframe.removeEventListener("error", onError);
    };

    const onLoad = () => {
      cleanup();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    iframe.addEventListener("load", onLoad);
    iframe.addEventListener("error", onError);

    document.body.appendChild(iframe);
    iframe.src = url;
  });
}

/**
 * Finds the first working URL from all possible variants
 * @returns First working URL or null if none work
 */
export async function findWorkingLink(homeTeam: string, awayTeam: string): Promise<string | null> {
  const allUrls = generateAllSourceLinks(homeTeam, awayTeam);
  const alternativeUrls = generateAllSourceLinks(awayTeam, homeTeam); // Reverse order

  const allPossibleUrls = [...allUrls, ...alternativeUrls];

  // Try each URL sequentially
  for (const url of allPossibleUrls) {
    const works = await checkUrlWorks(url);
    if (works) {
      return url;
    }
  }

  return null; // No working URL found
}

/**
 * Finds all working URLs from all possible variants
 * @returns Array of working URLs
 */
export async function findAllWorkingLinks(homeTeam: string, awayTeam: string): Promise<string[]> {
  const allUrls = generateAllSourceLinks(homeTeam, awayTeam);
  const alternativeUrls = generateAllSourceLinks(awayTeam, homeTeam);

  const allPossibleUrls = [...allUrls, ...alternativeUrls];
  const workingUrls: string[] = [];

  // Test all URLs in parallel
  const results = await Promise.all(
    allPossibleUrls.map(async (url) => ({
      url,
      works: await checkUrlWorks(url),
    })),
  );

  results.forEach(({ url, works }) => {
    if (works) {
      workingUrls.push(url);
    }
  });

  return workingUrls;
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
 */
export function generateAllSourceLinks(homeTeam: string, awayTeam: string): string[] {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  const links: string[] = [];

  SOURCES.forEach((source) => {
    links.push(`https://embedsports.top/embed/${source}/${matchSlug}/1`);
  });

  return links;
}
