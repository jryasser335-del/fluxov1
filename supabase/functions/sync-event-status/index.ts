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
}

async function getEspnStatus(espnId: string): Promise<{ completed: boolean } | null> {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const state = data?.header?.competitions?.[0]?.status?.type?.state;
    const completed = state === "post"; // STATUS_FINAL or STATUS_POSTPONED
    return { completed };
  } catch {
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

    const { data: events, error: fetchError } = await supabase
      .from("events")
      .select("id, espn_id, event_date, is_live, is_active")
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    const updates: { id: string; is_live: boolean }[] = [];
    const deactivations: string[] = [];
    const linkCleanups: string[] = [];

    for (const event of events as Event[]) {
      const eventDate = new Date(event.event_date);
      const timeDiff = now.getTime() - eventDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Check ESPN API for real-time status if espn_id exists
      if (event.espn_id) {
        const espnStatus = await getEspnStatus(event.espn_id);
        if (espnStatus?.completed) {
          // Partido terminado → limpiar links y desactivar
          linkCleanups.push(event.id);
          deactivations.push(event.id);
          continue;
        }
      }

      const shouldBeLive = timeDiff >= 0 && hoursDiff <= 3;
      const shouldDeactivate = hoursDiff > 4;

      if (shouldDeactivate) {
        deactivations.push(event.id);
        linkCleanups.push(event.id); // También limpiar links por fallback
      } else if (shouldBeLive !== event.is_live) {
        updates.push({ id: event.id, is_live: shouldBeLive });
      }
    }

    // Update is_live status
    for (const update of updates) {
      await supabase.from("events").update({ is_live: update.is_live }).eq("id", update.id);
    }

    // Clean links from finished events
    if (linkCleanups.length > 0) {
      await supabase
        .from("events")
        .update({
          stream_url: null,
          stream_url_2: null,
          stream_url_3: null,
          is_live: false,
        })
        .in("id", linkCleanups);
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
        linksCleared: linkCleanups.length,
        message: `Updated ${updates.length}, deactivated ${deactivations.length}, cleared links from ${linkCleanups.length} events`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
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
