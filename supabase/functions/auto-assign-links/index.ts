import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CATEGORY_TO_SPORT: Record<string, string> = {
  basketball: "Basketball",
  football: "Soccer",
};

function getLinks(scraped: any): string[] {
  return [scraped.source_admin, scraped.source_delta, scraped.source_echo, scraped.source_golf].filter(Boolean);
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
      .select("id, team_home, team_away, name")
      .eq("is_active", true);

    let purgedBadQuality = 0;
    if (badEvents) {
      const badIds = badEvents
        .filter((e: any) => {
          const hasTeams = e.team_home?.trim() && e.team_away?.trim();
          return !hasTeams;
        })
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
        JSON.stringify({ success: true, message: "No scraped links available", assigned: 0, created: 0, purgedPast, purgedBadQuality }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get ALL active events
    const { data: allEvents } = await supabase.from("events").select("*").eq("is_active", true);
    const allActiveEvents = allEvents || [];
    const now = new Date();

    // ── VISIBILITY RULE: 30 minutes before start ──
    // Links are only assigned when event starts within 30 min or already started
    const events = allActiveEvents.filter((e: any) => {
      if (!e.event_date) return false;
      const eventDate = new Date(e.event_date);
      const minutesUntilStart = (eventDate.getTime() - now.getTime()) / (1000 * 60);
      return minutesUntilStart <= 30;
    });

    const tooEarlyEvents = allActiveEvents.filter((e: any) => {
      if (!e.event_date) return false;
      const eventDate = new Date(e.event_date);
      const minutesUntilStart = (eventDate.getTime() - now.getTime()) / (1000 * 60);
      return minutesUntilStart > 30;
    });

    let assigned = 0;
    let created = 0;
    let cleaned = 0;
    let removed = 0;
    let skippedTooEarly = 0;

    const matchedScrapedIds = new Set<string>();
    const matchedEventIds = new Set<string>();

    // 1. Update existing events with scraped links
    for (const event of events) {
      const homeWords = normalize(event.team_home || "").split(/\s+/);
      const awayWords = normalize(event.team_away || "").split(/\s+/);
      const nameWords = normalize(event.name || "")
        .split(/\s+/)
        .filter((w: string) => w.length > 2);

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
        const links = getLinks(match);

        if (links.length > 0) {
          const newUpdate: Record<string, string | null> = {};
          newUpdate.stream_url = links[0] || null;
          newUpdate.stream_url_2 = links[1] || null;
          newUpdate.stream_url_3 = links[2] || null;

          const { error: updateError } = await supabase.from("events").update(newUpdate).eq("id", event.id);
          if (!updateError) assigned++;
        }
      }
    }

    // 2. Clean links from events no longer in scraper
    for (const event of events) {
      if (matchedEventIds.has(event.id)) continue;
      if (!event.stream_url || !event.stream_url.includes("embedsports")) continue;

      await supabase
        .from("events")
        .update({
          stream_url: null,
          stream_url_2: null,
          stream_url_3: null,
          is_live: false,
          is_active: false,
        })
        .eq("id", event.id);
      cleaned++;
    }

    // 2b. Ensure too-early events have NO links (30-min rule)
    for (const event of tooEarlyEvents) {
      if (!event.stream_url) continue;

      await supabase
        .from("events")
        .update({
          stream_url: null,
          stream_url_2: null,
          stream_url_3: null,
        })
        .eq("id", event.id);
      skippedTooEarly++;
    }

    // 3. Remove links from not-live events
    const { data: notLiveWithLinks } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .eq("is_live", false)
      .not("stream_url", "is", null);

    if (notLiveWithLinks) {
      for (const event of notLiveWithLinks) {
        if (!event.stream_url?.includes("embedsports")) continue;
        // Check if it's within 30 min window - if so, keep the link
        const eventDate = new Date(event.event_date);
        const minutesUntilStart = (eventDate.getTime() - now.getTime()) / (1000 * 60);
        if (minutesUntilStart <= 30 && minutesUntilStart >= 0) continue;

        await supabase
          .from("events")
          .update({ stream_url: null, stream_url_2: null, stream_url_3: null })
          .eq("id", event.id);
        removed++;
      }
    }

    // 4. Create events for unmatched scraped links (only with complete info)
    for (const scraped of scrapedLinks) {
      if (matchedScrapedIds.has(scraped.id)) continue;

      const links = getLinks(scraped);
      if (links.length === 0) continue;

      // QUALITY: Skip if missing team names
      if (!scraped.team_home?.trim() || !scraped.team_away?.trim()) continue;

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
        stream_url: links[0] || null,
        stream_url_2: links[1] || null,
        stream_url_3: links[2] || null,
        is_live: true,
        is_active: true,
      });

      if (!insertError) created++;
      else console.error(`Failed to create event ${scraped.match_title}:`, insertError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        assigned,
        created,
        cleaned,
        removed,
        skippedTooEarly,
        purgedPast,
        purgedBadQuality,
        checked: events.length,
        tooEarly: tooEarlyEvents.length,
        scraped: scrapedLinks.length,
        message: `Assigned ${assigned}, created ${created}, cleaned ${cleaned}, removed ${removed}, purged ${purgedPast} past + ${purgedBadQuality} bad quality, ${skippedTooEarly} too early`,
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
