/**
 * Generates embed links for sports events using the BEST streaming sources
 * Uses: StreamEast, BuffStreams, and sport-specific sources (NBABite, NFLBite, etc.)
 * These sources DON'T block iframes and provide HIGH QUALITY streams
 */
export interface GeneratedLinks {
  url1: string; // StreamEast - Best quality (1080p)
  url2: string; // BuffStreams - Very reliable (720p-1080p)
  url3: string; // Sport-specific or CrackStreams (720p-1080p)
  url4: string; // Alternative StreamEast mirror
}

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
 * Generates the BEST streaming links for a match
 * @param homeTeam - Home team name
 * @param awayTeam - Away team name
 * @param sport - Sport type (nba, nfl, mlb, nhl, soccer)
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string, sport: string = "nba"): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `${awaySlug}-vs-${homeSlug}`;
  const sportLower = sport.toLowerCase();

  // Determine sport-specific source for url3
  let url3: string;
  switch (sportLower) {
    case "nba":
    case "basketball":
      url3 = `https://nbabite.com/${matchSlug}`;
      break;
    case "nfl":
    case "football":
      url3 = `https://nflbite.com/${matchSlug}`;
      break;
    case "mlb":
    case "baseball":
      url3 = `https://mlbbite.com/${matchSlug}`;
      break;
    case "nhl":
    case "hockey":
      url3 = `https://nhlbite.com/${matchSlug}`;
      break;
    case "soccer":
    case "futbol":
      url3 = `https://hesgoal.tv/watch/${matchSlug}`;
      break;
    default:
      url3 = `https://crackstreams.biz/${sportLower}/${matchSlug}`;
  }

  return {
    url1: `https://streameast.app/${sportLower}/${matchSlug}`, // StreamEast - Best quality
    url2: `https://buffstreams.app/${sportLower}/${matchSlug}`, // BuffStreams - Very reliable
    url3: url3, // Sport-specific source
    url4: `https://streameast.live/${sportLower}/${matchSlug}`, // StreamEast mirror
  };
}

/**
 * Generates alternative link variants (home-vs-away instead of away-vs-home)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string, sport: string = "nba"): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `${homeSlug}-vs-${awaySlug}`;
  const sportLower = sport.toLowerCase();

  // Determine sport-specific source for url3
  let url3: string;
  switch (sportLower) {
    case "nba":
    case "basketball":
      url3 = `https://nbabite.com/${matchSlug}`;
      break;
    case "nfl":
    case "football":
      url3 = `https://nflbite.com/${matchSlug}`;
      break;
    case "mlb":
    case "baseball":
      url3 = `https://mlbbite.com/${matchSlug}`;
      break;
    case "nhl":
    case "hockey":
      url3 = `https://nhlbite.com/${matchSlug}`;
      break;
    case "soccer":
    case "futbol":
      url3 = `https://hesgoal.tv/watch/${matchSlug}`;
      break;
    default:
      url3 = `https://crackstreams.biz/${sportLower}/${matchSlug}`;
  }

  return {
    url1: `https://streameast.app/${sportLower}/${matchSlug}`,
    url2: `https://buffstreams.app/${sportLower}/${matchSlug}`,
    url3: url3,
    url4: `https://streameast.live/${sportLower}/${matchSlug}`,
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
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
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
export async function findWorkingLink(
  homeTeam: string,
  awayTeam: string,
  sport: string = "nba",
): Promise<string | null> {
  const allUrls = generateAllSourceLinks(homeTeam, awayTeam, sport);
  const alternativeUrls = generateAllSourceLinks(awayTeam, homeTeam, sport);

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
export async function findAllWorkingLinks(
  homeTeam: string,
  awayTeam: string,
  sport: string = "nba",
): Promise<string[]> {
  const allUrls = generateAllSourceLinks(homeTeam, awayTeam, sport);
  const alternativeUrls = generateAllSourceLinks(awayTeam, homeTeam, sport);

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
  sport: string = "nba",
): {
  primary: GeneratedLinks;
  alternative: GeneratedLinks;
} {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam, sport),
    alternative: generateAlternativeLinks(homeTeam, awayTeam, sport),
  };
}

/**
 * Generates links from all available sources
 */
export function generateAllSourceLinks(homeTeam: string, awayTeam: string, sport: string = "nba"): string[] {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `${awaySlug}-vs-${homeSlug}`;
  const sportLower = sport.toLowerCase();

  const links: string[] = [];

  // StreamEast variants
  links.push(`https://streameast.app/${sportLower}/${matchSlug}`);
  links.push(`https://streameast.live/${sportLower}/${matchSlug}`);
  links.push(`https://streameast.io/${sportLower}/${matchSlug}`);

  // BuffStreams variants
  links.push(`https://buffstreams.app/${sportLower}/${matchSlug}`);
  links.push(`https://buffstreams.tv/${sportLower}/${matchSlug}`);

  // CrackStreams
  links.push(`https://crackstreams.biz/${sportLower}/${matchSlug}`);

  // Sport-specific sources
  switch (sportLower) {
    case "nba":
    case "basketball":
      links.push(`https://nbabite.com/${matchSlug}`);
      links.push(`https://nba-streams.tv/${matchSlug}`);
      break;
    case "nfl":
    case "football":
      links.push(`https://nflbite.com/${matchSlug}`);
      break;
    case "mlb":
    case "baseball":
      links.push(`https://mlbbite.com/${matchSlug}`);
      break;
    case "nhl":
    case "hockey":
      links.push(`https://nhlbite.com/${matchSlug}`);
      break;
    case "soccer":
    case "futbol":
      links.push(`https://hesgoal.tv/watch/${matchSlug}`);
      break;
  }

  // Additional reliable sources
  links.push(`https://bilasport.net/${sportLower}/${matchSlug}.html`);
  links.push(`https://720pstream.me/watch/${matchSlug}`);

  return links;
}
