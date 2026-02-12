// supabase/functions/sync-event-status/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Event {
  id: string;
  espn_id: string | null;
  event_date: string;
  is_live: boolean;
  is_active: boolean;
  stream_url: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
}

// Check ESPN API for game status
async function getEspnStatus(espnId: string): Promise<{ completed: boolean; status: string } | null> {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const status = data?.header?.competitions?.[0]?.status?.type?.name || "";
    const completed = status === "STATUS_FINAL" || status === "STATUS_POSTPONED";

    return { completed, status };
  } catch (e) {
    console.error(`ESPN fetch failed for ${espnId}:`, e.message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Get all active events
    const { data: events, error: fetchError } = await supabase
      .from("events")
      .select("id, espn_id, event_date, is_live, is_active, stream_url, stream_url_2, stream_url_3")
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    const updates: { id: string; is_live: boolean }[] = [];
    const deactivations: string[] = [];
    let linksCleaned = 0;

    for (const event of events as Event[]) {
      const eventDate = new Date(event.event_date);
      const timeDiff = now.getTime() - eventDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // 🔴 NEW: Check ESPN for FINAL status and remove links immediately
      if (event.espn_id && event.stream_url && timeDiff > 0) {
        const espnStatus = await getEspnStatus(event.espn_id);

        if (espnStatus?.completed) {
          console.log(`Game ${event.espn_id} is ${espnStatus.status} — removing links`);

          await supabase
            .from("events")
            .update({
              stream_url: null,
              stream_url_2: null,
              stream_url_3: null,
              is_live: false,
            })
            .eq("id", event.id);

          linksCleaned++;
          continue; // Skip further processing for this event
        }
      }

      const shouldBeLive = timeDiff >= 0 && hoursDiff <= 3;
      const shouldDeactivate = hoursDiff > 4;

      if (shouldDeactivate) {
        deactivations.push(event.id);
      } else if (shouldBeLive !== event.is_live) {
        updates.push({ id: event.id, is_live: shouldBeLive });
      }
    }

    // Batch update is_live status
    for (const update of updates) {
      await supabase.from("events").update({ is_live: update.is_live }).eq("id", update.id);
    }

    // Deactivate finished events
    if (deactivations.length > 0) {
      await supabase.from("events").update({ is_active: false }).in("id", deactivations);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        deactivated: deactivations.length,
        linksCleaned,
        message: `Updated ${updates.length}, deactivated ${deactivations.length}, cleaned links from ${linksCleaned} finished games`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error syncing event status:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
