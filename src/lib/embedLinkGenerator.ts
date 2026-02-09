export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

/**
 * Limpia los nombres de los equipos para slugs
 */
function teamToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Genera los links con los formatos REALES de cada servidor
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // ID aleatorio para delta (parece generado)
  const deltaId = Math.floor(Math.random() * 900000000) + 100000000;

  // ID aleatorio para echo
  const echoId = Math.floor(Math.random() * 9000000) + 1000000;

  return {
    // ADMIN: ppv-local-vs-visitante
    url1: `https://embedsports.top/embed/admin/ppv-${homeSlug}-vs-${awaySlug}/1?autoplay=1`,

    // DELTA: live_laliga_local-visitante-live-streaming-XXXXXXXXX
    url2: `https://embedsports.top/embed/delta/live_laliga_${homeSlug}-${awaySlug}-live-streaming-${deltaId}/1?autoplay=1`,

    // ECHO: local-vs-visitante-football-XXXXXXX
    url3: `https://embedsports.top/embed/echo/${homeSlug}-vs-${awaySlug}-football-${echoId}/1?autoplay=1`,

    // GOLF: intentando formato similar a admin
    url4: `https://embedsports.top/embed/golf/ppv-${homeSlug}-vs-${awaySlug}/1?autoplay=1`,
  };
}

/**
 * Variante con equipos invertidos
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  const deltaId = Math.floor(Math.random() * 900000000) + 100000000;
  const echoId = Math.floor(Math.random() * 9000000) + 1000000;

  return {
    url1: `https://embedsports.top/embed/admin/ppv-${awaySlug}-vs-${homeSlug}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/live_laliga_${awaySlug}-${homeSlug}-live-streaming-${deltaId}/1?autoplay=1`,
    url3: `https://embedsports.top/embed/echo/${awaySlug}-vs-${homeSlug}-football-${echoId}/1?autoplay=1`,
    url4: `https://embedsports.top/embed/golf/ppv-${awaySlug}-vs-${homeSlug}/1?autoplay=1`,
  };
}

export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
