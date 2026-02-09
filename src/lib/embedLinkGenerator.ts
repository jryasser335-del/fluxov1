export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

/**
 * Limpia los nombres de los equipos para que coincidan
 * con los slugs de MovieBite / EmbedSports
 */
function teamToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "") // Solo letras, números y guiones
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Genera los links usando EXCLUSIVAMENTE la estructura de EmbedSports
 * que utiliza la plataforma MovieBite.
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awayTeamSlug = teamToSlug(awayTeam);

  // Formato exacto de MovieBite: ppv-local-vs-visitante
  const matchSlug = `ppv-${homeSlug}-vs-${awayTeamSlug}`;

  return {
    // Servidor Principal (El que me pasaste de la Roma y Villarreal)
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1?autoplay=1`,

    // Servidores Espejo de MovieBite (Backup)
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1?autoplay=1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1?autoplay=1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1?autoplay=1`,
  };
}

/**
 * Variante alternativa por si el servidor tiene los equipos invertidos
 */
export function generateAlternativeLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awayTeamSlug = teamToSlug(awayTeam);

  // Formato: ppv-visitante-vs-local
  const matchSlugAlt = `ppv-${awayTeamSlug}-vs-${homeSlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlugAlt}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/${matchSlugAlt}/1?autoplay=1`,
    url3: `https://embedsports.top/embed/golf/${matchSlugAlt}/1?autoplay=1`,
    url4: `https://embedsports.top/embed/echo/${matchSlugAlt}/1?autoplay=1`,
  };
}

export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
