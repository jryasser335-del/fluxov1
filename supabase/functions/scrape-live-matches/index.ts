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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("=== Iniciando Scraper MovieBite v2 (Forzado de Admin) ===");

    const response = await fetch("https://sportsbite.top/api/matches/all", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`Error API: ${response.status}`);

    const data = await response.json();
    // La API puede devolver el array directo o dentro de .events o .data
    const allMatches = Array.isArray(data) ? data : data.events || data.data || [];

    const records = allMatches.map((match: any) => {
      let adminId = null;
      let deltaId = null;
      let echoId = null;
      let golfId = null;

      // 1. Intentar sacar de la propiedad directa (si existe match.admin, match.vola, etc)
      adminId = match.admin || match.vola || match.main;
      deltaId = match.delta;
      echoId = match.echo;
      golfId = match.golf || match.mv;

      // 2. Si no, buscar dentro del array de sources con mapeo de nombres
      if (match.sources && Array.isArray(match.sources)) {
        match.sources.forEach((s: any) => {
          const name = String(s.name || s.source || "").toLowerCase();
          const id = s.id || s.value;

          if (["vola", "admin", "main", "stream1"].includes(name)) adminId = id;
          if (["delta", "stream2"].includes(name)) deltaId = id;
          if (["echo", "stream3"].includes(name)) echoId = id;
          if (["mv", "golf", "stream4"].includes(name)) golfId = id;
        });
      }

      return {
        match_id: String(match.id || match._id),
        match_title: match.title || match.name || "Partido",
        category: match.category || match.sport || "other",
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        // CONSTRUCCIÓN FORZADA: Usamos el ID encontrado pero siempre con el nombre que tu panel espera
        source_admin: adminId ? buildLink("admin", adminId) : null,
        source_delta: deltaId ? buildLink("delta", deltaId) : null,
        source_echo: echoId ? buildLink("echo", echoId) : null,
        source_golf: golfId ? buildLink("golf", golfId) : null,
        scanned_at: new Date().toISOString(),
      };
    });

    // Solo subimos los que tengan al menos UN link activo
    const validRecords = records.filter((r) => r.source_admin || r.source_delta || r.source_echo || r.source_golf);

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Limpieza total antes de insertar
    await adminClient.from("live_scraped_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (validRecords.length > 0) {
      const { error } = await adminClient.from("live_scraped_links").upsert(validRecords);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: validRecords.length,
        admin_found: validRecords.filter((r) => r.source_admin).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Scraper Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
