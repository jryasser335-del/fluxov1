import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS, type PlatformValue } from "@/lib/platforms";
import { DEFAULT_WATCH_REGION, getWatchProviderIdForPlatform } from "@/lib/tmdbWatchProviders";

const SERIES_FILTERS = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top" },
  { value: "on_the_air", label: "En emisión" },
  { value: "airing_today", label: "Hoy" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface SeriesViewProps {
  searchQuery: string;
}

export function SeriesView({ searchQuery }: SeriesViewProps) {
  const [type, setType] = useState("popular");
  const [platform, setPlatform] = useState<"all" | PlatformValue>("all");
  const [page, setPage] = useState(1);
  const [allSeries, setAllSeries] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(20);

  // Fetch multiple pages for more content
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const fetchMultiplePages = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const watchRegion = DEFAULT_WATCH_REGION;

        const providerId =
          platform === "all"
            ? null
            : await getWatchProviderIdForPlatform({
                mediaType: "tv",
                platform,
                region: watchRegion,
              });

        // Base query using Discover so that platform filters can work.
        let basePath = "discover/tv?include_adult=false";
        if (type === "popular") {
          basePath += "&sort_by=popularity.desc";
        } else if (type === "top_rated") {
          basePath += "&sort_by=vote_average.desc&vote_count.gte=200";
        } else if (type === "on_the_air") {
          basePath += `&sort_by=first_air_date.desc&first_air_date.lte=${today}`;
        } else if (type === "airing_today") {
          basePath += `&sort_by=first_air_date.desc&first_air_date.gte=${today}&first_air_date.lte=${today}`;
        }

        if (providerId) {
          basePath += `&with_watch_providers=${providerId}&watch_region=${watchRegion}&with_watch_monetization_types=flatrate`;
        } else if (platform !== "all") {
          if (!cancelled) {
            setAllSeries([]);
            setTotalPages(1);
            setLoading(false);
          }
          return;
        }

        const pagesToFetch = [page, page + 1, page + 2];
        const promises = pagesToFetch.map(p => 
          fetchTMDB(`${basePath}&page=${p}`)
        );
        
        const results = await Promise.all(promises);
        
        if (!cancelled) {
          const combined = results.flatMap(r => r.results);
          const unique = Array.from(new Map(combined.map(s => [s.id, s])).values());
          setAllSeries(unique);
          setTotalPages(Math.min(results[0]?.total_pages || 20, 500));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchMultiplePages();

    return () => {
      cancelled = true;
    };
  }, [type, platform, page]);


  const handleTypeChange = (newType: string) => {
    setType(newType);
    setPage(1);
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform as "all" | PlatformValue);
    setPage(1);
  };

  // Filter by search only (platform is fetched from TMDB via watch providers)
  const filteredSeries = useMemo(() => {
    let result = allSeries;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => (s.name || "").toLowerCase().includes(q));
    }
    
    return result;
  }, [allSeries, searchQuery]);

  const platformLabel = platform === "all" ? "Todas" : STREAMING_PLATFORMS.find(p => p.value === platform)?.label || platform;
  const badge = loading
    ? "Cargando…"
    : platform !== "all"
    ? `${filteredSeries.length} en ${platformLabel}`
    : searchQuery
    ? `${filteredSeries.length} resultados`
    : `Página ${page} • ${allSeries.length} títulos`;

  return (
    <Section title="Series" emoji="📺" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={SERIES_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>
      <Pager page={page} onPageChange={setPage} maxPage={Math.ceil(totalPages / 3)} />

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : filteredSeries.length === 0 && platform !== "all" ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          TMDB no devolvió resultados para {platformLabel}.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {filteredSeries.map((s) => {
            return (
              <MediaCard 
                key={s.id} 
                item={s} 
                type="series" 
                platform={platform === "all" ? null : platform}
              />
            );
          })}
        </div>
      )}
    </Section>
  );
}
