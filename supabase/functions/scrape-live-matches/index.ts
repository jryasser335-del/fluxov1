import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STREAMED_BASES = ["https://streamed.pk", "https://streamed.su", "https://streamed.one"];

const MOVIEBITE_API = "https://api.watchfooty.pw";

const ALLOWED_CATEGORIES = new Set([
  "football",
  "basketball",
  "baseball",
  "fighting",
  "wrestling",
  "wwe",
  "ufc",
  "mma",
  "boxing",
  "tennis",
  "hockey",
  "rugby",
  "cricket",
  "motorsport",
  "afl",
  "darts",
  "handball",
  "volleyball",
  "cycling",
]);

const PPV_CATEGORY_MAP: Record<string, string> = {
  Basketball: "basketball",
  Football: "football",
  Baseball: "baseball",
  "Ice Hockey": "hockey",
  "Combat Sports": "fighting",
  Wrestling: "wrestling",
  "American Football": "football",
  "Arm Wrestling": "fighting",
  Cricket: "cricket",
  Motorsports: "motorsport",
  Tennis: "tennis",
  Rugby: "rugby",
  Boxing: "boxing",
  MMA: "mma",
  Cycling: "cycling",
  Darts: "darts",
  Soccer: "football",
  AFL: "afl",
  Handball: "handball",
  Volleyball: "volleyball",
};

const MOVIEBITE_CATEGORY_MAP: Record<string, string> = {
  Soccer: "football",
  Football: "football",
  Basketball: "basketball",
  Baseball: "baseball",
  Hockey: "hockey",
  Tennis: "tennis",
  MMA: "mma",
  Boxing: "boxing",
  Rugby: "rugby",
  Cricket: "cricket",
  Motorsports: "motorsport",
  Wrestling: "wrestling",
};

interface MatchSource {
  source: string;
  id: string;
}
interface MatchData {
  id: string;
  title: string;
  category: string;
  teams?: { home?: { name: string }; away?: { name: string } };
  sources: MatchSource[];
}
interface PPVEvent {
  title: string;
  category: string;
  embedUrl: string;
  teamHome: string | null;
  teamAway: string | null;
}
interface MoviebiteEvent {
  title: string;
  category: string;
  streamUrl: string;
  teamHome: string | null;
  teamAway: string | null;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function parseTeams(title: string): { home: string; away: string } | null {
  for (const sep of [" vs. ", " vs ", " v ", " - ", " VS ", " Vs "]) {
    const idx = title.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) {
      const home = title.substring(0, idx).trim();
      const away = title.substring(idx + sep.length).trim();
      if (home && away) return { home, away };
    }
  }
  return null;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(t);
    return res;
  } catch (e) {
    console.error(`Fetch failed: ${url}`, e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// LINK 1 — PPV.to
// ─────────────────────────────────────────
async function fetchPPV(): Promise<PPVEvent[]> {
  try {
    for (const url of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
      const res = await fetchWithTimeout(url);
      if (!res?.ok) continue;
      const data = await res.json();
      if (!data.success || !data.streams) continue;
      const events: PPVEvent[] = [];
      for (const cat of data.streams) {
        const mapped = PPV_CATEGORY_MAP[cat.category || ""] || "other";
        for (const s of cat.streams || []) {
          if (!s.name || !s.iframe || s.always_live) continue;
          const teams = parseTeams(s.name);
          events.push({
            title: s.name,
            category: mapped,
            embedUrl: s.iframe,
            teamHome: teams?.home || null,
            teamAway: teams?.away || null,
          });
        }
      }
      console.log(`PPV.to: ${events.length} events`);
      return events;
    }
  } catch (e) {
    console.error("PPV failed:", e.message);
  }
  return [];
}

// ─────────────────────────────────────────
// LINK 2 — Streamed.pk (source alpha/bravo = calidad admin/HD)
// ─────────────────────────────────────────
async function fetchStreamedMatches(): Promise<MatchData[]> {
  for (const base of STREAMED_BASES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetchWithTimeout(`${base}/api/matches/all`, 10000);
      if (res?.ok) {
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("json")) break;
        const matches = await res.json();
        console.log(`Streamed: ${matches.length} matches from ${base}`);
        return matches;
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return [];
}

// Resuelve un stream usando source alpha (mejor calidad) de Streamed
async function resolveStreamedAdminUrl(match: MatchData): Promise<string | null> {
  // Preferir alpha primero, luego bravo — ambos son calidad "admin/HD"
  const preferred = match.sources.filter((s) => s.source === "alpha" || s.source === "bravo");
  if (preferred.length === 0) return null;

  for (const src of preferred) {
    for (const base of STREAMED_BASES) {
      try {
        const res = await fetchWithTimeout(`${base}/api/stream/${src.source}/${src.id}`, 6000);
        if (!res?.ok) continue;
        const streams = await res.json();
        if (!Array.isArray(streams) || streams.length === 0) continue;
        // Preferir HD + English
        const best =
          streams.find((s) => s.hd && s.language?.toLowerCase().includes("english")) ||
          streams.find((s) => s.hd) ||
          streams[0];
        if (best?.embedUrl) return best.embedUrl;
      } catch {
        continue;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────
// LINK 3 — Moviebite (live.moviebite.cc, api: watchfooty.pw)
// ─────────────────────────────────────────
async function fetchMoviebite(): Promise<MoviebiteEvent[]> {
  const entries: MoviebiteEvent[] = [];
  try {
    const res = await fetchWithTimeout(`${MOVIEBITE_API}/api/v1/matches/all`, 8000);
    if (!res?.ok) return entries;
    const matches = await res.json();
    if (!Array.isArray(matches)) return entries;

    const promises: Promise<void>[] = [];
    for (const m of matches.slice(0, 60)) {
      const matchId = m.id || m.matchId;
      if (!matchId) continue;
      promises.push(
        (async () => {
          try {
            const r = await fetchWithTimeout(`${MOVIEBITE_API}/api/v1/match/${matchId}`, 4000);
            if (!r?.ok) return;
            const detail = await r.json();
            const home = detail.teams?.home?.name || m.teams?.home?.name || "";
            const away = detail.teams?.away?.name || m.teams?.away?.name || "";
            if (!home || !away) return;
            const name = detail.title || `${home} vs ${away}`;
            const rawCat = detail.sport || detail.league || m.sport || "";
            const category = MOVIEBITE_CATEGORY_MAP[rawCat] || rawCat.toLowerCase() || "other";

            // Escoger el mejor stream HD disponible (misma lógica que fetch-all-streams)
            const streams = detail.streams || [];
            const prioritySources = ["hd", "prime", "elite", "omega", "easy", "tv", "delta", "echo"];
            const hdEn = streams
              .filter((s: any) => s.url && s.quality === "HD" && (s.language === "English" || s.language === "en"))
              .sort((a: any, b: any) => {
                const ai = prioritySources.indexOf(a.source);
                const bi = prioritySources.indexOf(b.source);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
              });
            const best =
              hdEn[0] || streams.find((s: any) => s.url && s.quality === "HD") || streams.find((s: any) => s.url);
            if (!best?.url) return;

            entries.push({ title: name, category, streamUrl: best.url, teamHome: home, teamAway: away });
          } catch {
            /* skip */
          }
        })(),
      );
    }
    // Resolver en batches de 15
    for (let i = 0; i < promises.length; i += 15) {
      await Promise.all(promises.slice(i, i + 15));
    }
    console.log(`Moviebite: ${entries.length} events`);
  } catch (e) {
    console.error("Moviebite failed:", e.message);
  }
  return entries;
}

// ─────────────────────────────────────────
// Fuzzy match por nombres de equipo
// ─────────────────────────────────────────
function teamsMatch(homeA: string, awayA: string, homeB: string | null, awayB: string | null): boolean {
  if (!homeB || !awayB) return false;
  const words = (s: string) =>
    normalize(s)
      .split(/\s+/)
      .filter((w) => w.length > 3);
  const hW = words(homeA),
    aW = words(awayA);
  const hB = normalize(homeB),
    aB = normalize(awayB);
  const homeHit = hW.some((w) => hB.includes(w) || aB.includes(w));
  const awayHit = aW.some((w) => hB.includes(w) || aB.includes(w));
  return homeHit && awayHit;
}

function findInRecords(home: string, away: string, records: Record<string, any>[]): number {
  return records.findIndex((r) => teamsMatch(home, away, r.team_home, r.team_away));
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Fetch las 3 fuentes en paralelo
    const [ppvEvents, allMatches, moviebiteEvents] = await Promise.all([
      fetchPPV(),
      fetchStreamedMatches(),
      fetchMoviebite(),
    ]);

    // ── PASO 1: Base desde PPV → source_admin (Link 1) ──
    const records: Record<string, any>[] = [];

    for (const ev of ppvEvents) {
      if (!ev.embedUrl || ev.category === "other") continue;
      const slugId = ev.embedUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
      records.push({
        match_id: `ppv-${slugId}`,
        match_title: ev.title,
        category: ev.category,
        team_home: ev.teamHome,
        team_away: ev.teamAway,
        source_admin: ev.embedUrl, // ✅ Link 1 — PPV.to
        source_delta: null, //    Link 2 — Streamed alpha/bravo (admin HD)
        source_echo: null, //    Link 3 — Moviebite HD
        source_golf: null,
        scanned_at: new Date().toISOString(),
      });
    }
    console.log(`Base PPV: ${records.length} records`);

    // ── PASO 2: Streamed alpha/bravo → source_delta (Link 2) ──
    const qualityMatches = allMatches.filter((m) => {
      if (!ALLOWED_CATEGORIES.has((m.category || "").toLowerCase())) return false;
      const h = m.teams?.home?.name?.trim();
      const a = m.teams?.away?.name?.trim();
      if (!h || !a) return false;
      return m.sources.some((s) => s.source === "alpha" || s.source === "bravo");
    });

    // Resolver URLs de Streamed alpha/bravo en paralelo
    const streamedUrlMap = new Map<string, string>(); // match.id -> embedUrl
    const resolvePromises: Promise<void>[] = [];

    for (const match of qualityMatches) {
      resolvePromises.push(
        resolveStreamedAdminUrl(match).then((url) => {
          if (url) streamedUrlMap.set(match.id, url);
        }),
      );
    }
    for (let i = 0; i < resolvePromises.length; i += 20) {
      await Promise.all(resolvePromises.slice(i, i + 20));
    }

    let streamedMerged = 0,
      streamedAdded = 0;
    for (const match of qualityMatches) {
      const url = streamedUrlMap.get(match.id);
      if (!url) continue;
      const h = match.teams?.home?.name || "";
      const a = match.teams?.away?.name || "";
      const idx = findInRecords(h, a, records);
      if (idx >= 0) {
        if (!records[idx].source_delta) {
          records[idx].source_delta = url; // ✅ Link 2 — Streamed admin HD
          streamedMerged++;
        }
      } else {
        // Partido solo en Streamed → agregar como fallback
        records.push({
          match_id: match.id,
          match_title: match.title,
          category: match.category || null,
          team_home: h || null,
          team_away: a || null,
          source_admin: url,
          source_delta: null,
          source_echo: null,
          source_golf: null,
          scanned_at: new Date().toISOString(),
        });
        streamedAdded++;
      }
    }
    console.log(`Streamed merged: ${streamedMerged} | solo: ${streamedAdded}`);

    // ── PASO 3: Moviebite HD → source_echo (Link 3) ──
    let moviebiteMerged = 0,
      moviebiteAdded = 0;
    for (const mb of moviebiteEvents) {
      if (!mb.streamUrl || !mb.teamHome || !mb.teamAway) continue;
      const idx = findInRecords(mb.teamHome, mb.teamAway, records);
      if (idx >= 0) {
        if (!records[idx].source_echo) {
          records[idx].source_echo = mb.streamUrl; // ✅ Link 3 — Moviebite HD
          moviebiteMerged++;
        }
      } else if (mb.category !== "other") {
        const slugId = mb.streamUrl.replace(/[^a-z0-9]/gi, "-").slice(-40);
        records.push({
          match_id: `mb-${slugId}`,
          match_title: mb.title,
          category: mb.category,
          team_home: mb.teamHome,
          team_away: mb.teamAway,
          source_admin: mb.streamUrl,
          source_delta: null,
          source_echo: null,
          source_golf: null,
          scanned_at: new Date().toISOString(),
        });
        moviebiteAdded++;
      }
    }
    console.log(`Moviebite merged: ${moviebiteMerged} | solo: ${moviebiteAdded}`);

    // ── PASO 4: Guardar en Supabase ──
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (records.length > 0) {
      const { error } = await adminClient.from("live_scraped_links").upsert(records, { onConflict: "match_id" });
      if (error) throw new Error(error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: records.length,
        ppvBase: ppvEvents.filter((e) => e.category !== "other" && e.embedUrl).length,
        streamedMerged,
        streamedAdded,
        moviebiteMerged,
        moviebiteAdded,
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
