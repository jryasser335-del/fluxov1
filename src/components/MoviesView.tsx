import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS, type PlatformValue } from "@/lib/platforms";
import { DEFAULT_WATCH_REGION, getWatchProviderIdForPlatform } from "@/lib/tmdbWatchProviders";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(500);
  const [hasMore, setHasMore] = useState(true);

  // Build the base path for queries
  const buildBasePath = useCallback(async () => {
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
      return null; // Platform not found
    }

    return basePath;
  }, [type, platform]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAllMovies([]);
    setPage(1);
    setHasMore(true);

    const fetchInitial = async () => {
      try {
        const basePath = await buildBasePath();
        if (basePath === null) {
          if (!cancelled) {
            setAllMovies([]);
            setTotalPages(1);
            setHasMore(false);
            setLoading(false);
          }
          return;
        }

        // Fetch first 5 pages initially for more content
        const pagesToFetch = [1, 2, 3, 4, 5];
        const promises = pagesToFetch.map(p => fetchTMDB(`${basePath}&page=${p}`));
        const results = await Promise.all(promises);

        if (!cancelled) {
          const combined = results.flatMap(r => r.results);
          const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
          setAllMovies(unique);
          setTotalPages(Math.min(results[0]?.total_pages || 500, 500));
          setPage(5);
          setHasMore(5 < Math.min(results[0]?.total_pages || 500, 500));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [type, platform, buildBasePath]);

  // Load more function for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const basePath = await buildBasePath();
      if (!basePath) {
        setLoadingMore(false);
        return;
      }

      const nextPage = page + 1;
      const result = await fetchTMDB(`${basePath}&page=${nextPage}`);
      
      setAllMovies(prev => {
        const combined = [...prev, ...result.results];
        return Array.from(new Map(combined.map(m => [m.id, m])).values());
      });
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } catch (err) {
      console.error("Error loading more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, totalPages, hasMore, loadingMore, buildBasePath]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    onLoadMore: loadMore,
  });

  const handleTypeChange = (newType: string) => {
    setType(newType);
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform as "all" | PlatformValue);
  };

  // Filter by search only
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
    : searchQuery
    ? `${filteredMovies.length} resultados`
    : `${filteredMovies.length} películas`;

  return (
    <Section title="Películas" emoji="🎬" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-4">
        <Chips options={MOVIE_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>

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
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {filteredMovies.map((movie) => (
              <MediaCard 
                key={movie.id} 
                item={movie} 
                type="movie" 
                platform={platform === "all" ? null : platform}
              />
            ))}
          </div>
          
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          
          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          {!hasMore && filteredMovies.length > 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">
              Has llegado al final del catálogo
            </div>
          )}
        </>
      )}
    </Section>
  );
}
