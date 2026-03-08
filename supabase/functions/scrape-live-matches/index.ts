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

const ALLOWED_CATEGORIES = new Set([
  "football", "basketball", "baseball",
  "fighting", "wrestling", "wwe", "ufc", "mma", "boxing",
  "tennis", "hockey", "rugby", "cricket", "motorsport",
  "afl", "darts", "handball", "volleyball", "cycling",
]);

// Map source names to our DB columns (pick best 4 sources)
const SOURCE_TO_COLUMN: Record<string, string> = {
  alpha: "source_admin",
  bravo: "source_admin",
  charlie: "source_delta",
  delta: "source_delta",
  echo: "source_echo",
  foxtrot: "source_echo",
  golf: "source_golf",
  hotel: "source_golf",
  intel: "source_golf",
};

const PPV_CATEGORY_MAP: Record<string, string> = {
  "Basketball": "basketball", "Football": "football", "Baseball": "baseball",
  "Ice Hockey": "hockey", "Combat Sports": "fighting", "Wrestling": "wrestling",
  "American Football": "football", "Arm Wrestling": "fighting", "Cricket": "cricket",
  "Motorsports": "motorsport", "Tennis": "tennis", "Rugby": "rugby",
  "Boxing": "boxing", "MMA": "mma", "Cycling": "cycling", "Darts": "darts",
  "Soccer": "football", "AFL": "afl", "Handball": "handball", "Volleyball": "volleyball",
};

interface MatchSource { source: string; id: string; }
interface MatchData { id: string; title: string; category: string; teams?: { home?: { name: string }; away?: { name: string } }; sources: MatchSource[]; }
interface SupEvent { title: string; category: string; embedUrl: string; teamHome: string | null; teamAway: string | null; }

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

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

// ── Fetch all matches from Streamed.pk ──
async function fetchStreamedMatches(): Promise<MatchData[]> {
  for (const base of STREAMED_BASES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetchWithTimeout(`${base}/api/matches/all`, 10000);
      if (response?.ok) {
        const ct = response.headers.get("content-type") || "";
        if (!ct.includes("json")) break;
        const matches = await response.json();
        console.log(`Fetched ${matches.length} matches from ${base}`);
        return matches;
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return [];
}

// ── Resolve embed URLs using the official Streams API ──
async function resolveStreamUrl(source: string, id: string): Promise<string | null> {
  for (const base of STREAMED_BASES) {
    try {
      const response = await fetchWithTimeout(`${base}/api/stream/${source}/${id}`, 6000);
      if (!response?.ok) continue;
      const streams = await response.json();
      if (Array.isArray(streams) && streams.length > 0) {
        // Prefer HD, English stream
        const hdStream = streams.find((s: any) => s.hd && s.language?.toLowerCase().includes("english"));
        const best = hdStream || streams.find((s: any) => s.hd) || streams[0];
        return best.embedUrl || null;
      }
    } catch { continue; }
  }
  return null;
}

// ── PPV.to ──
async function fetchPPV(): Promise<SupEvent[]> {
  try {
    for (const url of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
      const response = await fetchWithTimeout(url);
      if (!response?.ok) continue;
      const data = await response.json();
      if (!data.success || !data.streams) continue;
      const events: SupEvent[] = [];
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

// ── Match PPV events to Streamed records by team name similarity ──
function findPPVMatch(ppvEvent: SupEvent, records: Record<string, any>[]): number {
  if (!ppvEvent.teamHome) return -1;
  const pH = normalize(ppvEvent.teamHome);
  const pA = normalize(ppvEvent.teamAway || "");
  const homeWords = pH.split(/\s+/).filter((w: string) => w.length > 3);
  const awayWords = pA.split(/\s+/).filter((w: string) => w.length > 3);

  return records.findIndex((r) => {
    if (!r.team_home || !r.team_away) return false;
    const rHome = normalize(r.team_home);
    const rAway = normalize(r.team_away);
    const homeMatch = homeWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
    const awayMatch = pA ? awayWords.some((w: string) => rHome.includes(w) || rAway.includes(w)) : false;
    return homeMatch && awayMatch;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Fetch from BOTH sources in parallel ──
    const [matches, ppvEvents] = await Promise.all([
      fetchStreamedMatches(),
      fetchPPV(),
    ]);

    const filteredMatches = matches.filter((m) => ALLOWED_CATEGORIES.has((m.category || "").toLowerCase()));
    const qualityMatches = filteredMatches.filter((match) => {
      const homeName = match.teams?.home?.name?.trim();
      const awayName = match.teams?.away?.name?.trim();
      if (!homeName || !awayName) return false;
      return match.sources?.some((s) => SOURCE_TO_COLUMN[s.source]);
    });

    // ── 2. Resolve Streamed stream URLs ──
    const records: Record<string, any>[] = [];
    const resolvePromises: Promise<void>[] = [];

    for (const match of qualityMatches) {
      const record: Record<string, string | null> = {
        match_id: match.id,
        match_title: match.title,
        category: match.category || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: null, source_delta: null, source_echo: null, source_golf: null,
        scanned_at: new Date().toISOString(),
      };
      records.push(record);

      const columnsResolved = new Set<string>();
      for (const src of match.sources) {
        const col = SOURCE_TO_COLUMN[src.source];
        if (!col || columnsResolved.has(col)) continue;
        columnsResolved.add(col);

        const recordRef = record;
        const colName = col;
        const source = src.source;
        const id = src.id;
        resolvePromises.push(
          resolveStreamUrl(source, id).then((url) => {
            if (url) recordRef[colName] = url;
          })
        );
      }
    }

    const BATCH_SIZE = 20;
    for (let i = 0; i < resolvePromises.length; i += BATCH_SIZE) {
      await Promise.all(resolvePromises.slice(i, i + BATCH_SIZE));
    }

    // Filter out records with zero resolved URLs (before PPV merge)
    let validRecords = records.filter((r) => r.source_admin || r.source_delta || r.source_echo || r.source_golf);
    console.log(`Resolved ${validRecords.length}/${records.length} matches with stream URLs`);

    // ── 3. Merge PPV as CO-PRIMARY source ──
    // Priority order for final links: PPV (link 1) > Streamed HD alpha/bravo (link 2) > rest (link 3)
    // PPV goes into source_admin (highest priority), Streamed HD shifts down
    let ppvMerged = 0;
    let ppvAdded = 0;

    for (const sup of ppvEvents) {
      if (!sup.embedUrl) continue;

      const existingIdx = findPPVMatch(sup, validRecords);

      if (existingIdx >= 0) {
        const r = validRecords[existingIdx];
        // PPV becomes the top priority link - shift existing links down
        // Current source_admin (Streamed HD) moves to source_delta/echo
        const currentAdmin = r.source_admin;
        const currentDelta = r.source_delta;
        
        // Insert PPV as source_admin (Link 1)
        r.source_admin = sup.embedUrl;
        // Old admin (Streamed HD) goes to next available slot
        if (currentAdmin) {
          if (!r.source_delta) r.source_delta = currentAdmin;
          else if (!r.source_echo) r.source_echo = currentAdmin;
          else if (!r.source_golf) r.source_golf = currentAdmin;
        }
        ppvMerged++;
      } else if (sup.category !== "other" && sup.teamHome) {
        // PPV-only event - create new record with PPV as primary
        const slugId = sup.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
        validRecords.push({
          match_id: `ppv-${slugId}`,
          match_title: sup.title, category: sup.category,
          team_home: sup.teamHome, team_away: sup.teamAway,
          source_admin: sup.embedUrl, // PPV is link 1
          source_delta: null, source_echo: null, source_golf: null,
          scanned_at: new Date().toISOString(),
        });
        ppvAdded++;
      }
    }

    // ── 4. Save ──
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (validRecords.length > 0) {
      const { error: insertError } = await adminClient.from("live_scraped_links").upsert(validRecords, { onConflict: "match_id" });
      if (insertError) { console.error("Insert error:", insertError); throw new Error(insertError.message); }
    }

    return new Response(
      JSON.stringify({
        success: true, count: validRecords.length,
        matchesFound: qualityMatches.length,
        streamsResolved: validRecords.length - ppvAdded,
        ppv: ppvEvents.length, ppvMerged, ppvAdded,
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
