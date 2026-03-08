import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WATCHFOOTY_API = "https://api.watchfooty.pw/api/v1";
const PIKACHU_EMBED = "https://pikachusports.top/embed";

const ALLOWED_SPORTS = [
  "football", "hockey", "baseball", "basketball", "racing",
  "fighting", "rugby", "tennis", "cricket", "volleyball", "american-football",
];

const PPV_CATEGORY_MAP: Record<string, string> = {
  "Basketball": "basketball", "Football": "football", "Baseball": "baseball",
  "Ice Hockey": "hockey", "Combat Sports": "fighting", "Wrestling": "fighting",
  "American Football": "american-football", "Cricket": "cricket",
  "Motorsports": "racing", "Tennis": "tennis", "Rugby": "rugby",
  "Boxing": "fighting", "MMA": "fighting", "Soccer": "football",
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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

async function fetchWithTimeout(url: string, timeoutMs = 8000, headers: Record<string, string> = {}): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json", ...headers },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (e) {
    console.error(`Fetch failed: ${url}`, e.message);
    return null;
  }
}

// ── Fetch matches from Watchfooty and build pikachusports embed URLs directly ──
async function fetchWatchfootyRecords(): Promise<Record<string, any>[]> {
  const records: Record<string, any>[] = [];

  for (const sport of ALLOWED_SPORTS) {
    try {
      const response = await fetchWithTimeout(`${WATCHFOOTY_API}/matches/${sport}`, 10000);
      if (!response?.ok) continue;
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      const matches = await response.json();
      if (!Array.isArray(matches)) continue;

      for (const m of matches) {
        const homeName = m.teams?.home?.name?.trim();
        const awayName = m.teams?.away?.name?.trim();
        if (!homeName || !awayName) continue;

        const matchId = m.id;
        const homeSlug = slugify(homeName);
        const awaySlug = slugify(awayName);
        const slug = `${homeSlug}-${awaySlug}`;

        // Construct pikachusports HD embed URLs directly
        const hdUrl = `${PIKACHU_EMBED}/${matchId}/${slug}/hd/1`;
        const omegaUrl = `${PIKACHU_EMBED}/${matchId}/${slug}/omega/1`;

        records.push({
          match_id: `wf-${matchId}`,
          match_title: m.title || `${homeName} vs ${awayName}`,
          category: sport,
          team_home: homeName,
          team_away: awayName,
          source_admin: null,     // PPV.to (assigned below)
          source_delta: hdUrl,    // Watchfooty/Pikachusports HD
          source_echo: omegaUrl,  // Watchfooty/Pikachusports Omega HD
          source_golf: null,
          scanned_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error(`Watchfooty ${sport} failed:`, e.message);
    }
  }

  console.log(`Watchfooty: Built ${records.length} records with embed URLs`);
  return records;
}

// ── PPV.to (primary source for link 1) ──
async function fetchPPV(): Promise<{ title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null }[]> {
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
          events.push({ title: stream.name, category: mappedCat, embedUrl: stream.iframe, teamHome: teams?.home || null, teamAway: teams?.away || null });
        }
      }
      console.log(`PPV.to: Found ${events.length} events`);
      return events;
    }
    return [];
  } catch (e) { console.error("PPV failed:", e.message); return []; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Fetch from Watchfooty + PPV in parallel ──
    const [validRecords, ppvEvents] = await Promise.all([
      fetchWatchfootyRecords(),
      fetchPPV(),
    ]);

    // ── 2. Match PPV links as primary source (source_admin) ──
    let ppvMatched = 0;
    for (const ppv of ppvEvents) {
      if (!ppv.embedUrl || !ppv.teamHome) continue;

      const existingIdx = validRecords.findIndex((r) => {
        if (!r.team_home || !r.team_away) return false;
        const rHome = normalize(r.team_home);
        const rAway = normalize(r.team_away);
        const pH = normalize(ppv.teamHome || ppv.title);
        const pA = normalize(ppv.teamAway || "");
        const homeWords = pH.split(/\s+/).filter((w: string) => w.length > 3);
        const awayWords = pA.split(/\s+/).filter((w: string) => w.length > 3);
        const homeMatch = homeWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
        const awayMatch = pA ? awayWords.some((w: string) => rHome.includes(w) || rAway.includes(w)) : false;
        return homeMatch && awayMatch;
      });

      if (existingIdx >= 0) {
        validRecords[existingIdx].source_admin = ppv.embedUrl;
        ppvMatched++;
      } else if (ppv.category !== "other" && ppv.teamHome) {
        // Create standalone PPV record
        const slugId = ppv.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
        validRecords.push({
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
    }

    console.log(`PPV matched to ${ppvMatched} watchfooty records, ${ppvEvents.length - ppvMatched} standalone`);

    // ── 3. Deduplicate by match_id ──
    const uniqueMap = new Map<string, any>();
    for (const r of validRecords) {
      const existing = uniqueMap.get(r.match_id);
      if (!existing) {
        uniqueMap.set(r.match_id, r);
      } else {
        // Merge: prefer records with more sources
        if (!existing.source_admin && r.source_admin) existing.source_admin = r.source_admin;
        if (!existing.source_delta && r.source_delta) existing.source_delta = r.source_delta;
        if (!existing.source_echo && r.source_echo) existing.source_echo = r.source_echo;
      }
    }
    const deduped = Array.from(uniqueMap.values());

    // ── 4. Save to DB ──
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    let saved = 0;
    if (deduped.length > 0) {
      for (let i = 0; i < deduped.length; i += 500) {
        const batch = deduped.slice(i, i + 500);
        const { error: insertError } = await adminClient.from("live_scraped_links").upsert(batch, { onConflict: "match_id" });
        if (insertError) { console.error("Insert error:", insertError); }
        else { saved += batch.length; }
      }
    }

    console.log(`Saved ${saved}/${deduped.length} total records`);

    return new Response(
      JSON.stringify({
        success: true,
        count: validRecords.length,
        watchfooty: validRecords.filter(r => r.source_delta).length,
        ppvTotal: ppvEvents.length,
        ppvMatched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
