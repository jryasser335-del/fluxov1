const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchResult {
  name: string;
  url: string;
  source: string;
}

async function scrapePage(apiKey: string, url: string): Promise<{ markdown: string; links: string[] }> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        waitFor: 5000,
        onlyMainContent: true,
      }),
    });

    const data = await response.json();
    return {
      markdown: data.data?.markdown || data.markdown || "",
      links: data.data?.links || data.links || [],
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return { markdown: "", links: [] };
  }
}

function extractMatchesFromMarkdown(markdown: string, sourceUrl: string): MatchResult[] {
  const matches: MatchResult[] = [];
  const lines = markdown.split("\n");

  // Look for patterns that indicate match listings
  // Common patterns: "Team A vs Team B", links with /watch/, /live/, match times
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const text = linkMatch[1];
      const url = linkMatch[2];
      if (
        url.includes("/watch") ||
        url.includes("/live") ||
        url.includes("/stream") ||
        url.includes("/match") ||
        url.includes("/event") ||
        url.includes("/embed") ||
        url.includes("/play")
      ) {
        matches.push({ name: text, url, source: sourceUrl });
      }
    }

    // Look for "vs" patterns indicating matches
    if (line.toLowerCase().includes(" vs ") || line.toLowerCase().includes(" v ")) {
      // Check if there's a link nearby
      const nearbyLink = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
      const urlMatch = nearbyLink.match(/\((https?:\/\/[^)]+)\)/);
      if (urlMatch) {
        matches.push({ name: line.replace(/[#*\[\]]/g, "").trim(), url: urlMatch[1], source: sourceUrl });
      }
    }
  }

  return matches;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scraping moviebite.cc for live matches...");

    // Scrape multiple pages in parallel
    const pagesToScrape = [
      "https://app.moviebite.cc/live",
      "https://app.moviebite.cc/schedule",
      "https://app.moviebite.cc/football",
      "https://app.moviebite.cc/nba",
      "https://app.moviebite.cc/nfl",
      "https://app.moviebite.cc/channels",
    ];

    const results = await Promise.all(
      pagesToScrape.map((url) => scrapePage(apiKey, url))
    );

    const allMatches: MatchResult[] = [];
    const allRawLinks: string[] = [];
    const markdownPreviews: Record<string, string> = {};

    results.forEach((result, index) => {
      const sourceUrl = pagesToScrape[index];
      const pageName = sourceUrl.split("/").pop() || "unknown";

      // Store markdown preview
      markdownPreviews[pageName] = result.markdown.substring(0, 500);

      // Extract matches from markdown
      const markdownMatches = extractMatchesFromMarkdown(result.markdown, sourceUrl);
      allMatches.push(...markdownMatches);

      // Collect all links that look like match/stream pages
      const matchLinks = result.links.filter((link: string) =>
        /\/(watch|live|stream|match|event|play|embed|channel)/i.test(link)
      );

      for (const link of matchLinks) {
        allRawLinks.push(link);
        if (!allMatches.some((m) => m.url === link)) {
          try {
            const urlObj = new URL(link);
            const pathParts = urlObj.pathname.split("/").filter(Boolean);
            const name = pathParts
              .map((p: string) => decodeURIComponent(p).replace(/[-_]/g, " "))
              .join(" — ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase());
            allMatches.push({ name: name || link, url: link, source: sourceUrl });
          } catch {
            allMatches.push({ name: link, url: link, source: sourceUrl });
          }
        }
      }
    });

    // Deduplicate
    const uniqueMatches = allMatches.reduce((acc: MatchResult[], match) => {
      if (!acc.some((m) => m.url === match.url)) {
        acc.push(match);
      }
      return acc;
    }, []);

    const uniqueLinks = [...new Set(allRawLinks)];

    console.log(`Found ${uniqueMatches.length} matches, ${uniqueLinks.length} raw links`);

    return new Response(
      JSON.stringify({
        success: true,
        matches: uniqueMatches,
        allLinks: uniqueLinks,
        totalFound: uniqueMatches.length,
        markdownPreviews,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error scraping moviebite:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
