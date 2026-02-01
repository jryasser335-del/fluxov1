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

const LANG_FILTERS = [
  { value: "ko", label: "K-Drama" },
  { value: "ja", label: "J-Drama" },
  { value: "zh", label: "C-Drama" },
];

const TYPE_FILTERS = [
  { value: "trending", label: "Tendencias" },
  { value: "top", label: "Top" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface DoramasViewProps {
  searchQuery: string;
}

export function DoramasView({ searchQuery }: DoramasViewProps) {
  const [lang, setLang] = useState("ko");
  const [type, setType] = useState("trending");
  const [platform, setPlatform] = useState<"all" | PlatformValue>("all");
  const [page, setPage] = useState(1);
  const [allDoramas, setAllDoramas] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(500);
  const [hasMore, setHasMore] = useState(true);

  // Build the base path for queries
  const buildBasePath = useCallback(async () => {
    const watchRegion = DEFAULT_WATCH_REGION;
    const providerId =
      platform === "all"
        ? null
        : await getWatchProviderIdForPlatform({
            mediaType: "tv",
            platform,
            region: watchRegion,
          });

    let basePath =
      type === "top"
        ? `discover/tv?with_original_language=${lang}&sort_by=vote_average.desc&vote_count.gte=200`
        : `discover/tv?with_original_language=${lang}&sort_by=popularity.desc`;

    if (providerId) {
      basePath += `&with_watch_providers=${providerId}&watch_region=${watchRegion}&with_watch_monetization_types=flatrate`;
    } else if (platform !== "all") {
      return null;
    }

    return basePath;
  }, [lang, type, platform]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAllDoramas([]);
    setPage(1);
    setHasMore(true);

    const fetchInitial = async () => {
      try {
        const basePath = await buildBasePath();
        if (basePath === null) {
          if (!cancelled) {
            setAllDoramas([]);
            setTotalPages(1);
            setHasMore(false);
            setLoading(false);
          }
          return;
        }

        const pagesToFetch = [1, 2, 3, 4, 5];
        const promises = pagesToFetch.map(p => fetchTMDB(`${basePath}&page=${p}`));
        const results = await Promise.all(promises);

        if (!cancelled) {
          const combined = results.flatMap(r => r.results);
          const unique = Array.from(new Map(combined.map(d => [d.id, d])).values());
          setAllDoramas(unique);
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
  }, [lang, type, platform, buildBasePath]);

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
      
      setAllDoramas(prev => {
        const combined = [...prev, ...result.results];
        return Array.from(new Map(combined.map(d => [d.id, d])).values());
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

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform as "all" | PlatformValue);
  };

  // Filter by search only
  const filteredDoramas = useMemo(() => {
    let result = allDoramas;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => (d.name || "").toLowerCase().includes(q));
    }
    
    return result;
  }, [allDoramas, searchQuery]);

  const langName = lang === "ko" ? "K-Drama" : lang === "ja" ? "J-Drama" : "C-Drama";
  const platformLabel = platform === "all" ? "Todas" : STREAMING_PLATFORMS.find(p => p.value === platform)?.label || platform;
  const badge = loading
    ? "Cargando…"
    : searchQuery
    ? `${filteredDoramas.length} resultados`
    : `${filteredDoramas.length} ${langName}s`;

  return (
    <Section title="Doramas" emoji="🎎" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-4">
        <Chips options={LANG_FILTERS} value={lang} onChange={handleLangChange} />
        <Chips options={TYPE_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : filteredDoramas.length === 0 && platform !== "all" ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          TMDB no devolvió resultados para {platformLabel}.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {filteredDoramas.map((d) => (
              <MediaCard 
                key={d.id} 
                item={d} 
                type="dorama" 
                platform={platform === "all" ? null : platform}
              />
            ))}
          </div>
          
          <div ref={sentinelRef} className="h-4" />
          
          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          {!hasMore && filteredDoramas.length > 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">
              Has llegado al final del catálogo
            </div>
          )}
        </>
      )}
    </Section>
  );
}
