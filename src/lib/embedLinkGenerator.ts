/**
export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

/**
 * Limpia los nombres de los equipos para el formato de embedsports
 * Ejemplo: "Real Madrid" -> "real-madrid"
 */
function teamToSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/[^a-z0-9\s-]/g, "") // Quita caracteres especiales
    .replace(/\s+/g, "-") // Espacios por guiones
    .replace(/-+/g, "-") // Evita guiones dobles
    .replace(/^-|-$/g, ""); // Limpia extremos
}

export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Formato exacto: ppv-equipo1-vs-equipo2
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

/**
 * Variante por si el servidor tiene los equipos en orden inverso
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const matchSlug = `ppv-${awaySlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}
