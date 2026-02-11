/**
 * Generates specific sports embed links for Dami TV
 * URL 1: Admin (autoplay)
 * URL 2: Admin (no autoplay)
 * URL 3: Echo
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
}

/**
 * Convierte el nombre de un equipo a un slug amigable para URL
 * Limpia acentos y caracteres especiales
 */
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
 * Valida que la URL generada tenga un formato de link válido
 */
function validateLink(url: string): string {
  try {
    new URL(url);
    return url;
  } catch (e) {
    console.error("Link generado inválido:", url);
    return "";
  }
}

/**
 * Construye la URL con el formato exacto de Dami TV:
 * https://embed.damitv.pro/?source=...&id=...&streamNo=1&autoplay=...
 */
function buildDamiUrl(source: "admin" | "echo", matchSlug: string, autoplay: boolean = false): string {
  const baseUrl = "https://embed.damitv.pro/";
  const params = new URLSearchParams({
    source: source,
    id: matchSlug,
    streamNo: "1",
    autoplay: autoplay ? "true" : "false",
  });
  return validateLink(`${baseUrl}?${params.toString()}`);
}

/**
 * Generador principal (Orden: Home vs Away)
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: buildDamiUrl("admin", matchSlug, true),
    url2: buildDamiUrl("admin", matchSlug, false),
    url3: buildDamiUrl("echo", matchSlug, false),
  };
}

/**
 * Variante con orden inverso (Away vs Home)
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: buildDamiUrl("admin", matchSlug, true),
    url2: buildDamiUrl("admin", matchSlug, false),
    url3: buildDamiUrl("echo", matchSlug, false),
  };
}

/**
 * EXPORTACIÓN REQUERIDA POR LOVABLE
 * Esto soluciona el error "does not provide an export named 'generateAllLinkVariants'"
 */
export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
