import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function testLink(url: string): Promise<{ ok: boolean; expired: boolean }> {
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

    if (!response.ok && response.status >= 400) {
      return { ok: false, expired: false };
    }

    // Check if m3u8 content contains 'expired'
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("mpegurl") || contentType.includes("m3u8") || url.includes(".m3u8")) {
      try {
        const body = await response.text();
        if (body.toLowerCase().includes("expired")) {
          return { ok: false, expired: true };
        }
      } catch {
        // Can't read body, assume ok if status was good
      }
    }

    return { ok: true, expired: false };
  } catch {
    return { ok: false, expired: false };
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

    // Get events with active or pending links
    const { data: events, error } = await supabase
      .from("events")
      .select("id, name, stream_url, stream_url_2, stream_url_3, pending_url, pending_url_2, pending_url_3")
      .eq("is_active", true);

    if (error) throw error;

    // Filter to events that have any link
    const eventsWithLinks = (events || []).filter((e: any) =>
      e.stream_url || e.pending_url
    ).slice(0, 50);

    if (eventsWithLinks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tested: 0, removed: 0, message: "No events with links to test" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let tested = 0;
    let removed = 0;
    let cleaned = 0;
    let expiredRemoved = 0;

    const batchSize = 5;
    for (let i = 0; i < eventsWithLinks.length; i += batchSize) {
      const batch = eventsWithLinks.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (event: any) => {
          tested++;

          // Test pending links first
          const pendingUrl = event.pending_url || event.stream_url;
          if (!pendingUrl) return;

          const result = await testLink(pendingUrl);

          if (result.expired) {
            // Expired m3u8 → remove entirely
            await supabase.from("events").delete().eq("id", event.id);
            removed++;
            expiredRemoved++;
            return;
          }

          if (!result.ok) {
            // Try fallbacks
            const url2 = event.pending_url_2 || event.stream_url_2;
            const url3 = event.pending_url_3 || event.stream_url_3;

            const r2 = url2 ? await testLink(url2) : { ok: false, expired: false };
            const r3 = url3 ? await testLink(url3) : { ok: false, expired: false };

            if (r2.expired && r3.expired) {
              await supabase.from("events").delete().eq("id", event.id);
              removed++;
              expiredRemoved++;
              return;
            }

            if (r2.ok && !r2.expired) {
              await supabase.from("events").update({
                pending_url: url2,
                pending_url_2: (r3.ok && !r3.expired) ? url3 : null,
                pending_url_3: null,
                stream_url: event.stream_url ? url2 : null,
                stream_url_2: (event.stream_url && r3.ok && !r3.expired) ? url3 : null,
                stream_url_3: null,
              }).eq("id", event.id);
              cleaned++;
            } else if (r3.ok && !r3.expired) {
              await supabase.from("events").update({
                pending_url: url3,
                pending_url_2: null,
                pending_url_3: null,
                stream_url: event.stream_url ? url3 : null,
                stream_url_2: null,
                stream_url_3: null,
              }).eq("id", event.id);
              cleaned++;
            } else {
              // All broken → delete event
              await supabase.from("events").delete().eq("id", event.id);
              removed++;
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
        expiredRemoved,
        working: tested - removed - cleaned,
        message: `Tested ${tested}: ${removed} deleted (${expiredRemoved} expired), ${cleaned} cleaned`,
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
