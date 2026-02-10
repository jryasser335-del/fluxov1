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

function isValidMatchLink(link: string): boolean {
  const url = link.toLowerCase();

  // ❌ EXCLUIR estos tipos de archivos
  const excludedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".css", ".js", ".ico", ".woff", ".ttf"];
  if (excludedExtensions.some((ext) => url.includes(ext))) {
    return false;
  }

  // ❌ EXCLUIR URLs de CDN, imágenes, assets
  const excludedDomains = ["pinimg.com", "imgur.com", "cloudinary.com", "cdn.", "static.", "assets."];
  if (excludedDomains.some((domain) => url.includes(domain))) {
    return false;
  }

  // ❌ EXCLUIR rutas genéricas
  const excludedPaths = ["/api/", "/assets/", "/static/", "/images/", "/img/", "/css/", "/js/"];
  if (excludedPaths.some((path) => url.includes(path))) {
    return false;
  }

  // ❌ EXCLUIR homepage y páginas base
  if (
    url === "https://app.moviebite.cc/" ||
    url === "https://app.moviebite.cc/live" ||
    url.endsWith("/live/") ||
    url.endsWith("/channels/")
  ) {
    return false;
  }

  // ✅ DEBE ser de moviebite.cc
  if (!url.includes("moviebite.cc")) {
    return false;
  }

  // ✅ Extraer el slug (última parte de la URL)
  try {
    const urlObj = new URL(link);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    // Debe tener un slug válido (no vacío, no 'live', no 'channels')
    if (!lastPart || lastPart === "live" || lastPart === "channels" || lastPart.length < 3) {
      return false;
    }

    // El slug no debe contener extensiones de archivo
    if (lastPart.includes(".")) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

function extractMatchesFromMarkdown(markdown: string, sourceUrl: string): MatchResult[] {
  const matches: MatchResult[] = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const text = linkMatch[1];
      const url = linkMatch[2];

      // Validar que sea un link de partido válido
      if (isValidMatchLink(url)) {
        matches.push({ name: text, url, source: sourceUrl });
      }
    }

    // Look for "vs" or "@" patterns indicating matches
    if (
      line.toLowerCase().includes(" vs ") ||
      line.toLowerCase().includes(" v ") ||
      line.toLowerCase().includes(" @ ")
    ) {
      // Check if there's a link nearby
      const nearbyLink = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
      const urlMatch = nearbyLink.match(/\((https?:\/\/[^)]+)\)/);

      if (urlMatch && isValidMatchLink(urlMatch[1])) {
        const cleanName = line.replace(/[#*\[\]]/g, "").trim();
        matches.push({ name: cleanName, url: urlMatch[1], source: sourceUrl });
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
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Scraping moviebite.cc for live matches...");

    // Solo scrapear la página principal de live (las otras páginas causan ruido)
    const pagesToScrape = ["https://app.moviebite.cc/live"];

    const results = await Promise.all(pagesToScrape.map((url) => scrapePage(apiKey, url)));

    const allMatches: MatchResult[] = [];
    const allRawLinks: string[] = [];

    results.forEach((result, index) => {
      const sourceUrl = pagesToScrape[index];

      console.log(`Processing ${sourceUrl}...`);
      console.log(`Found ${result.links.length} total links`);

      // Extract matches from markdown
      const markdownMatches = extractMatchesFromMarkdown(result.markdown, sourceUrl);
      console.log(`Extracted ${markdownMatches.length} matches from markdown`);
      allMatches.push(...markdownMatches);

      // Filter valid match links
      const validLinks = result.links.filter((link: string) => isValidMatchLink(link));
      console.log(`Filtered to ${validLinks.length} valid match links`);

      for (const link of validLinks) {
        allRawLinks.push(link);

        // Si no está ya en matches, agregarlo
        if (!allMatches.some((m) => m.url === link)) {
          try {
            const urlObj = new URL(link);
            const pathParts = urlObj.pathname.split("/").filter(Boolean);
            const slug = pathParts[pathParts.length - 1];

            // Generar nombre desde el slug
            const name = slug
              .replace(/[-_]/g, " ")
              .split(" ")
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            allMatches.push({
              name: name || slug || "Live Event",
              url: link,
              source: sourceUrl,
            });
          } catch {
            // Si falla el parseo, usar el link como nombre
            allMatches.push({
              name: "Live Event",
              url: link,
              source: sourceUrl,
            });
          }
        }
      }
    });

    // Deduplicate por URL
    const uniqueMatches = allMatches.reduce((acc: MatchResult[], match) => {
      if (!acc.some((m) => m.url === match.url)) {
        acc.push(match);
      }
      return acc;
    }, []);

    const uniqueLinks = [...new Set(allRawLinks)];

    console.log(`✅ Final result: ${uniqueMatches.length} unique matches, ${uniqueLinks.length} unique links`);

    // Log primeros 5 para debugging
    if (uniqueMatches.length > 0) {
      console.log("First 5 matches:");
      uniqueMatches.slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name} → ${m.url}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        matches: uniqueMatches,
        allLinks: uniqueLinks,
        totalFound: uniqueMatches.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error scraping moviebite:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        matches: [],
        allLinks: [],
        totalFound: 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
