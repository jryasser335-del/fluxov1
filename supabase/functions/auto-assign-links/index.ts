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
  baseball: "Baseball",
  fighting: "Fighting",
  wrestling: "Wrestling",
  wwe: "Wrestling",
  ufc: "MMA",
  mma: "MMA",
  boxing: "Boxing",
  tennis: "Tennis",
  hockey: "Hockey",
  rugby: "Rugby",
  cricket: "Cricket",
  motorsport: "Motorsport",
};

function getRawLinks(scraped: any): string[] {
  return [scraped.source_admin, scraped.source_echo, scraped.source_delta, scraped.source_golf].filter(Boolean);
}

const TEAM_STOPWORDS = new Set([
  "fc", "cf", "sc", "ac", "bc", "cd", "club", "team", "the", "de", "la", "el",
  "basketball", "football", "soccer", "baseball", "hockey", "rugby", "cricket", "motorsport", "vs", "v",
]);

function tokenizeTeamName(name: string): string[] {
  return normalize(name)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !TEAM_STOPWORDS.has(t));
}

function tokenOverlapScore(a: string, b: string): number {
  const ta = tokenizeTeamName(a);
  const tb = tokenizeTeamName(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let overlap = 0;
  for (const token of sa) if (sb.has(token)) overlap++;
  return overlap / Math.max(sa.size, sb.size);
}

function teamsMatchScore(eHome: string, eAway: string, sHome: string, sAway: string): number {
  const direct = (tokenOverlapScore(eHome, sHome) + tokenOverlapScore(eAway, sAway)) / 2;
  const swapped = (tokenOverlapScore(eHome, sAway) + tokenOverlapScore(eAway, sHome)) / 2;
  return Math.max(direct, swapped);
}

function sportMatches(eventSport: string | null, scrapedCategory: string | null): boolean {
  if (!eventSport || !scrapedCategory) return true;
  const mappedSport = CATEGORY_TO_SPORT[scrapedCategory.toLowerCase()] || scrapedCategory;
  return normalize(eventSport) === normalize(mappedSport);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Purge old events
    await supabase.from("events").delete().lt("event_date", todayStart.toISOString());

    // Delete events without team info
    const { data: badEvents } = await supabase
      .from("events").select("id, team_home, team_away").eq("is_active", true);
    const badIds = (badEvents || []).filter((e: any) => !e.team_home?.trim() || !e.team_away?.trim()).map((e: any) => e.id);
    if (badIds.length > 0) await supabase.from("events").delete().in("id", badIds);

    // Get scraped links
    const { data: scrapedLinks, error: scrapedError } = await supabase.from("live_scraped_links").select("*");
    if (scrapedError) throw scrapedError;
    if (!scrapedLinks?.length) {
      return new Response(JSON.stringify({ success: true, message: "No scraped links", assigned: 0, created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get active events
    const { data: allEvents } = await supabase.from("events").select("*").eq("is_active", true);
    const activeEvents = allEvents || [];

    let assigned = 0, created = 0, promoted = 0, cleaned = 0;
    const matchedScrapedIds = new Set<string>();
    const matchedEventIds = new Set<string>();

    // 1. Match & assign links
    for (const event of activeEvents) {
      if (!event.team_home?.trim() || !event.team_away?.trim()) continue;

      const MIN_MATCH_SCORE = 0.55;
      let bestMatch: any = null;
      let bestScore = 0;

      for (const s of scrapedLinks) {
        if (matchedScrapedIds.has(s.id)) continue;
        if (!s.team_home?.trim() || !s.team_away?.trim()) continue;
        if (!sportMatches(event.sport ?? null, s.category ?? null)) continue;

        const score = teamsMatchScore(event.team_home, event.team_away, s.team_home, s.team_away);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = s;
        }
      }

      const match = bestMatch && bestScore >= MIN_MATCH_SCORE ? bestMatch : null;

      if (match) {
        matchedScrapedIds.add(match.id);
        matchedEventIds.add(event.id);
        const links = getRawLinks(match);
        if (links.length > 0) {
          const eventDate = new Date(event.event_date);
          const minsUntil = (eventDate.getTime() - now.getTime()) / 60000;
          const isLiveOrSoon = minsUntil <= 30;

          await supabase.from("events").update({
            pending_url: links[0] || null,
            pending_url_2: links[1] || null,
            pending_url_3: links[2] || null,
            ...(isLiveOrSoon ? {
              stream_url: links[0] || null,
              stream_url_2: links[1] || null,
              stream_url_3: links[2] || null,
            } : {}),
          }).eq("id", event.id);
          assigned++;
          if (isLiveOrSoon) promoted++;
        }
      }
    }

    // 2. Clean unmatched events with embedsports links
    for (const event of activeEvents) {
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

    // 3. Create events for unmatched scraped links
    const newEvents: any[] = [];
    for (const scraped of scrapedLinks) {
      if (matchedScrapedIds.has(scraped.id)) continue;
      if (!scraped.team_home?.trim() || !scraped.team_away?.trim()) continue;
      const links = getRawLinks(scraped);
      if (links.length === 0) continue;

      const exists = activeEvents.some((e: any) => {
        if (!e.team_home?.trim() || !e.team_away?.trim()) return false;
        if (!sportMatches(e.sport ?? null, scraped.category ?? null)) return false;
        return teamsMatchScore(e.team_home, e.team_away, scraped.team_home, scraped.team_away) >= 0.65;
      });
      if (exists) continue;

      newEvents.push({
        name: scraped.match_title,
        event_date: new Date().toISOString(),
        sport: CATEGORY_TO_SPORT[(scraped.category || "other").toLowerCase()] || "Other",
        league: scraped.category || null,
        team_home: scraped.team_home,
        team_away: scraped.team_away,
        pending_url: links[0] || null,
        pending_url_2: links[1] || null,
        pending_url_3: links[2] || null,
        stream_url: links[0] || null,
        stream_url_2: links[1] || null,
        stream_url_3: links[2] || null,
        is_live: true,
        is_active: true,
      });
    }

    if (newEvents.length > 0) {
      const { error: insertError } = await supabase.from("events").insert(newEvents);
      if (!insertError) created = newEvents.length;
      else console.error("Insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true, assigned, created, promoted, cleaned,
        checked: activeEvents.length, scraped: scrapedLinks.length,
        message: `Assigned ${assigned}, promoted ${promoted}, created ${created}, cleaned ${cleaned}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Auto-assign error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
