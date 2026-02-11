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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get ALL active events: upcoming (within 30 min) OR already started/live
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);

    // Events starting within 30 min
    const { data: upcoming } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .gte("event_date", now.toISOString())
      .lte("event_date", in30min.toISOString());

    // Events already started (event_date in the past) that are still active
    const { data: started } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .lte("event_date", now.toISOString());

    // Deduplicate by id
    const seen = new Set<string>();
    const allEvents = [...(upcoming || []), ...(started || [])].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    if (allEvents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No events need links", assigned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all scraped links
    const { data: scrapedLinks, error: scrapedError } = await supabase
      .from("live_scraped_links")
      .select("*");

    if (scrapedError) throw scrapedError;
    if (!scrapedLinks || scrapedLinks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No scraped links available", assigned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let assigned = 0;

    for (const event of allEvents) {
      const homeWords = normalize(event.team_home || "").split(/\s+/);
      const awayWords = normalize(event.team_away || "").split(/\s+/);

      if (homeWords.length === 0 || awayWords.length === 0) continue;

      // Find matching scraped link
      const match = scrapedLinks.find((s: any) => {
        const title = normalize(s.match_title || "");
        const sHome = normalize(s.team_home || "");
        const sAway = normalize(s.team_away || "");
        const allText = `${title} ${sHome} ${sAway}`;

        const homeMatch = homeWords.some((w: string) => w.length > 2 && allText.includes(w));
        const awayMatch = awayWords.some((w: string) => w.length > 2 && allText.includes(w));
        return homeMatch && awayMatch;
      });

      if (match) {
        // Prioritize: admin > delta > echo > golf
        const availableLinks = [
          match.source_admin,
          match.source_delta,
          match.source_echo,
          match.source_golf,
        ].filter(Boolean);

        if (availableLinks.length > 0) {
          const updateData: Record<string, string | null> = {
            stream_url: availableLinks[0] || null,
            stream_url_2: availableLinks[1] || null,
            stream_url_3: availableLinks[2] || null,
          };

          const { error: updateError } = await supabase
            .from("events")
            .update(updateData)
            .eq("id", event.id);

          if (!updateError) {
            assigned++;
            console.log(`Assigned ${availableLinks.length} link(s) to: ${event.name}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        assigned,
        checked: allEvents.length,
        message: `Auto-assigned links to ${assigned} events`,
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
