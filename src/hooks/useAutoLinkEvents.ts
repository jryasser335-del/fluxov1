import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ESPNEvent } from "@/lib/api";
import { generateAllLinkVariants } from "@/lib/embedLinkGenerator";

interface AutoLinkResult {
  linked: number;
  skipped: number;
}

/**
 * Hook para auto-asignar links de embedsports a eventos de ESPN.
 * Detecta eventos sin links y les genera URLs automáticamente.
 */
export function useAutoLinkEvents() {
  /**
   * Asigna links automáticamente a eventos que no tienen URL de streaming.
   * Solo crea eventos nuevos si no existen en la base de datos.
   */
  const autoLinkEvents = useCallback(async (
    events: ESPNEvent[],
    leagueInfo: { name: string; sport?: string }
  ): Promise<AutoLinkResult> => {
    if (!events.length) return { linked: 0, skipped: 0 };

    // Obtener los ESPN IDs que ya tienen links en la base de datos
    const { data: existingEvents } = await supabase
      .from("events")
      .select("espn_id")
      .not("espn_id", "is", null);

    const existingIds = new Set(existingEvents?.map(e => e.espn_id) || []);

    // Filtrar eventos que no están en la base de datos
    const newEvents = events.filter(e => !existingIds.has(e.id));

    if (!newEvents.length) {
      return { linked: 0, skipped: events.length };
    }

    // Preparar los eventos con links generados
    const eventsToInsert = newEvents.map(event => {
      const comp = event.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === "home");
      const away = comp.competitors.find(c => c.homeAway === "away");

      const homeName = home?.team.displayName || "TBD";
      const awayName = away?.team.displayName || "TBD";

      // Generar links automáticamente
      const links = generateAllLinkVariants(homeName, awayName);

      return {
        espn_id: event.id,
        name: `${homeName} vs ${awayName}`,
        event_date: event.date,
        sport: leagueInfo.sport || null,
        league: leagueInfo.name || null,
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

    // Insertar en lotes
    const { error } = await supabase
      .from("events")
      .upsert(eventsToInsert, { onConflict: "espn_id" });

    if (error) {
      console.error("Error auto-linking events:", error);
      return { linked: 0, skipped: events.length };
    }

    return { linked: eventsToInsert.length, skipped: events.length - eventsToInsert.length };
  }, []);

  return { autoLinkEvents };
}
