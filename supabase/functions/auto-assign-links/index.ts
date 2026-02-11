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
  fight: "Boxing/MMA",
  tennis: "Tennis",
  hockey: "Hockey",
  baseball: "Baseball",
  motorsport: "Motorsports",
  other: "Other",
};

function getLinks(scraped: any): string[] {
  return [
    scraped.source_admin,
    scraped.source_delta,
    scraped.source_echo,
    scraped.source_golf,
  ].filter(Boolean);
}

function wordsMatch(eventWords: string[], scrapedText: string): boolean {
  return eventWords.some((w: string) => w.length > 2 && scrapedText.includes(w));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all scraped links
    const { data: scrapedLinks, error: scrapedError } = await supabase
      .from("live_scraped_links")
      .select("*");

    if (scrapedError) throw scrapedError;
    if (!scrapedLinks || scrapedLinks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No scraped links available", assigned: 0, created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get ALL active events
    const { data: allEvents } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true);

    const events = allEvents || [];
    let assigned = 0;
    let created = 0;

    // Track which scraped links were matched to existing events
    const matchedScrapedIds = new Set<string>();

    // 1. Update existing events with scraped links
    for (const event of events) {
      const homeWords = normalize(event.team_home || "").split(/\s+/);
      const awayWords = normalize(event.team_away || "").split(/\s+/);

      if (homeWords[0] === "" || awayWords[0] === "") continue;

      const match = scrapedLinks.find((s: any) => {
        const allText = `${normalize(s.match_title || "")} ${normalize(s.team_home || "")} ${normalize(s.team_away || "")}`;
        return wordsMatch(homeWords, allText) && wordsMatch(awayWords, allText);
      });

      if (match) {
        matchedScrapedIds.add(match.id);
        const links = getLinks(match);

        if (links.length > 0) {
          const { error: updateError } = await supabase
            .from("events")
            .update({
              stream_url: links[0] || null,
              stream_url_2: links[1] || null,
              stream_url_3: links[2] || null,
            })
            .eq("id", event.id);

          if (!updateError) {
            assigned++;
          }
        }
      }
    }

    // 2. Create events for scraped links that have sources but no matching event
    for (const scraped of scrapedLinks) {
      if (matchedScrapedIds.has(scraped.id)) continue;

      const links = getLinks(scraped);
      // Only create if there's at least one link
      if (links.length === 0) continue;

      // Check if event already exists by match_title similarity
      const scrapedNorm = normalize(scraped.match_title || "");
      const alreadyExists = events.some((e: any) => {
        const eventNorm = normalize(e.name || "");
        // Check word overlap
        const scrapedWords = scrapedNorm.split(/\s+/).filter((w: string) => w.length > 2);
        const matchCount = scrapedWords.filter((w: string) => eventNorm.includes(w)).length;
        return matchCount >= 2;
      });

      if (alreadyExists) continue;

      const { error: insertError } = await supabase
        .from("events")
        .insert({
          name: scraped.match_title,
          event_date: scraped.scanned_at || new Date().toISOString(),
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
        checked: events.length,
        scraped: scrapedLinks.length,
        message: `Updated ${assigned} events, created ${created} new events`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-assign error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
