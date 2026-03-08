import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PPV_CATEGORY_MAP: Record<string, string> = {
  Basketball: "basketball",
  Football: "football",
  Baseball: "baseball",
  "Ice Hockey": "hockey",
  "Combat Sports": "fighting",
  Wrestling: "fighting",
  "American Football": "american-football",
  Cricket: "cricket",
  Motorsports: "racing",
  Tennis: "tennis",
  Rugby: "rugby",
  Boxing: "fighting",
  MMA: "fighting",
  Soccer: "football",
};

const STREAMED_CATEGORY_MAP: Record<string, string> = {
  football: "football",
  soccer: "football",
  basketball: "basketball",
  nba: "basketball",
  baseball: "baseball",
  mlb: "baseball",
  hockey: "hockey",
  nhl: "hockey",
  tennis: "tennis",
  rugby: "rugby",
  cricket: "cricket",
  boxing: "fighting",
  mma: "fighting",
  ufc: "fighting",
  wrestling: "fighting",
  wwe: "fighting",
  motorsport: "racing",
  f1: "racing",
  "american football": "american-football",
  nfl: "american-football",
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const STOPWORDS = new Set(["fc", "cf", "sc", "ac", "bc", "cd", "the", "de", "la", "el", "club", "team", "vs", "v"]);
const tokenize = (s: string): string[] =>
  normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
const nameScore = (a: string, b: string): number => {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
};

function parseTeams(title: string): { home: string; away: string } | null {
  const separators = [" vs. ", " vs ", " v ", " - ", " VS ", " Vs "];
  for (const sep of separators) {
    const idx = title.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) {
      const home = title.substring(0, idx).trim();
      const away = title.substring(idx + sep.length).trim();
      if (home && away) return { home, away };
    }
  }
  return null;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000,
  headers: Record<string, string> = {},
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/html",
        ...headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (e) {
    console.error(`Fetch failed: ${url}`, e.message);
    return null;
  }
}

// ── PPV.to (fuente 1 → source_admin) ──
async function fetchPPV(): Promise<
  { title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]
> {
  try {
    for (const url of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
      const response = await fetchWithTimeout(url);
      if (!response?.ok) continue;
      const data = await response.json();
      if (!data.success || !data.streams) continue;
      const events: any[] = [];
      for (const category of data.streams) {
        const catName = category.category || "";
        const mappedCat = PPV_CATEGORY_MAP[catName] || "other";
        for (const stream of category.streams || []) {
          if (!stream.name || !stream.iframe || stream.always_live) continue;
          const teams = parseTeams(stream.name);
          events.push({
            title: stream.name,
            category: mappedCat,
            embedUrl: stream.iframe,
            teamHome: teams?.home || null,
            teamAway: teams?.away || null,
          });
        }
      }
      console.log(`PPV.to: Found ${events.length} events`);
      return events;
    }
    return [];
  } catch (e) {
    console.error("PPV failed:", e.message);
    return [];
  }
}

// ── Streamed.pk/su (fuente 2 = admin embed, fuente 3 = delta embed) ──
async function fetchStreamed(): Promise<
  {
    title: string;
    category: string;
    embedAdmin: string | null;
    embedDelta: string | null;
    teamHome: string | null;
    teamAway: string | null;
  }[]
> {
  const results: any[] = [];

  // Intentar varios endpoints de streamed
  const apiEndpoints = [
    "https://streamed.su/api/matches/all",
    "https://streamed.pk/api/matches/all",
    "https://api.streamed.su/matches",
    "https://streamed.su/api/matches/live",
  ];

  for (const baseUrl of apiEndpoints) {
    try {
      const response = await fetchWithTimeout(baseUrl, 8000);
      if (!response?.ok) continue;
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      const data = await response.json();
      const items = Array.isArray(data) ? data : data.matches || data.events || data.data || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const item of items) {
        const title = item.title || item.name || item.match || "";
        if (!title) continue;
        const category = item.category || item.sport || "other";
        const teams = parseTeams(title);

        const sources = item.sources || item.streams || [];
        let embedAdmin: string | null = null;
        let embedDelta: string | null = null;

        if (Array.isArray(sources)) {
          for (const src of sources) {
            const srcName = (src.source || src.name || "").toLowerCase();
            const embedUrl = src.embedUrl || src.iframe || src.url || src.embed || "";
            if (!embedUrl) continue;
            if (srcName.includes("admin") && !embedAdmin) embedAdmin = embedUrl;
            else if (srcName.includes("delta") && !embedDelta) embedDelta = embedUrl;
            else if (!embedAdmin) embedAdmin = embedUrl;
            else if (!embedDelta) embedDelta = embedUrl;
          }
        } else if (typeof sources === "object" && sources !== null) {
          embedAdmin = sources.admin || sources.source1 || null;
          embedDelta = sources.delta || sources.source2 || null;
        }

        // Si no hay sources explícitos pero hay id, construir URLs estándar de streamed
        if (!embedAdmin && item.id) {
          embedAdmin = `https://streamed.su/watch/${item.id}/admin/1`;
          embedDelta = `https://streamed.su/watch/${item.id}/delta/1`;
        }

        if (!embedAdmin && !embedDelta) continue;

        results.push({
          title,
          category: STREAMED_CATEGORY_MAP[category.toLowerCase()] || category.toLowerCase() || "other",
          embedAdmin,
          embedDelta,
          teamHome: teams?.home || item.home || item.team1 || item.homeTeam || null,
          teamAway: teams?.away || item.away || item.team2 || item.awayTeam || null,
        });
      }

      if (results.length > 0) {
        console.log(`Streamed API (${baseUrl}): Found ${results.length} events`);
        return results;
      }
    } catch (e) {
      console.error(`Streamed endpoint ${baseUrl} failed:`, e.message);
      continue;
    }
  }

  // Fallback: scraping HTML de streamed.su
  try {
    const response = await fetchWithTimeout("https://streamed.su/", 10000, { Accept: "text/html" });
    if (response?.ok) {
      const html = await response.text();
      const jsonMatch = html.match(/"matches":\s*(\[[\s\S]*?\])/);
      if (jsonMatch) {
        try {
          const matches = JSON.parse(jsonMatch[1]);
          for (const m of matches) {
            const title = m.title || m.name || "";
            if (!title) continue;
            const teams = parseTeams(title);
            const embedAdmin = m.id ? `https://streamed.su/watch/${m.id}/admin/1` : null;
            const embedDelta = m.id ? `https://streamed.su/watch/${m.id}/delta/1` : null;
            if (!embedAdmin) continue;
            results.push({
              title,
              category: STREAMED_CATEGORY_MAP[(m.category || "").toLowerCase()] || "other",
              embedAdmin,
              embedDelta,
              teamHome: teams?.home || null,
              teamAway: teams?.away || null,
            });
          }
          console.log(`Streamed HTML fallback: Found ${results.length} events`);
        } catch {
          /* ignore */
        }
      }
    }
  } catch (e) {
    console.error("Streamed HTML fallback failed:", e.message);
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Fetch PPV.to y Streamed.pk en paralelo ──
    const [ppvEvents, streamedEvents] = await Promise.all([fetchPPV(), fetchStreamed()]);

    console.log(`PPV.to: ${ppvEvents.length} | Streamed: ${streamedEvents.length}`);

    // ── 2. Construir registros ──
    // PPV.to            → source_admin (link 1)
    // Streamed admin    → source_delta (link 2)
    // Streamed delta    → source_echo  (link 3)
    const recordMap = new Map<string, any>();

    // Base: todos los eventos de PPV.to
    for (const ppv of ppvEvents) {
      if (!ppv.teamHome) continue;
      const key = normalize(`${ppv.teamHome}-${ppv.teamAway || ""}`);
      const slugId = ppv.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
      recordMap.set(key, {
        match_id: `ppv-${slugId}`,
        match_title: ppv.title,
        category: ppv.category,
        team_home: ppv.teamHome,
        team_away: ppv.teamAway,
        source_admin: ppv.embedUrl,
        source_delta: null,
        source_echo: null,
        source_golf: null,
        scanned_at: new Date().toISOString(),
      });
    }

    // Cruzar Streamed con PPV para agregar fuentes 2 y 3
    let streamedMatched = 0;
    for (const s of streamedEvents) {
      if (!s.teamHome || (!s.embedAdmin && !s.embedDelta)) continue;

      let bestKey = "";
      let bestScore = 0;

      for (const [key, record] of recordMap.entries()) {
        const direct =
          (nameScore(s.teamHome, record.team_home || "") + nameScore(s.teamAway || "", record.team_away || "")) / 2;
        const swapped =
          (nameScore(s.teamHome, record.team_away || "") + nameScore(s.teamAway || "", record.team_home || "")) / 2;
        const score = Math.max(direct, swapped);
        if (score > bestScore) {
          bestScore = score;
          bestKey = key;
        }
      }

      if (bestKey && bestScore >= 0.35) {
        const record = recordMap.get(bestKey)!;
        if (!record.source_delta && s.embedAdmin) record.source_delta = s.embedAdmin;
        if (!record.source_echo && s.embedDelta) record.source_echo = s.embedDelta;
        streamedMatched++;
      } else if (s.teamHome && s.teamAway) {
        // Standalone de Streamed si no matcheó con PPV.to
        const key = normalize(`${s.teamHome}-${s.teamAway}`);
        if (!recordMap.has(key)) {
          const slugId = (s.embedAdmin || s.title).replace(/[^a-z0-9]/gi, "-").slice(-40);
          recordMap.set(key, {
            match_id: `st-${slugId}`,
            match_title: s.title,
            category: s.category,
            team_home: s.teamHome,
            team_away: s.teamAway,
            source_admin: null,
            source_delta: s.embedAdmin,
            source_echo: s.embedDelta,
            source_golf: null,
            scanned_at: new Date().toISOString(),
          });
        }
      }
    }

    console.log(`Streamed matched: ${streamedMatched}, standalone: ${streamedEvents.length - streamedMatched}`);

    const deduped = Array.from(recordMap.values());

    // ── 3. Guardar en DB ──
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    let saved = 0;
    if (deduped.length > 0) {
      for (let i = 0; i < deduped.length; i += 500) {
        const batch = deduped.slice(i, i + 500);
        const { error: insertError } = await adminClient
          .from("live_scraped_links")
          .upsert(batch, { onConflict: "match_id" });
        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          saved += batch.length;
        }
      }
    }

    console.log(`Saved ${saved}/${deduped.length} total records`);

    return new Response(
      JSON.stringify({
        success: true,
        count: saved,
        ppvTotal: ppvEvents.length,
        streamedTotal: streamedEvents.length,
        streamedMatched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
