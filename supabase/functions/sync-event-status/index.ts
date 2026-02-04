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
      .select("id, espn_id, event_date, is_live, is_active")
      .eq("is_active", true);

    if (fetchError) {
      throw fetchError;
    }

    const updates: { id: string; is_live: boolean }[] = [];
    const deactivations: string[] = [];

    for (const event of events as Event[]) {
      const eventDate = new Date(event.event_date);
      const timeDiff = now.getTime() - eventDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Event should be "en vivo" if:
      // - Started within the last 3 hours (typical game duration)
      // - And the event has started (timeDiff > 0)
      const shouldBeLive = timeDiff >= 0 && hoursDiff <= 3;

      // Event should be deactivated if:
      // - It ended more than 4 hours ago
      const shouldDeactivate = hoursDiff > 4;

      if (shouldDeactivate) {
        deactivations.push(event.id);
      } else if (shouldBeLive !== event.is_live) {
        updates.push({ id: event.id, is_live: shouldBeLive });
      }
    }

    // Batch update is_live status
    for (const update of updates) {
      await supabase
        .from("events")
        .update({ is_live: update.is_live })
        .eq("id", update.id);
    }

    // Deactivate finished events
    if (deactivations.length > 0) {
      await supabase
        .from("events")
        .update({ is_active: false })
        .in("id", deactivations);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        deactivated: deactivations.length,
        message: `Updated ${updates.length} events, deactivated ${deactivations.length} events`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error syncing event status:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
