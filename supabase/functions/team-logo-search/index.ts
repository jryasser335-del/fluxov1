import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const cache = new Map<string, { logo: string | null; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Try ESPN's global search API first (fast, single request)
async function searchESPN(teamName: string): Promise<string | null> {
  try {
    // ESPN site search for teams
    const res = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(teamName)}&limit=10&type=team&mode=prefix`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    const results = data?.results || [];
    const q = normalize(teamName);
    
    for (const item of results) {
      const name = normalize(item?.displayName || item?.name || "");
      const shortName = normalize(item?.shortName || "");
      
      if (name === q || name.includes(q) || q.includes(name) || shortName === q) {
        // Try to get logo from the result
        if (item?.logo?.href) return item.logo.href;
        if (item?.logos?.[0]?.href) return item.logos[0].href;
        
        // If we have a team ID and sport, construct ESPN CDN URL
        const id = item?.id;
        const sport = item?.sport?.slug;
        if (id && sport) {
          const sportMap: Record<string, string> = {
            soccer: "soccer", basketball: "nba", baseball: "mlb",
            hockey: "nhl", football: "nfl", "mixed-martial-arts": "mma",
          };
          const segment = sportMap[sport] || sport;
          return `https://a.espncdn.com/i/teamlogos/${segment}/500/${id}.png`;
        }
      }
    }
    
    // Also check content items
    const content = data?.content || [];
    for (const section of content) {
      const items = section?.items || [];
      for (const item of items) {
        if (item?.type === "team") {
          const name = normalize(item?.displayName || "");
          if (name.includes(q) || q.includes(name)) {
            if (item?.logo?.href) return item.logo.href;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// Fallback: TheSportsDB (free, good coverage)
async function searchTheSportsDB(teamName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const team = data?.teams?.[0];
    return team?.strBadge || team?.strLogo || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const teamName = url.searchParams.get("t");

    if (!teamName) {
      return new Response(JSON.stringify({ logo: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = normalize(teamName);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(JSON.stringify({ logo: cached.logo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
      });
    }

    // Try ESPN first, then TheSportsDB as fallback
    let logo = await searchESPN(teamName);
    if (!logo) {
      logo = await searchTheSportsDB(teamName);
    }

    cache.set(cacheKey, { logo, ts: Date.now() });

    return new Response(JSON.stringify({ logo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ logo: null, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
