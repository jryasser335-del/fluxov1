import { useEffect, useRef } from "react";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { generateAllLinkVariants } from "@/lib/embedLinkGenerator";

// Ligas prioritarias que siempre se procesan primero
const PRIORITY_LEAGUES = [
  "nba", "nfl", "mlb", "nhl", "mls",
  "eng.1", "esp.1", "ger.1", "ita.1", "fra.1",
  "uefa.champions", "uefa.europa",
  "mex.1", "arg.1", "bra.1",
  "conmebol.libertadores",
  "ufc"
];

function detectSportFromLeague(key: string): string {
  const k = key.toLowerCase();
  if (["nba", "wnba", "ncaab", "euroleague"].some(l => k.includes(l))) return "Basketball";
  if (["nfl", "ncaaf", "xfl"].some(l => k.includes(l))) return "Football";
  if (["nhl", "khl", "shl", "ahl"].some(l => k.includes(l))) return "Hockey";
  if (k.includes("mlb")) return "Baseball";
  if (["ufc", "bellator", "pfl", "boxing", "mma"].some(l => k.includes(l))) return "MMA";
  if (["atp", "wta", "tennis"].some(l => k.includes(l))) return "Tennis";
  if (["f1", "motogp", "nascar", "indycar"].some(l => k.includes(l))) return "Motorsports";
  if (["pga", "lpga"].some(l => k.includes(l))) return "Golf";
  return "Soccer";
}

/**
 * Hook que auto-linkea eventos de TODAS las ligas configuradas.
 * Se ejecuta una vez al montar el componente principal.
 */
export function useAutoLinkAllLeagues() {
  const hasRun = useRef(false);

  useEffect(() => {
    // Solo ejecutar una vez por sesión
    if (hasRun.current) return;
    hasRun.current = true;

    const processAllLeagues = async () => {
      console.log("🚀 Iniciando auto-link de todas las ligas...");

      // Obtener IDs de eventos que ya existen
      const { data: existingEvents } = await supabase
        .from("events")
        .select("espn_id")
        .not("espn_id", "is", null);

      const existingIds = new Set(existingEvents?.map(e => e.espn_id) || []);

      // Obtener ligas únicas (eliminar duplicados)
      const uniqueLeagues = [...new Set(LEAGUE_OPTIONS.map(l => l.value))];
      
      // Ordenar: primero las prioritarias
      const sortedLeagues = [
        ...PRIORITY_LEAGUES.filter(l => uniqueLeagues.includes(l)),
        ...uniqueLeagues.filter(l => !PRIORITY_LEAGUES.includes(l))
      ];

      let totalLinked = 0;
      let processedLeagues = 0;

      // Procesar en lotes de 5 ligas para no sobrecargar
      const batchSize = 5;
      for (let i = 0; i < sortedLeagues.length; i += batchSize) {
        const batch = sortedLeagues.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (leagueKey) => {
            try {
              const data = await fetchESPNScoreboard(leagueKey);
              const events = data.events || [];
              
              if (events.length === 0) return 0;

              const lg = data.leagues?.[0];
              const leagueName = lg?.name || lg?.abbreviation || leagueKey;
              const sport = detectSportFromLeague(leagueKey);

              // Filtrar solo eventos nuevos
              const newEvents = events.filter((e: ESPNEvent) => !existingIds.has(e.id));
              
              if (newEvents.length === 0) return 0;

              // Preparar eventos con links generados
              const eventsToInsert = newEvents.map((event: ESPNEvent) => {
                const comp = event.competitions[0];
                const home = comp.competitors.find(c => c.homeAway === "home");
                const away = comp.competitors.find(c => c.homeAway === "away");

                const homeName = home?.team.displayName || "TBD";
                const awayName = away?.team.displayName || "TBD";

                const links = generateAllLinkVariants(homeName, awayName);

                // Agregar a existingIds para evitar duplicados en el mismo batch
                existingIds.add(event.id);

                return {
                  espn_id: event.id,
                  name: `${homeName} vs ${awayName}`,
                  event_date: event.date,
                  sport,
                  league: leagueName,
                  team_home: homeName,
                  team_away: awayName,
                  thumbnail: home?.team.logo || away?.team.logo || null,
                  stream_url: links.primary.url1,
                  stream_url_2: links.primary.url2,
                  stream_url_3: links.primary.url3,
                  is_live: comp.status.type.state === "in",
                  is_active: true,
                };
              });

              // Insertar en Supabase
              const { error } = await supabase
                .from("events")
                .upsert(eventsToInsert, { onConflict: "espn_id" });

              if (error) {
                console.error(`❌ Error en ${leagueKey}:`, error.message);
                return 0;
              }

              return eventsToInsert.length;
            } catch (err) {
              // Silenciar errores de ligas sin datos
              return 0;
            }
          })
        );

        // Contar resultados exitosos
        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value > 0) {
            totalLinked += result.value;
          }
        });

        processedLeagues += batch.length;

        // Pequeña pausa entre lotes para no saturar la API
        if (i + batchSize < sortedLeagues.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (totalLinked > 0) {
        console.log(`✅ Auto-link completado: ${totalLinked} eventos enlazados de ${processedLeagues} ligas`);
      } else {
        console.log(`ℹ️ Auto-link: todos los eventos ya tienen links asignados`);
      }
    };

    // Ejecutar después de un pequeño delay para no bloquear el render inicial
    const timer = setTimeout(processAllLeagues, 2000);
    
    return () => clearTimeout(timer);
  }, []);
}
