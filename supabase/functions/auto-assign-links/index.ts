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

function teamMatch(teamName: string, scrapedText: string): boolean {
  const words = normalize(teamName).split(/\s+/).filter((w: string) => w.length > 3);
  if (words.length === 0) return false;
  const matched = words.filter((w: string) => scrapedText.includes(w)).length;
  return matched >= 1 && matched >= Math.ceil(words.length * 0.5);
}

function isMatchEnded(eventDate: string): boolean {
  const start = new Date(eventDate).getTime();
  const now = Date.now();
  const hoursElapsed = (now - start) / (1000 * 60 * 60);
  return hoursElapsed > 3;
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
    let cleaned = 0;

    // Track which scraped links were matched to existing events
    const matchedScrapedIds = new Set<string>();
    // Track which events got matched to a scraped link
    const matchedEventIds = new Set<string>();

    // 1. Update existing events with scraped links
    for (const event of events) {
      const homeWords = normalize(event.team_home || "").split(/\s+/);
      const awayWords = normalize(event.team_away || "").split(/\s+/);
      const nameWords = normalize(event.name || "").split(/\s+/).filter((w: string) => w.length > 2);

      if (homeWords[0] === "" && nameWords.length === 0) continue;

      const match = scrapedLinks.find((s: any) => {
        const allText = `${normalize(s.match_title || "")} ${normalize(s.team_home || "")} ${normalize(s.team_away || "")}`;
        if (homeWords[0] !== "" && awayWords[0] !== "") {
          return wordsMatch(homeWords, allText) && wordsMatch(awayWords, allText);
        }
        // Fallback: match by name words
        const matched = nameWords.filter((w: string) => allText.includes(w)).length;
        return matched >= 2;
      });

      if (match) {
        matchedScrapedIds.add(match.id);
        matchedEventIds.add(event.id);
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

    // 2. Clean links from events that ended (3+ hours since start) OR no longer in scraper
    for (const event of events) {
      // Skip if still matched to a live scrape
      if (matchedEventIds.has(event.id)) {
        // Even if matched, check if ended by time
        if (event.event_date && isMatchEnded(event.event_date)) {
          const { error: cleanError } = await supabase
            .from("events")
            .update({
              stream_url: null,
              stream_url_2: null,
              stream_url_3: null,
              is_live: false,
            })
            .eq("id", event.id);
          if (!cleanError) cleaned++;
          continue;
        }
        continue;
      }
      // Not in scraper anymore - clean if auto-assigned
      if (!event.stream_url || !event.stream_url.includes("embedsports")) continue;

      const { error: cleanError } = await supabase
        .from("events")
        .update({
          stream_url: null,
          stream_url_2: null,
          stream_url_3: null,
          is_live: false,
        })
        .eq("id", event.id);

      if (!cleanError) {
        cleaned++;
      }
    }

    // 3. Create events for scraped links that have sources but no matching event
    for (const scraped of scrapedLinks) {
      if (matchedScrapedIds.has(scraped.id)) continue;

      const links = getLinks(scraped);
      if (links.length === 0) continue;

      const scrapedText = normalize(scraped.match_title || "");
      const scrapedHome = normalize(scraped.team_home || "");
      const scrapedAway = normalize(scraped.team_away || "");
      
      const alreadyExists = events.some((e: any) => {
        // Use team-based matching (stricter, avoids false positives with short words)
        if (e.team_home && e.team_away && scrapedHome && scrapedAway) {
          const eHome = normalize(e.team_home);
          const eAway = normalize(e.team_away);
          return teamMatch(e.team_home, `${scrapedHome} ${scrapedAway} ${scrapedText}`) 
              && teamMatch(e.team_away, `${scrapedHome} ${scrapedAway} ${scrapedText}`);
        }
        // Fallback: require 3+ word overlap with words > 3 chars
        const eventNorm = normalize(e.name || "");
        const scrapedWords = scrapedText.split(/\s+/).filter((w: string) => w.length > 3);
        const matchCount = scrapedWords.filter((w: string) => eventNorm.includes(w)).length;
        return matchCount >= 3;
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
        cleaned,
        checked: events.length,
        scraped: scrapedLinks.length,
        message: `Updated ${assigned} events, created ${created} new, cleaned ${cleaned} finished`,
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
