/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{event-name}-{team1}-vs-{team2}/{stream}
 */

export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

/**
 * Convierte cualquier texto (nombres de equipos o eventos) a un slug amigable para URL
 * Ejemplo: "Seattle Seahawks" -> "seattle-seahawks"
 * Ejemplo: "Super Bowl LX" -> "super-bowl-lx"
 */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos y tildes
    .replace(/[^a-z0-9\s-]/g, "") // Quita caracteres especiales (como el '#' o '.')
    .replace(/\s+/g, "-") // Convierte espacios en guiones
    .replace(/-+/g, "-") // Evita que haya guiones dobles (--)
    .replace(/^-|-$/g, ""); // Limpia guiones al inicio o al final
}

/**
 * Genera los links automáticos.
 * Si pasas el nombre de un evento (como Super Bowl), lo incluirá al principio.
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string, eventName?: string): GeneratedLinks {
  const homeSlug = toSlug(homeTeam);
  const awaySlug = toSlug(awayTeam);
  const eventSlug = eventName ? `${toSlug(eventName)}-` : "";

  // Formato: ppv-[evento]-equipo1-vs-equipo2
  const matchSlug = `ppv-${eventSlug}${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

export function generateAlternativeLinks(homeTeam: string, awayTeam: string, eventName?: string): GeneratedLinks {
  const homeSlug = toSlug(homeTeam);
  const awaySlug = toSlug(awayTeam);
  const eventSlug = eventName ? `${toSlug(eventName)}-` : "";

  // Formato inverso por si el servidor lo tiene registrado así
  const matchSlug = `ppv-${eventSlug}${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

export function generateAllLinkVariants(homeTeam: string, awayTeam: string, eventName?: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam, eventName),
    alternative: generateAlternativeLinks(homeTeam, awayTeam, eventName),
  };
}
