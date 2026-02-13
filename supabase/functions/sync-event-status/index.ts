import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // ── 1. PURGE past events (before today) ──
    const { data: pastEvents } = await supabase
      .from("events")
      .select("id")
      .lt("event_date", todayStart.toISOString());

    let deletedPast = 0;
    if (pastEvents && pastEvents.length > 0) {
      const ids = pastEvents.map((e: any) => e.id);
      await supabase.from("events").delete().in("id", ids);
      deletedPast = ids.length;
    }

    // ── 2. PURGE incomplete events (no team info) ──
    const { data: allEvents } = await supabase.from("events").select("id, team_home, team_away");
    let deletedIncomplete = 0;
    if (allEvents) {
      const badIds = allEvents
        .filter((e: any) => !e.team_home?.trim() || !e.team_away?.trim())
        .map((e: any) => e.id);
      if (badIds.length > 0) {
        await supabase.from("events").delete().in("id", badIds);
        deletedIncomplete = badIds.length;
      }
    }

    // ── 3. Update is_live status & delete finished events ──
    const { data: activeEvents, error: fetchError } = await supabase
      .from("events")
      .select("id, espn_id, event_date, is_live, is_active")
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    const updates: { id: string; is_live: boolean }[] = [];
    const deletions: string[] = [];

    for (const event of activeEvents || []) {
      const eventDate = new Date(event.event_date);
      const timeDiff = now.getTime() - eventDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      const shouldBeLive = timeDiff >= 0 && hoursDiff <= 3;
      const shouldDelete = hoursDiff > 4;

      if (shouldDelete) {
        deletions.push(event.id);
      } else if (shouldBeLive !== event.is_live) {
        updates.push({ id: event.id, is_live: shouldBeLive });
      }
    }

    for (const update of updates) {
      await supabase.from("events").update({ is_live: update.is_live }).eq("id", update.id);
    }

    if (deletions.length > 0) {
      await supabase.from("events").delete().in("id", deletions);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        deleted: deletions.length,
        deletedPast,
        deletedIncomplete,
        message: `Updated ${updates.length}, deleted ${deletions.length} finished, ${deletedPast} past, ${deletedIncomplete} incomplete`,
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
