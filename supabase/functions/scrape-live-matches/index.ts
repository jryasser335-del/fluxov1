import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_BASE = "https://embedsports.top/embed";

function buildLink(server: string, id: string): string {
  return `${EMBED_BASE}/${server}/${id}/1?autoplay=1`;
}

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
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
    }

    console.log("=== Iniciando Scraper MovieBite ===");

    // Intentamos obtener la cartelera completa de la API de MovieBite
    const response = await fetch("https://sportsbite.top/api/matches/all", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`MovieBite API error: ${response.status}`);

    const data = await response.json();
    const allMatches: MatchData[] = Array.isArray(data) ? data : data.events || [];

    // PROCESAMIENTO CON MAPEO INTELIGENTE
    const records = allMatches.map((match: any) => {
      const sources = match.sources || [];

      // Buscamos los IDs basándonos en los nombres reales que usa MovieBite
      // MovieBite usa 'vola' para Admin y 'mv' para Golf
      const volaSrc = sources.find((s: any) => ["vola", "admin", "main"].includes(s.source?.toLowerCase()));
      const deltaSrc = sources.find((s: any) => s.source?.toLowerCase() === "delta");
      const echoSrc = sources.find((s: any) => s.source?.toLowerCase() === "echo");
      const mvSrc = sources.find((s: any) => ["mv", "golf"].includes(s.source?.toLowerCase()));

      return {
        match_id: String(match.id || match._id),
        match_title: match.title || match.name || "Sin título",
        category: match.category || match.sport || "otros",
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        // Aquí forzamos el nombre del servidor para que el link funcione en tu embed
        source_admin: volaSrc ? buildLink("admin", volaSrc.id) : null,
        source_delta: deltaSrc ? buildLink("delta", deltaSrc.id) : null,
        source_echo: echoSrc ? buildLink("echo", echoSrc.id) : null,
        source_golf: mvSrc ? buildLink("golf", mvSrc.id) : null,
        scanned_at: new Date().toISOString(),
      };
    });

    // Filtramos para no subir basura (solo partidos que tengan al menos un link)
    const validRecords = records.filter((r) => r.source_admin || r.source_delta || r.source_echo || r.source_golf);

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Limpiamos y subimos
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (validRecords.length > 0) {
      const { error: insertError } = await adminClient
        .from("live_scraped_links")
        .upsert(validRecords, { onConflict: "match_id" });

      if (insertError) throw insertError;
    }

    console.log(`✓ Scaneo finalizado. Partidos con links: ${validRecords.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        count: validRecords.length,
        admin_count: validRecords.filter((r) => r.source_admin).length,
        matches: validRecords,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
