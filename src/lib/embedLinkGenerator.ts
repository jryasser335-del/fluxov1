export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

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
 * Extrae los enlaces embedsports de la página de MovieBite
 */
async function fetchEmbedLinksFromMovieBite(homeTeam: string, awayTeam: string): Promise<GeneratedLinks> {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  try {
    // Intenta obtener la página del partido
    const response = await fetch(`https://app.moviebite.cc/`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await response.text();

    // Buscar todos los enlaces embedsports en el HTML
    const adminMatch = html.match(/https:\/\/embedsports\.top\/embed\/admin\/ppv-[^"'\s]+/);
    const deltaMatch = html.match(/https:\/\/embedsports\.top\/embed\/delta\/live_laliga_[^"'\s]+/);
    const echoMatch = html.match(/https:\/\/embedsports\.top\/embed\/echo\/[^"'\s]+/);
    const golfMatch = html.match(/https:\/\/embedsports\.top\/embed\/golf\/[^"'\s]+/);

    // Filtrar por los equipos específicos
    const adminUrl =
      adminMatch?.[0].includes(homeSlug) && adminMatch?.[0].includes(awaySlug)
        ? adminMatch[0]
        : `https://embedsports.top/embed/admin/ppv-${homeSlug}-vs-${awaySlug}/1?autoplay=1`;

    const deltaUrl =
      deltaMatch?.[0].includes(homeSlug) && deltaMatch?.[0].includes(awaySlug)
        ? deltaMatch[0]
        : `https://embedsports.top/embed/delta/live_laliga_${homeSlug}-${awaySlug}-live-streaming-000000000/1?autoplay=1`;

    const echoUrl =
      echoMatch?.[0].includes(homeSlug) && echoMatch?.[0].includes(awaySlug)
        ? echoMatch[0]
        : `https://embedsports.top/embed/echo/${homeSlug}-vs-${awaySlug}-football-0000000/1?autoplay=1`;

    const golfUrl =
      golfMatch?.[0].includes(homeSlug) && golfMatch?.[0].includes(awaySlug)
        ? golfMatch[0]
        : `https://embedsports.top/embed/golf/ppv-${homeSlug}-vs-${awaySlug}/1?autoplay=1`;

    return {
      url1: adminUrl,
      url2: deltaUrl,
      url3: echoUrl,
      url4: golfUrl,
    };
  } catch (error) {
    console.error("Error fetching from MovieBite:", error);

    // Fallback: generar solo admin que sabemos que funciona
    return {
      url1: `https://embedsports.top/embed/admin/ppv-${homeSlug}-vs-${awaySlug}/1?autoplay=1`,
      url2: "❌ No se pudo obtener enlace delta",
      url3: "❌ No se pudo obtener enlace echo",
      url4: `https://embedsports.top/embed/golf/ppv-${homeSlug}-vs-${awaySlug}/1?autoplay=1`,
    };
  }
}

/**
 * Función principal para generar enlaces
 */
export async function generateEmbedLinks(homeTeam: string, awayTeam: string): Promise<GeneratedLinks> {
  return await fetchEmbedLinksFromMovieBite(homeTeam, awayTeam);
}

/**
 * Versión síncrona solo con admin (no requiere scraping)
 */
export function generateAdminLinkOnly(homeTeam: string, awayTeam: string): string {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);
  return `https://embedsports.top/embed/admin/ppv-${homeSlug}-vs-${awaySlug}/1?autoplay=1`;
}
