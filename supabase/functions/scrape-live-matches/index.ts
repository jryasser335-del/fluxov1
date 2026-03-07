import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STREAMED_BASES = [
  "https://streamed.su",
  "https://streamed.pk",
  "https://streamed.best",
  "https://streamed.top",
];

const EMBED_BASE = "https://embedsports.top/embed";

const ALLOWED_CATEGORIES = new Set([
  "football", "basketball", "baseball",
  "fighting", "wrestling", "wwe", "ufc", "mma", "boxing",
  "tennis", "hockey", "rugby", "cricket", "motorsport",
  "afl", "darts", "handball", "volleyball", "cycling",
]);

// Map source names to our DB columns
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
      const response = await fetchWithTimeout(`${base}/api/matches/all`, 12000);
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

// ── Build embed URL directly (NO API call needed) ──
function buildEmbedUrl(source: string, id: string, category: string): string {
  // For echo/foxtrot sources, append category suffix
  if (source === "echo" || source === "foxtrot") {
    return `${EMBED_BASE}/${source}/${id}-${category}/1`;
  }
  // For alpha/bravo, just use source/id
  if (source === "alpha" || source === "bravo") {
    return `${EMBED_BASE}/${source}/${id}`;
  }
  // For charlie/delta and others, use the live_ prefix pattern
  if (source === "charlie" || source === "delta") {
    return `${EMBED_BASE}/${source}/${id}/1`;
  }
  // Default
  return `${EMBED_BASE}/${source}/${id}/1`;
}

// ── PPV.to ──
async function fetchPPV(): Promise<SupEvent[]> {
  try {
    for (const url of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
      const response = await fetchWithTimeout(url, 10000);
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

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Fetch matches from Streamed.pk and PPV in parallel ──
    const [matches, ppv] = await Promise.all([fetchStreamedMatches(), fetchPPV()]);

    const filteredMatches = matches.filter((m) => ALLOWED_CATEGORIES.has((m.category || "").toLowerCase()));
    // Only keep matches with valid team names and known sources
    const qualityMatches = filteredMatches.filter((match) => {
      const homeName = match.teams?.home?.name?.trim();
      const awayName = match.teams?.away?.name?.trim();
      if (!homeName || !awayName) return false;
      return match.sources?.some((s) => SOURCE_TO_COLUMN[s.source]);
    });

    // Prioritize: popular matches first, limit total to avoid timeout
    const sorted = qualityMatches.sort((a, b) => {
      if ((a as any).popular && !(b as any).popular) return -1;
      if (!(a as any).popular && (b as any).popular) return 1;
      return 0;
    });
    const limitedMatches = sorted.slice(0, 150);

    // ── 2. Build embed URLs directly (no API resolution needed) ──
    const records: Record<string, any>[] = [];

    for (const match of limitedMatches) {
      const record: Record<string, string | null> = {
        match_id: match.id,
        match_title: match.title,
        category: match.category || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: null, source_delta: null, source_echo: null, source_golf: null,
        scanned_at: new Date().toISOString(),
      };

      const columnsResolved = new Set<string>();
      for (const src of match.sources) {
        const col = SOURCE_TO_COLUMN[src.source];
        if (!col || columnsResolved.has(col)) continue;
        columnsResolved.add(col);
        record[col] = buildEmbedUrl(src.source, src.id, match.category);
      }

      records.push(record);
    }

    const validRecords = records.filter((r) => r.source_admin || r.source_delta || r.source_echo || r.source_golf);
    console.log(`Built ${validRecords.length}/${limitedMatches.length} matches with embed URLs`);

    // ── 3. Merge PPV supplementary links ──
    let supplementaryAdded = 0;
    let supplementaryEnriched = 0;

    for (const sup of ppv) {
      if (!sup.embedUrl) continue;

      const existingIdx = validRecords.findIndex((r) => {
        if (!r.team_home || !r.team_away) return false;
        const rHome = normalize(r.team_home);
        const rAway = normalize(r.team_away);
        const pH = normalize(sup.teamHome || sup.title);
        const pA = normalize(sup.teamAway || "");
        const homeWords = pH.split(/\s+/).filter((w: string) => w.length > 3);
        const awayWords = pA.split(/\s+/).filter((w: string) => w.length > 3);
        const homeMatch = homeWords.some((w: string) => rHome.includes(w) || rAway.includes(w));
        const awayMatch = pA ? awayWords.some((w: string) => rHome.includes(w) || rAway.includes(w)) : false;
        return homeMatch && awayMatch;
      });

      if (existingIdx >= 0) {
        const r = validRecords[existingIdx];
        if (!r.source_golf) { r.source_golf = sup.embedUrl; supplementaryEnriched++; }
        else if (!r.source_echo) { r.source_echo = sup.embedUrl; supplementaryEnriched++; }
      } else if (sup.category !== "other" && sup.teamHome && validRecords.length < 250) {
        const slugId = sup.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
        validRecords.push({
          match_id: `ppv-${slugId}`,
          match_title: sup.title, category: sup.category,
          team_home: sup.teamHome, team_away: sup.teamAway,
          source_admin: null, source_delta: null, source_echo: null,
          source_golf: sup.embedUrl,
          scanned_at: new Date().toISOString(),
        });
        supplementaryAdded++;
      }
    }

    // ── 4. Save in batches ──
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    let saved = 0;
    const BATCH = 50;
    for (let i = 0; i < validRecords.length; i += BATCH) {
      const batch = validRecords.slice(i, i + BATCH);
      const { error: insertError } = await adminClient.from("live_scraped_links").insert(batch);
      if (insertError) { console.error("Batch insert error:", insertError.message); }
      else { saved += batch.length; }
    }
    console.log(`Saved ${saved}/${validRecords.length} records`);

    return new Response(
      JSON.stringify({
        success: true, count: saved,
        matchesFound: qualityMatches.length,
        ppv: ppv.length,
        supplementaryAdded, supplementaryEnriched,
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
