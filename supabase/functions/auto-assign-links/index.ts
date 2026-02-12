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

    // Get all scraped links
    const { data: scrapedLinks, error: scrapedError } = await supabase.from("live_scraped_links").select("*");

    if (scrapedError) throw scrapedError;
    if (!scrapedLinks || scrapedLinks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No scraped links available", assigned: 0, created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get ALL active events
    const { data: allEvents } = await supabase.from("events").select("*").eq("is_active", true);

    const allActiveEvents = allEvents || [];
    const now = new Date();

    // Filter: only assign links to events starting within 15 minutes or already started
    const events = allActiveEvents.filter((e: any) => {
      if (!e.event_date) return false;
      const eventDate = new Date(e.event_date);
      const minutesUntilStart = (eventDate.getTime() - now.getTime()) / (1000 * 60);
      // Allow if: already started (negative) OR within 15 minutes of starting
      return minutesUntilStart <= 15;
    });

    // Events that exist but are too early (more than 15 min away)
    const tooEarlyEvents = allActiveEvents.filter((e: any) => {
      if (!e.event_date) return false;
      const eventDate = new Date(e.event_date);
      const minutesUntilStart = (eventDate.getTime() - now.getTime()) / (1000 * 60);
      return minutesUntilStart > 15;
    });

    let assigned = 0;
    let created = 0;
    let cleaned = 0;
    let removed = 0;
    let skippedTooEarly = 0;

    // Track which scraped links were matched to existing events
    const matchedScrapedIds = new Set<string>();
    const matchedEventIds = new Set<string>();

    // 1. Update existing events (only those within 15 min) with scraped links
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

          // Always set the best available links
          newUpdate.stream_url = links[0] || null;
          newUpdate.stream_url_2 = links[1] || null;
          newUpdate.stream_url_3 = links[2] || null;

          const { error: updateError } = await supabase.from("events").update(newUpdate).eq("id", event.id);

          if (!updateError) {
            assigned++;
          }
        }
      }
    }

    // 2. Clean links from events that are NO LONGER in the scraper (match ended)
    // AND delete the event entirely since the match is finished
    for (const event of events) {
      if (matchedEventIds.has(event.id)) continue;
      if (!event.stream_url || !event.stream_url.includes("embedsports")) continue;

      // Match ended - remove the event from the panel entirely
      const { error: deleteError } = await supabase
        .from("events")
        .update({
          stream_url: null,
          stream_url_2: null,
          stream_url_3: null,
          is_live: false,
          is_active: false,
        })
        .eq("id", event.id);

      if (!deleteError) {
        cleaned++;
      }
    }

    // 2b. Clean links from events that are too early (more than 15 min away)
    for (const event of tooEarlyEvents) {
      if (!event.stream_url || !event.stream_url.includes("embedsports")) continue;

      const { error: cleanEarlyError } = await supabase
        .from("events")
        .update({
          stream_url: null,
          stream_url_2: null,
          stream_url_3: null,
        })
        .eq("id", event.id);

      if (!cleanEarlyError) {
        skippedTooEarly++;
      }
    }

    // 3. Also remove events that are NOT live (is_live = false) and have links - clean them
    const { data: notLiveWithLinks } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .eq("is_live", false)
      .not("stream_url", "is", null);

    if (notLiveWithLinks) {
      for (const event of notLiveWithLinks) {
        if (!event.stream_url?.includes("embedsports")) continue;

        const { error: cleanNotLiveError } = await supabase
          .from("events")
          .update({
            stream_url: null,
            stream_url_2: null,
            stream_url_3: null,
          })
          .eq("id", event.id);

        if (!cleanNotLiveError) {
          removed++;
        }
      }
    }

    // 4. Create events for scraped links that have sources but no matching event
    for (const scraped of scrapedLinks) {
      if (matchedScrapedIds.has(scraped.id)) continue;

      const links = getLinks(scraped);
      if (links.length === 0) continue;

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
        team_home: scraped.team_home || null,
        team_away: scraped.team_away || null,
        stream_url: links[0] || null,
        stream_url_2: links[1] || null,
        stream_url_3: links[2] || null,
        is_live: true,
        is_active: true,
      });

      if (!insertError) {
        created++;
      } else {
        console.error(`Failed to create event ${scraped.match_title}:`, insertError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        assigned,
        created,
        cleaned,
        removed,
        skippedTooEarly,
        checked: events.length,
        tooEarly: tooEarlyEvents.length,
        scraped: scrapedLinks.length,
        message: `Updated ${assigned} events, created ${created} new, cleaned ${cleaned} finished, removed ${removed} not-live links, ${skippedTooEarly} too early`,
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
