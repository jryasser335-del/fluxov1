import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS, type PlatformValue } from "@/lib/platforms";
import { DEFAULT_WATCH_REGION, getWatchProviderIdForPlatform } from "@/lib/tmdbWatchProviders";

const MOVIE_FILTERS = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top" },
  { value: "now_playing", label: "Reciente" },
  { value: "upcoming", label: "Próximas" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface MoviesViewProps {
  searchQuery: string;
}

export function MoviesView({ searchQuery }: MoviesViewProps) {
  const [type, setType] = useState("popular");
  const [platform, setPlatform] = useState<"all" | PlatformValue>("all");
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<TMDBResult[]>([]);
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
                mediaType: "movie",
                platform,
                region: watchRegion,
              });

        // Base query using Discover so that platform filters can work.
        let basePath = "discover/movie?include_adult=false&include_video=false";
        if (type === "popular") {
          basePath += "&sort_by=popularity.desc";
        } else if (type === "top_rated") {
          basePath += "&sort_by=vote_average.desc&vote_count.gte=200";
        } else if (type === "now_playing") {
          basePath += `&sort_by=primary_release_date.desc&primary_release_date.lte=${today}`;
        } else if (type === "upcoming") {
          basePath += `&sort_by=primary_release_date.asc&primary_release_date.gte=${today}`;
        }

        if (providerId) {
          basePath += `&with_watch_providers=${providerId}&watch_region=${watchRegion}&with_watch_monetization_types=flatrate`;
        } else if (platform !== "all") {
          // Platform selected but provider id not found for this region
          if (!cancelled) {
            setAllMovies([]);
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
          const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
          setAllMovies(unique);
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
  const filteredMovies = useMemo(() => {
    let result = allMovies;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => (m.title || "").toLowerCase().includes(q));
    }
    
    return result;
  }, [allMovies, searchQuery]);

  const platformLabel = platform === "all" ? "Todas" : STREAMING_PLATFORMS.find(p => p.value === platform)?.label || platform;
  const badge = loading
    ? "Cargando…"
    : platform !== "all"
    ? `${filteredMovies.length} en ${platformLabel}`
    : searchQuery
    ? `${filteredMovies.length} resultados`
    : `Página ${page} • ${allMovies.length} títulos`;

  return (
    <Section title="Películas" emoji="🎬" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={MOVIE_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>
      <Pager page={page} onPageChange={setPage} maxPage={Math.ceil(totalPages / 3)} />

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : filteredMovies.length === 0 && platform !== "all" ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          TMDB no devolvió resultados para {platformLabel}.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {filteredMovies.map((movie) => {
            return (
              <MediaCard 
                key={movie.id} 
                item={movie} 
                type="movie" 
                platform={platform === "all" ? null : platform}
              />
            );
          })}
        </div>
      )}
    </Section>
  );
}
