/**
 * Gets streaming links from streamed.pk edge function
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
 * Fetches streaming links from streamed.pk via edge function
 */
export async function generateEmbedLinks(homeTeam: string, awayTeam: string): Promise<GeneratedLinks> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/get-streaming-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ homeTeam, awayTeam }),
    });

    const data = await response.json();

    if (data.links && data.links.length >= 3) {
      return {
        url1: data.links[0].url,
        url2: data.links[1].url,
        url3: data.links[2].url,
      };
    }

    return {
      url1: "",
      url2: "",
      url3: "",
    };
  } catch (error) {
    console.error("Error fetching streaming links:", error);
    return {
      url1: "",
      url2: "",
      url3: "",
    };
  }
}

/**
 * Generates alternative link variants
 */
export async function generateAlternativeLinks(homeTeam: string, awayTeam: string): Promise<GeneratedLinks> {
  return generateEmbedLinks(awayTeam, homeTeam);
}

/**
 * Generates all possible link variants for a match
 */
export async function generateAllLinkVariants(
  homeTeam: string,
  awayTeam: string,
): Promise<{
  primary: GeneratedLinks;
  alternative: GeneratedLinks;
}> {
  return {
    primary: await generateEmbedLinks(homeTeam, awayTeam),
    alternative: await generateAlternativeLinks(homeTeam, awayTeam),
  };
}

/**
 * Generates links from streamed.pk
 */
export async function generateAllSourceLinks(homeTeam: string, awayTeam: string): Promise<string[]> {
  const links = await generateEmbedLinks(homeTeam, awayTeam);
  return [links.url1, links.url2, links.url3].filter((url) => url);
}
