import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STREAMED_BASES = [
  "https://streamed.pk",
  "https://streamed.su",
  "https://streamed.one",
];

const PPV_CATEGORY_MAP: Record<string, string> = {
  "Basketball": "basketball", "Football": "football", "Baseball": "baseball",
  "Ice Hockey": "hockey", "Combat Sports": "fighting", "Wrestling": "wrestling",
  "American Football": "football", "Cricket": "cricket",
  "Motorsports": "motorsport", "Tennis": "tennis", "Rugby": "rugby",
  "Boxing": "boxing", "MMA": "mma", "Soccer": "football",
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function tokenize(name: string): string[] {
  const stopwords = new Set(["fc", "cf", "sc", "ac", "club", "the", "de", "la", "el", "vs", "v"]);
  return normalize(name).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !stopwords.has(t));
}

function matchScore(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res;
  } catch { return null; }
}

interface ResolvedLinks {
  url1: string | null;
  url2: string | null;
  url3: string | null;
  source1: string | null;
  source2: string | null;
  source3: string | null;
}

// Search Streamed.pk for a match
async function findStreamedMatch(homeTeam: string, awayTeam: string): Promise<{ embedUrls: string[] }> {
  const embedUrls: string[] = [];
  
  for (const base of STREAMED_BASES) {
    try {
      const res = await fetchWithTimeout(`${base}/api/matches/all`, 8000);
      if (!res?.ok) continue;
      const matches = await res.json();
      
      // Find best match
      let bestMatch: any = null;
      let bestScore = 0;
      
      for (const m of matches) {
        const mHome = m.teams?.home?.name || "";
        const mAway = m.teams?.away?.name || "";
        if (!mHome || !mAway) continue;
        
        const direct = (matchScore(homeTeam, mHome) + matchScore(awayTeam, mAway)) / 2;
        const swapped = (matchScore(homeTeam, mAway) + matchScore(awayTeam, mHome)) / 2;
        const score = Math.max(direct, swapped);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = m;
        }
      }
      
      if (bestMatch && bestScore >= 0.5) {
        // Resolve HD sources
        const hdSources = ["alpha", "bravo", "charlie", "delta", "echo"];
        const sources = (bestMatch.sources || []).filter((s: any) => hdSources.includes(s.source));
        
        // Resolve up to 3 streams in parallel
        const resolvePromises = sources.slice(0, 3).map(async (src: any) => {
          for (const b of STREAMED_BASES) {
            try {
              const r = await fetchWithTimeout(`${b}/api/stream/${src.source}/${src.id}`, 5000);
              if (!r?.ok) continue;
              const streams = await r.json();
              if (Array.isArray(streams) && streams.length > 0) {
                const hd = streams.find((s: any) => s.hd) || streams[0];
                return hd.embedUrl || null;
              }
            } catch { continue; }
          }
          return null;
        });
        
        const resolved = await Promise.all(resolvePromises);
        for (const url of resolved) {
          if (url && !embedUrls.includes(url)) embedUrls.push(url);
        }
      }
      break; // Found matches from this base, no need to try others
    } catch { continue; }
  }
  
  return { embedUrls };
}

// Search PPV.to for a match
async function findPPVMatch(homeTeam: string, awayTeam: string): Promise<string | null> {
  for (const url of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
    try {
      const res = await fetchWithTimeout(url, 6000);
      if (!res?.ok) continue;
      const data = await res.json();
      if (!data.success || !data.streams) continue;
      
      let bestUrl: string | null = null;
      let bestScore = 0;
      
      for (const category of data.streams) {
        for (const stream of category.streams || []) {
          if (!stream.name || !stream.iframe || stream.always_live) continue;
          
          const direct = (matchScore(homeTeam, stream.name) + matchScore(awayTeam, stream.name)) / 2;
          if (direct > bestScore) {
            bestScore = direct;
            bestUrl = stream.iframe;
          }
        }
      }
      
      if (bestUrl && bestScore >= 0.3) return bestUrl;
    } catch { continue; }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { homeTeam, awayTeam, espnId, sport } = await req.json();
    
    if (!homeTeam || !awayTeam) {
      return new Response(JSON.stringify({ error: "homeTeam and awayTeam required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Resolving streams for: ${homeTeam} vs ${awayTeam}`);

    // Search both sources in parallel
    const [ppvUrl, streamedResult] = await Promise.all([
      findPPVMatch(homeTeam, awayTeam),
      findStreamedMatch(homeTeam, awayTeam),
    ]);

    // Build links: PPV first, then Streamed
    const allUrls: { url: string; source: string }[] = [];
    if (ppvUrl) allUrls.push({ url: ppvUrl, source: "ppv" });
    for (const url of streamedResult.embedUrls) {
      allUrls.push({ url, source: "streamed" });
    }

    const links: ResolvedLinks = {
      url1: allUrls[0]?.url || null,
      url2: allUrls[1]?.url || null,
      url3: allUrls[2]?.url || null,
      source1: allUrls[0]?.source || null,
      source2: allUrls[1]?.source || null,
      source3: allUrls[2]?.source || null,
    };

    // If we found links and have an ESPN ID, save to DB for future use
    if (links.url1 && espnId) {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        
        // Check if event exists
        const { data: existing } = await supabase.from("events").select("id").eq("espn_id", espnId).maybeSingle();
        
        if (existing) {
          await supabase.from("events").update({
            stream_url: links.url1,
            stream_url_2: links.url2,
            stream_url_3: links.url3,
            is_live: true,
          }).eq("id", existing.id);
        } else {
          await supabase.from("events").insert({
            espn_id: espnId,
            name: `${homeTeam} vs ${awayTeam}`,
            team_home: homeTeam,
            team_away: awayTeam,
            sport: sport || "Other",
            stream_url: links.url1,
            stream_url_2: links.url2,
            stream_url_3: links.url3,
            pending_url: links.url1,
            event_date: new Date().toISOString(),
            is_live: true,
            is_active: true,
          });
        }
      } catch (e) {
        console.error("DB save error:", e.message);
      }
    }

    console.log(`Resolved: ${allUrls.length} links for ${homeTeam} vs ${awayTeam}`);

    return new Response(JSON.stringify({ success: true, links }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Resolve error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
