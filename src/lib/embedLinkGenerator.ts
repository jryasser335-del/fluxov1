export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

const SOURCES = ["admin", "delta", "golf", "echo"] as const;

function teamToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  const homeSlug = teamToSlug(homeTeam);
  const awaySlug = teamToSlug(awayTeam);

  // Orden Correcto: home-vs-away para que funcionen (ej: atalanta-vs-cremonese)
  const matchSlug = `ppv-${homeSlug}-vs-${awaySlug}`;

  return {
    url1: `https://embedsports.top/embed/admin/${matchSlug}/1`,
    url2: `https://embedsports.top/embed/delta/${matchSlug}/1`,
    url3: `https://embedsports.top/embed/golf/${matchSlug}/1`,
    url4: `https://embedsports.top/embed/echo/${matchSlug}/1`,
  };
}

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

export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateAlternativeLinks(homeTeam, awayTeam),
  };
}
