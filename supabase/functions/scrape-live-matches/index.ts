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

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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

// ── PPV.to (fuente 1) ──
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

// ── live.moviebite.cc (fuente 2) ──
// Intenta primero la API JSON, si no funciona hace scraping del HTML
async function fetchMoviebite(): Promise<
  { title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]
> {
  const results: any[] = [];

  // Intentar endpoints JSON comunes
  const jsonEndpoints = [
    "https://live.moviebite.cc/api/streams",
    "https://live.moviebite.cc/api/events",
    "https://live.moviebite.cc/api/matches",
    "https://live.moviebite.cc/streams.json",
  ];

  for (const endpoint of jsonEndpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, 6000);
      if (!response?.ok) continue;
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      const data = await response.json();

      const items = Array.isArray(data) ? data : data.streams || data.events || data.matches || data.data || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const item of items) {
        const title = item.name || item.title || item.match || "";
        const embedUrl = item.iframe || item.embed || item.url || item.stream || "";
        const category = item.category || item.sport || "other";
        if (!title || !embedUrl) continue;
        const teams = parseTeams(title);
        results.push({
          title,
          category: PPV_CATEGORY_MAP[category] || category.toLowerCase() || "other",
          embedUrl,
          teamHome: teams?.home || item.home || item.team_home || null,
          teamAway: teams?.away || item.away || item.team_away || null,
        });
      }

      if (results.length > 0) {
        console.log(`Moviebite JSON (${endpoint}): Found ${results.length} events`);
        return results;
      }
    } catch (e) {
      continue;
    }
  }

  // Si no hay API JSON, hacer scraping del HTML
  try {
    const response = await fetchWithTimeout("https://live.moviebite.cc/", 10000, { Accept: "text/html" });
    if (!response?.ok) return [];
    const html = await response.text();

    // Intentar extraer bloques de partido del HTML
    const matchBlocks = [
      ...html.matchAll(
        /<(?:div|article|li)[^>]*class=["'][^"']*(?:match|event|game|stream)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|article|li)>/gi,
      ),
    ];

    for (const block of matchBlocks) {
      const blockHtml = block[1];
      const titleMatch = blockHtml.match(
        /([A-Za-z0-9\s\u00C0-\u024F]+(?:\s+vs\.?\s+|\s+v\s+)[A-Za-z0-9\s\u00C0-\u024F]+)/i,
      );
      const iframeMatch = blockHtml.match(/(?:src|href)=["']([^"']+)["']/i);
      if (!titleMatch || !iframeMatch) continue;
      const title = titleMatch[1].trim();
      const embedUrl = iframeMatch[1].trim();
      const teams = parseTeams(title);
      if (!teams) continue;
      results.push({
        title,
        category: "other",
        embedUrl: embedUrl.startsWith("http") ? embedUrl : `https://live.moviebite.cc${embedUrl}`,
        teamHome: teams.home,
        teamAway: teams.away,
      });
    }

    console.log(`Moviebite HTML scraping: Found ${results.length} events`);
  } catch (e) {
    console.error("Moviebite HTML scraping failed:", e.message);
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Fetch de PPV.to y Moviebite en paralelo ──
    const [ppvEvents, moviebiteEvents] = await Promise.all([fetchPPV(), fetchMoviebite()]);

    console.log(`PPV.to: ${ppvEvents.length} events | Moviebite: ${moviebiteEvents.length} events`);

    // ── 2. Construir registros combinando ambas fuentes ──
    // PPV.to → source_admin (link 1)
    // Moviebite → source_delta (link 2)
    const recordMap = new Map<string, any>();

    // Primero cargar todos los eventos de PPV.to
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
        source_admin: ppv.embedUrl, // PPV.to = link 1
        source_delta: null, // Moviebite = link 2 (se llena abajo)
        source_echo: null,
        source_golf: null,
        scanned_at: new Date().toISOString(),
      });
    }

    // Luego cruzar con Moviebite para agregar source_delta
    let moviebiteMatched = 0;
    for (const mb of moviebiteEvents) {
      if (!mb.teamHome) continue;
      const mbHome = normalize(mb.teamHome);
      const mbAway = normalize(mb.teamAway || "");
      const mbHomeWords = mbHome.split(/\s+/).filter((w: string) => w.length > 2);
      const mbAwayWords = mbAway.split(/\s+/).filter((w: string) => w.length > 2);

      // Buscar si ya existe en el mapa (viene de PPV.to)
      let matched = false;
      for (const [_key, record] of recordMap.entries()) {
        const rHome = normalize(record.team_home || "");
        const rAway = normalize(record.team_away || "");
        const homeMatch = mbHomeWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
        const awayMatch = mbAway ? mbAwayWords.some((w: string) => rHome.includes(w) || rAway.includes(w)) : true;
        if (homeMatch && awayMatch) {
          record.source_delta = mb.embedUrl; // Moviebite = link 2
          moviebiteMatched++;
          matched = true;
          break;
        }
      }

      // Si no matcheó con ningún PPV.to, crear registro standalone con Moviebite
      if (!matched && mb.teamHome && mb.teamAway) {
        const key = normalize(`${mb.teamHome}-${mb.teamAway}`);
        if (!recordMap.has(key)) {
          const slugId = mb.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
          recordMap.set(key, {
            match_id: `mb-${slugId}`,
            match_title: mb.title,
            category: mb.category,
            team_home: mb.teamHome,
            team_away: mb.teamAway,
            source_admin: null,
            source_delta: mb.embedUrl, // Moviebite como único link
            source_echo: null,
            source_golf: null,
            scanned_at: new Date().toISOString(),
          });
        }
      }
    }

    console.log(
      `Moviebite matched to ${moviebiteMatched} PPV records, ${moviebiteEvents.length - moviebiteMatched} standalone`,
    );

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
        moviebiteTotal: moviebiteEvents.length,
        moviebiteMatched,
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
