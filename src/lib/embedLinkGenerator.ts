/**
 * Estructura de links para Dami TV
 */
export interface DamiLinks {
  url1: string; // Admin + Autoplay
  url2: string; // Admin
  url3: string; // Echo
}

function teamToSlug(team: string): string {
  return team
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
}

/**
 * Genera la URL con el formato exacto de Dami TV
 */
function buildDamiUrl(source: "admin" | "echo", matchSlug: string, autoplay: boolean = false): string {
  const baseUrl = "https://embed.damitv.pro/";
  const params = new URLSearchParams({
    source: source,
    id: matchSlug,
    streamNo: "1",
    autoplay: autoplay ? "true" : "false",
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Función principal: Genera ambos órdenes (Home-vs-Away y Away-vs-Home)
 * para que siempre tengas el link que sí funciona.
 */
export function generateDamiLinks(homeTeam: string, awayTeam: string) {
  const home = teamToSlug(homeTeam);
  const away = teamToSlug(awayTeam);

  const slugPrimary = `ppv-${home}-vs-${away}`;
  const slugAlternative = `ppv-${away}-vs-${home}`;

  const createSet = (slug: string): DamiLinks => ({
    url1: buildDamiUrl("admin", slug, true),
    url2: buildDamiUrl("admin", slug, false),
    url3: buildDamiUrl("echo", slug, false),
  });

  return {
    // Te entrega ambos para que si el primario (NY-vs-IND) falla,
    // el sistema use automáticamente el alternativo (IND-vs-NY).
    optionA: createSet(slugPrimary),
    optionB: createSet(slugAlternative),
  };
}
