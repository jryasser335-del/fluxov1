import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_BASE = "https://embedsports.top/embed";

function buildLink(source: string, id: string): string {
  return `${EMBED_BASE}/${source}/${id}/1?autoplay=1`;
}

// Map API source names to our internal source names and embed path
const SOURCE_MAP: Record<string, { field: string; embedName: string }> = {
  vola: { field: "source_admin", embedName: "admin" },
  main: { field: "source_admin", embedName: "admin" },
  admin: { field: "source_admin", embedName: "admin" },
  delta: { field: "source_delta", embedName: "delta" },
  echo: { field: "source_echo", embedName: "echo" },
  mv: { field: "source_golf", embedName: "golf" },
  golf: { field: "source_golf", embedName: "golf" },
};

interface MatchSource {
  source: string;
  id: string;
}

interface MatchData {
  id: string;
  title: string;
  category: string;
  teams?: {
    home?: { name: string };
    away?: { name: string };
  };
  sources: MatchSource[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roleData } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Try schedule endpoints in order
    let matches: MatchData[] = [];
    const urls = [
      "https://sportsbite.top/api/matches/all",
      "https://app.moviebite.cc/api/schedule",
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (response.ok) {
          matches = await response.json();
          console.log(`Fetched ${matches.length} matches from ${url}`);
          break;
        }
      } catch (e) {
        console.error(`Failed to fetch from ${url}:`, e.message);
      }
    }

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not fetch schedule from any endpoint" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process matches with source mapping
    const records = matches.map((match) => {
      const record: Record<string, string | null> = {
        match_id: match.id,
        match_title: match.title,
        category: match.category || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: null,
        source_delta: null,
        source_echo: null,
        source_golf: null,
        scanned_at: new Date().toISOString(),
      };

      for (const src of match.sources) {
        const mapping = SOURCE_MAP[src.source];
        if (mapping) {
          record[mapping.field] = buildLink(mapping.embedName, src.id);
        }
      }

      return record;
    });

    // Use service role to upsert
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Clear all old records and insert fresh schedule
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (records.length > 0) {
      const { error: insertError } = await adminClient
        .from("live_scraped_links")
        .upsert(records, { onConflict: "match_id" });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(insertError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: records.length,
        matches: records,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
