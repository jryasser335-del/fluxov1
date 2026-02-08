/**
 * Generates embed links for sports events based on team names
 * Pattern: https://embedsports.top/embed/{source}/ppv-{event-name}-{team1}-vs-{team2}/{stream}
 */

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
 * Detecta si los equipos son de la NFL
 */
function isNFLTeam(teamName: string): boolean {
  const nflTeams = [
    "patriots",
    "seahawks",
    "chiefs",
    "eagles",
    "rams",
    "49ers",
    "cowboys",
    "packers",
    "steelers",
    "ravens",
    "bills",
    "broncos",
    "raiders",
    "chargers",
    "dolphins",
    "jets",
    "browns",
    "bengals",
    "titans",
    "colts",
    "jaguars",
    "texans",
    "panthers",
    "saints",
    "buccaneers",
    "falcons",
    "cardinals",
    "lions",
    "vikings",
    "bears",
    "commanders",
    "giants",
    "washington",
    "niners",
  ];

  const teamLower = teamName.toLowerCase();
  return nflTeams.some((nflTeam) => teamLower.includes(nflTeam));
}

/**
 * Convierte número a romano (para Super Bowl)
 */
function toRomanNumeral(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let result = "";
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result.toLowerCase();
}

/**
 * Detecta el nombre del evento NFL según la fecha
 */
function detectNFLEvent(): string {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDay = currentDate.getDate();
  const currentYear = currentDate.getFullYear();

  // Super Bowl (generalmente primer domingo de febrero)
  if (currentMonth === 2 && currentDay <= 14) {
    const superBowlNumber = currentYear - 1966; // Super Bowl I fue en 1967
    return `super-bowl-${toRomanNumeral(superBowlNumber)}`;
  }

  // Conference Championships (últimos días de enero)
  if (currentMonth === 1 && currentDay >= 20) {
    return "nfl-conference-championship";
  }

  // Divisional Round (mediados de enero)
  if (currentMonth === 1 && currentDay >= 13 && currentDay < 20) {
    return "nfl-divisional-round";
  }

  // Wild Card Round (principios de enero)
  if (currentMonth === 1 && currentDay <= 12) {
    return "nfl-wild-card";
  }

  // Playoffs genérico (enero completo por si acaso)
  if (currentMonth === 1) {
    return "nfl-playoffs";
  }

  // Temporada regular (septiembre - diciembre)
  if (currentMonth >= 9 || currentMonth <= 12) {
    return "nfl";
  }

  // Por defecto
  return "nfl";
}

/**
 * Genera los links automáticos.
 * Si pasas el nombre de un evento (como Super Bowl), lo incluirá al principio.
 * Si detecta equipos NFL y no pasas evento, lo detecta automáticamente.
 */
export function generateEmbedLinks(homeTeam: string, awayTeam: string, eventName?: string): GeneratedLinks {
  const homeSlug = toSlug(homeTeam);
  const awaySlug = toSlug(awayTeam);

  // Auto-detectar evento NFL si no se proporciona uno
  let finalEventName = eventName;
  if (!eventName && (isNFLTeam(homeTeam) || isNFLTeam(awayTeam))) {
    finalEventName = detectNFLEvent();
  }

  const eventSlug = finalEventName ? `${toSlug(finalEventName)}-` : "";

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

  // Auto-detectar evento NFL si no se proporciona uno
  let finalEventName = eventName;
  if (!eventName && (isNFLTeam(homeTeam) || isNFLTeam(awayTeam))) {
    finalEventName = detectNFLEvent();
  }

  const eventSlug = finalEventName ? `${toSlug(finalEventName)}-` : "";

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
