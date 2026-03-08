import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WATCHFOOTY_API = "https://api.watchfooty.pw/api/v1";

const ALLOWED_SPORTS = new Set([
  "football", "hockey", "baseball", "basketball", "racing",
  "fighting", "rugby", "tennis", "cricket", "volleyball", "american-football",
]);

const PPV_CATEGORY_MAP: Record<string, string> = {
  "Basketball": "basketball", "Football": "football", "Baseball": "baseball",
  "Ice Hockey": "hockey", "Combat Sports": "fighting", "Wrestling": "fighting",
  "American Football": "american-football", "Cricket": "cricket",
  "Motorsports": "racing", "Tennis": "tennis", "Rugby": "rugby",
  "Boxing": "fighting", "MMA": "fighting", "Soccer": "football",
};

interface WatchfootyMatch {
  id: string | number;
  title: string;
  teams?: { home?: { name: string }; away?: { name: string } };
  league?: string;
  sport?: string;
  status?: string;
}

interface WatchfootyStream {
  url: string;
  source: string;
  quality: string;
  language: string;
}

interface SupEvent {
  title: string;
  category: string;
  embedUrl: string;
  teamHome: string | null;
  teamAway: string | null;
}

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

// ── Fetch all matches from Watchfooty (moviebite backend) ──
async function fetchWatchfootyMatches(): Promise<WatchfootyMatch[]> {
  const allMatches: WatchfootyMatch[] = [];
  
  for (const sport of ALLOWED_SPORTS) {
    try {
      const response = await fetchWithTimeout(`${WATCHFOOTY_API}/matches/${sport}`, 10000);
      if (!response?.ok) continue;
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      const matches = await response.json();
      if (Array.isArray(matches)) {
        for (const m of matches) {
          allMatches.push({ ...m, sport });
        }
      }
    } catch (e) {
      console.error(`Watchfooty ${sport} failed:`, e.message);
    }
  }
  
  console.log(`Watchfooty: Fetched ${allMatches.length} matches across all sports`);
  return allMatches;
}

// ── Get HD embed URLs from Watchfooty match details ──
async function resolveWatchfootyStreams(matchId: string | number): Promise<{ hd1: string | null; hd2: string | null }> {
  try {
    const response = await fetchWithTimeout(`${WATCHFOOTY_API}/match/${matchId}`, 6000);
    if (!response?.ok) return { hd1: null, hd2: null };
    const data = await response.json();
    const streams: WatchfootyStream[] = data.streams || [];
    
    // Prioritize: hd English > omega English > prime English > easy English > any HD
    const hdEnglish = streams.filter(s => s.quality === "HD" && s.language?.toLowerCase().includes("english"));
    const anyHd = streams.filter(s => s.quality === "HD");
    
    const prioritized = hdEnglish.length > 0 ? hdEnglish : anyHd;
    
    // Pick 2 different sources for redundancy
    const sources = new Set<string>();
    const picked: string[] = [];
    
    // Prefer hd, omega, prime, easy, elite, tv, delta sources in order
    const sourceOrder = ["hd", "omega", "prime", "easy", "elite", "tv", "delta", "echo"];
    for (const preferredSource of sourceOrder) {
      const match = prioritized.find(s => s.source === preferredSource && !sources.has(s.source));
      if (match) {
        sources.add(match.source);
        picked.push(match.url);
        if (picked.length >= 2) break;
      }
    }
    
    // Fill remaining from any available
    if (picked.length < 2) {
      for (const s of prioritized) {
        if (!picked.includes(s.url)) {
          picked.push(s.url);
          if (picked.length >= 2) break;
        }
      }
    }
    
    return { hd1: picked[0] || null, hd2: picked[1] || null };
  } catch (e) {
    console.error(`Watchfooty match ${matchId} failed:`, e.message);
    return { hd1: null, hd2: null };
  }
}

// ── PPV.to (primary source for link 1) ──
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Fetch matches from Watchfooty + PPV in parallel ──
    const [watchfootyMatches, ppvEvents] = await Promise.all([
      fetchWatchfootyMatches(),
      fetchPPV(),
    ]);

    // Filter quality matches with team info
    const qualityMatches = watchfootyMatches.filter((m) => {
      const homeName = m.teams?.home?.name?.trim();
      const awayName = m.teams?.away?.name?.trim();
      return homeName && awayName;
    });

    // ── 2. Resolve Watchfooty HD embed URLs (batch, max 20 concurrent) ──
    const records: Record<string, any>[] = [];
    const resolvePromises: Promise<void>[] = [];

    for (const match of qualityMatches) {
      const record: Record<string, string | null> = {
        match_id: `wf-${match.id}`,
        match_title: match.title,
        category: match.sport || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: null,   // Will be PPV
        source_delta: null,   // Watchfooty HD 1
        source_echo: null,    // Watchfooty HD 2
        source_golf: null,    // Fallback
        scanned_at: new Date().toISOString(),
      };
      records.push(record);

      const recordRef = record;
      const matchId = match.id;
      resolvePromises.push(
        resolveWatchfootyStreams(matchId).then(({ hd1, hd2 }) => {
          recordRef.source_delta = hd1;
          recordRef.source_echo = hd2;
        })
      );
    }

    // Resolve in batches of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < resolvePromises.length; i += BATCH_SIZE) {
      await Promise.all(resolvePromises.slice(i, i + BATCH_SIZE));
    }

    // Filter out records with zero resolved URLs
    let validRecords = records.filter((r) => r.source_delta || r.source_echo);
    console.log(`Watchfooty resolved ${validRecords.length}/${records.length} matches with HD streams`);

    // ── 3. Assign PPV links as primary source (source_admin) ──
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
        // Create new record with PPV as primary
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

    // ── 4. Save to DB ──
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (validRecords.length > 0) {
      const { error: insertError } = await adminClient.from("live_scraped_links").upsert(validRecords, { onConflict: "match_id" });
      if (insertError) { console.error("Insert error:", insertError); throw new Error(insertError.message); }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: validRecords.length,
        watchfootyTotal: qualityMatches.length,
        watchfootyResolved: validRecords.filter(r => r.source_delta || r.source_echo).length,
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
