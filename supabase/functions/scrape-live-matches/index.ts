import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MOVIEBITE_BASE = "https://app.moviebite.cc";
const EMBED_BASE = "https://embedsports.top/embed";

// Mapeo de nombres de servidor de MovieBite a nuestras columnas
const SERVER_MAPPING: Record<string, string> = {
  'vola': 'admin',
  'main': 'admin',
  'admin': 'admin',
  'delta': 'delta',
  'echo': 'echo',
  'mv': 'golf',
  'golf': 'golf',
};

function buildLink(serverName: string, sourceId: string): string {
  return `${EMBED_BASE}/${serverName}/${sourceId}/1?autoplay=1`;
}

interface MovieBiteSource {
  name: string;
  embed?: string;
  id?: string;
}

interface MovieBiteEvent {
  id: string;
  title?: string;
  name?: string;
  category?: string;
  sport?: string;
  league?: string;
  time?: string;
  scheduled?: string;
  teams?: {
    home?: { name: string };
    away?: { name: string };
  };
}

interface ProcessedMatch {
  match_id: string;
  match_title: string;
  category: string | null;
  team_home: string | null;
  team_away: string | null;
  source_admin: string | null;
  source_delta: string | null;
  source_echo: string | null;
  source_golf: string | null;
  scanned_at: string;
}

async function fetchMovieBiteSchedule(): Promise<MovieBiteEvent[]> {
  try {
    console.log(`Fetching schedule from ${MOVIEBITE_BASE}/api/schedule`);
    
    const response = await fetch(`${MOVIEBITE_BASE}/api/schedule`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": `${MOVIEBITE_BASE}/schedule`,
      },
    });

    if (!response.ok) {
      throw new Error(`Schedule API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Extraer eventos de diferentes formatos posibles
    let events: MovieBiteEvent[] = [];
    if (Array.isArray(data)) {
      events = data;
    } else if (data.events && Array.isArray(data.events)) {
      events = data.events;
    } else if (data.data && Array.isArray(data.data)) {
      events = data.data;
    }
    
    console.log(`✓ Found ${events.length} events in schedule`);
    return events;
    
  } catch (error) {
    console.error("Error fetching schedule:", error);
    throw error;
  }
}

async function fetchMatchSources(matchId: string): Promise<Record<string, string>> {
  const sources: Record<string, string> = {
    admin: '',
    delta: '',
    echo: '',
    golf: '',
  };
  
  try {
    console.log(`  Fetching sources for match ${matchId}`);
    
    const response = await fetch(`${MOVIEBITE_BASE}/api/stream/${matchId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": `${MOVIEBITE_BASE}/stream/${matchId}`,
      },
    });

    if (!response.ok) {
      console.log(`  ⚠ Stream API returned ${response.status} for match ${matchId}`);
      return sources;
    }

    const data = await response.json();
    
    // Procesar sources de diferentes formatos posibles
    let sourcesArray: MovieBiteSource[] = [];
    
    if (data.sources && Array.isArray(data.sources)) {
      sourcesArray = data.sources;
    } else if (data.streams && Array.isArray(data.streams)) {
      sourcesArray = data.streams;
    }
    
    console.log(`  Found ${sourcesArray.length} sources for match ${matchId}`);
    
    for (const source of sourcesArray) {
      const sourceName = (source.name || '').toLowerCase();
      
      // Verificar si este nombre está en nuestro mapeo
      if (SERVER_MAPPING[sourceName]) {
        const mappedColumn = SERVER_MAPPING[sourceName];
        
        // Extraer el ID de la fuente
        let sourceId = source.id;
        
        // Si no hay ID directo, intentar extraerlo del embed
        if (!sourceId && source.embed) {
          const embedMatch = source.embed.match(/\/([^\/]+)\/([^\/]+)/);
          if (embedMatch) {
            sourceId = embedMatch[2];
          }
        }
        
        if (sourceId) {
          // Construir el link usando el nombre del servidor original (no el mapeado)
          const link = buildLink(sourceName, sourceId);
          sources[mappedColumn] = link;
          console.log(`    ✓ ${sourceName} → ${mappedColumn}: ${sourceId}`);
        }
      }
    }
    
  } catch (error) {
    console.error(`  ✗ Error fetching sources for match ${matchId}:`, error);
  }
  
  return sources;
}

async function processAllMatches(): Promise<ProcessedMatch[]> {
  const processedMatches: ProcessedMatch[] = [];
  
  try {
    // Paso 1: Obtener todos los eventos del schedule
    const events = await fetchMovieBiteSchedule();
    
    console.log(`\nProcessing ${events.length} events...\n`);
    
    // Paso 2: Para cada evento, obtener sus fuentes
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        const matchId = event.id;
        const matchTitle = event.title || event.name || "Unknown Match";
        
        console.log(`[${i + 1}/${events.length}] ${matchTitle}`);
        
        // Obtener las fuentes de este partido
        const sources = await fetchMatchSources(matchId);
        
        // Crear el registro procesado
        const processedMatch: ProcessedMatch = {
          match_id: matchId,
          match_title: matchTitle,
          category: event.category || event.sport || event.league || null,
          team_home: event.teams?.home?.name || null,
          team_away: event.teams?.away?.name || null,
          source_admin: sources.admin || null,
          source_delta: sources.delta || null,
          source_echo: sources.echo || null,
          source_golf: sources.golf || null,
          scanned_at: new Date().toISOString(),
        };
        
        processedMatches.push(processedMatch);
        
        // Pequeña pausa para no saturar el servidor
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (eventError) {
        console.error(`✗ Error processing event ${i + 1}:`, eventError);
      }
    }
    
  } catch (error) {
    console.error("Error in processAllMatches:", error);
    throw error;
  }
  
  return processedMatches;
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
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
          global: { headers: { Authorization: authHeader } },
        }
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // If no auth header, allow cron execution

    console.log("=== MOVIEBITE SCRAPER STARTED ===");
    console.log(`Time: ${new Date().toISOString()}`);
    
    // Procesar todos los partidos de MovieBite
    const records = await processAllMatches();
    
    // Contar sources por tipo
    const adminCount = records.filter(r => r.source_admin).length;
    const deltaCount = records.filter(r => r.source_delta).length;
    const echoCount = records.filter(r => r.source_echo).length;
    const golfCount = records.filter(r => r.source_golf).length;
    
    console.log(`\n=== SCRAPING SUMMARY ===`);
    console.log(`Total matches: ${records.length}`);
    console.log(`Admin sources: ${adminCount}`);
    console.log(`Delta sources: ${deltaCount}`);
    console.log(`Echo sources: ${echoCount}`);
    console.log(`Golf sources: ${golfCount}`);
    
    // Use service role to upsert (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Limpiar registros antiguos
    console.log("\nClearing old records...");
    await adminClient
      .from("live_scraped_links")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Insertar nuevos registros
    if (records.length > 0) {
      console.log(`Inserting ${records.length} new records...`);
      
      const { error: insertError } = await adminClient
        .from("live_scraped_links")
        .upsert(records, { onConflict: "match_id" });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(insertError.message);
      }
      
      console.log("✓ Records inserted successfully");
    }

    console.log("=== SCRAPER COMPLETED ===\n");

    return new Response(
      JSON.stringify({
        success: true,
        count: records.length,
        stats: {
          admin: adminCount,
          delta: deltaCount,
          echo: echoCount,
          golf: golfCount,
        },
        matches: records,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("=== SCRAPER ERROR ===");
    console.error(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

**Características clave del scraper:**

✅ **Fuente única**: Solo extrae de MovieBite (`https://app.moviebite.cc`)
✅ **Dos pasos**: 
   1. GET `/api/schedule` → lista de partidos
   2. GET `/api/stream/[ID]` → fuentes de cada partido
✅ **Mapeo correcto**:
   - `vola`, `main`, `admin` → `source_admin`
   - `delta` → `source_delta`
   - `echo` → `source_echo`
   - `mv`, `golf` → `source_golf`
✅ **Links correctos**: `https://embedsports.top/embed/[servidor]/[id]/1?autoplay=1`
✅ **Calendario completo**: Trae todos los partidos del schedule, no solo live
✅ **Limpieza antes de insertar**: `delete()` + `upsert()`
✅ **Logging detallado**: Para debugging

**Ejemplo de salida en logs:**
```
[1/30] Charlotte Hornets vs Atlanta Hawks
  Fetching sources for match 2358138
  Found 4 sources for match 2358138
    ✓ admin → admin: 123
    ✓ delta → delta: 456
    ✓ echo → echo: 789
    ✓ golf → golf: 012

=== SCRAPING SUMMARY ===
Total matches: 30
Admin sources: 25
Delta sources: 28
Echo sources: 22
Golf sources: 15