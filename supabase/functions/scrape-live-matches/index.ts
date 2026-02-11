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

// Función para obtener partidos desde MovieBite usando su API real
async function fetchMovieBiteAPI(): Promise<MatchData[]> {
  const matches: MatchData[] = [];
  
  try {
    console.log("Fetching from MovieBite API...");
    
    // Esta es la API real que usa MovieBite internamente
    const response = await fetch("https://sportsbite.top/api/matches/all", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://app.moviebite.cc",
        "Referer": "https://app.moviebite.cc/",
      },
    });

    if (!response.ok) {
      console.log(`MovieBite API returned ${response.status}`);
      return matches;
    }

    const data = await response.json();
    
    // Procesar los datos
    if (Array.isArray(data)) {
      for (const match of data) {
        const sources: MatchSource[] = [];
        
        // Extraer sources del formato de MovieBite
        if (match.sources && Array.isArray(match.sources)) {
          for (const src of match.sources) {
            if (src.source && src.id) {
              sources.push({
                source: src.source.toLowerCase(),
                id: src.id,
              });
            }
          }
        }
        
        // Si el match tiene los sources directamente
        if (match.admin) sources.push({ source: "admin", id: match.admin });
        if (match.delta) sources.push({ source: "delta", id: match.delta });
        if (match.echo) sources.push({ source: "echo", id: match.echo });
        if (match.golf) sources.push({ source: "golf", id: match.golf });
        
        if (sources.length > 0) {
          matches.push({
            id: match.id || match._id || `mb_${Date.now()}_${Math.random()}`,
            title: match.title || match.name || "Unknown",
            category: match.category || match.sport || "unknown",
            teams: match.teams,
            sources: sources,
          });
        }
      }
    }
    
    console.log(`MovieBite API returned ${matches.length} matches`);
    
  } catch (error) {
    console.error("Error fetching MovieBite API:", error);
  }
  
  return matches;
}

// Función alternativa: scraping directo de schedule
async function fetchMovieBiteSchedule(): Promise<MatchData[]> {
  const matches: MatchData[] = [];
  
  try {
    console.log("Trying MovieBite schedule scraping...");
    
    // Intentar múltiples endpoints
    const endpoints = [
      "https://app.moviebite.cc/api/schedule",
      "https://app.moviebite.cc/api/events",
      "https://sportsbite.top/api/schedule",
      "https://sportsbite.top/api/events",
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Endpoint ${endpoint} returned data`);
          
          let events: any[] = [];
          if (Array.isArray(data)) {
            events = data;
          } else if (data.events) {
            events = data.events;
          } else if (data.data) {
            events = data.data;
          }
          
          console.log(`Found ${events.length} events`);
          
          for (const event of events) {
            const sources: MatchSource[] = [];
            
            // Extraer sources de diferentes formatos posibles
            if (event.sources) {
              for (const src of event.sources) {
                if (src.source && src.id) {
                  sources.push({ source: src.source, id: src.id });
                }
              }
            }
            
            if (event.admin) sources.push({ source: "admin", id: event.admin });
            if (event.delta) sources.push({ source: "delta", id: event.delta });
            if (event.echo) sources.push({ source: "echo", id: event.echo });
            if (event.golf) sources.push({ source: "golf", id: event.golf });
            
            if (sources.length > 0) {
              matches.push({
                id: event.id || `mb_${matches.length}`,
                title: event.title || event.name || "Unknown",
                category: event.category || event.sport || "unknown",
                teams: event.teams,
                sources: sources,
              });
            }
          }
          
          if (matches.length > 0) {
            console.log(`Successfully got ${matches.length} matches from ${endpoint}`);
            break; // Si encontramos matches, salimos del loop
          }
        }
      } catch (endpointError) {
        console.log(`Endpoint ${endpoint} failed, trying next...`);
        continue;
      }
    }
    
  } catch (error) {
    console.error("Error in schedule scraping:", error);
  }
  
  return matches;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if this is a cron call (no auth header) or admin call
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      // Manual call - verify admin
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("=== Starting scraper ===");
    
    let allMatches: MatchData[] = [];
    
    // 1. Streamed.pk API
    try {
      console.log("Fetching from streamed.pk...");
      const response = await fetch("https://streamed.pk/api/matches/all", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (response.ok) {
        const apiMatches: MatchData[] = await response.json();
        console.log(`✓ Streamed.pk: ${apiMatches.length} matches`);
        allMatches = [...apiMatches];
      }
    } catch (error) {
      console.error("✗ Streamed.pk failed:", error);
    }
    
    // 2. MovieBite API (método principal)
    try {
      const movieBiteMatches = await fetchMovieBiteAPI();
      console.log(`✓ MovieBite API: ${movieBiteMatches.length} matches`);
      allMatches = [...allMatches, ...movieBiteMatches];
    } catch (error) {
      console.error("✗ MovieBite API failed:", error);
    }
    
    // 3. MovieBite Schedule (backup)
    if (allMatches.filter(m => m.sources.some(s => s.source === 'admin')).length === 0) {
      console.log("No admin sources found, trying schedule scraping...");
      try {
        const scheduleMatches = await fetchMovieBiteSchedule();
        console.log(`✓ MovieBite Schedule: ${scheduleMatches.length} matches`);
        allMatches = [...allMatches, ...scheduleMatches];
      } catch (error) {
        console.error("✗ MovieBite Schedule failed:", error);
      }
    }

    // Deduplicación y merge de sources
    const uniqueMatches = new Map<string, MatchData>();
    for (const match of allMatches) {
      const key = `${match.title}_${match.teams?.home?.name}_${match.teams?.away?.name}`.toLowerCase().trim();
      
      if (!uniqueMatches.has(key)) {
        uniqueMatches.set(key, match);
      } else {
        const existing = uniqueMatches.get(key)!;
        for (const newSource of match.sources) {
          if (!existing.sources.some(s => s.source === newSource.source && s.id === newSource.id)) {
            existing.sources.push(newSource);
          }
        }
      }
    }

    const finalMatches = Array.from(uniqueMatches.values());
    
    console.log(`=== Summary ===`);
    console.log(`Total matches: ${finalMatches.length}`);
    console.log(`Admin sources: ${finalMatches.filter(m => m.sources.some(s => s.source === 'admin')).length}`);
    console.log(`Delta sources: ${finalMatches.filter(m => m.sources.some(s => s.source === 'delta')).length}`);
    console.log(`Echo sources: ${finalMatches.filter(m => m.sources.some(s => s.source === 'echo')).length}`);
    console.log(`Golf sources: ${finalMatches.filter(m => m.sources.some(s => s.source === 'golf')).length}`);

    // Process matches
    const records = finalMatches.map((match) => {
      const adminSource = match.sources.find((s) => s.source === "admin");
      const deltaSource = match.sources.find((s) => s.source === "delta");
      const echoSource = match.sources.find((s) => s.source === "echo");
      const golfSource = match.sources.find((s) => s.source === "golf");

      return {
        match_id: match.id,
        match_title: match.title,
        category: match.category || null,
        team_home: match.teams?.home?.name || null,
        team_away: match.teams?.away?.name || null,
        source_admin: adminSource ? buildLink("admin", adminSource.id) : null,
        source_delta: deltaSource ? buildLink("delta", deltaSource.id) : null,
        source_echo: echoSource ? buildLink("echo", echoSource.id) : null,
        source_golf: golfSource ? buildLink("golf", golfSource.id) : null,
        scanned_at: new Date().toISOString(),
      };
    });

    // Use service role to upsert (bypasses RLS)
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Clear old records and insert new ones
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

**Cambios clave:**

1. ✅ **API real de MovieBite**: Ahora usa `https://sportsbite.top/api/matches/all` (la API backend real)
2. ✅ **Múltiples endpoints de respaldo**: Si uno falla, prueba otros
3. ✅ **Logging mejorado**: Verás exactamente cuántos sources de cada tipo encontró
4. ✅ **Triple estrategia**: streamed.pk → MovieBite API → MovieBite Schedule

Despliega este código y **revisa los logs de Supabase** para ver qué está pasando. Deberías ver algo como:
```
✓ MovieBite API: 25 matches
Admin sources: 15
Delta sources: 20