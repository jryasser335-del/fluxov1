import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: events, error } = await supabase.from("events").select("*").eq("is_active", true);

    if (error) throw error;

    const now = new Date();
    const deletions: string[] = [];
    const deactivations: string[] = [];

    for (const event of events || []) {
      const start = new Date(event.event_date);
      const hoursDiff = (now.getTime() - start.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 4) {
        deletions.push(event.id);
      } else if (hoursDiff > 3) {
        deactivations.push(event.id);
      }
    }

    if (deletions.length > 0) {
      const { error: delError } = await supabase.from("events").delete().in("id", deletions);
      if (delError) console.error("Error eliminando eventos:", delError);
    }

    if (deactivations.length > 0) {
      const { error: deacError } = await supabase.from("events").update({ is_active: false }).in("id", deactivations);
      if (deacError) console.error("Error desactivando eventos:", deacError);
    }

    // También eliminar eventos inactivos sin stream_url (limpieza)
    const { error: cleanError } = await supabase.from("events").delete().eq("is_active", false).is("stream_url", null);

    if (cleanError) console.error("Error limpiando inactivos:", cleanError);

    return new Response(
      JSON.stringify({
        deleted: deletions.length,
        deactivated: deactivations.length,
        message: "Sincronización completada",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
