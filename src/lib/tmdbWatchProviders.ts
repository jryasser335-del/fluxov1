import { TMDB_KEY } from "@/lib/constants";
import type { PlatformValue } from "@/lib/platforms";

type TMDBMediaType = "movie" | "tv";

type TMDBWatchProvider = {
  provider_id: number;
  provider_name: string;
};

type TMDBWatchProvidersResponse = {
  results?: TMDBWatchProvider[];
};

export const DEFAULT_WATCH_REGION = "US";

const PROVIDER_NAMES_BY_PLATFORM: Partial<Record<PlatformValue, string[]>> = {
  netflix: ["Netflix"],
  disney: ["Disney Plus"],
  hbo: ["HBO Max", "Max"],
  prime: ["Amazon Prime Video", "Amazon Video"],
  viki: ["Viki"],
  rakuten: ["Rakuten Viki", "Viki"],
  crunchyroll: ["Crunchyroll"],
  paramount: ["Paramount Plus"],
  apple: ["Apple TV Plus"],
  peacock: ["Peacock"],
  hulu: ["Hulu"],
};

const providersCache = new Map<string, TMDBWatchProvider[]>();

function normalizeProviderName(input: string) {
  return input
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function fetchWatchProviders(mediaType: TMDBMediaType, region: string) {
  const cacheKey = `${mediaType}:${region}`;
  const cached = providersCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://api.themoviedb.org/3/watch/providers/${mediaType}?api_key=${TMDB_KEY}&watch_region=${encodeURIComponent(region)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB providers error");

  const json = (await res.json()) as TMDBWatchProvidersResponse;
  const list = Array.isArray(json.results) ? json.results : [];
  providersCache.set(cacheKey, list);
  return list;
}

export async function getWatchProviderIdForPlatform(args: {
  mediaType: TMDBMediaType;
  platform: PlatformValue;
  region?: string;
}): Promise<number | null> {
  const region = args.region ?? DEFAULT_WATCH_REGION;
  const candidates = PROVIDER_NAMES_BY_PLATFORM[args.platform];
  if (!candidates || candidates.length === 0) return null;

  const providers = await fetchWatchProviders(args.mediaType, region);

  // 1) Exact match
  for (const name of candidates) {
    const found = providers.find((p) => p.provider_name === name);
    if (found) return found.provider_id;
  }

  // 2) Normalized match
  const candidatesNormalized = candidates.map(normalizeProviderName);
  for (const p of providers) {
    const norm = normalizeProviderName(p.provider_name);
    if (candidatesNormalized.includes(norm)) return p.provider_id;
  }

  return null;
}
