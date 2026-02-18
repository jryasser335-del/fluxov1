import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const CATEGORY_TO_SPORT: Record<string, string> = {
  basketball: "Basketball",
  football: "Soccer",
};

interface LinkTest {
  url: string;
  ok: boolean;
  latency: number; // ms
  expired: boolean;
}

/** Test a single link: checks status + latency + expired content */
async function testLink(url: string): Promise<LinkTest> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
        Referer: "https://embedsports.top/",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;

    if (!res.ok) return { url, ok: false, latency, expired: false };

    // Check m3u8 for "expired"
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("mpegurl") || ct.includes("m3u8") || url.includes(".m3u8")) {
      try {
        const body = await res.text();
        if (body.toLowerCase().includes("expired")) {
          return { url, ok: false, latency, expired: true };
        }
      } catch { /* ignore */ }
    }

    return { url, ok: true, latency, expired: false };
  } catch {
    return { url, ok: false, latency: Date.now() - start, expired: false };
  }
}

/** Get raw links from a scraped entry */
function getRawLinks(scraped: any): string[] {
  return [scraped.source_admin, scraped.source_delta, scraped.source_echo, scraped.source_golf].filter(Boolean);
}

/** Test all links and return sorted by quality (working first, then by latency) */
async function getQualityLinks(scraped: any): Promise<string[]> {
  const raw = getRawLinks(scraped);
  if (raw.length === 0) return [];

  const results = await Promise.all(raw.map(testLink));

  // Filter working, non-expired links and sort by latency (fastest first)
  const working = results
    .filter((r) => r.ok && !r.expired)
    .sort((a, b) => a.latency - b.latency)
    .map((r) => r.url);

  return working;
}

function wordsMatch(eventWords: string[], scrapedText: string): boolean {
  return eventWords.some((w: string) => w.length > 2 && scrapedText.includes(w));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();

    // ── 0. PURGE: Delete events from before today ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: pastEvents } = await supabase
      .from("events")
      .select("id")
      .lt("event_date", todayStart.toISOString());

    let purgedPast = 0;
    if (pastEvents && pastEvents.length > 0) {
      const ids = pastEvents.map((e: any) => e.id);
      await supabase.from("events").delete().in("id", ids);
      purgedPast = ids.length;
    }

    // ── 0b. QUALITY FILTER: Delete events without team info ──
    const { data: badEvents } = await supabase
      .from("events")
      .select("id, team_home, team_away")
      .eq("is_active", true);

    let purgedBadQuality = 0;
    if (badEvents) {
      const badIds = badEvents
        .filter((e: any) => !e.team_home?.trim() || !e.team_away?.trim())
        .map((e: any) => e.id);
      if (badIds.length > 0) {
        await supabase.from("events").delete().in("id", badIds);
        purgedBadQuality = badIds.length;
      }
    }

    // Get all scraped links
    const { data: scrapedLinks, error: scrapedError } = await supabase.from("live_scraped_links").select("*");
    if (scrapedError) throw scrapedError;
    if (!scrapedLinks || scrapedLinks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No scraped links available", assigned: 0, created: 0, promoted: 0, purgedPast, purgedBadQuality }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get ALL active events
    const { data: allEvents } = await supabase.from("events").select("*").eq("is_active", true);
    const allActiveEvents = allEvents || [];

    let assigned = 0;
    let created = 0;
    let promoted = 0;
    let cleaned = 0;
    let qualityFiltered = 0;

    const matchedScrapedIds = new Set<string>();
    const matchedEventIds = new Set<string>();

    // 1. Match scraped links → test quality → store best in pending_url
    for (const event of allActiveEvents) {
      const homeWords = normalize(event.team_home || "").split(/\s+/);
      const awayWords = normalize(event.team_away || "").split(/\s+/);
      const nameWords = normalize(event.name || "").split(/\s+/).filter((w: string) => w.length > 2);

      if (homeWords[0] === "" && nameWords.length === 0) continue;

      const match = scrapedLinks.find((s: any) => {
        const allText = `${normalize(s.match_title || "")} ${normalize(s.team_home || "")} ${normalize(s.team_away || "")}`;
        if (homeWords[0] !== "" && awayWords[0] !== "") {
          return wordsMatch(homeWords, allText) && wordsMatch(awayWords, allText);
        }
        const matched = nameWords.filter((w: string) => allText.includes(w)).length;
        return matched >= 2;
      });

      if (match) {
        matchedScrapedIds.add(match.id);
        matchedEventIds.add(event.id);

        // Test and sort links by quality
        const qualityLinks = await getQualityLinks(match);
        const discarded = getRawLinks(match).length - qualityLinks.length;
        qualityFiltered += discarded;

        if (qualityLinks.length > 0) {
          const pendingUpdate: Record<string, string | null> = {
            pending_url: qualityLinks[0] || null,
            pending_url_2: qualityLinks[1] || null,
            pending_url_3: qualityLinks[2] || null,
          };

          await supabase.from("events").update(pendingUpdate).eq("id", event.id);
          assigned++;
        }
      }
    }

    // 2. PROMOTION: Move pending → active for events within 30 min of start
    for (const event of allActiveEvents) {
      if (!event.pending_url) continue;

      const eventDate = new Date(event.event_date);
      const minutesUntilStart = (eventDate.getTime() - now.getTime()) / (1000 * 60);

      if (minutesUntilStart <= 30) {
        await supabase.from("events").update({
          stream_url: event.pending_url,
          stream_url_2: event.pending_url_2 || null,
          stream_url_3: event.pending_url_3 || null,
        }).eq("id", event.id);
        promoted++;
      } else {
        if (event.stream_url) {
          await supabase.from("events").update({
            stream_url: null,
            stream_url_2: null,
            stream_url_3: null,
          }).eq("id", event.id);
        }
      }
    }

    // 3. Clean events not in scraper anymore
    for (const event of allActiveEvents) {
      if (matchedEventIds.has(event.id)) continue;
      if (!event.pending_url && !event.stream_url) continue;
      if (event.stream_url && !event.stream_url.includes("embedsports")) continue;

      await supabase.from("events").update({
        pending_url: null, pending_url_2: null, pending_url_3: null,
        stream_url: null, stream_url_2: null, stream_url_3: null,
        is_live: false, is_active: false,
      }).eq("id", event.id);
      cleaned++;
    }

    // 4. Create events for unmatched scraped links (test quality first)
    for (const scraped of scrapedLinks) {
      if (matchedScrapedIds.has(scraped.id)) continue;
      if (!scraped.team_home?.trim() || !scraped.team_away?.trim()) continue;

      const qualityLinks = await getQualityLinks(scraped);
      if (qualityLinks.length === 0) continue;

      const scrapedNorm = normalize(scraped.match_title || "");
      const alreadyExists = allActiveEvents.some((e: any) => {
        const eventNorm = normalize(e.name || "");
        const scrapedWords = scrapedNorm.split(/\s+/).filter((w: string) => w.length > 2);
        const matchCount = scrapedWords.filter((w: string) => eventNorm.includes(w)).length;
        return matchCount >= 2;
      });

      if (alreadyExists) continue;

      const { error: insertError } = await supabase.from("events").insert({
        name: scraped.match_title,
        event_date: new Date().toISOString(),
        sport: CATEGORY_TO_SPORT[scraped.category || "other"] || "Other",
        league: scraped.category || null,
        team_home: scraped.team_home,
        team_away: scraped.team_away,
        pending_url: qualityLinks[0] || null,
        pending_url_2: qualityLinks[1] || null,
        pending_url_3: qualityLinks[2] || null,
        stream_url: null, stream_url_2: null, stream_url_3: null,
        is_live: true,
        is_active: true,
      });

      if (!insertError) created++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        assigned, created, promoted, cleaned,
        purgedPast, purgedBadQuality, qualityFiltered,
        checked: allActiveEvents.length,
        scraped: scrapedLinks.length,
        message: `Assigned ${assigned}, promoted ${promoted}, created ${created}, cleaned ${cleaned}, quality-filtered ${qualityFiltered}, purged ${purgedPast} past + ${purgedBadQuality} bad`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Auto-assign error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
