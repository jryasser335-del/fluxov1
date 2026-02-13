import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function testLink(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
        Referer: "https://embedsports.top/",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    // If we get a valid response (2xx or 3xx), the link works
    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return true;
    }

    // 403/404/500+ means broken
    return false;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get all active events with links
    const { data: events, error } = await supabase
      .from("events")
      .select("id, name, stream_url, stream_url_2, stream_url_3")
      .eq("is_active", true)
      .not("stream_url", "is", null);

    // Limit to 50 events per run to avoid timeout
    const eventsToCheck = events.slice(0, 50);
    if (!eventsToCheck || eventsToCheck.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tested: 0, removed: 0, message: "No events with links to test" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let tested = 0;
    let removed = 0;
    let cleaned = 0;
    const results: { name: string; status: string }[] = [];

    // Test in batches of 5 to avoid overwhelming
    const batchSize = 5;
    for (let i = 0; i < eventsToCheck.length; i += batchSize) {
      const batch = eventsToCheck.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (event: any) => {
          tested++;
          const url1Works = event.stream_url ? await testLink(event.stream_url) : false;

          if (!url1Works) {
            // Primary link broken - check if url2 or url3 work as fallback
            const url2Works = event.stream_url_2 ? await testLink(event.stream_url_2) : false;
            const url3Works = event.stream_url_3 ? await testLink(event.stream_url_3) : false;

            if (url2Works) {
              // Promote url2 to primary
              await supabase
                .from("events")
                .update({
                  stream_url: event.stream_url_2,
                  stream_url_2: url3Works ? event.stream_url_3 : null,
                  stream_url_3: null,
                })
                .eq("id", event.id);
              cleaned++;
              results.push({ name: event.name, status: "promoted_url2" });
            } else if (url3Works) {
              // Promote url3 to primary
              await supabase
                .from("events")
                .update({
                  stream_url: event.stream_url_3,
                  stream_url_2: null,
                  stream_url_3: null,
                })
                .eq("id", event.id);
              cleaned++;
              results.push({ name: event.name, status: "promoted_url3" });
            } else {
              // All links broken - delete event
              await supabase.from("events").delete().eq("id", event.id);
              removed++;
              results.push({ name: event.name, status: "deleted" });
            }
          } else {
            // Primary works, check secondary links
            const updates: Record<string, string | null> = {};
            let needsUpdate = false;

            if (event.stream_url_2) {
              const url2Works = await testLink(event.stream_url_2);
              if (!url2Works) {
                updates.stream_url_2 = null;
                needsUpdate = true;
              }
            }
            if (event.stream_url_3) {
              const url3Works = await testLink(event.stream_url_3);
              if (!url3Works) {
                updates.stream_url_3 = null;
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              await supabase.from("events").update(updates).eq("id", event.id);
              cleaned++;
              results.push({ name: event.name, status: "cleaned_bad_secondary" });
            } else {
              results.push({ name: event.name, status: "ok" });
            }
          }
        }),
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tested,
        removed,
        cleaned,
        working: tested - removed - cleaned,
        message: `Tested ${tested} events: ${removed} deleted (broken), ${cleaned} cleaned, ${tested - removed - cleaned} working`,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Link check error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
