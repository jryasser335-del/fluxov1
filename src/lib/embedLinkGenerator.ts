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
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateEmbedLinks(homeTeam: string, awayTeam: string): GeneratedLinks {
  // Si lo que recibimos en homeTeam es un ID real de MovieBite (contiene números al final)
  const isDirectId = /\d+$/.test(homeTeam);

  const finalId = isDirectId ? homeTeam : `ppv-${teamToSlug(homeTeam)}-vs-${teamToSlug(awayTeam)}`;

  return {
    url1: `https://embedsports.top/embed/admin/${finalId}/1?autoplay=1`,
    url2: `https://embedsports.top/embed/delta/${finalId}/1?autoplay=1`,
    url3: `https://embedsports.top/embed/echo/${finalId}/1?autoplay=1`,
    url4: `https://itv2.moviebite.cc/m1.php?id=${finalId}`,
  };
}

export function generateAllLinkVariants(homeTeam: string, awayTeam: string) {
  return {
    primary: generateEmbedLinks(homeTeam, awayTeam),
    alternative: generateEmbedLinks(awayTeam, homeTeam),
  };
}
