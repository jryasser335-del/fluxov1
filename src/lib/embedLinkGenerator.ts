export interface GeneratedLinks {
  url1: string;
  url2: string;
  url3: string;
  url4: string;
}

/**
 * GENERADOR DEFINITIVO BASADO EN ID REAL
 * Este código usa el ID exacto que extraemos de MovieBite
 */
export function generateEmbedLinks(matchId: string): GeneratedLinks {
  // Si no hay ID, devolvemos strings vacíos para evitar errores
  if (!matchId) {
    return { url1: "", url2: "", url3: "", url4: "" };
  }

  return {
    // Servidor principal de MovieBite (Admin)
    url1: `https://embedsports.top/embed/admin/${matchId}/1?autoplay=1`,

    // Servidor secundario (Delta)
    url2: `https://embedsports.top/embed/delta/${matchId}/1?autoplay=1`,

    // Servidor Echo (El que sustituyó a Golf)
    url3: `https://embedsports.top/embed/echo/${matchId}/1?autoplay=1`,

    // Servidor Directo de respaldo
    url4: `https://itv2.moviebite.cc/m1.php?id=${matchId}`,
  };
}

// Mantener esta función por compatibilidad con tu Admin actual
export function generateAllLinkVariants(matchId: string) {
  return {
    primary: generateEmbedLinks(matchId),
    alternative: generateEmbedLinks(matchId), // Aquí ya no hace falta invertir nombres porque el ID es único
  };
}
